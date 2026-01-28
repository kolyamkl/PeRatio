"""
Pear Protocol API Client
========================
Python client for Pear Protocol API integration.
Loads credentials from Api configs/EXPORT_DATA.json
"""

import json
import logging
import os
import requests
from typing import Optional, Any
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PearApiClient:
    """
    Python client for Pear Protocol API.
    
    Features:
    - Loads credentials from EXPORT_DATA.json
    - Supports GET, POST, DELETE requests
    - Handles authentication via Bearer token
    - JSON output for all responses
    """
    
    def __init__(self, config_path: Optional[str] = None, access_token: Optional[str] = None):
        """
        Initialize the Pear API client.
        
        Args:
            config_path: Path to EXPORT_DATA.json. If None, auto-discovers from Api configs.
            access_token: Optional access token override. If None, uses env or generates.
        """
        self.config = self._load_config(config_path)
        self.api_url = self.config.get("credentials", {}).get("apiUrl", "https://hl-v2.pearprotocol.io")
        self.client_id = self.config.get("credentials", {}).get("clientId", "HLHackathon9")
        self.private_key = self.config.get("credentials", {}).get("privateKey", "")
        self.agent_wallet = self.config.get("walletAddresses", {}).get("agentWallet", "")
        self.user_wallet = self.config.get("walletAddresses", {}).get("userWallet", "")
        
        # Access token - from param, env, or will need to authenticate
        self.access_token = access_token or os.getenv("PEAR_ACCESS_TOKEN", "")
        
        # Setup session
        self.session = requests.Session()
        self._update_headers()
        
        logger.info(f"PearApiClient initialized")
        logger.info(f"  API URL: {self.api_url}")
        logger.info(f"  Client ID: {self.client_id}")
        logger.info(f"  Agent Wallet: {self.agent_wallet}")
    
    def _load_config(self, config_path: Optional[str] = None) -> dict:
        """
        Load configuration from EXPORT_DATA.json.
        
        Args:
            config_path: Explicit path to config file
            
        Returns:
            Configuration dictionary
        """
        if config_path:
            path = Path(config_path)
        else:
            # Auto-discover from parent directory
            current_dir = Path(__file__).parent
            api_configs_path = current_dir.parent / "Api configs" / "EXPORT_DATA.json"
            path = api_configs_path
        
        if path.exists():
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                logger.info(f"Loaded config from: {path}")
                return config
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse config: {e}")
                return {}
        else:
            logger.warning(f"Config file not found: {path}")
            # Return defaults
            return {
                "credentials": {
                    "apiUrl": "https://hl-v2.pearprotocol.io",
                    "clientId": "HLHackathon9"
                }
            }
    
    def _update_headers(self):
        """Update session headers with current access token."""
        self.session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}" if self.access_token else "",
        })
    
    def set_access_token(self, token: str):
        """
        Set or update the access token.
        
        Args:
            token: New access token
        """
        self.access_token = token
        self._update_headers()
        logger.info("Access token updated")
    
    def get(self, endpoint: str, params: Optional[dict] = None) -> dict:
        """
        Make a GET request to Pear Protocol API.
        
        Args:
            endpoint: API endpoint (e.g., "/agentWallet")
            params: Query parameters
            
        Returns:
            Response as JSON dict
        """
        url = f"{self.api_url}{endpoint}"
        
        try:
            logger.debug(f"GET {url}")
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return {"success": True, "data": response.json()}
        except requests.exceptions.HTTPError as e:
            error_data = e.response.json() if e.response else {}
            logger.error(f"GET {endpoint} failed: {e}")
            return {"success": False, "error": str(e), "details": error_data}
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {e}")
            return {"success": False, "error": str(e)}
    
    def post(self, endpoint: str, data: Optional[dict] = None) -> dict:
        """
        Make a POST request to Pear Protocol API.
        
        Args:
            endpoint: API endpoint
            data: Request body
            
        Returns:
            Response as JSON dict
        """
        url = f"{self.api_url}{endpoint}"
        
        try:
            logger.info(f"POST {url}")
            logger.info(f"POST data: {json.dumps(data, indent=2) if data else 'None'}")
            response = self.session.post(url, json=data, timeout=60)
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response headers: {dict(response.headers)}")
            logger.info(f"Response body: {response.text[:1000] if response.text else 'Empty'}")
            response.raise_for_status()
            return {"success": True, "data": response.json()}
        except requests.exceptions.HTTPError as e:
            try:
                error_data = e.response.json() if e.response else {}
            except:
                error_data = {"raw": e.response.text if e.response else "No response"}
            logger.error(f"POST {endpoint} failed: {e}")
            logger.error(f"Response status: {e.response.status_code if e.response else 'N/A'}")
            logger.error(f"Response headers: {dict(e.response.headers) if e.response else 'N/A'}")
            logger.error(f"Response body: {e.response.text if e.response else 'N/A'}")
            logger.error(f"Error details: {error_data}")
            return {"success": False, "error": str(e), "details": error_data}
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {e}")
            return {"success": False, "error": str(e)}
    
    def delete(self, endpoint: str, params: Optional[dict] = None) -> dict:
        """
        Make a DELETE request to Pear Protocol API.
        
        Args:
            endpoint: API endpoint
            params: Query parameters
            
        Returns:
            Response as JSON dict
        """
        url = f"{self.api_url}{endpoint}"
        
        try:
            logger.debug(f"DELETE {url}")
            response = self.session.delete(url, params=params, timeout=30)
            response.raise_for_status()
            return {"success": True, "data": response.json()}
        except requests.exceptions.HTTPError as e:
            error_data = e.response.json() if e.response else {}
            logger.error(f"DELETE {endpoint} failed: {e}")
            return {"success": False, "error": str(e), "details": error_data}
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {e}")
            return {"success": False, "error": str(e)}
    
    # =========================================================================
    # AGENT WALLET OPERATIONS
    # =========================================================================
    
    def get_agent_wallet(self) -> dict:
        """
        Get agent wallet status.
        
        Returns:
            Agent wallet info as JSON
        """
        return self.get("/agentWallet", {"clientId": self.client_id})
    
    def create_agent_wallet(self) -> dict:
        """
        Create a new agent wallet.
        
        Returns:
            New agent wallet info as JSON
        """
        return self.post("/agentWallet", {"clientId": self.client_id})
    
    # =========================================================================
    # TRADING OPERATIONS
    # =========================================================================
    
    def place_order(self, order_data: dict) -> dict:
        """
        Place a trading order.
        
        Args:
            order_data: Order parameters
            
        Returns:
            Order result as JSON
        """
        order_data["clientId"] = self.client_id
        return self.post("/hl/order", order_data)
    
    def place_market_order(self, symbol: str, side: str, size: float) -> dict:
        """
        Place a simple market order (creates a position).
        
        Args:
            symbol: Trading symbol (BTC, ETH, etc.)
            side: 'buy' (long) or 'sell' (short)
            size: Position size in USD
            
        Returns:
            Position result with orderId and fills
        """
        position_data = {
            "executionType": "MARKET",
            "slippage": 0.08,  # 8% slippage tolerance
            "leverage": 2,
            "usdValue": size,
            "longAssets": [{"asset": symbol, "weight": 1.0}] if side == "buy" else [],
            "shortAssets": [{"asset": symbol, "weight": 1.0}] if side == "sell" else []
        }
        return self.post("/positions", position_data)
    
    def place_limit_order(self, symbol: str, side: str, size: float, price: float, time_in_force: str = "GTC") -> dict:
        """
        Place a trigger order (limit order with price trigger).
        
        Args:
            symbol: Trading symbol
            side: 'buy' (long) or 'sell' (short)
            size: Position size in USD
            price: Trigger price
            time_in_force: Not used (kept for compatibility)
            
        Returns:
            Position result with orderId
        """
        position_data = {
            "executionType": "TRIGGER",
            "slippage": 0.08,
            "leverage": 2,
            "usdValue": size,
            "longAssets": [{"asset": symbol, "weight": 1.0}] if side == "buy" else [],
            "shortAssets": [{"asset": symbol, "weight": 1.0}] if side == "sell" else [],
            "triggerType": "PRICE",
            "triggerValue": str(price),
            "direction": "MORE_THAN" if side == "buy" else "LESS_THAN"
        }
        return self.post("/positions", position_data)
    
    def cancel_order(self, order_id: str) -> dict:
        """
        Cancel an order.
        
        Args:
            order_id: Order ID to cancel
            
        Returns:
            Cancellation result as JSON
        """
        return self.delete(f"/orders/{order_id}", {"clientId": self.client_id})
    
    def open_position(self, position_data: dict) -> dict:
        """
        Open a new position (pair/basket trade).
        
        Args:
            position_data: Position parameters including long/short baskets
            
        Returns:
            Position result as JSON
        """
        position_data["clientId"] = self.client_id
        return self.post("/positions", position_data)
    
    def close_position(self, position_id: str) -> dict:
        """
        Close a position.
        
        Args:
            position_id: Position ID to close
            
        Returns:
            Close result as JSON
        """
        return self.delete(f"/positions/{position_id}", {"clientId": self.client_id})
    
    def get_positions(self) -> dict:
        """
        Get all open positions.
        
        Returns:
            List of positions as JSON
        """
        return self.get("/positions", {"clientId": self.client_id})
    
    # =========================================================================
    # PAIR CREATION (for PeRatio integration)
    # =========================================================================
    
    def create_pair_trade(
        self,
        long_assets: list[dict],
        short_assets: list[dict],
        size_usd: float = 25.0,
        leverage: int = 2,
        execution_type: str = "MARKET",
        stop_loss_percent: float = 8.0,
        take_profit_percent: float = 20.0,
        slippage: float = 0.08
    ) -> dict:
        """
        Create a pair trade with long and short baskets.
        
        Args:
            long_assets: List of {"coin": "BTC", "weight": 0.5} dicts
            short_assets: List of {"coin": "ETH", "weight": 0.5} dicts
            size_usd: Position size in USD
            leverage: Leverage multiplier
            execution_type: MARKET, TWAP, TRIGGER, or LADDER
            stop_loss_percent: Stop loss percentage
            take_profit_percent: Take profit percentage
            slippage: Slippage tolerance
            
        Returns:
            Trade result as JSON
        """
        # Convert from {"coin": "BTC", "weight": 0.5} to {"asset": "BTC", "weight": 0.5}
        long_formatted = [{"asset": a.get("coin", a.get("asset")), "weight": a["weight"]} for a in long_assets]
        short_formatted = [{"asset": a.get("coin", a.get("asset")), "weight": a["weight"]} for a in short_assets]
        
        payload = {
            "longAssets": long_formatted,
            "shortAssets": short_formatted,
            "executionType": execution_type,
            "slippage": slippage,
            "leverage": leverage,
            "usdValue": size_usd,
            "stopLoss": {
                "type": "PERCENTAGE",
                "value": stop_loss_percent
            },
            "takeProfit": {
                "type": "PERCENTAGE",
                "value": take_profit_percent
            }
            # Note: clientId is NOT included - auth is via Bearer token
        }
        
        logger.info(f"Creating pair trade: {json.dumps(payload, indent=2)}")
        return self.post("/positions", payload)
    
    # =========================================================================
    # UTILITY METHODS
    # =========================================================================
    
    def get_config_json(self) -> str:
        """
        Get current configuration as JSON string.
        
        Returns:
            JSON string of current config
        """
        config_output = {
            "api_url": self.api_url,
            "client_id": self.client_id,
            "agent_wallet": self.agent_wallet,
            "user_wallet": self.user_wallet,
            "has_access_token": bool(self.access_token),
            "approval_status": self.config.get("approvalStatus", {})
        }
        return json.dumps(config_output, indent=2)
    
    def to_json(self, data: Any) -> str:
        """
        Convert any data to JSON string.
        
        Args:
            data: Data to convert
            
        Returns:
            JSON string
        """
        return json.dumps(data, indent=2, default=str)


def create_pear_client(access_token: Optional[str] = None) -> PearApiClient:
    """
    Factory function to create a PearApiClient instance.
    
    Args:
        access_token: Optional access token
        
    Returns:
        Configured PearApiClient instance
    """
    return PearApiClient(access_token=access_token)


# =============================================================================
# TESTING
# =============================================================================

if __name__ == "__main__":
    # Test the client
    client = create_pear_client()
    
    print("\n" + "="*60)
    print("PEAR API CLIENT - Configuration")
    print("="*60)
    print(client.get_config_json())
    
    # Test agent wallet endpoint
    print("\n" + "="*60)
    print("Testing Agent Wallet Endpoint")
    print("="*60)
    result = client.get_agent_wallet()
    print(client.to_json(result))
