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

# Configure logging
logger = logging.getLogger(__name__)

# File to store latest signal for main.py to read
LATEST_SIGNAL_FILE = os.path.join(os.path.dirname(__file__), "latest_pear_signal.json")
SIGNALS_HISTORY_FILE = os.path.join(os.path.dirname(__file__), "pear_signals_history.json")

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

async def handle_new_message(event, source_channel: str):
    """Handle new messages from @agentpear"""
    try:
        text = event.message.text
        if not text:
            return
        
        logger.info(f"")
        logger.info(f"{'='*60}")
        logger.info(f"[PEAR_MONITOR] 🍐 NEW MESSAGE FROM {source_channel}")
        logger.info(f"{'='*60}")
        logger.info(f"[PEAR_MONITOR] {text[:200]}..." if len(text) > 200 else f"[PEAR_MONITOR] {text}")
        
        # Parse signal
        signal = parse_signal_from_text(text)
        
        if signal:
            logger.info(f"[PEAR_MONITOR] ✅ SIGNAL DETECTED!")
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
