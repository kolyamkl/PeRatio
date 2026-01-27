"""
Pear Protocol Wallet API
Handles agent wallet management and trade execution via user's Bearer token
"""

import logging
import requests
from typing import Optional, Dict, Any
from config import get_settings

logger = logging.getLogger(__name__)

PEAR_API_URL = "https://hl-v2.pearprotocol.io"
CLIENT_ID = "HLHackathon9"


def check_agent_wallet(access_token: str) -> Optional[Dict[str, Any]]:
    """
    Check if user has an agent wallet
    Returns agent wallet info or None if not found
    """
    logger.info("[PEAR_WALLET] Checking agent wallet status...")
    
    try:
        response = requests.get(
            f"{PEAR_API_URL}/agentWallet",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
            params={"clientId": CLIENT_ID},
            timeout=30,
        )
        
        if response.status_code == 404:
            logger.info("[PEAR_WALLET] No agent wallet found")
            return None
        
        response.raise_for_status()
        data = response.json()
        
        if data.get("agentWalletAddress"):
            logger.info(f"[PEAR_WALLET] Agent wallet found: {data['agentWalletAddress']}")
            return data
        
        return None
        
    except requests.exceptions.RequestException as e:
        logger.error(f"[PEAR_WALLET] Error checking agent wallet: {e}")
        raise


def create_agent_wallet(access_token: str) -> Dict[str, Any]:
    """
    Create a new agent wallet for the user
    Returns the new agent wallet info
    """
    logger.info("[PEAR_WALLET] Creating new agent wallet...")
    
    try:
        response = requests.post(
            f"{PEAR_API_URL}/agentWallet",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={"clientId": CLIENT_ID},
            timeout=30,
        )
        
        response.raise_for_status()
        data = response.json()
        
        logger.info(f"[PEAR_WALLET] Agent wallet created: {data.get('agentWalletAddress')}")
        return data
        
    except requests.exceptions.RequestException as e:
        logger.error(f"[PEAR_WALLET] Error creating agent wallet: {e}")
        raise


def get_user_state(access_token: str) -> Dict[str, Any]:
    """
    Get user's account state (balances, positions) from Hyperliquid via Pear
    """
    logger.info("[PEAR_WALLET] Fetching user state...")
    
    try:
        response = requests.get(
            f"{PEAR_API_URL}/hl/user-state",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
            timeout=30,
        )
        
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.RequestException as e:
        logger.error(f"[PEAR_WALLET] Error fetching user state: {e}")
        raise


def get_positions(access_token: str) -> list:
    """
    Get user's open positions from Pear Protocol
    """
    logger.info("[PEAR_WALLET] Fetching positions...")
    
    try:
        response = requests.get(
            f"{PEAR_API_URL}/positions",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
            timeout=30,
        )
        
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.RequestException as e:
        logger.error(f"[PEAR_WALLET] Error fetching positions: {e}")
        raise


def execute_trade_with_token(
    access_token: str,
    long_assets: list,
    short_assets: list,
    usd_value: float,
    leverage: int,
    take_profit_percent: Optional[float] = None,
    stop_loss_percent: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Execute a trade using the user's Bearer token
    This uses the user's approved agent wallet on Hyperliquid
    """
    logger.info("[PEAR_WALLET] 🚀 Executing trade with user token...")
    logger.info(f"[PEAR_WALLET] Long: {long_assets}, Short: {short_assets}")
    logger.info(f"[PEAR_WALLET] USD Value: ${usd_value}, Leverage: {leverage}x")
    
    position_data = {
        "executionType": "MARKET",
        "slippage": 0.08,  # 8% slippage tolerance
        "leverage": leverage,
        "usdValue": usd_value,
        "longAssets": long_assets,
        "shortAssets": short_assets,
    }
    
    if take_profit_percent:
        position_data["takeProfit"] = {
            "type": "PERCENTAGE",
            "value": abs(take_profit_percent),
        }
        logger.info(f"[PEAR_WALLET] Take Profit: {abs(take_profit_percent)}%")
    
    if stop_loss_percent:
        position_data["stopLoss"] = {
            "type": "PERCENTAGE",
            "value": abs(stop_loss_percent),
        }
        logger.info(f"[PEAR_WALLET] Stop Loss: {abs(stop_loss_percent)}%")
    
    logger.info(f"[PEAR_WALLET] Request payload: {position_data}")
    
    try:
        response = requests.post(
            f"{PEAR_API_URL}/positions",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=position_data,
            timeout=30,
        )
        
        logger.info(f"[PEAR_WALLET] Response status: {response.status_code}")
        logger.info(f"[PEAR_WALLET] Response body: {response.text[:500]}")
        
        if response.status_code in [200, 201]:
            result = response.json()
            order_id = result.get("orderId", result.get("id", "N/A"))
            logger.info(f"[PEAR_WALLET] ✅ Trade executed! Order ID: {order_id}")
            return result
        else:
            error_msg = response.text
            logger.error(f"[PEAR_WALLET] ❌ Trade failed: {error_msg}")
            raise Exception(f"Trade execution failed: {error_msg}")
            
    except requests.exceptions.Timeout:
        logger.error("[PEAR_WALLET] ⏱️ Request timeout")
        raise Exception("Trade request timed out")
    except requests.exceptions.RequestException as e:
        logger.error(f"[PEAR_WALLET] 🌐 Network error: {e}")
        raise


def close_position(access_token: str, position_id: str) -> Dict[str, Any]:
    """
    Close an open position
    """
    logger.info(f"[PEAR_WALLET] Closing position: {position_id}")
    
    try:
        response = requests.delete(
            f"{PEAR_API_URL}/positions/{position_id}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
            timeout=30,
        )
        
        response.raise_for_status()
        logger.info(f"[PEAR_WALLET] ✅ Position closed: {position_id}")
        return response.json()
        
    except requests.exceptions.RequestException as e:
        logger.error(f"[PEAR_WALLET] Error closing position: {e}")
        raise
