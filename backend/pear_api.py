"""
Pear Protocol API Helper
========================
Fetches open positions and PnL data from Pear Protocol API.
"""

import logging
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


async def fetch_open_positions(api_url: str, access_token: str) -> Dict[str, Any]:
    """
    Fetch open positions with PnL from Pear Protocol API.
    
    Args:
        api_url: Base URL for Pear API (e.g., https://hl-v2.pearprotocol.io)
        access_token: Bearer token for authentication
        
    Returns:
        Dict with positions data or error information
    """
    if not access_token:
        logger.warning("[PearAPI] No access token provided")
        return {"success": False, "error": "No access token", "positions": []}
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{api_url}/positions",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 401:
                logger.error("[PearAPI] Authentication failed - token may be expired")
                return {"success": False, "error": "Authentication failed", "positions": []}
            
            if response.status_code != 200:
                logger.error(f"[PearAPI] API error: {response.status_code} - {response.text}")
                return {"success": False, "error": f"API error: {response.status_code}", "positions": []}
            
            data = response.json()
            logger.info(f"[PearAPI] Fetched positions: {len(data) if isinstance(data, list) else 'N/A'}")
            
            # Normalize response - API might return list directly or wrapped in object
            if isinstance(data, list):
                return {"success": True, "positions": data}
            elif isinstance(data, dict) and "positions" in data:
                return {"success": True, "positions": data["positions"]}
            else:
                return {"success": True, "positions": data if isinstance(data, list) else []}
                
    except httpx.TimeoutException:
        logger.error("[PearAPI] Request timeout")
        return {"success": False, "error": "Request timeout", "positions": []}
    except Exception as e:
        logger.error(f"[PearAPI] Unexpected error: {e}")
        return {"success": False, "error": str(e), "positions": []}


def parse_positions_for_notification(positions_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse positions data into a format suitable for notifications.
    
    Returns:
        Dict with:
        - total_pnl: float - Total unrealized PnL in USD
        - total_pnl_pct: float - Total PnL as percentage
        - total_notional: float - Total position value
        - positions: List of parsed position dicts
    """
    if not positions_data.get("success") or not positions_data.get("positions"):
        return {
            "total_pnl": 0.0,
            "total_pnl_pct": 0.0,
            "total_notional": 0.0,
            "positions": [],
            "has_positions": False
        }
    
    positions = positions_data["positions"]
    parsed_positions = []
    total_pnl = 0.0
    total_notional = 0.0
    
    for pos in positions:
        # Handle Pear Protocol API format with longAssets/shortAssets arrays
        long_assets = pos.get("longAssets", [])
        short_assets = pos.get("shortAssets", [])
        
        # Extract long asset info (first asset in array)
        if long_assets:
            long_asset = long_assets[0].get("coin", "UNKNOWN")
            long_entry_price = long_assets[0].get("entryPrice", 0)
            long_leverage = long_assets[0].get("leverage", 1)
        else:
            long_asset = pos.get("longAsset", pos.get("long_asset", "UNKNOWN"))
            long_entry_price = 0
            long_leverage = 1
        
        # Extract short asset info (first asset in array)
        if short_assets:
            short_asset = short_assets[0].get("coin", "UNKNOWN")
            short_entry_price = short_assets[0].get("entryPrice", 0)
            short_leverage = short_assets[0].get("leverage", 1)
        else:
            short_asset = pos.get("shortAsset", pos.get("short_asset", ""))
            short_entry_price = 0
            short_leverage = 1
        
        # Overall position data
        pnl = float(pos.get("unrealizedPnl", pos.get("pnl", 0)))
        pnl_pct = float(pos.get("unrealizedPnlPercentage", 0)) * 100  # Convert to percentage
        notional = float(pos.get("positionValue", pos.get("notional", 0)))
        
        # TP/SL info
        take_profit = pos.get("takeProfit", {})
        stop_loss = pos.get("stopLoss", {})
        tp_value = take_profit.get("value", 0) if isinstance(take_profit, dict) else take_profit
        sl_value = stop_loss.get("value", 0) if isinstance(stop_loss, dict) else stop_loss
        
        parsed_pos = {
            "long_asset": long_asset,
            "short_asset": short_asset,
            "pnl": pnl,
            "pnl_pct": pnl_pct,
            "notional": notional,
            "long_entry_price": long_entry_price,
            "short_entry_price": short_entry_price,
            "take_profit": tp_value,
            "stop_loss": sl_value,
            "leverage": max(long_leverage, short_leverage),
            "status": "OPEN"
        }
        
        parsed_positions.append(parsed_pos)
        total_pnl += pnl
        total_notional += notional
    
    # Calculate total PnL percentage
    total_pnl_pct = (total_pnl / total_notional * 100) if total_notional > 0 else 0.0
    
    return {
        "total_pnl": total_pnl,
        "total_pnl_pct": total_pnl_pct,
        "total_notional": total_notional,
        "positions": parsed_positions,
        "has_positions": len(parsed_positions) > 0
    }
