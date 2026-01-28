"""
Pair Output Module
==================
Creates trading pairs from PeRatio baskets and outputs them as JSON
for integration with external applications.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional, Any
from pathlib import Path

from pear_api_client import PearApiClient, create_pear_client
from basket_builder import BasketBuilder
from lllm_config import (
    CRYPTO_ASSETS,
    METAL_ASSETS,
    STOCK_ASSETS,
    MAX_ASSETS_PER_SIDE,
    CONFIDENCE_THRESHOLD,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PairOutputGenerator:
    """
    Generates trading pairs and outputs them as JSON.
    
    This class bridges PeRatio's basket building with Pear Protocol API,
    creating structured JSON output for external applications.
    """
    
    def __init__(self, access_token: Optional[str] = None):
        """
        Initialize the pair output generator.
        
        Args:
            access_token: Pear Protocol access token
        """
        self.pear_client = create_pear_client(access_token)
        self.basket_builder = BasketBuilder()
        
        logger.info("PairOutputGenerator initialized")
    
    def create_pair(
        self,
        long_assets: list[str],
        short_assets: list[str],
        weighting: str = "equal",
        volatilities: Optional[dict] = None,
        convictions: Optional[dict] = None,
        confidence: float = 7.0,
        rationale: str = "",
        metadata: Optional[dict] = None
    ) -> dict:
        """
        Create a trading pair with long and short baskets.
        
        Args:
            long_assets: List of asset symbols to go long
            short_assets: List of asset symbols to go short
            weighting: Weighting method (equal, volatility, conviction)
            volatilities: Volatility data for vol weighting
            convictions: Conviction scores for conviction weighting
            confidence: Confidence score (0-10)
            rationale: Trading rationale/reasoning
            metadata: Additional metadata
            
        Returns:
            Structured pair as JSON-compatible dict
        """
        # Build baskets
        long_basket = self.basket_builder.create_basket(
            assets=long_assets,
            weighting=weighting,
            volatilities=volatilities,
            convictions=convictions
        )
        
        short_basket = self.basket_builder.create_basket(
            assets=short_assets,
            weighting=weighting,
            volatilities=volatilities,
            convictions=convictions
        )
        
        # Classify asset types
        long_classes = self._classify_assets(long_assets)
        short_classes = self._classify_assets(short_assets)
        
        # Generate pair ID
        pair_id = self._generate_pair_id(long_assets, short_assets)
        
        # Build output structure
        pair_output = {
            "pair_id": pair_id,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "confidence": confidence,
            "meets_threshold": confidence >= CONFIDENCE_THRESHOLD,
            "rationale": rationale,
            "long": {
                "assets": long_basket,
                "symbols": long_assets,
                "asset_classes": long_classes,
                "total_weight": sum(a["weight"] for a in long_basket)
            },
            "short": {
                "assets": short_basket,
                "symbols": short_assets,
                "asset_classes": short_classes,
                "total_weight": sum(a["weight"] for a in short_basket)
            },
            "weighting_method": weighting,
            "execution": {
                "type": "MARKET",
                "slippage": self._calculate_slippage(long_assets + short_assets),
                "stop_loss_percent": 8.0,
                "take_profit_percent": 20.0
            },
            "pear_protocol": {
                "api_url": self.pear_client.api_url,
                "client_id": self.pear_client.client_id,
                "agent_wallet": self.pear_client.agent_wallet
            },
            "metadata": metadata or {}
        }
        
        return pair_output
    
    def create_pair_json(self, **kwargs) -> str:
        """
        Create a trading pair and return as JSON string.
        
        Args:
            **kwargs: Same arguments as create_pair()
            
        Returns:
            JSON string of the pair
        """
        pair = self.create_pair(**kwargs)
        return json.dumps(pair, indent=2)
    
    def create_pairs_batch(self, pairs_config: list[dict]) -> dict:
        """
        Create multiple pairs in a batch.
        
        Args:
            pairs_config: List of pair configurations
            
        Returns:
            Batch output with all pairs as JSON-compatible dict
        """
        pairs = []
        
        for config in pairs_config:
            try:
                pair = self.create_pair(
                    long_assets=config.get("long_assets", []),
                    short_assets=config.get("short_assets", []),
                    weighting=config.get("weighting", "equal"),
                    volatilities=config.get("volatilities"),
                    convictions=config.get("convictions"),
                    confidence=config.get("confidence", 5.0),
                    rationale=config.get("rationale", ""),
                    metadata=config.get("metadata")
                )
                pairs.append(pair)
            except Exception as e:
                logger.error(f"Failed to create pair: {e}")
                pairs.append({
                    "error": str(e),
                    "config": config
                })
        
        batch_output = {
            "batch_id": f"batch_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "total_pairs": len(pairs),
            "valid_pairs": len([p for p in pairs if "error" not in p]),
            "pairs": pairs
        }
        
        return batch_output
    
    def create_pairs_batch_json(self, pairs_config: list[dict]) -> str:
        """
        Create multiple pairs and return as JSON string.
        
        Args:
            pairs_config: List of pair configurations
            
        Returns:
            JSON string of the batch
        """
        batch = self.create_pairs_batch(pairs_config)
        return json.dumps(batch, indent=2)
    
    def send_pair_to_pear(self, pair: dict) -> dict:
        """
        Send a pair to Pear Protocol for execution.
        
        Args:
            pair: Pair dict from create_pair()
            
        Returns:
            Execution result from Pear Protocol as JSON-compatible dict
        """
        if not pair.get("meets_threshold", False):
            return {
                "success": False,
                "error": "Pair does not meet confidence threshold",
                "pair_id": pair.get("pair_id"),
                "confidence": pair.get("confidence"),
                "threshold": CONFIDENCE_THRESHOLD
            }
        
        result = self.pear_client.create_pair_trade(
            long_assets=pair["long"]["assets"],
            short_assets=pair["short"]["assets"],
            execution_type=pair["execution"]["type"],
            stop_loss_percent=pair["execution"]["stop_loss_percent"],
            take_profit_percent=pair["execution"]["take_profit_percent"],
            slippage=pair["execution"]["slippage"]
        )
        
        return {
            "pair_id": pair.get("pair_id"),
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "pear_response": result
        }
    
    def save_to_file(self, data: Any, filename: str = "pairs_output.json") -> str:
        """
        Save data to a JSON file.
        
        Args:
            data: Data to save
            filename: Output filename
            
        Returns:
            Path to saved file
        """
        output_path = Path(__file__).parent / filename
        
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        
        logger.info(f"Saved output to: {output_path}")
        return str(output_path)
    
    def _classify_assets(self, assets: list[str]) -> dict:
        """Classify assets by their class (CRYPTO, METALS, STOCKS)."""
        classes = {"CRYPTO": [], "METALS": [], "STOCKS": [], "UNKNOWN": []}
        
        for asset in assets:
            if asset in CRYPTO_ASSETS:
                classes["CRYPTO"].append(asset)
            elif asset in METAL_ASSETS:
                classes["METALS"].append(asset)
            elif asset in STOCK_ASSETS:
                classes["STOCKS"].append(asset)
            else:
                classes["UNKNOWN"].append(asset)
        
        # Remove empty classes
        return {k: v for k, v in classes.items() if v}
    
    def _calculate_slippage(self, assets: list[str]) -> float:
        """Calculate appropriate slippage based on asset types."""
        has_crypto = any(a in CRYPTO_ASSETS for a in assets)
        has_metals = any(a in METAL_ASSETS for a in assets)
        has_stocks = any(a in STOCK_ASSETS for a in assets)
        
        # Mixed baskets need higher slippage
        mixed = sum([has_crypto, has_metals, has_stocks]) > 1
        if mixed:
            return 0.015  # 1.5%
        
        if has_metals:
            return 0.02  # 2%
        if has_stocks:
            return 0.02  # 2%
        
        return 0.01  # 1% for crypto
    
    def _generate_pair_id(self, long_assets: list[str], short_assets: list[str]) -> str:
        """Generate a unique pair ID."""
        long_str = "-".join(sorted(long_assets)[:3])
        short_str = "-".join(sorted(short_assets)[:3])
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        return f"PAIR_{long_str}_vs_{short_str}_{timestamp}"
    
    def get_api_config_json(self) -> str:
        """Get current Pear API configuration as JSON."""
        return self.pear_client.get_config_json()


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def create_simple_pair(
    long_asset: str,
    short_asset: str,
    confidence: float = 7.0,
    rationale: str = ""
) -> str:
    """
    Quick function to create a simple 1v1 pair as JSON.
    
    Args:
        long_asset: Asset to go long
        short_asset: Asset to go short
        confidence: Confidence score
        rationale: Trading rationale
        
    Returns:
        JSON string of the pair
    """
    generator = PairOutputGenerator()
    return generator.create_pair_json(
        long_assets=[long_asset],
        short_assets=[short_asset],
        confidence=confidence,
        rationale=rationale
    )


def create_basket_pair(
    long_assets: list[str],
    short_assets: list[str],
    weighting: str = "equal",
    confidence: float = 7.0,
    rationale: str = ""
) -> str:
    """
    Quick function to create a basket pair as JSON.
    
    Args:
        long_assets: List of assets to go long
        short_assets: List of assets to go short
        weighting: Weighting method
        confidence: Confidence score
        rationale: Trading rationale
        
    Returns:
        JSON string of the pair
    """
    generator = PairOutputGenerator()
    return generator.create_pair_json(
        long_assets=long_assets,
        short_assets=short_assets,
        weighting=weighting,
        confidence=confidence,
        rationale=rationale
    )


# =============================================================================
# TESTING / DEMO
# =============================================================================

if __name__ == "__main__":
    print("\n" + "="*70)
    print("PAIR OUTPUT GENERATOR - Demo")
    print("="*70)
    
    # Create generator
    generator = PairOutputGenerator()
    
    # Show API config
    print("\n📋 Pear Protocol Configuration:")
    print(generator.get_api_config_json())
    
    # Example 1: Simple crypto pair
    print("\n" + "="*70)
    print("Example 1: Simple BTC vs ETH Pair")
    print("="*70)
    
    simple_pair = create_simple_pair(
        long_asset="BTC",
        short_asset="ETH",
        confidence=7.5,
        rationale="BTC showing relative strength vs ETH on momentum divergence"
    )
    print(simple_pair)
    
    # Example 2: Multi-asset basket pair
    print("\n" + "="*70)
    print("Example 2: Gold/Silver vs Crypto Basket")
    print("="*70)
    
    basket_pair = create_basket_pair(
        long_assets=["XAU", "XAG"],
        short_assets=["BTC", "ETH", "SOL"],
        weighting="equal",
        confidence=8.0,
        rationale="Risk-off environment favoring precious metals over crypto"
    )
    print(basket_pair)
    
    # Example 3: Batch creation
    print("\n" + "="*70)
    print("Example 3: Batch Pair Creation")
    print("="*70)
    
    batch_config = [
        {
            "long_assets": ["NVDA", "AMD"],
            "short_assets": ["AAPL", "MSFT"],
            "confidence": 6.5,
            "rationale": "AI chip makers vs traditional tech"
        },
        {
            "long_assets": ["SOL", "AVAX"],
            "short_assets": ["ETH"],
            "confidence": 5.5,
            "rationale": "Alt L1s gaining on Ethereum"
        }
    ]
    
    batch_json = generator.create_pairs_batch_json(batch_config)
    print(batch_json)
    
    # Save output to file
    print("\n" + "="*70)
    print("Saving Output")
    print("="*70)
    
    all_pairs = generator.create_pairs_batch(batch_config)
    output_path = generator.save_to_file(all_pairs, "pairs_output.json")
    print(f"✓ Saved to: {output_path}")
