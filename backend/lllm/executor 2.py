"""
RATIO Bot Executor
==================
Handles trade execution via Pear Protocol API.
Supports basket trades with multiple assets per side.
"""

import logging
import time
from typing import Optional
import requests

from lllm_config import (
    PEAR_API_BASE_URL,
    PEAR_API_KEY,
    DEFAULT_SLIPPAGE_CRYPTO,
    DEFAULT_SLIPPAGE_METALS,
    DEFAULT_SLIPPAGE_STOCKS,
    DEFAULT_SLIPPAGE_MIXED,
    DEFAULT_TWAP_DURATION,
    DEFAULT_TWAP_INTERVAL,
    CRYPTO_ASSETS,
    METAL_ASSETS,
    STOCK_ASSETS,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PearProtocolExecutor:
    """
    Executor for Pear Protocol API.
    
    Pear Protocol enables:
    - Synchronized long/short execution
    - Ratio-based TP/SL
    - MARKET, TWAP, TRIGGER, LADDER execution types
    - Multi-asset basket trades
    
    API Reference: https://docs.pearprotocol.io/api-integration/api-specification/positions
    """
    
    BASE_URL = PEAR_API_BASE_URL
    
    # Asset class mapping
    ASSET_CLASSES = {
        "CRYPTO": CRYPTO_ASSETS,
        "METALS": METAL_ASSETS,
        "STOCKS": STOCK_ASSETS,
    }
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Pear Protocol executor.
        
        Args:
            api_key: Pear Protocol API key. If None, uses PEAR_API_KEY from config.
        """
        self.api_key = api_key or PEAR_API_KEY
        
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
        })
        
        if not self.api_key:
            logger.warning("Pear Protocol API key not set - trades will fail")
        else:
            logger.info("Pear Protocol executor initialized")
    
    def _post(self, endpoint: str, payload: dict) -> dict:
        """
        Make a POST request to Pear Protocol API.
        
        Args:
            endpoint: API endpoint (without base URL)
            payload: Request body
            
        Returns:
            Response JSON
        """
        url = f"{self.BASE_URL}/{endpoint}"
        
        try:
            logger.debug(f"POST {url}")
            logger.debug(f"Payload: {payload}")
            
            response = self.session.post(url, json=payload, timeout=60)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error: {e}")
            logger.error(f"Response: {e.response.text if e.response else 'No response'}")
            return {"error": str(e), "status": "failed"}
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {e}")
            return {"error": str(e), "status": "failed"}
    
    def _get(self, endpoint: str, params: dict = None) -> dict:
        """
        Make a GET request to Pear Protocol API.
        
        Args:
            endpoint: API endpoint
            params: Query parameters
            
        Returns:
            Response JSON
        """
        url = f"{self.BASE_URL}/{endpoint}"
        
        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {e}")
            return {"error": str(e)}
    
    def _delete(self, endpoint: str) -> dict:
        """
        Make a DELETE request to Pear Protocol API.
        
        Args:
            endpoint: API endpoint
            
        Returns:
            Response JSON
        """
        url = f"{self.BASE_URL}/{endpoint}"
        
        try:
            response = self.session.delete(url, timeout=30)
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {e}")
            return {"error": str(e)}
    
    def _get_asset_class(self, symbol: str) -> str:
        """Get the asset class for a symbol."""
        for asset_class, symbols in self.ASSET_CLASSES.items():
            if symbol in symbols:
                return asset_class
        return "UNKNOWN"
    
    def _calculate_slippage(self, assets: list) -> float:
        """
        Calculate appropriate slippage based on asset types.
        
        Args:
            assets: List of asset dicts with "coin" keys
            
        Returns:
            Slippage as decimal (e.g., 0.01 for 1%)
        """
        has_crypto = any(a["coin"] in CRYPTO_ASSETS for a in assets)
        has_metals = any(a["coin"] in METAL_ASSETS for a in assets)
        has_stocks = any(a["coin"] in STOCK_ASSETS for a in assets)
        
        # Mixed baskets need higher slippage
        if (has_crypto and has_metals) or (has_crypto and has_stocks) or (has_metals and has_stocks):
            return DEFAULT_SLIPPAGE_MIXED
        
        if has_metals:
            return DEFAULT_SLIPPAGE_METALS
        
        if has_stocks:
            return DEFAULT_SLIPPAGE_STOCKS
        
        return DEFAULT_SLIPPAGE_CRYPTO
    
    def open_basket_trade(
        self,
        long_basket: list[dict],
        short_basket: list[dict],
        execution_type: str = "MARKET",
        sl_percent: float = 8.0,
        tp_percent: float = 20.0,
        slippage: Optional[float] = None,
        twap_duration: Optional[int] = None,
        twap_interval: Optional[int] = None,
    ) -> dict:
        """
        Open a basket pair trade.
        
        Args:
            long_basket: List of dicts with "coin" and "weight" keys
                        e.g., [{"coin": "XAU", "weight": 0.5}, {"coin": "XAG", "weight": 0.5}]
            short_basket: List of dicts with "coin" and "weight" keys
            execution_type: "MARKET", "TWAP", "TRIGGER", or "LADDER"
            sl_percent: Stop loss percentage (on ratio)
            tp_percent: Take profit percentage (on ratio)
            slippage: Slippage tolerance (auto-calculated if None)
            twap_duration: TWAP duration in minutes (for TWAP orders)
            twap_interval: TWAP interval in seconds (for TWAP orders)
            
        Returns:
            Trade result dict with trade_id, status, entry details
        """
        logger.info(f"Opening basket trade: {execution_type}")
        logger.info(f"  Long: {[a['coin'] for a in long_basket]}")
        logger.info(f"  Short: {[a['coin'] for a in short_basket]}")
        
        # Validate baskets
        if not self._validate_basket(long_basket):
            return {"error": "Invalid long basket", "status": "failed"}
        
        if not self._validate_basket(short_basket):
            return {"error": "Invalid short basket", "status": "failed"}
        
        # Calculate slippage if not provided
        all_assets = long_basket + short_basket
        slippage = slippage or self._calculate_slippage(all_assets)
        
        # Build payload
        payload = {
            "long": long_basket,
            "short": short_basket,
            "executionType": execution_type,
            "slippage": slippage,
            "stopLoss": {
                "type": "PERCENTAGE",
                "value": sl_percent
            },
            "takeProfit": {
                "type": "PERCENTAGE",
                "value": tp_percent
            }
        }
        
        # Add TWAP parameters if needed
        if execution_type == "TWAP":
            payload["twapDuration"] = twap_duration or DEFAULT_TWAP_DURATION
            payload["twapIntervalSeconds"] = twap_interval or DEFAULT_TWAP_INTERVAL
        
        # Execute trade
        result = self._post("positions", payload)
        
        if "error" not in result:
            logger.info(f"Trade opened successfully")
            logger.info(f"  Trade ID: {result.get('trade_id', 'N/A')}")
            logger.info(f"  Status: {result.get('status', 'N/A')}")
        else:
            logger.error(f"Trade failed: {result.get('error')}")
        
        return result
    
    def open_single_pair_trade(
        self,
        long_asset: str,
        short_asset: str,
        execution_type: str = "MARKET",
        sl_percent: float = 5.0,
        tp_percent: float = 12.0,
    ) -> dict:
        """
        Open a simple 1v1 pair trade.
        
        Args:
            long_asset: Symbol to go long
            short_asset: Symbol to go short
            execution_type: "MARKET" or "TWAP"
            sl_percent: Stop loss percentage
            tp_percent: Take profit percentage
            
        Returns:
            Trade result dict
        """
        long_basket = [{"coin": long_asset, "weight": 1.0}]
        short_basket = [{"coin": short_asset, "weight": 1.0}]
        
        return self.open_basket_trade(
            long_basket=long_basket,
            short_basket=short_basket,
            execution_type=execution_type,
            sl_percent=sl_percent,
            tp_percent=tp_percent,
        )
    
    def _validate_basket(self, basket: list) -> bool:
        """
        Validate a basket configuration.
        
        Args:
            basket: List of asset dicts
            
        Returns:
            True if valid, False otherwise
        """
        if not basket:
            logger.error("Basket is empty")
            return False
        
        if len(basket) > 5:
            logger.error(f"Basket has {len(basket)} assets (max 5)")
            return False
        
        # Check weights sum to 1.0
        total_weight = sum(a.get("weight", 0) for a in basket)
        if abs(total_weight - 1.0) > 0.01:
            logger.error(f"Basket weights sum to {total_weight:.2f}, not 1.0")
            return False
        
        # Check all symbols are valid
        all_valid_symbols = CRYPTO_ASSETS + METAL_ASSETS + STOCK_ASSETS
        for asset in basket:
            if asset.get("coin") not in all_valid_symbols:
                logger.error(f"Invalid symbol: {asset.get('coin')}")
                return False
            
            if not 0 < asset.get("weight", 0) <= 1:
                logger.error(f"Invalid weight for {asset.get('coin')}: {asset.get('weight')}")
                return False
        
        return True
    
    def get_open_positions(self) -> list:
        """
        Get all open positions.
        
        Returns:
            List of position dicts
        """
        logger.info("Fetching open positions...")
        
        result = self._get("positions")
        
        if isinstance(result, list):
            logger.info(f"Found {len(result)} open positions")
            return result
        
        if "error" in result:
            logger.error(f"Failed to get positions: {result.get('error')}")
            return []
        
        return result.get("positions", [])
    
    def close_position(self, position_id: str, execution_type: str = "MARKET") -> dict:
        """
        Close a specific position.
        
        Args:
            position_id: The position/trade ID to close
            execution_type: How to close ("MARKET" or "TWAP")
            
        Returns:
            Close result dict
        """
        logger.info(f"Closing position: {position_id}")
        
        endpoint = f"positions/{position_id}/close"
        
        # For MARKET close, use DELETE
        if execution_type == "MARKET":
            result = self._delete(endpoint)
        else:
            # For TWAP close, POST with execution params
            result = self._post(endpoint, {
                "executionType": execution_type,
                "twapDuration": DEFAULT_TWAP_DURATION,
            })
        
        if "error" not in result:
            logger.info(f"Position closed successfully")
        else:
            logger.error(f"Failed to close position: {result.get('error')}")
        
        return result
    
    def close_all_positions(self) -> dict:
        """
        Close all open positions.
        
        Returns:
            Close result dict
        """
        logger.info("Closing all positions...")
        
        result = self._delete("positions/close-all")
        
        if "error" not in result:
            logger.info("All positions closed")
        else:
            logger.error(f"Failed to close all positions: {result.get('error')}")
        
        return result
    
    def get_trade_history(self, limit: int = 50) -> list:
        """
        Get trade history.
        
        Args:
            limit: Maximum number of trades to return
            
        Returns:
            List of historical trade dicts
        """
        logger.info("Fetching trade history...")
        
        result = self._get("trade-history", params={"limit": limit})
        
        if isinstance(result, list):
            logger.info(f"Found {len(result)} historical trades")
            return result
        
        return result.get("trades", [])
    
    def get_market_overview(self, base_assets: list[str]) -> dict:
        """
        Get market overview for specified base assets.
        
        Args:
            base_assets: List of asset symbols
            
        Returns:
            Market overview dict with ratios, volumes, etc.
        """
        logger.info(f"Fetching market overview for: {base_assets}")
        
        result = self._post("market-overview", {"baseAssets": base_assets})
        
        return result
    
    def get_available_markets(self) -> list:
        """
        Get list of all available markets.
        
        Returns:
            List of available market symbols
        """
        logger.info("Fetching available markets...")
        
        result = self._get("market")
        
        if isinstance(result, list):
            return result
        
        return result.get("markets", [])


def execute_signal(signal: dict, dry_run: bool = True) -> dict:
    """
    Execute a trading signal via Pear Protocol.
    
    Args:
        signal: Validated signal from LLM engine
        dry_run: If True, log but don't execute
        
    Returns:
        Execution result dict
    """
    logger.info("Executing trading signal...")
    
    long_basket = signal.get("long_basket", [])
    short_basket = signal.get("short_basket", [])
    execution_type = signal.get("execution_recommendation", "MARKET")
    
    pos_sizing = signal.get("position_sizing", {})
    sl_percent = pos_sizing.get("recommended_sl_percent", 8)
    tp_percent = pos_sizing.get("recommended_tp_percent", 20)
    
    logger.info(f"Signal details:")
    logger.info(f"  Category: {signal.get('basket_category')}")
    logger.info(f"  Long: {[a['coin'] for a in long_basket]}")
    logger.info(f"  Short: {[a['coin'] for a in short_basket]}")
    logger.info(f"  Execution: {execution_type}")
    logger.info(f"  SL: {sl_percent}%  TP: {tp_percent}%")
    
    if dry_run:
        logger.info("DRY RUN - Trade not executed")
        return {
            "status": "dry_run",
            "trade_id": f"DRY_RUN_{int(time.time())}",
            "long_basket": long_basket,
            "short_basket": short_basket,
            "sl_percent": sl_percent,
            "tp_percent": tp_percent,
        }
    
    # Execute real trade
    executor = PearProtocolExecutor()
    
    result = executor.open_basket_trade(
        long_basket=long_basket,
        short_basket=short_basket,
        execution_type=execution_type,
        sl_percent=sl_percent,
        tp_percent=tp_percent,
    )
    
    return result


# =============================================================================
# TESTING
# =============================================================================

if __name__ == "__main__":
    import json
    
    print("=" * 60)
    print("RATIO BOT - EXECUTOR TEST")
    print("=" * 60)
    
    executor = PearProtocolExecutor()
    
    # Test basket validation
    print("\n--- Testing Basket Validation ---")
    
    valid_basket = [
        {"coin": "XAU", "weight": 0.5},
        {"coin": "XAG", "weight": 0.5},
    ]
    print(f"Valid basket: {executor._validate_basket(valid_basket)}")
    
    invalid_basket = [
        {"coin": "XAU", "weight": 0.5},
        {"coin": "XAG", "weight": 0.3},  # Doesn't sum to 1.0
    ]
    print(f"Invalid basket (bad weights): {executor._validate_basket(invalid_basket)}")
    
    # Test slippage calculation
    print("\n--- Testing Slippage Calculation ---")
    
    crypto_only = [{"coin": "BTC", "weight": 0.5}, {"coin": "ETH", "weight": 0.5}]
    print(f"Crypto only: {executor._calculate_slippage(crypto_only)}")
    
    metals_only = [{"coin": "XAU", "weight": 0.5}, {"coin": "XAG", "weight": 0.5}]
    print(f"Metals only: {executor._calculate_slippage(metals_only)}")
    
    mixed = [{"coin": "XAU", "weight": 0.5}, {"coin": "BTC", "weight": 0.5}]
    print(f"Mixed (crypto+metal): {executor._calculate_slippage(mixed)}")
    
    # Test example trade (dry run)
    print("\n--- Testing Trade Execution (Dry Run) ---")
    
    example_signal = {
        "basket_category": "METALS_VS_CRYPTO",
        "long_basket": [
            {"coin": "XAU", "weight": 0.50},
            {"coin": "XAG", "weight": 0.50},
        ],
        "short_basket": [
            {"coin": "BTC", "weight": 0.50},
            {"coin": "ETH", "weight": 0.50},
        ],
        "execution_recommendation": "MARKET",
        "position_sizing": {
            "recommended_sl_percent": 8,
            "recommended_tp_percent": 20,
        }
    }
    
    result = execute_signal(example_signal, dry_run=True)
    print(f"Dry run result: {json.dumps(result, indent=2)}")
    
    # Show example payload
    print("\n--- Example Pear Protocol Payload ---")
    payload = {
        "long": example_signal["long_basket"],
        "short": example_signal["short_basket"],
        "executionType": "MARKET",
        "slippage": 0.015,
        "stopLoss": {"type": "PERCENTAGE", "value": 8},
        "takeProfit": {"type": "PERCENTAGE", "value": 20}
    }
    print(json.dumps(payload, indent=2))

