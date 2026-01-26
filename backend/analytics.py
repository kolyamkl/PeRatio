"""
Analytics endpoints for trade statistics and performance metrics
Fetches real data from PostgreSQL database
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from sqlmodel import Session, select, func, and_
from models import Trade


def get_trade_statistics(session: Session, user_id: Optional[str] = None, days: int = 30) -> Dict[str, Any]:
    """
    Calculate trade statistics from PostgreSQL
    
    Args:
        session: Database session
        user_id: Optional user filter
        days: Number of days to look back
    
    Returns:
        Dictionary with trade statistics
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Build query
    query = select(Trade).where(Trade.created_at >= cutoff_date)
    if user_id:
        query = query.where(Trade.user_id == user_id)
    
    trades = session.exec(query).all()
    
    if not trades:
        return {
            "total_trades": 0,
            "pending_trades": 0,
            "executed_trades": 0,
            "cancelled_trades": 0,
            "total_volume": 0.0,
            "avg_confidence": 0.0,
            "top_long_assets": [],
            "top_short_assets": [],
            "performance_by_day": []
        }
    
    # Calculate statistics
    total_trades = len(trades)
    pending = sum(1 for t in trades if t.status == "PENDING")
    executed = sum(1 for t in trades if t.status == "EXECUTED")
    cancelled = sum(1 for t in trades if t.status == "CANCELLED")
    
    # Calculate total volume
    total_volume = sum(t.pair_long_notional + t.pair_short_notional for t in trades)
    
    # Calculate average confidence
    confidences = [t.confidence for t in trades if t.confidence is not None]
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    
    # Count asset frequencies
    long_assets: Dict[str, int] = {}
    short_assets: Dict[str, int] = {}
    
    for trade in trades:
        # Handle long basket
        long_basket = trade.get_long_basket()
        for asset in long_basket:
            coin = asset.get("coin", "").replace("-PERP", "")
            long_assets[coin] = long_assets.get(coin, 0) + 1
        
        # Handle short basket
        short_basket = trade.get_short_basket()
        for asset in short_basket:
            coin = asset.get("coin", "").replace("-PERP", "")
            short_assets[coin] = short_assets.get(coin, 0) + 1
    
    # Get top 5 assets
    top_long = sorted(long_assets.items(), key=lambda x: x[1], reverse=True)[:5]
    top_short = sorted(short_assets.items(), key=lambda x: x[1], reverse=True)[:5]
    
    # Performance by day
    trades_by_day: Dict[str, int] = {}
    for trade in trades:
        day_key = trade.created_at.strftime("%Y-%m-%d")
        trades_by_day[day_key] = trades_by_day.get(day_key, 0) + 1
    
    performance_by_day = [
        {"date": date, "count": count}
        for date, count in sorted(trades_by_day.items())
    ]
    
    return {
        "total_trades": total_trades,
        "pending_trades": pending,
        "executed_trades": executed,
        "cancelled_trades": cancelled,
        "total_volume": round(total_volume, 2),
        "avg_confidence": round(avg_confidence, 2),
        "top_long_assets": [{"symbol": symbol, "count": count} for symbol, count in top_long],
        "top_short_assets": [{"symbol": symbol, "count": count} for symbol, count in top_short],
        "performance_by_day": performance_by_day
    }


def get_performance_data(session: Session, user_id: Optional[str] = None, days: int = 30) -> List[Dict[str, Any]]:
    """
    Get performance chart data from PostgreSQL
    
    Returns list of data points for charting
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    query = select(Trade).where(Trade.created_at >= cutoff_date)
    if user_id:
        query = query.where(Trade.user_id == user_id)
    
    query = query.order_by(Trade.created_at)
    trades = session.exec(query).all()
    
    # Calculate cumulative metrics
    cumulative_volume = 0.0
    performance_data = []
    
    for trade in trades:
        cumulative_volume += trade.pair_long_notional + trade.pair_short_notional
        
        performance_data.append({
            "date": trade.created_at.isoformat(),
            "trade_id": trade.trade_id,
            "volume": round(trade.pair_long_notional + trade.pair_short_notional, 2),
            "cumulative_volume": round(cumulative_volume, 2),
            "confidence": trade.confidence or 0.0,
            "status": trade.status,
            "long_symbol": trade.pair_long_symbol,
            "short_symbol": trade.pair_short_symbol
        })
    
    return performance_data
