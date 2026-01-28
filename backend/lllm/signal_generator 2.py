"""
Signal Generator - LLM + Pear Protocol Integration
===================================================
Generates trading signals using LLM and outputs them as JSON
ready for execution via Pear Protocol API.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional, Any
from pathlib import Path

from pair_output import PairOutputGenerator
from pear_api_client import create_pear_client
from prompts import EXAMPLE_MARKET_DATA
from lllm_config import CONFIDENCE_THRESHOLD

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# MOCK SIGNAL - For testing when OpenAI quota is exceeded
# SIMPLE PAIR TRADE - Single asset per side
# =============================================================================

MOCK_LLM_SIGNAL = {
    "trade_type": "PAIR",
    "basket_category": "L1_VS_L2",
    "long_basket": [
        {"coin": "BTC", "weight": 1.0}
    ],
    "short_basket": [
        {"coin": "ARB", "weight": 1.0}
    ],
    "pair_ratio": {
        "entry_ratio": 1.25,
        "target_ratio": 1.40,
        "stop_ratio": 1.15,
        "ratio_explanation": "BTC / ARB"
    },
    "confidence": 7.0,
    "thesis": "BTC showing strong momentum with institutional interest. ARB seeing reduced activity post-Dencun upgrade.",
    "position_sizing": {
        "recommended_sl_percent": 8,   # Dynamic: 3-15%
        "recommended_tp_percent": 15,  # Dynamic: 5-30%
        "risk_reward_ratio": 1.88      # 15/8 = 1.88:1
    },
    "factor_analysis": {
        "momentum_divergence": 7,
        "sector_rotation_signal": 7,
        "macro_alignment": 7,
        "volatility_match": 7,
        "correlation_quality": 7,
        "funding_favorability": 7,
        "overall_confluence": 7
    },
    "execution_recommendation": "MARKET",
    "weighting_method": "equal",
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "model": "mock-gpt-4o-mini"
}


class SignalGenerator:
    """
    Generates trading signals using LLM analysis and outputs
    them as structured JSON for Pear Protocol execution.
    
    Flow:
    1. Collect market data (or use provided data)
    2. Generate LLM signal with basket recommendations
    3. Validate signal
    4. Convert to Pear Protocol format
    5. Output as JSON
    """
    
    def __init__(self, use_live_data: bool = False, use_mock: bool = False):
        """
        Initialize the signal generator.
        
        Args:
            use_live_data: If True, fetches live market data. If False, uses sample data.
            use_mock: If True, uses mock LLM response (for testing without API).
        """
        self.use_mock = use_mock
        self.llm_engine = None
        self.data_collector = None
        
        # Only initialize LLM engine if not using mock
        if not use_mock:
            try:
                from llm_engine import LLMEngine
                self.llm_engine = LLMEngine()
                logger.info(f"✅ LLMEngine initialized successfully - use_mock will be FALSE")
            except Exception as e:
                logger.error(f"❌ Could not initialize LLM engine: {e}")
                logger.error(f"   Exception type: {type(e).__name__}")
                import traceback
                logger.error(f"   Traceback: {traceback.format_exc()}")
                logger.warning("⚠️ Using mock mode instead")
                self.use_mock = True
        
        self.pair_generator = PairOutputGenerator()
        self.use_live_data = use_live_data
        
        if use_live_data and not use_mock:
            try:
                from data_collector import MarketDataCollector
                self.data_collector = MarketDataCollector()
                logger.info("Signal generator initialized with LIVE data")
            except Exception as e:
                logger.warning(f"Could not initialize live data collector: {e}")
                logger.warning("Falling back to sample data")
                self.data_collector = None
                self.use_live_data = False
        else:
            self.data_collector = None
            mode = "MOCK" if use_mock else "SAMPLE"
            logger.info(f"Signal generator initialized with {mode} data")
    
    def generate_signal(self, market_data: Optional[dict] = None) -> dict:
        """
        Generate a trading signal from market data.
        
        Args:
            market_data: Optional market data dict. If None, collects automatically.
            
        Returns:
            LLM signal dict with basket recommendations
        """
        logger.info(f"[SignalGenerator] generate_signal called - use_mock={self.use_mock}, llm_engine={self.llm_engine is not None}")
        
        # Use mock if enabled
        if self.use_mock:
            logger.info("Generating MOCK signal (LLM API bypassed)...")
            signal = MOCK_LLM_SIGNAL.copy()
            signal["generated_at"] = datetime.now(timezone.utc).isoformat()
            signal["validation"] = {"is_valid": True, "errors": []}
            signal["meets_threshold"] = signal.get("confidence", 0) >= CONFIDENCE_THRESHOLD
            return signal
        
        # Get market data
        if market_data is None:
            market_data = self._get_market_data()
        
        # Generate signal via LLM
        logger.info(f"[SignalGenerator] 🚀 Calling LLM engine to generate signal...")
        signal = self.llm_engine.generate_signal(market_data)
        logger.info(f"[SignalGenerator] ✅ LLM signal received: {signal.get('basket_category', 'N/A')}")
        
        # Validate
        is_valid, errors = self.llm_engine.validate_signal(signal)
        signal["validation"] = {
            "is_valid": is_valid,
            "errors": errors
        }
        
        # Check trading threshold
        signal["meets_threshold"] = self.llm_engine.should_trade(signal)
        
        return signal
    
    def signal_to_pair_json(self, signal: dict) -> dict:
        """
        Convert an LLM signal to Pear Protocol pair format.
        
        Args:
            signal: LLM signal dict
            
        Returns:
            Pear Protocol pair format dict
        """
        # Extract baskets
        long_assets = [item["coin"] for item in signal.get("long_basket", [])]
        short_assets = [item["coin"] for item in signal.get("short_basket", [])]
        
        # Get position sizing
        pos_sizing = signal.get("position_sizing", {})
        
        # Create pair using pair generator (this preserves LLM weights)
        pair = {
            "pair_id": self._generate_pair_id(signal),
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "source": "llm_signal",
            "model": signal.get("model", "unknown"),
            "basket_category": signal.get("basket_category", "UNKNOWN"),
            "confidence": signal.get("confidence", 0),
            "meets_threshold": signal.get("meets_threshold", False),
            "thesis": signal.get("thesis", ""),
            "long": {
                "assets": signal.get("long_basket", []),
                "symbols": long_assets,
                "total_weight": sum(item.get("weight", 0) for item in signal.get("long_basket", []))
            },
            "short": {
                "assets": signal.get("short_basket", []),
                "symbols": short_assets,
                "total_weight": sum(item.get("weight", 0) for item in signal.get("short_basket", []))
            },
            "weighting_method": signal.get("weighting_method", "equal"),
            "execution": {
                "type": signal.get("execution_recommendation", "MARKET"),
                "slippage": self._calculate_slippage(long_assets + short_assets),
                "stop_loss_percent": pos_sizing.get("recommended_sl_percent", 8.0),
                "take_profit_percent": pos_sizing.get("recommended_tp_percent", 20.0),
                "risk_reward_ratio": pos_sizing.get("risk_reward_ratio", 2.5)
            },
            "factor_analysis": signal.get("factor_analysis", {}),
            "pear_protocol": {
                "api_url": self.pair_generator.pear_client.api_url,
                "client_id": self.pair_generator.pear_client.client_id,
                "agent_wallet": self.pair_generator.pear_client.agent_wallet
            },
            "validation": signal.get("validation", {}),
            "generated_at": signal.get("generated_at", "")
        }
        
        return pair
    
    def generate_and_output(self, market_data: Optional[dict] = None) -> dict:
        """
        Full pipeline: generate signal and output as pair JSON.
        
        Args:
            market_data: Optional market data
            
        Returns:
            Pair JSON ready for Pear Protocol
        """
        signal = self.generate_signal(market_data)
        pair = self.signal_to_pair_json(signal)
        return pair
    
    def generate_and_save(
        self, 
        market_data: Optional[dict] = None,
        filename: str = "signal_output.json"
    ) -> tuple[dict, str]:
        """
        Generate signal, convert to pair, and save to file.
        
        Args:
            market_data: Optional market data
            filename: Output filename
            
        Returns:
            Tuple of (pair_dict, file_path)
        """
        pair = self.generate_and_output(market_data)
        
        output_path = Path(__file__).parent / filename
        with open(output_path, 'w') as f:
            json.dump(pair, f, indent=2, default=str)
        
        logger.info(f"Signal saved to: {output_path}")
        return pair, str(output_path)
    
    def generate_batch(
        self,
        market_data_list: list[dict],
        save: bool = True,
        filename: str = "signals_batch.json"
    ) -> dict:
        """
        Generate multiple signals from different market data snapshots.
        
        Args:
            market_data_list: List of market data dicts
            save: Whether to save output
            filename: Output filename
            
        Returns:
            Batch output dict
        """
        pairs = []
        
        for i, market_data in enumerate(market_data_list):
            logger.info(f"Generating signal {i+1}/{len(market_data_list)}...")
            try:
                pair = self.generate_and_output(market_data)
                pairs.append(pair)
            except Exception as e:
                logger.error(f"Failed to generate signal {i+1}: {e}")
                pairs.append({
                    "error": str(e),
                    "index": i
                })
        
        batch = {
            "batch_id": f"batch_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "total_signals": len(pairs),
            "valid_signals": len([p for p in pairs if "error" not in p and p.get("validation", {}).get("is_valid", False)]),
            "tradeable_signals": len([p for p in pairs if p.get("meets_threshold", False)]),
            "pairs": pairs
        }
        
        if save:
            output_path = Path(__file__).parent / filename
            with open(output_path, 'w') as f:
                json.dump(batch, f, indent=2, default=str)
            logger.info(f"Batch saved to: {output_path}")
        
        return batch
    
    def send_to_pear(self, pair: dict, execute: bool = False) -> dict:
        """
        Send a generated pair to Pear Protocol.
        
        Args:
            pair: Pair dict from signal_to_pair_json
            execute: If True, actually executes the trade. If False, just validates.
            
        Returns:
            Pear Protocol response
        """
        if not pair.get("meets_threshold", False):
            return {
                "success": False,
                "error": "Signal does not meet confidence threshold",
                "pair_id": pair.get("pair_id"),
                "confidence": pair.get("confidence"),
                "threshold": CONFIDENCE_THRESHOLD
            }
        
        if not pair.get("validation", {}).get("is_valid", False):
            return {
                "success": False,
                "error": "Signal failed validation",
                "pair_id": pair.get("pair_id"),
                "validation_errors": pair.get("validation", {}).get("errors", [])
            }
        
        if not execute:
            return {
                "success": True,
                "status": "dry_run",
                "message": "Trade validated but not executed (execute=False)",
                "pair_id": pair.get("pair_id"),
                "would_execute": {
                    "long": pair["long"]["symbols"],
                    "short": pair["short"]["symbols"],
                    "execution_type": pair["execution"]["type"]
                }
            }
        
        # Actually execute via Pear Protocol
        result = self.pair_generator.pear_client.create_pair_trade(
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
            "executed": True,
            "pear_response": result
        }
    
    def _get_market_data(self) -> dict:
        """Get market data from collector or use sample data."""
        if self.use_live_data and self.data_collector:
            try:
                return self.data_collector.collect_all()
            except Exception as e:
                logger.warning(f"Failed to get live data: {e}")
                logger.warning("Using sample data instead")
        
        return EXAMPLE_MARKET_DATA
    
    def _generate_pair_id(self, signal: dict) -> str:
        """Generate a unique pair ID from signal."""
        long_assets = [item["coin"] for item in signal.get("long_basket", [])]
        short_assets = [item["coin"] for item in signal.get("short_basket", [])]
        
        long_str = "-".join(sorted(long_assets)[:3])
        short_str = "-".join(sorted(short_assets)[:3])
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        
        return f"SIG_{long_str}_vs_{short_str}_{timestamp}"
    
    def _calculate_slippage(self, assets: list[str]) -> float:
        """Calculate slippage based on asset types."""
        from lllm_config import CRYPTO_ASSETS, METAL_ASSETS, STOCK_ASSETS
        
        has_crypto = any(a in CRYPTO_ASSETS for a in assets)
        has_metals = any(a in METAL_ASSETS for a in assets)
        has_stocks = any(a in STOCK_ASSETS for a in assets)
        
        if sum([has_crypto, has_metals, has_stocks]) > 1:
            return 0.015
        if has_metals:
            return 0.02
        if has_stocks:
            return 0.02
        return 0.01
    
    def get_signal_summary(self, signal: dict) -> str:
        """Get formatted signal summary."""
        if self.use_mock or self.llm_engine is None:
            # Generate summary manually for mock mode
            long_basket = signal.get("long_basket", [])
            short_basket = signal.get("short_basket", [])
            
            long_str = " + ".join([f"{a['coin']} ({a['weight']*100:.0f}%)" for a in long_basket])
            short_str = " + ".join([f"{a['coin']} ({a['weight']*100:.0f}%)" for a in short_basket])
            
            pos = signal.get("position_sizing", {})
            factors = signal.get("factor_analysis", {})
            
            summary = f"""
╔══════════════════════════════════════════════════════════════╗
║                    RATIO BOT SIGNAL                          ║
╠══════════════════════════════════════════════════════════════╣
║ Category: {signal.get('basket_category', 'UNKNOWN'):<48} ║
║ Confidence: {signal.get('confidence', 0)}/10                                          ║
╠══════════════════════════════════════════════════════════════╣
║ LONG:  {long_str:<53} ║
║ SHORT: {short_str:<53} ║
╠══════════════════════════════════════════════════════════════╣
║ Stop Loss: {pos.get('recommended_sl_percent', 0)}%    Take Profit: {pos.get('recommended_tp_percent', 0)}%    R:R {pos.get('risk_reward_ratio', 0):.1f}:1 ║
╠══════════════════════════════════════════════════════════════╣
║ Thesis: {signal.get('thesis', 'N/A')[:52]:<52} ║
╠══════════════════════════════════════════════════════════════╣
║ Factors:                                                     ║
║   Momentum: {factors.get('momentum_divergence', 0)}/10  Sector: {factors.get('sector_rotation_signal', 0)}/10  Macro: {factors.get('macro_alignment', 0)}/10  ║
║   Vol Match: {factors.get('volatility_match', 0)}/10  Corr: {factors.get('correlation_quality', 0)}/10  Overall: {factors.get('overall_confluence', 0)}/10 ║
╠══════════════════════════════════════════════════════════════╣
║ Execution: {signal.get('execution_recommendation', 'MARKET'):<10}  Weighting: {signal.get('weighting_method', 'equal'):<20} ║
╚══════════════════════════════════════════════════════════════╝
"""
            return summary
        return self.llm_engine.format_signal_summary(signal)


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def generate_signal_json(market_data: Optional[dict] = None) -> str:
    """
    Generate a trading signal and return as JSON string.
    
    Args:
        market_data: Optional market data
        
    Returns:
        JSON string of the signal pair
    """
    generator = SignalGenerator(use_live_data=False)
    pair = generator.generate_and_output(market_data)
    return json.dumps(pair, indent=2)


def quick_signal() -> dict:
    """
    Generate a quick signal using sample data.
    
    Returns:
        Signal pair dict
    """
    generator = SignalGenerator(use_live_data=False)
    return generator.generate_and_output()


# =============================================================================
# MAIN - Demo
# =============================================================================

if __name__ == "__main__":
    import sys
    
    # Check for --mock flag or use mock by default to avoid API quota issues
    use_mock = "--mock" in sys.argv or "--live" not in sys.argv
    
    print("\n" + "="*70)
    print("SIGNAL GENERATOR - LLM + Pear Protocol Integration")
    print("="*70)
    
    if use_mock:
        print("\n⚠️  Running in MOCK mode (use --live for real LLM calls)")
    
    # Initialize
    generator = SignalGenerator(use_live_data=False, use_mock=use_mock)
    
    print("\n📊 Using sample market data...")
    print("🤖 Generating signal...")
    
    # Generate signal
    signal = generator.generate_signal()
    
    # Print summary
    print("\n" + generator.get_signal_summary(signal))
    
    # Convert to pair format
    print("\n📝 Converting to Pear Protocol format...")
    pair = generator.signal_to_pair_json(signal)
    
    # Show JSON output
    print("\n" + "="*70)
    print("JSON OUTPUT:")
    print("="*70)
    print(json.dumps(pair, indent=2))
    
    # Save to file
    print("\n💾 Saving to file...")
    _, filepath = generator.generate_and_save(filename="signal_output.json")
    print(f"✅ Saved to: {filepath}")
    
    # Test dry run send
    print("\n🔍 Testing dry-run send to Pear...")
    send_result = generator.send_to_pear(pair, execute=False)
    print(json.dumps(send_result, indent=2))
    
    print("\n" + "="*70)
    print("✅ Signal generation complete!")
    print("="*70)
