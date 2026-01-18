#!/usr/bin/env python3
"""
LLLM Signal Service Runner
===========================
Runs the signal generator as a continuous service that generates
signals periodically and saves them to JSON files.

The backend FastAPI app reads these signals when users request trades.
"""

import os
import sys
import time
import logging
import argparse
from datetime import datetime, timezone
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)

def run_signal_generator(use_mock=False, interval_minutes=30):
    """
    Run signal generator in a loop.
    
    Args:
        use_mock: Use mock LLM instead of real OpenAI
        interval_minutes: Minutes between signal generations
    """
    from signal_generator import SignalGenerator
    
    logger.info("=" * 80)
    logger.info("🚀 LLLM SIGNAL SERVICE STARTING")
    logger.info("=" * 80)
    logger.info(f"Mode: {'MOCK' if use_mock else 'REAL LLM (OpenAI)'}")
    logger.info(f"Interval: {interval_minutes} minutes")
    logger.info("=" * 80)
    
    signal_gen = SignalGenerator(use_live_data=False, use_mock=use_mock)
    cycle_count = 0
    
    while True:
        try:
            cycle_count += 1
            timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            
            logger.info("")
            logger.info("=" * 80)
            logger.info(f"📊 CYCLE #{cycle_count} - {timestamp}")
            logger.info("=" * 80)
            
            # Generate signal
            logger.info("🤖 Generating signal...")
            signal = signal_gen.generate_signal()
            
            # Log summary
            confidence = signal.get("confidence", 0)
            meets_threshold = signal.get("meets_threshold", False)
            long_basket = signal.get("long_basket", [])
            short_basket = signal.get("short_basket", [])
            
            logger.info("")
            logger.info(f"✅ Signal Generated:")
            logger.info(f"   Confidence: {confidence}/10")
            logger.info(f"   Meets Threshold: {meets_threshold}")
            logger.info(f"   Long Basket: {len(long_basket)} assets")
            logger.info(f"   Short Basket: {len(short_basket)} assets")
            
            # Save to file
            output_dir = Path(__file__).parent
            filename = f"latest_signal.json"
            output_path = output_dir / filename
            
            import json
            with open(output_path, 'w') as f:
                json.dump(signal, f, indent=2)
            
            logger.info(f"💾 Saved to: {filename}")
            
            # Also save with timestamp for history
            timestamp_file = f"crypto_signal_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(output_dir / timestamp_file, 'w') as f:
                json.dump(signal, f, indent=2)
            
            logger.info(f"📝 History: {timestamp_file}")
            
            # Sleep until next cycle
            logger.info("")
            logger.info(f"⏰ Next signal in {interval_minutes} minutes...")
            logger.info("=" * 80)
            
            time.sleep(interval_minutes * 60)
            
        except KeyboardInterrupt:
            logger.info("")
            logger.info("⚠️  Keyboard interrupt - shutting down...")
            break
        except Exception as e:
            logger.error(f"❌ Error in cycle {cycle_count}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            logger.info(f"⏰ Retrying in 5 minutes...")
            time.sleep(300)  # Wait 5 minutes before retry

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Run LLLM signal generator as a service')
    parser.add_argument('--mock', action='store_true', help='Use mock LLM (no OpenAI API calls)')
    parser.add_argument('--interval', type=int, default=30, help='Minutes between signals (default: 30)')
    
    args = parser.parse_args()
    
    try:
        run_signal_generator(use_mock=args.mock, interval_minutes=args.interval)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)
