"""
Seed Agent Pear signals from agentpear_data.txt into the database.
Parses both OPEN and CLOSE signals and calculates metrics.
"""
import re
import sys
import os
from datetime import datetime
from typing import Optional, Dict, Any, List

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from core.database import engine, init_db
from core.models import AgentPearSignal


def parse_open_signal(text: str, message_id: int, date: datetime) -> Optional[AgentPearSignal]:
    """Parse an OPEN signal message"""
    if "Pair Trade Signal" not in text:
        return None
    
    signal = AgentPearSignal(
        message_id=message_id,
        signal_type="OPEN",
        signal_date=date,
        raw_message=text[:2000]
    )
    
    # Parse pair: **🔄 Pair:** `BTC` / `BNB`
    pair_match = re.search(r'\*\*🔄 Pair:\*\*\s*`?([A-Z0-9]+)`?\s*/\s*`?([A-Z0-9]+)`?', text)
    if pair_match:
        signal.long_asset = pair_match.group(1)
        signal.short_asset = pair_match.group(2)
    else:
        # Try alternative format
        pair_match = re.search(r'Pair:\s*([A-Z0-9]+)\s*/\s*([A-Z0-9]+)', text, re.IGNORECASE)
        if pair_match:
            signal.long_asset = pair_match.group(1)
            signal.short_asset = pair_match.group(2)
        else:
            return None  # Can't parse pair
    
    # Parse entry price: **💰 Entry Price:** 98.887098
    price_match = re.search(r'Entry Price:\*?\*?\s*([0-9.]+)', text)
    if price_match:
        signal.entry_price = float(price_match.group(1))
    
    # Parse Z-Score: **📈 Z-Score:** 2.27 | Rolling: 1.62
    zscore_match = re.search(r'Z-Score:\*?\*?\s*([+-]?[0-9.]+)\s*\|\s*Rolling:\s*([+-]?[0-9.]+)', text)
    if zscore_match:
        signal.z_score = float(zscore_match.group(1))
        signal.rolling_z_score = float(zscore_match.group(2))
    else:
        # Try without rolling
        zscore_match = re.search(r'Z-Score:\*?\*?\s*([+-]?[0-9.]+)', text)
        if zscore_match:
            signal.z_score = float(zscore_match.group(1))
    
    # Parse correlation: **📏 Correl:** 0.823
    correl_match = re.search(r'Correl:\*?\*?\s*([0-9.]+)', text)
    if correl_match:
        signal.correlation = float(correl_match.group(1))
    
    # Parse cointegration: **✅ Cointegration:** Yes
    coint_match = re.search(r'Cointegration:\*?\*?\s*(Yes|No)', text, re.IGNORECASE)
    if coint_match:
        signal.cointegration = coint_match.group(1).lower() == 'yes'
    
    # Parse hedge ratio: **🔄 Hedge Ratio:** 1.259 (55.7% BTC, 44.3% BNB)
    hedge_match = re.search(r'Hedge Ratio:\*?\*?\s*([0-9.]+)\s*\(([0-9.]+)%\s*[A-Z0-9]+,\s*([0-9.]+)%', text)
    if hedge_match:
        signal.hedge_ratio = float(hedge_match.group(1))
        signal.long_weight = float(hedge_match.group(2))
        signal.short_weight = float(hedge_match.group(3))
    
    # Parse expected reversion: **✨ Expected Reversion:** ~3.5 days
    reversion_match = re.search(r'Expected Reversion:\*?\*?\s*~?([0-9.]+)\s*days?', text)
    if reversion_match:
        signal.expected_reversion_days = float(reversion_match.group(1))
    
    # Parse backtest win rate: **🏆 Backtest Win Rate:** 86.5%
    winrate_match = re.search(r'Backtest Win Rate:\*?\*?\s*([0-9.]+)%', text)
    if winrate_match:
        signal.backtest_win_rate = float(winrate_match.group(1))
    
    # Parse platforms: **🎯 Platforms:** SYMMIO, HYPERLIQUID
    platforms_match = re.search(r'Platforms:\*?\*?\s*([A-Za-z0-9, ]+)', text)
    if platforms_match:
        signal.platforms = platforms_match.group(1).strip()
    
    return signal


def parse_close_signal(text: str, message_id: int, date: datetime) -> Optional[AgentPearSignal]:
    """Parse a CLOSE signal message"""
    # Format: Closing BTC/BNB (1h) due to mean reversion. Exit $99.141020 from entry $98.887098 (entry z=1.62, exit z=-0.40). Result: profit. Max attainable returns: +13.87% @54x
    
    if not text.lower().startswith('closing'):
        return None
    
    signal = AgentPearSignal(
        message_id=message_id,
        signal_type="CLOSE",
        signal_date=date,
        raw_message=text[:2000]
    )
    
    # Parse pair and timeframe: Closing BTC/BNB (1h)
    pair_match = re.search(r'Closing\s+([A-Z0-9]+)/([A-Z0-9]+)\s*\((\w+)\)', text, re.IGNORECASE)
    if pair_match:
        signal.long_asset = pair_match.group(1)
        signal.short_asset = pair_match.group(2)
        signal.timeframe = pair_match.group(3)
    else:
        # Try without timeframe
        pair_match = re.search(r'Closing\s+([A-Z0-9]+)/([A-Z0-9]+)', text, re.IGNORECASE)
        if pair_match:
            signal.long_asset = pair_match.group(1)
            signal.short_asset = pair_match.group(2)
        else:
            return None
    
    # Parse close reason: due to mean reversion
    reason_match = re.search(r'due to\s+([^.]+)', text, re.IGNORECASE)
    if reason_match:
        signal.close_reason = reason_match.group(1).strip()
    
    # Parse exit and entry prices: Exit $99.141020 from entry $98.887098
    prices_match = re.search(r'Exit\s+\$?([0-9.]+)\s+from\s+entry\s+\$?([0-9.]+)', text, re.IGNORECASE)
    if prices_match:
        signal.exit_price = float(prices_match.group(1))
        signal.entry_price = float(prices_match.group(2))
    
    # Parse z-scores: (entry z=1.62, exit z=-0.40)
    zscore_match = re.search(r'entry\s+z=([+-]?[0-9.]+),?\s*exit\s+z=([+-]?[0-9.]+)', text, re.IGNORECASE)
    if zscore_match:
        signal.entry_z_score = float(zscore_match.group(1))
        signal.exit_z_score = float(zscore_match.group(2))
    
    # Parse result: Result: profit or Result: loss
    result_match = re.search(r'Result:\s*(profit|loss)', text, re.IGNORECASE)
    if result_match:
        signal.result = result_match.group(1).lower()
    
    # Parse max returns: Max attainable returns: +13.87% @54x or --15.39% @54x
    returns_match = re.search(r'Max attainable returns:\s*([+-]+)?([0-9.]+)%\s*@(\d+)x', text, re.IGNORECASE)
    if returns_match:
        sign = returns_match.group(1) or '+'
        value = float(returns_match.group(2))
        if '--' in sign or sign == '-':
            value = -value
        signal.max_returns_pct = value
        signal.leverage_used = int(returns_match.group(3))
    
    return signal


def parse_message_block(block: str) -> Optional[Dict[str, Any]]:
    """Parse a single message block from the data file"""
    lines = block.strip().split('\n')
    
    message_id = None
    date = None
    message_text = []
    in_message = False
    
    for line in lines:
        if line.startswith('Message ID:'):
            message_id = int(line.replace('Message ID:', '').strip())
        elif line.startswith('Date:'):
            date_str = line.replace('Date:', '').strip()
            try:
                # Parse: 2026-01-28 12:10:29+00:00
                date = datetime.fromisoformat(date_str)
            except:
                pass
        elif line.startswith('Message:'):
            in_message = True
        elif line.startswith('Views:'):
            in_message = False
        elif in_message:
            message_text.append(line)
    
    if message_id and date and message_text:
        return {
            'message_id': message_id,
            'date': date,
            'text': '\n'.join(message_text).strip()
        }
    return None


def seed_from_file(filepath: str):
    """Parse the data file and seed the database"""
    print(f"Reading data from {filepath}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by message separator
    blocks = content.split('=' * 80)
    
    signals = []
    open_count = 0
    close_count = 0
    
    for block in blocks:
        if not block.strip():
            continue
        
        parsed = parse_message_block(block)
        if not parsed:
            continue
        
        text = parsed['text']
        message_id = parsed['message_id']
        date = parsed['date']
        
        # Try to parse as OPEN signal
        signal = parse_open_signal(text, message_id, date)
        if signal:
            signals.append(signal)
            open_count += 1
            continue
        
        # Try to parse as CLOSE signal
        signal = parse_close_signal(text, message_id, date)
        if signal:
            signals.append(signal)
            close_count += 1
    
    print(f"Parsed {len(signals)} signals: {open_count} OPEN, {close_count} CLOSE")
    
    # Save to database
    print("Saving to database...")
    init_db()
    
    with Session(engine) as session:
        saved = 0
        skipped = 0
        
        for signal in signals:
            # Check if already exists
            existing = session.exec(
                select(AgentPearSignal).where(AgentPearSignal.message_id == signal.message_id)
            ).first()
            
            if existing:
                skipped += 1
                continue
            
            session.add(signal)
            saved += 1
        
        session.commit()
        print(f"Saved {saved} new signals, skipped {skipped} existing")
    
    return signals


def calculate_metrics(session: Session) -> Dict[str, Any]:
    """Calculate performance metrics from stored signals"""
    # Get all CLOSE signals (these have results)
    close_signals = session.exec(
        select(AgentPearSignal).where(AgentPearSignal.signal_type == "CLOSE")
    ).all()
    
    if not close_signals:
        return {}
    
    total_trades = len(close_signals)
    wins = sum(1 for s in close_signals if s.result == 'profit')
    losses = sum(1 for s in close_signals if s.result == 'loss')
    win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
    
    # Calculate returns
    returns_with_leverage = []
    returns_without_leverage = []
    
    for s in close_signals:
        if s.max_returns_pct is not None and s.leverage_used:
            returns_with_leverage.append(s.max_returns_pct)
            returns_without_leverage.append(s.max_returns_pct / s.leverage_used if s.leverage_used > 0 else 0)
    
    total_return_with_leverage = sum(returns_with_leverage)
    total_return_without_leverage = sum(returns_without_leverage)
    
    # Calculate profit factor
    gross_profit = sum(r for r in returns_with_leverage if r > 0)
    gross_loss = abs(sum(r for r in returns_with_leverage if r < 0))
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
    
    # Calculate average duration (from signal dates)
    durations = []
    open_signals = session.exec(
        select(AgentPearSignal).where(AgentPearSignal.signal_type == "OPEN")
    ).all()
    
    # Create a map of open signals by pair
    open_map = {}
    for s in open_signals:
        key = f"{s.long_asset}/{s.short_asset}"
        if key not in open_map:
            open_map[key] = []
        open_map[key].append(s)
    
    for close_signal in close_signals:
        key = f"{close_signal.long_asset}/{close_signal.short_asset}"
        if key in open_map:
            # Find the most recent open signal before this close
            for open_signal in reversed(open_map[key]):
                if open_signal.signal_date < close_signal.signal_date:
                    duration = (close_signal.signal_date - open_signal.signal_date).total_seconds() / 3600
                    durations.append(duration)
                    break
    
    avg_duration_hours = sum(durations) / len(durations) if durations else 0
    
    # Get date range for trades per day calculation
    if close_signals:
        dates = [s.signal_date for s in close_signals]
        min_date = min(dates)
        max_date = max(dates)
        days = max(1, (max_date - min_date).days)
        trades_per_day = total_trades / days
    else:
        trades_per_day = 0
    
    # Average returns per day
    avg_returns_per_day = total_return_with_leverage / days if days > 0 else 0
    
    # APY calculation (simplified)
    daily_return = avg_returns_per_day / 100
    apy = ((1 + daily_return) ** 365 - 1) * 100 if daily_return > -1 else 0
    
    return {
        'total_trades': total_trades,
        'win_rate': round(win_rate, 1),
        'apy': round(min(apy, 999), 1),  # Cap at 999%
        'total_return_with_leverage': round(total_return_with_leverage, 1),
        'total_return_without_leverage': round(total_return_without_leverage, 1),
        'avg_trades_per_day': round(trades_per_day, 1),
        'avg_returns_per_day': round(avg_returns_per_day, 1),
        'profit_factor': round(profit_factor, 2) if profit_factor != float('inf') else 99.99,
        'avg_duration_hours': round(avg_duration_hours, 1),
    }


if __name__ == '__main__':
    # Path to data file - check multiple locations
    possible_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'agentpear_data.txt'),
        '/app/agentpear_data.txt',  # Docker container path
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'agentpear_data.txt'),
    ]
    
    data_file = None
    for path in possible_paths:
        if os.path.exists(path):
            data_file = path
            break
    
    if not data_file:
        data_file = possible_paths[0]  # Default for error message
    
    if not os.path.exists(data_file):
        print(f"Data file not found: {data_file}")
        sys.exit(1)
    
    signals = seed_from_file(data_file)
    
    # Calculate and print metrics
    print("\n" + "=" * 60)
    print("TRADE SIGNAL METRICS")
    print("=" * 60)
    
    with Session(engine) as session:
        metrics = calculate_metrics(session)
        
        print(f"Total trades:                  {metrics.get('total_trades', 0)}")
        print(f"Win rate:                      {metrics.get('win_rate', 0)}%")
        print(f"APY:                           {metrics.get('apy', 0)}%")
        print(f"Total Return with leverage:   {metrics.get('total_return_with_leverage', 0)}%")
        print(f"Total Return without leverage: {metrics.get('total_return_without_leverage', 0)}%")
        print(f"Avg number of trades per day: {metrics.get('avg_trades_per_day', 0)}")
        print(f"Avg returns per day:          {metrics.get('avg_returns_per_day', 0)}%")
        print(f"Profit Factor:                {metrics.get('profit_factor', 0)}")
        print(f"Average Duration:             {metrics.get('avg_duration_hours', 0)}h")
