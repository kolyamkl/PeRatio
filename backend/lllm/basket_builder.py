"""
RATIO Bot Basket Builder
========================
Constructs and validates multi-asset trading baskets with various weighting methods.
"""

import logging
from typing import Optional
import numpy as np

from lllm_config import (
    CRYPTO_ASSETS,
    METAL_ASSETS,
    STOCK_ASSETS,
    ALL_ASSETS,
    MAX_ASSETS_PER_SIDE,
    MIN_WEIGHT_PER_ASSET,
    VOLATILITY_BASELINES,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BasketBuilder:
    """
    Builder for multi-asset trading baskets.
    
    Supports:
    - Equal weighting
    - Volatility-weighted (inverse vol, risk parity style)
    - Conviction-weighted (based on signal strength)
    - Market cap weighted
    """
    
    ASSET_CLASSES = {
        "CRYPTO": CRYPTO_ASSETS,
        "METALS": METAL_ASSETS,
        "STOCKS": STOCK_ASSETS,
    }
    
    def __init__(self):
        self.max_assets = MAX_ASSETS_PER_SIDE
        self.min_weight = MIN_WEIGHT_PER_ASSET
        
        logger.info("BasketBuilder initialized")
    
    def create_basket(
        self,
        assets: list[str],
        weighting: str = "equal",
        volatilities: Optional[dict] = None,
        convictions: Optional[dict] = None,
        market_caps: Optional[dict] = None,
    ) -> list[dict]:
        """
        Create a weighted basket of assets.
        
        Args:
            assets: List of asset symbols
            weighting: Weighting method ("equal", "volatility", "conviction", "market_cap")
            volatilities: Dict mapping symbols to volatility values (for vol weighting)
            convictions: Dict mapping symbols to conviction scores (for conviction weighting)
            market_caps: Dict mapping symbols to market cap values (for cap weighting)
            
        Returns:
            List of dicts with "coin" and "weight" keys
        """
        if not assets:
            logger.error("Cannot create basket: no assets provided")
            return []
        
        if len(assets) > self.max_assets:
            logger.warning(f"Trimming basket from {len(assets)} to {self.max_assets} assets")
            assets = assets[:self.max_assets]
        
        # Calculate weights based on method
        if weighting == "equal":
            weights = self._equal_weight(assets)
        elif weighting == "volatility":
            weights = self._volatility_weight(assets, volatilities)
        elif weighting == "conviction":
            weights = self._conviction_weight(assets, convictions)
        elif weighting == "market_cap":
            weights = self._market_cap_weight(assets, market_caps)
        else:
            logger.warning(f"Unknown weighting method: {weighting}, using equal")
            weights = self._equal_weight(assets)
        
        # Build basket
        basket = []
        for asset, weight in zip(assets, weights):
            basket.append({
                "coin": asset,
                "weight": round(weight, 4)
            })
        
        return basket
    
    def _equal_weight(self, assets: list[str]) -> list[float]:
        """Equal weight allocation."""
        n = len(assets)
        return [1.0 / n] * n
    
    def _volatility_weight(
        self,
        assets: list[str],
        volatilities: Optional[dict] = None
    ) -> list[float]:
        """
        Inverse volatility weighting (risk parity style).
        Lower volatility = higher weight.
        """
        if not volatilities:
            # Use default volatilities based on asset class
            volatilities = {}
            for asset in assets:
                asset_class = self._get_asset_class(asset)
                volatilities[asset] = VOLATILITY_BASELINES.get(asset_class, 3.0)
        
        # Get volatilities for assets
        vols = [volatilities.get(asset, 3.0) for asset in assets]
        
        # Inverse volatility
        inv_vols = [1.0 / max(v, 0.1) for v in vols]
        
        # Normalize to sum to 1.0
        total = sum(inv_vols)
        weights = [iv / total for iv in inv_vols]
        
        # Ensure minimum weight
        weights = self._enforce_min_weight(weights)
        
        return weights
    
    def _conviction_weight(
        self,
        assets: list[str],
        convictions: Optional[dict] = None
    ) -> list[float]:
        """
        Conviction weighting based on signal strength.
        Higher conviction = higher weight.
        """
        if not convictions:
            # Default to equal if no convictions provided
            return self._equal_weight(assets)
        
        # Get conviction scores
        scores = [convictions.get(asset, 5.0) for asset in assets]
        
        # Normalize to sum to 1.0
        total = sum(scores)
        if total <= 0:
            return self._equal_weight(assets)
        
        weights = [s / total for s in scores]
        
        # Ensure minimum weight
        weights = self._enforce_min_weight(weights)
        
        return weights
    
    def _market_cap_weight(
        self,
        assets: list[str],
        market_caps: Optional[dict] = None
    ) -> list[float]:
        """
        Market cap weighting.
        Larger market cap = higher weight.
        """
        if not market_caps:
            # Use rough estimates for major assets
            default_caps = {
                "BTC": 800, "ETH": 300, "SOL": 50, "XRP": 30, "DOGE": 20,
                "AVAX": 15, "LINK": 10, "MATIC": 8, "ARB": 5, "OP": 4,
                "XAU": 500, "XAG": 30, "XPT": 5, "XPD": 5, "HG": 10,
                "AAPL": 3000, "MSFT": 2800, "NVDA": 1200, "GOOGL": 1800,
                "AMZN": 1600, "META": 800, "TSLA": 700, "AMD": 200,
            }
            market_caps = default_caps
        
        # Get market caps
        caps = [market_caps.get(asset, 10) for asset in assets]
        
        # Normalize to sum to 1.0
        total = sum(caps)
        weights = [c / total for c in caps]
        
        # Ensure minimum weight
        weights = self._enforce_min_weight(weights)
        
        return weights
    
    def _enforce_min_weight(self, weights: list[float]) -> list[float]:
        """
        Ensure all weights meet minimum threshold.
        Redistributes from higher weights if needed.
        """
        n = len(weights)
        
        # Check if minimum weight is achievable
        if n * self.min_weight > 1.0:
            # Too many assets for min weight, use equal
            return [1.0 / n] * n
        
        # Identify assets below minimum
        below_min = [i for i, w in enumerate(weights) if w < self.min_weight]
        
        if not below_min:
            return weights
        
        # Calculate total weight to redistribute
        deficit = sum(self.min_weight - weights[i] for i in below_min)
        
        # Set below-minimum weights to minimum
        new_weights = weights.copy()
        for i in below_min:
            new_weights[i] = self.min_weight
        
        # Reduce above-minimum weights proportionally
        above_min = [i for i in range(n) if i not in below_min]
        above_total = sum(new_weights[i] for i in above_min)
        
        if above_total > deficit:
            factor = (above_total - deficit) / above_total
            for i in above_min:
                new_weights[i] *= factor
        
        # Normalize to ensure sum is 1.0
        total = sum(new_weights)
        new_weights = [w / total for w in new_weights]
        
        return new_weights
    
    def _get_asset_class(self, symbol: str) -> str:
        """Get the asset class for a symbol."""
        for asset_class, symbols in self.ASSET_CLASSES.items():
            if symbol in symbols:
                return asset_class
        return "UNKNOWN"
    
    def validate_basket(self, basket: list[dict]) -> tuple[bool, list[str]]:
        """
        Validate a basket configuration.
        
        Args:
            basket: List of dicts with "coin" and "weight" keys
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        if not basket:
            errors.append("Basket is empty")
            return False, errors
        
        if len(basket) > self.max_assets:
            errors.append(f"Basket has {len(basket)} assets (max {self.max_assets})")
        
        # Check weights sum to 1.0
        total_weight = sum(item.get("weight", 0) for item in basket)
        if abs(total_weight - 1.0) > 0.01:
            errors.append(f"Weights sum to {total_weight:.4f}, not 1.0")
        
        # Check individual assets
        for item in basket:
            coin = item.get("coin")
            weight = item.get("weight", 0)
            
            if not coin:
                errors.append("Basket item missing 'coin' field")
            elif coin not in ALL_ASSETS:
                errors.append(f"Invalid symbol: {coin}")
            
            if weight <= 0:
                errors.append(f"Invalid weight for {coin}: {weight}")
            elif weight < self.min_weight:
                errors.append(f"Weight for {coin} ({weight:.2%}) below minimum ({self.min_weight:.2%})")
        
        return len(errors) == 0, errors
    
    def get_basket_type(
        self,
        long_basket: list[dict],
        short_basket: list[dict]
    ) -> str:
        """
        Classify the basket pair type.
        
        Args:
            long_basket: Long side assets
            short_basket: Short side assets
            
        Returns:
            Basket category string
        """
        long_classes = set(self._get_asset_class(a["coin"]) for a in long_basket)
        short_classes = set(self._get_asset_class(a["coin"]) for a in short_basket)
        
        if long_classes == {"METALS"} and short_classes == {"CRYPTO"}:
            return "METALS_VS_CRYPTO"
        elif long_classes == {"CRYPTO"} and short_classes == {"METALS"}:
            return "CRYPTO_VS_METALS"
        elif long_classes == {"STOCKS"} and short_classes == {"CRYPTO"}:
            return "STOCKS_VS_CRYPTO"
        elif long_classes == {"CRYPTO"} and short_classes == {"STOCKS"}:
            return "CRYPTO_VS_STOCKS"
        elif long_classes == {"METALS"} and short_classes == {"STOCKS"}:
            return "METALS_VS_STOCKS"
        elif long_classes == {"STOCKS"} and short_classes == {"METALS"}:
            return "STOCKS_VS_METALS"
        elif long_classes == short_classes == {"CRYPTO"}:
            return "CRYPTO_VS_CRYPTO"
        elif long_classes == short_classes == {"METALS"}:
            return "METALS_VS_METALS"
        elif long_classes == short_classes == {"STOCKS"}:
            return "STOCKS_VS_STOCKS"
        else:
            return "MIXED_BASKET"
    
    def suggest_baskets(
        self,
        market_data: dict,
        strategy: str = "risk_off"
    ) -> tuple[list[dict], list[dict]]:
        """
        Suggest long and short baskets based on strategy.
        
        Args:
            market_data: Current market data
            strategy: Trading strategy type
            
        Returns:
            Tuple of (long_basket, short_basket)
        """
        if strategy == "risk_off":
            # Long metals, short crypto
            long_assets = ["XAU", "XAG", "XPT"]
            short_assets = ["BTC", "ETH", "SOL"]
            
        elif strategy == "risk_on":
            # Long crypto, short metals
            long_assets = ["BTC", "ETH", "SOL"]
            short_assets = ["XAU", "XAG"]
            
        elif strategy == "tech_vs_crypto":
            # Long tech stocks, short crypto
            long_assets = ["NVDA", "TSLA", "AMD"]
            short_assets = ["SOL", "AVAX"]
            
        elif strategy == "gold_silver_ratio":
            # Gold/Silver ratio trade
            long_assets = ["XAU"]
            short_assets = ["XAG"]
            
        elif strategy == "l1_rotation":
            # Layer 1 rotation
            long_assets = ["BTC", "ETH"]
            short_assets = ["SOL", "AVAX"]
            
        else:
            # Default: balanced crypto
            long_assets = ["BTC", "ETH"]
            short_assets = ["DOGE", "XRP"]
        
        # Build baskets with volatility weighting
        volatilities = self._extract_volatilities(market_data)
        
        long_basket = self.create_basket(long_assets, "volatility", volatilities)
        short_basket = self.create_basket(short_assets, "volatility", volatilities)
        
        return long_basket, short_basket
    
    def _extract_volatilities(self, market_data: dict) -> dict:
        """Extract volatility values from market data."""
        volatilities = {}
        
        for asset in ALL_ASSETS:
            key = f"{asset.lower()}_vol"
            if key in market_data:
                volatilities[asset] = market_data[key]
            else:
                # Use default based on asset class
                asset_class = self._get_asset_class(asset)
                volatilities[asset] = VOLATILITY_BASELINES.get(asset_class, 3.0)
        
        return volatilities


# =============================================================================
# TESTING
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("RATIO BOT - BASKET BUILDER TEST")
    print("=" * 60)
    
    builder = BasketBuilder()
    
    # Test equal weighting
    print("\n--- Equal Weighting ---")
    basket = builder.create_basket(["BTC", "ETH", "SOL"], "equal")
    print(f"Basket: {basket}")
    
    # Test volatility weighting
    print("\n--- Volatility Weighting ---")
    vols = {"BTC": 3.0, "ETH": 4.0, "SOL": 7.0}
    basket = builder.create_basket(["BTC", "ETH", "SOL"], "volatility", vols)
    print(f"Volatilities: {vols}")
    print(f"Basket: {basket}")
    
    # Test mixed basket
    print("\n--- Mixed Basket (Metals + Crypto) ---")
    vols = {"XAU": 0.8, "XAG": 1.5, "BTC": 3.0}
    basket = builder.create_basket(["XAU", "XAG", "BTC"], "volatility", vols)
    print(f"Basket: {basket}")
    
    # Test validation
    print("\n--- Basket Validation ---")
    
    valid_basket = [{"coin": "XAU", "weight": 0.5}, {"coin": "XAG", "weight": 0.5}]
    is_valid, errors = builder.validate_basket(valid_basket)
    print(f"Valid basket: valid={is_valid}, errors={errors}")
    
    invalid_basket = [{"coin": "XAU", "weight": 0.3}, {"coin": "XAG", "weight": 0.3}]
    is_valid, errors = builder.validate_basket(invalid_basket)
    print(f"Invalid basket (bad weights): valid={is_valid}, errors={errors}")
    
    # Test basket type classification
    print("\n--- Basket Type Classification ---")
    
    long_metals = [{"coin": "XAU", "weight": 0.5}, {"coin": "XAG", "weight": 0.5}]
    short_crypto = [{"coin": "BTC", "weight": 0.5}, {"coin": "ETH", "weight": 0.5}]
    
    basket_type = builder.get_basket_type(long_metals, short_crypto)
    print(f"Long Metals / Short Crypto: {basket_type}")
    
    basket_type = builder.get_basket_type(short_crypto, long_metals)
    print(f"Long Crypto / Short Metals: {basket_type}")
    
    # Test strategy suggestions
    print("\n--- Strategy-Based Basket Suggestions ---")
    
    mock_data = {"btc_vol": 3.0, "eth_vol": 4.0, "sol_vol": 7.0, "xau_vol": 0.8, "xag_vol": 1.5}
    
    for strategy in ["risk_off", "risk_on", "gold_silver_ratio"]:
        long_b, short_b = builder.suggest_baskets(mock_data, strategy)
        print(f"\n{strategy}:")
        print(f"  Long: {[a['coin'] for a in long_b]}")
        print(f"  Short: {[a['coin'] for a in short_b]}")

