"""
RATIO Bot Risk Manager
======================
Handles position sizing and risk management with cross-asset volatility adjustment.
"""

import logging
from typing import Optional

from lllm_config import (
    ACCOUNT_BALANCE,
    RISK_PER_TRADE,
    MAX_POSITIONS,
    MAX_LEVERAGE,
    CRYPTO_ASSETS,
    METAL_ASSETS,
    STOCK_ASSETS,
    VOLATILITY_BASELINES,
    MIN_SL_PERCENT,
    MAX_SL_PERCENT,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RiskManager:
    """
    Risk Manager for position sizing and risk control.
    
    Features:
    - Confidence-based position sizing
    - Cross-asset volatility adjustment
    - Position limits enforcement
    - Leverage controls
    """
    
    # Asset class mapping
    ASSET_CLASSES = {
        "CRYPTO": CRYPTO_ASSETS,
        "METALS": METAL_ASSETS,
        "STOCKS": STOCK_ASSETS,
    }
    
    def __init__(
        self,
        account_balance: Optional[float] = None,
        risk_per_trade: Optional[float] = None,
        max_positions: Optional[int] = None,
        max_leverage: Optional[float] = None,
    ):
        """
        Initialize the Risk Manager.
        
        Args:
            account_balance: Total account balance in USD
            risk_per_trade: Fraction of account to risk per trade (e.g., 0.01 = 1%)
            max_positions: Maximum concurrent open positions
            max_leverage: Maximum allowed leverage
        """
        self.account_balance = account_balance or ACCOUNT_BALANCE
        self.risk_per_trade = risk_per_trade or RISK_PER_TRADE
        self.max_positions = max_positions or MAX_POSITIONS
        self.max_leverage = max_leverage or MAX_LEVERAGE
        
        logger.info(f"RiskManager initialized:")
        logger.info(f"  Account: ${self.account_balance:,.0f}")
        logger.info(f"  Risk per trade: {self.risk_per_trade:.1%}")
        logger.info(f"  Max positions: {self.max_positions}")
        logger.info(f"  Max leverage: {self.max_leverage}x")
    
    def calculate_position_size(
        self,
        confidence: float,
        long_basket: list[dict],
        short_basket: list[dict],
        volatilities: dict,
        open_positions: int = 0,
        sl_percent: float = 5.0,
    ) -> dict:
        """
        Calculate position size based on signal confidence and risk parameters.
        
        Args:
            confidence: Signal confidence score (0-10)
            long_basket: Long side assets
            short_basket: Short side assets
            volatilities: Dict mapping symbols to volatility percentages
            open_positions: Number of currently open positions
            sl_percent: Stop loss percentage
            
        Returns:
            Position sizing dict with status, size, risk amount, etc.
        """
        logger.info(f"Calculating position size (confidence: {confidence}/10)")
        
        # Check position limits
        if open_positions >= self.max_positions:
            logger.warning(f"Position limit reached ({open_positions}/{self.max_positions})")
            return {
                "status": "rejected",
                "rejection_reason": f"Position limit reached ({open_positions}/{self.max_positions})",
                "size_usd": 0,
                "risk_usd": 0,
            }
        
        # Base risk amount
        base_risk = self.account_balance * self.risk_per_trade
        logger.debug(f"Base risk: ${base_risk:.2f}")
        
        # Confidence multiplier (0-10 normalized to 0.5-1.0)
        # Even at confidence 5 (threshold), we still take 50% size
        confidence_mult = 0.5 + (confidence / 20.0)  # 5 -> 0.75, 10 -> 1.0
        logger.debug(f"Confidence multiplier: {confidence_mult:.2f}")
        
        # Calculate average basket volatility
        all_assets = [a["coin"] for a in long_basket + short_basket]
        avg_vol = self._calculate_basket_volatility(all_assets, volatilities)
        logger.debug(f"Average basket volatility: {avg_vol:.2f}%")
        
        # Volatility adjustment
        # For mixed crypto/metal baskets, normalize to crypto-equivalent risk
        vol_adjustment = self._calculate_vol_adjustment(long_basket, short_basket, volatilities)
        logger.debug(f"Volatility adjustment: {vol_adjustment:.2f}x")
        
        # Position penalty for open positions (reduce size as more positions open)
        position_penalty = 1.0 - (open_positions * 0.2)  # 20% reduction per open position
        position_penalty = max(position_penalty, 0.4)  # Minimum 40% of base size
        logger.debug(f"Position penalty: {position_penalty:.2f}")
        
        # Calculate final risk amount
        risk_usd = base_risk * confidence_mult * vol_adjustment * position_penalty
        logger.info(f"Calculated risk: ${risk_usd:.2f}")
        
        # Calculate position size from risk and stop loss
        sl_decimal = sl_percent / 100
        size_usd = risk_usd / sl_decimal
        logger.info(f"Position size: ${size_usd:.2f}")
        
        # Apply maximum position size limit (25% of account)
        max_size = self.account_balance * 0.25
        if size_usd > max_size:
            logger.warning(f"Position size capped from ${size_usd:.2f} to ${max_size:.2f}")
            size_usd = max_size
            risk_usd = size_usd * sl_decimal
        
        # Calculate leverage
        leverage = size_usd / (self.account_balance / 2)  # Assume 50% capital allocation
        leverage = min(leverage, self.max_leverage)
        
        # Check minimum risk threshold
        min_risk = 50  # $50 minimum risk
        if risk_usd < min_risk:
            logger.warning(f"Risk ${risk_usd:.2f} below minimum ${min_risk}")
            return {
                "status": "rejected",
                "rejection_reason": f"Risk amount ${risk_usd:.2f} below minimum ${min_risk}",
                "size_usd": 0,
                "risk_usd": 0,
            }
        
        # Calculate per-leg sizes
        long_size = size_usd / 2
        short_size = size_usd / 2
        
        return {
            "status": "approved",
            "size_usd": round(size_usd, 2),
            "long_size_usd": round(long_size, 2),
            "short_size_usd": round(short_size, 2),
            "risk_usd": round(risk_usd, 2),
            "leverage": round(leverage, 2),
            "vol_adjustment": round(vol_adjustment, 2),
            "confidence_used": confidence,
            "sl_percent_used": sl_percent,
        }
    
    def _calculate_basket_volatility(
        self,
        assets: list[str],
        volatilities: dict
    ) -> float:
        """Calculate weighted average volatility of assets."""
        vols = []
        for asset in assets:
            vol = volatilities.get(asset)
            if vol is None:
                # Use default based on asset class
                asset_class = self._get_asset_class(asset)
                vol = VOLATILITY_BASELINES.get(asset_class, 3.0)
            vols.append(vol)
        
        return sum(vols) / len(vols) if vols else 3.0
    
    def _calculate_vol_adjustment(
        self,
        long_basket: list[dict],
        short_basket: list[dict],
        volatilities: dict
    ) -> float:
        """
        Calculate volatility adjustment factor.
        
        For metal/crypto pairs, metals have much lower vol, so we increase size.
        For crypto-only, we may reduce size in high vol environments.
        """
        long_assets = [a["coin"] for a in long_basket]
        short_assets = [a["coin"] for a in short_basket]
        
        long_vol = self._calculate_basket_volatility(long_assets, volatilities)
        short_vol = self._calculate_basket_volatility(short_assets, volatilities)
        avg_vol = (long_vol + short_vol) / 2
        
        # Check if this is a cross-asset trade
        long_classes = set(self._get_asset_class(a) for a in long_assets)
        short_classes = set(self._get_asset_class(a) for a in short_assets)
        
        is_cross_asset = long_classes != short_classes
        
        if is_cross_asset:
            # For cross-asset trades, normalize to crypto-equivalent volatility
            # If trading metals vs crypto, metals side needs larger notional
            crypto_baseline = VOLATILITY_BASELINES["CRYPTO"]
            
            if avg_vol < crypto_baseline:
                # Low vol basket (e.g., metals) - increase size
                adjustment = min(crypto_baseline / avg_vol, 3.0)
            else:
                # High vol basket - reduce size
                adjustment = max(crypto_baseline / avg_vol, 0.5)
        else:
            # Same asset class - standard vol adjustment
            if avg_vol > 10:
                # Very high vol - reduce size
                adjustment = 0.6
            elif avg_vol > 7:
                # High vol - slight reduction
                adjustment = 0.8
            elif avg_vol < 2:
                # Low vol - slight increase
                adjustment = 1.2
            else:
                # Normal vol
                adjustment = 1.0
        
        return adjustment
    
    def _get_asset_class(self, symbol: str) -> str:
        """Get the asset class for a symbol."""
        for asset_class, symbols in self.ASSET_CLASSES.items():
            if symbol in symbols:
                return asset_class
        return "UNKNOWN"
    
    def validate_trade(
        self,
        signal: dict,
        open_positions: int = 0
    ) -> tuple[bool, str]:
        """
        Validate whether a trade should be allowed.
        
        Args:
            signal: Trading signal dict
            open_positions: Current number of open positions
            
        Returns:
            Tuple of (is_valid, reason)
        """
        # Check position limits
        if open_positions >= self.max_positions:
            return False, f"Position limit reached ({open_positions}/{self.max_positions})"
        
        # Check confidence
        confidence = signal.get("confidence", 0)
        if confidence < 5.0:
            return False, f"Confidence {confidence} below threshold 5.0"
        
        # Check SL/TP validity
        pos_sizing = signal.get("position_sizing", {})
        sl = pos_sizing.get("recommended_sl_percent", 0)
        tp = pos_sizing.get("recommended_tp_percent", 0)
        
        if not MIN_SL_PERCENT <= sl <= MAX_SL_PERCENT:
            return False, f"Invalid SL: {sl}% (must be {MIN_SL_PERCENT}-{MAX_SL_PERCENT}%)"
        
        if tp <= sl:
            return False, f"TP ({tp}%) must be greater than SL ({sl}%)"
        
        return True, "Trade validated"
    
    def get_risk_summary(self, open_positions: list = None) -> dict:
        """
        Get a summary of current risk exposure.
        
        Args:
            open_positions: List of open position dicts
            
        Returns:
            Risk summary dict
        """
        open_positions = open_positions or []
        
        total_exposure = sum(p.get("size_usd", 0) for p in open_positions)
        total_risk = sum(p.get("risk_usd", 0) for p in open_positions)
        
        return {
            "account_balance": self.account_balance,
            "total_exposure_usd": total_exposure,
            "total_risk_usd": total_risk,
            "exposure_percent": (total_exposure / self.account_balance) * 100 if self.account_balance > 0 else 0,
            "risk_percent": (total_risk / self.account_balance) * 100 if self.account_balance > 0 else 0,
            "open_positions": len(open_positions),
            "max_positions": self.max_positions,
            "positions_available": self.max_positions - len(open_positions),
        }


# =============================================================================
# TESTING
# =============================================================================

if __name__ == "__main__":
    import json
    
    print("=" * 60)
    print("RATIO BOT - RISK MANAGER TEST")
    print("=" * 60)
    
    rm = RiskManager(account_balance=20000)
    
    # Test position sizing for crypto-only trade
    print("\n--- Crypto vs Crypto Trade ---")
    
    long_basket = [{"coin": "BTC", "weight": 0.5}, {"coin": "ETH", "weight": 0.5}]
    short_basket = [{"coin": "SOL", "weight": 0.5}, {"coin": "AVAX", "weight": 0.5}]
    volatilities = {"BTC": 3.0, "ETH": 4.0, "SOL": 7.0, "AVAX": 8.0}
    
    result = rm.calculate_position_size(
        confidence=7.5,
        long_basket=long_basket,
        short_basket=short_basket,
        volatilities=volatilities,
        open_positions=0,
        sl_percent=5.0
    )
    print(f"Result: {json.dumps(result, indent=2)}")
    
    # Test position sizing for metals vs crypto trade
    print("\n--- Metals vs Crypto Trade ---")
    
    long_basket = [{"coin": "XAU", "weight": 0.6}, {"coin": "XAG", "weight": 0.4}]
    short_basket = [{"coin": "BTC", "weight": 0.5}, {"coin": "ETH", "weight": 0.5}]
    volatilities = {"XAU": 0.8, "XAG": 1.5, "BTC": 3.0, "ETH": 4.0}
    
    result = rm.calculate_position_size(
        confidence=8.0,
        long_basket=long_basket,
        short_basket=short_basket,
        volatilities=volatilities,
        open_positions=0,
        sl_percent=8.0
    )
    print(f"Result: {json.dumps(result, indent=2)}")
    
    # Test with existing positions
    print("\n--- With 2 Open Positions ---")
    
    result = rm.calculate_position_size(
        confidence=7.0,
        long_basket=long_basket,
        short_basket=short_basket,
        volatilities=volatilities,
        open_positions=2,
        sl_percent=5.0
    )
    print(f"Result: {json.dumps(result, indent=2)}")
    
    # Test position limit
    print("\n--- At Position Limit ---")
    
    result = rm.calculate_position_size(
        confidence=9.0,
        long_basket=long_basket,
        short_basket=short_basket,
        volatilities=volatilities,
        open_positions=3,  # At limit
        sl_percent=5.0
    )
    print(f"Result: {json.dumps(result, indent=2)}")
    
    # Test risk summary
    print("\n--- Risk Summary ---")
    
    mock_positions = [
        {"size_usd": 2500, "risk_usd": 125},
        {"size_usd": 2000, "risk_usd": 100},
    ]
    
    summary = rm.get_risk_summary(mock_positions)
    print(f"Summary: {json.dumps(summary, indent=2)}")

