"""Pear Agent Monitor - Monitors @agentpear and integrates with trading system"""
from telethon import TelegramClient, events
import asyncio
import re
import json
import os
import httpx
from datetime import datetime
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Telegram API credentials from environment
API_ID = int(os.getenv("TELEGRAM_API_ID", "0"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
PHONE = os.getenv("TELEGRAM_PHONE", "")

# Channel to monitor
SOURCE_CHANNEL = os.getenv("TELEGRAM_SOURCE_CHANNEL", "@agentpear")

# File to store latest signal for main.py to read
LATEST_SIGNAL_FILE = os.path.join(os.path.dirname(__file__), "latest_pear_signal.json")
SIGNALS_HISTORY_FILE = os.path.join(os.path.dirname(__file__), "pear_signals_history.json")

# Backend URL for triggering trades
BACKEND_URL = "http://localhost:8000"

# Create client
client = TelegramClient('pear_monitor', API_ID, API_HASH)

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

@client.on(events.NewMessage(chats=SOURCE_CHANNEL))
async def handler(event):
    """Handle new messages from @agentpear"""
    try:
        text = event.message.text
        if not text:
            return
        
        print(f"\n{'='*60}")
        print(f"🍐 NEW MESSAGE FROM @agentpear")
        print(f"{'='*60}")
        print(f"{text[:200]}..." if len(text) > 200 else text)
        
        # Parse signal
        signal = parse_signal_from_text(text)
        
        if signal:
            print(f"\n✅ SIGNAL DETECTED!")
            print(f"   Long:  {signal['long_asset']}")
            print(f"   Short: {signal['short_asset']}")
            if 'z_score' in signal:
                print(f"   Z-Score: {signal['z_score']}")
            if 'correlation' in signal:
                print(f"   Correlation: {signal['correlation']}")
            
            # Convert to trade format
            trade_signal = convert_to_trade_format(signal, text)
            
            # Save for main.py
            save_signal(trade_signal)
            print(f"\n💾 Signal saved to {LATEST_SIGNAL_FILE}")
            
            # Trigger trade generation endpoint
            try:
                async with httpx.AsyncClient(timeout=10) as http_client:
                    resp = await http_client.post(
                        f"{BACKEND_URL}/api/pear-signal/broadcast",
                        json=trade_signal
                    )
                    if resp.status_code == 200:
                        print(f"📤 Signal broadcasted to users!")
                    else:
                        print(f"⚠️ Broadcast endpoint returned: {resp.status_code}")
            except Exception as e:
                print(f"⚠️ Could not broadcast (backend may not have endpoint yet): {e}")
        else:
            print(f"\n⏭️ No trading signal found in message")
        
        print(f"{'='*60}\n")
        
    except Exception as e:
        print(f"❌ Error processing message: {e}")

async def main():
    """Start the monitor"""
    await client.start(phone=PHONE)
    
    me = await client.get_me()
    print(f"\n{'='*60}")
    print(f"🍐 AGENTPEAR MONITOR - INTEGRATED MODE")
    print(f"{'='*60}")
    print(f"\n👤 Logged in as: {me.first_name}")
    print(f"👀 Monitoring: {SOURCE_CHANNEL}")
    print(f"� Saving signals to: {LATEST_SIGNAL_FILE}")
    print(f"� Backend: {BACKEND_URL}")
    print(f"\n⏳ Waiting for signals...")
    print(f"{'='*60}\n")
    
    await client.run_until_disconnected()

if __name__ == '__main__':
    asyncio.run(main())
