"""
Pear Agent Monitor - Monitors @agentpear and integrates with trading system.

This module can be run standalone or imported and started as a background task
from the main FastAPI backend.
"""
from telethon import TelegramClient, events
import asyncio
import re
import json
import os
import httpx
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from sqlmodel import Session, select
from core.database import engine
from core.models import AgentPearSignal

# Configure logging
logger = logging.getLogger(__name__)

# File to store latest signal for main.py to read
LATEST_SIGNAL_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "latest_pear_signal.json")
SIGNALS_HISTORY_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "pear_signals_history.json")

# Backend URL for triggering trades
BACKEND_URL = "http://localhost:8000"

# Global client instance (initialized when start_monitor is called)
_monitor_client: Optional[TelegramClient] = None
_monitor_task: Optional[asyncio.Task] = None

def parse_signal_from_text(text: str) -> Optional[Dict[str, Any]]:
    """Parse trading signal from @agentpear message text"""
    signal = {}
    
    # Look for trading pairs
    pair_patterns = [
        r'([A-Z]{2,10})\s*/\s*([A-Z]{2,10})',
        r'Long[:\s]+([A-Z]{2,10}).*?Short[:\s]+([A-Z]{2,10})',
        r'🟢\s*([A-Z]{2,10}).*?🔴\s*([A-Z]{2,10})',
        r'LONG[:\s]+([A-Z]{2,10}).*?SHORT[:\s]+([A-Z]{2,10})',
    ]
    
    for pattern in pair_patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            signal['long_asset'] = match.group(1).upper()
            signal['short_asset'] = match.group(2).upper()
            break
    
    if 'long_asset' not in signal:
        return None
    
    # Extract z-score
    if z_match := re.search(r'z[-\s]?score[:\s]+([+-]?\d+\.?\d*)', text, re.I):
        signal['z_score'] = float(z_match.group(1))
    
    # Extract correlation
    if corr_match := re.search(r'corr(?:elation)?[:\s]+(\d+\.?\d*)', text, re.I):
        corr = float(corr_match.group(1))
        signal['correlation'] = corr / 100 if corr > 1 else corr
    
    # Extract spread
    if spread_match := re.search(r'spread[:\s]+(\d+\.?\d*)', text, re.I):
        signal['spread'] = float(spread_match.group(1))
    
    return signal

def convert_to_trade_format(signal: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
    """Convert parsed signal to trading system format"""
    long_asset = signal.get('long_asset', 'BTC')
    short_asset = signal.get('short_asset', 'ETH')
    z_score = signal.get('z_score', 0)
    correlation = signal.get('correlation', 0)
    spread = signal.get('spread', 0)
    
    # Calculate confidence from z-score
    confidence = min(10, max(1, abs(z_score) * 3 + 4))
    
    # Dynamic TP/SL based on z-score
    tp_pct = max(5, min(30, 10 + abs(z_score) * 3))
    sl_pct = max(3, min(15, 5 + abs(z_score) * 1.5))
    
    if correlation > 0.7:
        sl_pct *= 0.8
    
    direction = "bullish" if z_score > 0 else "bearish"
    thesis = (
        f"🍐 Agent Pear Signal: {long_asset}/{short_asset} showing {direction} divergence. "
        f"Z-Score: {z_score:.2f}, Correlation: {correlation:.2f}, Spread: {spread:.4f}"
    )
    
    return {
        "trade_type": "PAIR",
        "basket_category": "AGENTPEAR_TELEGRAM_SIGNAL",
        "long_basket": [{"coin": long_asset, "weight": 1.0}],
        "short_basket": [{"coin": short_asset, "weight": 1.0}],
        "confidence": round(confidence, 1),
        "thesis": thesis,
        "position_sizing": {
            "recommended_sl_percent": round(sl_pct, 1),
            "recommended_tp_percent": round(tp_pct, 1),
            "risk_reward_ratio": round(tp_pct / sl_pct, 2)
        },
        "factor_analysis": {
            "z_score": round(z_score, 2),
            "correlation": round(correlation, 4),
            "spread": round(spread, 6),
            "momentum_divergence": int(min(10, abs(z_score) * 3)),
            "correlation_quality": int(correlation * 10),
            "overall_confluence": int(confidence)
        },
        "raw_text": raw_text[:500],
        "source": "telegram_agentpear",
        "generated_at": datetime.now().isoformat(),
        "model": "pear-monitor-telegram"
    }

def save_signal(signal_data: Dict[str, Any]):
    """Save signal to files for main.py to read"""
    # Save latest signal
    with open(LATEST_SIGNAL_FILE, 'w', encoding='utf-8') as f:
        json.dump(signal_data, f, indent=2, ensure_ascii=False)
    
    # Append to history
    history = []
    if os.path.exists(SIGNALS_HISTORY_FILE):
        try:
            with open(SIGNALS_HISTORY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
        except:
            history = []
    
    history.append(signal_data)
    
    # Keep only last 100 signals
    history = history[-100:]
    
    with open(SIGNALS_HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2, ensure_ascii=False)

def is_close_message(text: str) -> bool:
    """
    Check if the message is about closing a position (not opening).
    We only want to notify users about NEW trade opportunities, not closures.
    """
    text_lower = text.lower()
    
    # Keywords that indicate a close/exit message
    close_keywords = [
        'closed', 'closing', 'close position', 'exit', 'exited', 'exiting',
        'took profit', 'take profit hit', 'tp hit', 'stopped out', 'stop loss hit',
        'sl hit', 'position closed', 'trade closed', 'liquidated', 'liquidation',
        'sold', 'covered', 'unwound', 'unwind', 'flatten', 'flattened',
        'realized pnl', 'realized profit', 'realized loss', 'closed at',
        'exit at', 'closed for', 'profit taken', 'loss taken'
    ]
    
    for keyword in close_keywords:
        if keyword in text_lower:
            return True
    
    return False


def save_signal_to_db(text: str, message_id: int, signal_date: datetime) -> Optional[AgentPearSignal]:
    """
    Parse and save a signal (OPEN or CLOSE) to the database.
    Returns the saved signal or None if parsing failed.
    """
    try:
        is_close = is_close_message(text)
        
        if is_close:
            # Parse CLOSE signal
            signal = parse_close_signal_to_db(text, message_id, signal_date)
        else:
            # Parse OPEN signal
            signal = parse_open_signal_to_db(text, message_id, signal_date)
        
        if not signal:
            return None
        
        with Session(engine) as session:
            # Check if already exists
            existing = session.exec(
                select(AgentPearSignal).where(AgentPearSignal.message_id == message_id)
            ).first()
            
            if existing:
                logger.info(f"[PEAR_MONITOR] Signal {message_id} already exists in DB")
                return existing
            
            session.add(signal)
            session.commit()
            session.refresh(signal)
            logger.info(f"[PEAR_MONITOR] 💾 Saved {signal.signal_type} signal to DB: {signal.long_asset}/{signal.short_asset}")
            return signal
            
    except Exception as e:
        logger.error(f"[PEAR_MONITOR] ❌ Error saving signal to DB: {e}")
        return None


def parse_open_signal_to_db(text: str, message_id: int, signal_date: datetime) -> Optional[AgentPearSignal]:
    """Parse an OPEN signal message for database storage"""
    if "Pair Trade Signal" not in text:
        return None
    
    signal = AgentPearSignal(
        message_id=message_id,
        signal_type="OPEN",
        signal_date=signal_date,
        raw_message=text[:2000]
    )
    
    # Parse pair: **🔄 Pair:** `BTC` / `BNB`
    pair_match = re.search(r'\*\*🔄 Pair:\*\*\s*`?([A-Z0-9]+)`?\s*/\s*`?([A-Z0-9]+)`?', text)
    if pair_match:
        signal.long_asset = pair_match.group(1)
        signal.short_asset = pair_match.group(2)
    else:
        pair_match = re.search(r'Pair:\s*([A-Z0-9]+)\s*/\s*([A-Z0-9]+)', text, re.IGNORECASE)
        if pair_match:
            signal.long_asset = pair_match.group(1)
            signal.short_asset = pair_match.group(2)
        else:
            return None
    
    # Parse entry price
    price_match = re.search(r'Entry Price:\*?\*?\s*([0-9.]+)', text)
    if price_match:
        signal.entry_price = float(price_match.group(1))
    
    # Parse Z-Score
    zscore_match = re.search(r'Z-Score:\*?\*?\s*([+-]?[0-9.]+)\s*\|\s*Rolling:\s*([+-]?[0-9.]+)', text)
    if zscore_match:
        signal.z_score = float(zscore_match.group(1))
        signal.rolling_z_score = float(zscore_match.group(2))
    else:
        zscore_match = re.search(r'Z-Score:\*?\*?\s*([+-]?[0-9.]+)', text)
        if zscore_match:
            signal.z_score = float(zscore_match.group(1))
    
    # Parse correlation
    correl_match = re.search(r'Correl:\*?\*?\s*([0-9.]+)', text)
    if correl_match:
        signal.correlation = float(correl_match.group(1))
    
    # Parse cointegration
    coint_match = re.search(r'Cointegration:\*?\*?\s*(Yes|No)', text, re.IGNORECASE)
    if coint_match:
        signal.cointegration = coint_match.group(1).lower() == 'yes'
    
    # Parse hedge ratio
    hedge_match = re.search(r'Hedge Ratio:\*?\*?\s*([0-9.]+)\s*\(([0-9.]+)%\s*[A-Z0-9]+,\s*([0-9.]+)%', text)
    if hedge_match:
        signal.hedge_ratio = float(hedge_match.group(1))
        signal.long_weight = float(hedge_match.group(2))
        signal.short_weight = float(hedge_match.group(3))
    
    # Parse expected reversion
    reversion_match = re.search(r'Expected Reversion:\*?\*?\s*~?([0-9.]+)\s*days?', text)
    if reversion_match:
        signal.expected_reversion_days = float(reversion_match.group(1))
    
    # Parse backtest win rate
    winrate_match = re.search(r'Backtest Win Rate:\*?\*?\s*([0-9.]+)%', text)
    if winrate_match:
        signal.backtest_win_rate = float(winrate_match.group(1))
    
    # Parse platforms
    platforms_match = re.search(r'Platforms:\*?\*?\s*([A-Za-z0-9, ]+)', text)
    if platforms_match:
        signal.platforms = platforms_match.group(1).strip()
    
    return signal


def parse_close_signal_to_db(text: str, message_id: int, signal_date: datetime) -> Optional[AgentPearSignal]:
    """Parse a CLOSE signal message for database storage"""
    if not text.lower().startswith('closing'):
        return None
    
    signal = AgentPearSignal(
        message_id=message_id,
        signal_type="CLOSE",
        signal_date=signal_date,
        raw_message=text[:2000]
    )
    
    # Parse pair and timeframe
    pair_match = re.search(r'Closing\s+([A-Z0-9]+)/([A-Z0-9]+)\s*\((\w+)\)', text, re.IGNORECASE)
    if pair_match:
        signal.long_asset = pair_match.group(1)
        signal.short_asset = pair_match.group(2)
        signal.timeframe = pair_match.group(3)
    else:
        pair_match = re.search(r'Closing\s+([A-Z0-9]+)/([A-Z0-9]+)', text, re.IGNORECASE)
        if pair_match:
            signal.long_asset = pair_match.group(1)
            signal.short_asset = pair_match.group(2)
        else:
            return None
    
    # Parse close reason
    reason_match = re.search(r'due to\s+([^.]+)', text, re.IGNORECASE)
    if reason_match:
        signal.close_reason = reason_match.group(1).strip()
    
    # Parse exit and entry prices
    prices_match = re.search(r'Exit\s+\$?([0-9.]+)\s+from\s+entry\s+\$?([0-9.]+)', text, re.IGNORECASE)
    if prices_match:
        signal.exit_price = float(prices_match.group(1))
        signal.entry_price = float(prices_match.group(2))
    
    # Parse z-scores
    zscore_match = re.search(r'entry\s+z=([+-]?[0-9.]+),?\s*exit\s+z=([+-]?[0-9.]+)', text, re.IGNORECASE)
    if zscore_match:
        signal.entry_z_score = float(zscore_match.group(1))
        signal.exit_z_score = float(zscore_match.group(2))
    
    # Parse result
    result_match = re.search(r'Result:\s*(profit|loss)', text, re.IGNORECASE)
    if result_match:
        signal.result = result_match.group(1).lower()
    
    # Parse max returns
    returns_match = re.search(r'Max attainable returns:\s*([+-]+)?([0-9.]+)%\s*@(\d+)x', text, re.IGNORECASE)
    if returns_match:
        sign = returns_match.group(1) or '+'
        value = float(returns_match.group(2))
        if '--' in sign or sign == '-':
            value = -value
        signal.max_returns_pct = value
        signal.leverage_used = int(returns_match.group(3))
    
    return signal


async def handle_new_message(event, source_channel: str):
    """Handle new messages from @agentpear - save ALL signals to DB, but only notify for OPEN signals"""
    try:
        text = event.message.text
        if not text:
            return
        
        message_id = event.message.id
        signal_date = event.message.date
        
        logger.info(f"")
        logger.info(f"{'='*60}")
        logger.info(f"[PEAR_MONITOR] 🍐 NEW MESSAGE FROM {source_channel}")
        logger.info(f"{'='*60}")
        logger.info(f"[PEAR_MONITOR] Message ID: {message_id}")
        logger.info(f"[PEAR_MONITOR] {text[:200]}..." if len(text) > 200 else f"[PEAR_MONITOR] {text}")
        
        # Save ALL signals to database (both OPEN and CLOSE) for metrics tracking
        db_signal = save_signal_to_db(text, message_id, signal_date)
        if db_signal:
            logger.info(f"[PEAR_MONITOR] 💾 {db_signal.signal_type} signal saved to database")
        
        # Filter out close/exit messages - we only want to NOTIFY about NEW trades
        if is_close_message(text):
            logger.info(f"[PEAR_MONITOR] ⏭️ CLOSE message saved to DB but not broadcasting (not a new trade opportunity)")
            logger.info(f"{'='*60}")
            return
        
        # Parse signal for broadcasting
        signal = parse_signal_from_text(text)
        
        if signal:
            logger.info(f"[PEAR_MONITOR] ✅ OPEN SIGNAL DETECTED!")
            logger.info(f"[PEAR_MONITOR]    Long:  {signal['long_asset']}")
            logger.info(f"[PEAR_MONITOR]    Short: {signal['short_asset']}")
            if 'z_score' in signal:
                logger.info(f"[PEAR_MONITOR]    Z-Score: {signal['z_score']}")
            if 'correlation' in signal:
                logger.info(f"[PEAR_MONITOR]    Correlation: {signal['correlation']}")
            
            # Convert to trade format
            trade_signal = convert_to_trade_format(signal, text)
            
            # Save for main.py
            save_signal(trade_signal)
            logger.info(f"[PEAR_MONITOR] 💾 Signal saved to {LATEST_SIGNAL_FILE}")
            
            # Trigger trade generation endpoint
            try:
                async with httpx.AsyncClient(timeout=10) as http_client:
                    resp = await http_client.post(
                        f"{BACKEND_URL}/api/pear-signal/broadcast",
                        json=trade_signal
                    )
                    if resp.status_code == 200:
                        result = resp.json()
                        logger.info(f"[PEAR_MONITOR] 📤 Signal broadcasted to {result.get('sent_count', 0)} users!")
                    else:
                        logger.warning(f"[PEAR_MONITOR] ⚠️ Broadcast endpoint returned: {resp.status_code}")
            except Exception as e:
                logger.warning(f"[PEAR_MONITOR] ⚠️ Could not broadcast: {e}")
        else:
            logger.info(f"[PEAR_MONITOR] ⏭️ No trading signal found in message")
        
        logger.info(f"{'='*60}")
        
    except Exception as e:
        logger.error(f"[PEAR_MONITOR] ❌ Error processing message: {e}")


async def start_monitor(api_id: int, api_hash: str, phone: str, source_channel: str = "@agentpear") -> bool:
    """
    Start the Pear Agent monitor as a background task.
    
    Args:
        api_id: Telegram API ID
        api_hash: Telegram API hash
        phone: Phone number for authentication
        source_channel: Channel to monitor (default: @agentpear)
    
    Returns:
        True if started successfully, False otherwise
    """
    global _monitor_client, _monitor_task
    
    if not api_id or not api_hash or not phone:
        logger.warning("[PEAR_MONITOR] ⚠️ Missing Telegram API credentials, monitor not started")
        return False
    
    try:
        logger.info(f"[PEAR_MONITOR] 🍐 Starting Agent Pear monitor...")
        logger.info(f"[PEAR_MONITOR] Channel: {source_channel}")
        
        # Create client with session file in backend directory
        session_path = os.path.join(os.path.dirname(__file__), 'pear_monitor_session')
        _monitor_client = TelegramClient(session_path, api_id, api_hash)
        
        # Register message handler
        @_monitor_client.on(events.NewMessage(chats=source_channel))
        async def message_handler(event):
            await handle_new_message(event, source_channel)
        
        # Start the client
        await _monitor_client.start(phone=phone)
        
        me = await _monitor_client.get_me()
        logger.info(f"[PEAR_MONITOR] ✅ Monitor started - logged in as: {me.first_name}")
        logger.info(f"[PEAR_MONITOR] 👀 Monitoring: {source_channel}")
        
        # Run in background (don't block)
        _monitor_task = asyncio.create_task(_run_monitor())
        
        return True
        
    except Exception as e:
        logger.error(f"[PEAR_MONITOR] ❌ Failed to start monitor: {e}")
        return False


async def _run_monitor():
    """Internal function to keep the monitor running"""
    global _monitor_client
    try:
        if _monitor_client:
            await _monitor_client.run_until_disconnected()
    except asyncio.CancelledError:
        logger.info("[PEAR_MONITOR] Monitor task cancelled")
    except Exception as e:
        logger.error(f"[PEAR_MONITOR] Monitor error: {e}")


async def stop_monitor():
    """Stop the Pear Agent monitor"""
    global _monitor_client, _monitor_task
    
    if _monitor_task:
        _monitor_task.cancel()
        try:
            await _monitor_task
        except asyncio.CancelledError:
            pass
        _monitor_task = None
    
    if _monitor_client:
        await _monitor_client.disconnect()
        _monitor_client = None
    
    logger.info("[PEAR_MONITOR] ✅ Monitor stopped")


def is_monitor_running() -> bool:
    """Check if the monitor is currently running"""
    return _monitor_client is not None and _monitor_client.is_connected()


# Standalone execution
if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv()
    
    API_ID = int(os.getenv("TELEGRAM_API_ID", "0"))
    API_HASH = os.getenv("TELEGRAM_API_HASH", "")
    PHONE = os.getenv("TELEGRAM_PHONE", "")
    SOURCE_CHANNEL = os.getenv("TELEGRAM_SOURCE_CHANNEL", "@agentpear")
    
    async def main():
        success = await start_monitor(API_ID, API_HASH, PHONE, SOURCE_CHANNEL)
        if success:
            print(f"\n🍐 AGENTPEAR MONITOR RUNNING")
            print(f"Press Ctrl+C to stop\n")
            # Keep running
            while is_monitor_running():
                await asyncio.sleep(1)
        else:
            print("❌ Failed to start monitor")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Monitor stopped by user")
