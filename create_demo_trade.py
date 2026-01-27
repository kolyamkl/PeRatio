"""
Quick script to create a demo trade in the database for testing wallet integration
"""
import sys
import os
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from database import engine
from models import Trade
from sqlmodel import Session, select

def create_demo_trade():
    """Create a demo trade for testing"""
    
    trade_id = f"demo_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    trade = Trade(
        trade_id=trade_id,
        user_id="demo_user",
        pair_long_symbol="BTC",
        pair_long_notional=10.0,
        pair_long_leverage=2,
        pair_short_symbol="SOL",
        pair_short_notional=10.0,
        pair_short_leverage=2,
        take_profit_ratio=0.20,  # 20%
        stop_loss_ratio=-0.10,   # -10%
        reasoning="DEMO: Testing wallet integration - BTC long vs SOL short",
        status="PENDING",
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    
    with Session(engine) as session:
        session.add(trade)
        session.commit()
        session.refresh(trade)
        
        print(f"✅ Demo trade created!")
        print(f"Trade ID: {trade_id}")
        print(f"")
        print(f"Open this URL to execute the trade:")
        print(f"http://localhost/?tradeId={trade_id}&tp=20&sl=10&leverage=2")
        print(f"")
        print(f"Trade Details:")
        print(f"  LONG: BTC $10 @ 2x leverage")
        print(f"  SHORT: SOL $10 @ 2x leverage")
        print(f"  Take Profit: +20%")
        print(f"  Stop Loss: -10%")
        
        return trade_id

if __name__ == "__main__":
    create_demo_trade()
