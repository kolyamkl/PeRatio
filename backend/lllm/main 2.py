"""
RATIO Bot Main Entry Point
==========================
Orchestrates the 4-hour trading cycle.

Usage:
    python main.py              # Run continuous bot
    python main.py --once       # Run single cycle
    python main.py --dry-run    # Run without executing trades
"""

import argparse
import logging
import time
import sys
from datetime import datetime
import schedule

from lllm_config import (
    CYCLE_HOURS,
    CONFIDENCE_THRESHOLD,
    validate_config,
)
from data_collector import MarketDataCollector
from llm_engine import LLMEngine
from basket_builder import BasketBuilder
from risk_manager import RiskManager
from executor import PearProtocolExecutor, execute_signal
from monitor import TradeMonitor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("logs/ratio_bot.log", mode="a"),
    ]
)
logger = logging.getLogger(__name__)


class RatioBot:
    """
    Main RATIO Bot class that orchestrates the trading system.
    
    Components:
    - Data Collector: Fetches market data from APIs
    - LLM Engine: Generates trading signals
    - Basket Builder: Constructs weighted baskets
    - Risk Manager: Calculates position sizing
    - Executor: Executes trades on Pear Protocol
    - Monitor: Tracks P&L and performance
    """
    
    def __init__(self, dry_run: bool = False):
        """
        Initialize the RATIO Bot.
        
        Args:
            dry_run: If True, generate signals but don't execute trades
        """
        self.dry_run = dry_run
        
        logger.info("=" * 60)
        logger.info("RATIO BOT STARTING")
        logger.info("=" * 60)
        
        # Validate configuration
        is_valid, errors = validate_config()
        if not is_valid:
            logger.error("Configuration errors:")
            for error in errors:
                logger.error(f"  - {error}")
            raise ValueError("Invalid configuration")
        
        # Initialize components
        logger.info("Initializing components...")
        
        self.data_collector = MarketDataCollector()
        self.llm_engine = LLMEngine()
        self.basket_builder = BasketBuilder()
        self.risk_manager = RiskManager()
        self.executor = PearProtocolExecutor()
        self.monitor = TradeMonitor()
        
        logger.info(f"Dry run mode: {self.dry_run}")
        logger.info("RATIO Bot initialized successfully")
    
    def run_cycle(self) -> dict:
        """
        Execute one complete trading cycle.
        
        Flow:
        1. Collect market data
        2. Generate LLM signal
        3. Validate signal
        4. Calculate position size
        5. Execute trade (if not dry run)
        6. Log results
        
        Returns:
            Cycle result dict
        """
        cycle_start = datetime.utcnow()
        logger.info("=" * 60)
        logger.info(f"STARTING CYCLE at {cycle_start.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        logger.info("=" * 60)
        
        result = {
            "timestamp": cycle_start.isoformat(),
            "status": "pending",
            "signal": None,
            "position": None,
            "execution": None,
            "error": None,
        }
        
        try:
            # Step 1: Collect market data
            logger.info("Step 1: Collecting market data...")
            market_data = self.data_collector.collect_market_data()
            logger.info(f"  Collected {len(market_data)} data points")
            
            # Step 2: Generate LLM signal
            logger.info("Step 2: Generating LLM signal...")
            signal = self.llm_engine.generate_signal(market_data)
            result["signal"] = signal
            
            # Step 3: Validate signal
            logger.info("Step 3: Validating signal...")
            is_valid, errors = self.llm_engine.validate_signal(signal)
            
            if not is_valid:
                logger.warning(f"Signal validation failed: {errors}")
                result["status"] = "invalid_signal"
                result["error"] = f"Validation errors: {errors}"
                return result
            
            # Step 4: Check confidence threshold
            logger.info("Step 4: Checking confidence threshold...")
            confidence = signal.get("confidence", 0)
            
            if not self.llm_engine.should_trade(signal):
                logger.info(f"Signal skipped: confidence {confidence} < {CONFIDENCE_THRESHOLD}")
                result["status"] = "below_threshold"
                return result
            
            # Step 5: Calculate position size
            logger.info("Step 5: Calculating position size...")
            
            # Extract volatilities from market data
            volatilities = self._extract_volatilities(market_data)
            
            # Get current open positions
            open_positions = self.executor.get_open_positions()
            num_open = len(open_positions) if isinstance(open_positions, list) else 0
            
            position = self.risk_manager.calculate_position_size(
                confidence=confidence,
                long_basket=signal.get("long_basket", []),
                short_basket=signal.get("short_basket", []),
                volatilities=volatilities,
                open_positions=num_open,
                sl_percent=signal.get("position_sizing", {}).get("recommended_sl_percent", 5),
            )
            result["position"] = position
            
            if position["status"] == "rejected":
                logger.warning(f"Position rejected: {position.get('rejection_reason')}")
                result["status"] = "position_rejected"
                result["error"] = position.get("rejection_reason")
                return result
            
            # Step 6: Execute trade
            logger.info("Step 6: Executing trade...")
            
            if self.dry_run:
                logger.info("DRY RUN - Skipping actual execution")
                execution_result = {
                    "status": "dry_run",
                    "trade_id": f"DRY_{int(time.time())}",
                    "entry_ratio": 0,
                    "sl_ratio": 0,
                    "tp_ratio": 0,
                }
            else:
                execution_result = execute_signal(signal, dry_run=False)
            
            result["execution"] = execution_result
            
            if execution_result.get("status") in ["open", "dry_run"]:
                result["status"] = "success"
                
                # Step 7: Log trade
                logger.info("Step 7: Logging trade...")
                self.monitor.log_trade(signal, position, execution_result)
            else:
                result["status"] = "execution_failed"
                result["error"] = execution_result.get("error", "Unknown execution error")
            
            # Print summary
            logger.info("")
            logger.info(self.llm_engine.format_signal_summary(signal))
            
        except Exception as e:
            logger.exception(f"Cycle failed with error: {e}")
            result["status"] = "error"
            result["error"] = str(e)
        
        # Cycle complete
        cycle_end = datetime.utcnow()
        duration = (cycle_end - cycle_start).total_seconds()
        
        logger.info("=" * 60)
        logger.info(f"CYCLE COMPLETE - Status: {result['status']}")
        logger.info(f"Duration: {duration:.1f} seconds")
        logger.info("=" * 60)
        
        return result
    
    def _extract_volatilities(self, market_data: dict) -> dict:
        """Extract volatility values from market data."""
        volatilities = {}
        
        from lllm_config import ALL_ASSETS, VOLATILITY_BASELINES
        
        for asset in ALL_ASSETS:
            key = f"{asset.lower()}_vol"
            if key in market_data:
                volatilities[asset] = market_data[key]
            else:
                # Use default
                asset_class = self._get_asset_class(asset)
                volatilities[asset] = VOLATILITY_BASELINES.get(asset_class, 3.0)
        
        return volatilities
    
    def _get_asset_class(self, symbol: str) -> str:
        """Get asset class for a symbol."""
        from lllm_config import CRYPTO_ASSETS, METAL_ASSETS, STOCK_ASSETS
        
        if symbol in CRYPTO_ASSETS:
            return "CRYPTO"
        elif symbol in METAL_ASSETS:
            return "METALS"
        elif symbol in STOCK_ASSETS:
            return "STOCKS"
        return "UNKNOWN"
    
    def run_scheduled(self):
        """
        Run the bot on a schedule (every 4 hours).
        """
        logger.info("Starting scheduled mode...")
        logger.info(f"Cycle hours (UTC): {CYCLE_HOURS}")
        
        # Schedule cycles at specified hours
        for hour in CYCLE_HOURS:
            schedule.every().day.at(f"{hour:02d}:00").do(self.run_cycle)
        
        logger.info("Schedule set. Waiting for next cycle...")
        logger.info("Press Ctrl+C to stop")
        
        # Run immediately for first cycle
        self.run_cycle()
        
        # Keep running
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    def get_status(self) -> dict:
        """
        Get current bot status.
        
        Returns:
            Status dict with performance and open positions
        """
        performance = self.monitor.calculate_performance()
        open_positions = self.executor.get_open_positions()
        risk_summary = self.risk_manager.get_risk_summary(open_positions)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "dry_run": self.dry_run,
            "performance": performance,
            "risk": risk_summary,
            "open_positions": len(open_positions) if isinstance(open_positions, list) else 0,
        }


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="RATIO Bot - Multi-Asset Pair Trading")
    parser.add_argument("--once", action="store_true", help="Run single cycle and exit")
    parser.add_argument("--dry-run", action="store_true", help="Don't execute real trades")
    parser.add_argument("--status", action="store_true", help="Show current status and exit")
    
    args = parser.parse_args()
    
    # Ensure logs directory exists
    import os
    if not os.path.exists("logs"):
        os.makedirs("logs")
    
    try:
        bot = RatioBot(dry_run=args.dry_run)
        
        if args.status:
            status = bot.get_status()
            import json
            print(json.dumps(status, indent=2))
            return
        
        if args.once:
            result = bot.run_cycle()
            print(f"\nCycle result: {result['status']}")
        else:
            bot.run_scheduled()
            
    except KeyboardInterrupt:
        logger.info("\nBot stopped by user")
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

