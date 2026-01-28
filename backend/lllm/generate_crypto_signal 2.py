#!/usr/bin/env python3
"""
Generate Crypto Pair Trading Signal and Execute
================================================
Complete workflow: Generate signal → Convert to Pear format → Execute on Hyperliquid

This demonstrates the full LLM-to-execution pipeline using crypto-only assets.
"""

import json
from signal_generator import SignalGenerator
from pear_api_client import create_pear_client
from datetime import datetime, timezone
import sys

def generate_and_execute_crypto_signal(use_mock=True, execute_trade=False, usd_value=20):
    """
    Complete workflow from signal generation to trade execution.
    
    Args:
        use_mock: Use mock LLM (True) or real OpenAI (False)
        execute_trade: Actually execute the trade (True) or just prepare it (False)
        usd_value: Position size in USD ($20-30 range)
    """
    # Enforce trade size limits
    if usd_value < 20:
        print(f"⚠️  Trade size increased to minimum $20 (requested ${usd_value})")
        usd_value = 20
    if usd_value > 30:
        print(f"⚠️  Trade size capped at $30 (requested ${usd_value})")
        usd_value = 30
    
    print("=" * 80)
    print("CRYPTO PAIR TRADING SIGNAL → EXECUTION PIPELINE")
    print("=" * 80)
    print()
    
    mode = "MOCK LLM" if use_mock else "REAL LLM (OpenAI GPT-4o-mini)"
    print(f"🤖 Mode: {mode}")
    print(f"💰 Position Size: ${usd_value}")
    print(f"⚡ Execute: {'YES' if execute_trade else 'NO (dry run)'}")
    print()
    
    # =========================================================================
    # STEP 1: GENERATE SIGNAL
    # =========================================================================
    print("=" * 80)
    print("STEP 1: GENERATE TRADING SIGNAL")
    print("=" * 80)
    print()
    
    try:
        generator = SignalGenerator(use_live_data=False, use_mock=use_mock)
        print("✅ Signal generator initialized")
    except Exception as e:
        print(f"❌ Failed to initialize: {e}")
        return
    
    print()
    print("🧠 Generating signal...")
    
    try:
        signal = generator.generate_signal()
        print("✅ Signal generated successfully")
    except Exception as e:
        print(f"❌ Signal generation failed: {e}")
        print()
        print("💡 If OpenAI quota exceeded, use: python generate_crypto_signal.py --mock")
        return
    
    # Display signal
    print()
    print("-" * 80)
    print("📊 SIGNAL DETAILS")
    print("-" * 80)
    print(f"Category: {signal.get('basket_category', 'N/A')}")
    print(f"Confidence: {signal.get('confidence', 0)}/10")
    print(f"Trade Type: {signal.get('trade_type', 'PAIR')}")
    print()
    
    long_basket = signal.get('long_basket', [])
    print(f"📈 LONG ({len(long_basket)} assets):")
    for asset in long_basket:
        print(f"   {asset['coin']:6s}: {asset['weight']*100:5.1f}%")
    
    short_basket = signal.get('short_basket', [])
    print(f"\n📉 SHORT ({len(short_basket)} assets):")
    for asset in short_basket:
        print(f"   {asset['coin']:6s}: {asset['weight']*100:5.1f}%")
    
    # Display pair ratio if present
    pair_ratio = signal.get('pair_ratio', {})
    if pair_ratio:
        print(f"\n📊 PAIR RATIO:")
        print(f"   Entry Ratio:  {pair_ratio.get('entry_ratio', 'N/A')}")
        print(f"   Target Ratio: {pair_ratio.get('target_ratio', 'N/A')} (take profit)")
        print(f"   Stop Ratio:   {pair_ratio.get('stop_ratio', 'N/A')} (stop loss)")
        if pair_ratio.get('ratio_explanation'):
            print(f"   Method: {pair_ratio.get('ratio_explanation')[:60]}...")
    
    # Display SL/TP
    pos_sizing = signal.get('position_sizing', {})
    if pos_sizing:
        sl = pos_sizing.get('recommended_sl_percent', 'N/A')
        tp = pos_sizing.get('recommended_tp_percent', 'N/A')
        rr = pos_sizing.get('risk_reward_ratio', 'N/A')
        print(f"\n🎯 RISK MANAGEMENT:")
        print(f"   Stop Loss:   {sl}% (max 10%)")
        print(f"   Take Profit: {tp}% (max 50%)")
        print(f"   Risk/Reward: {rr}:1")
    
    print(f"\n💡 Thesis: {signal.get('thesis', 'N/A')[:100]}...")
    
    # Check if tradeable
    meets_threshold = signal.get('meets_threshold', False)
    is_valid = signal.get('validation', {}).get('is_valid', False)
    
    if not is_valid:
        print("\n⚠️  Signal validation failed:")
        for error in signal.get('validation', {}).get('errors', []):
            print(f"   • {error}")
        return
    
    if not meets_threshold:
        print(f"\n⚠️  Signal confidence ({signal.get('confidence')}) below threshold")
        print("   Signal will not be executed")
    else:
        print("\n✅ Signal meets confidence threshold - TRADEABLE")
    
    # =========================================================================
    # STEP 2: CONVERT TO PEAR PROTOCOL FORMAT
    # =========================================================================
    print()
    print("=" * 80)
    print("STEP 2: CONVERT TO PEAR PROTOCOL FORMAT")
    print("=" * 80)
    print()
    
    pair_json = generator.signal_to_pair_json(signal)
    
    print(f"✅ Converted to pair format")
    print(f"   Pair ID: {pair_json.get('pair_id', 'N/A')}")
    print(f"   Long: {', '.join(pair_json.get('long', {}).get('symbols', []))}")
    print(f"   Short: {', '.join(pair_json.get('short', {}).get('symbols', []))}")
    
    # =========================================================================
    # STEP 3: PREPARE POSITION FOR PEAR PROTOCOL
    # =========================================================================
    print()
    print("=" * 80)
    print("STEP 3: PREPARE POSITION DATA")
    print("=" * 80)
    print()
    
    # Convert signal to Pear Protocol position format
    long_basket = pair_json.get('long', {}).get('assets', [])
    short_basket = pair_json.get('short', {}).get('assets', [])
    
    # Calculate equal weights
    long_assets = []
    if long_basket:
        weight = 1.0 / len(long_basket)
        long_assets = [{"asset": a['coin'], "weight": weight} for a in long_basket]
    
    short_assets = []
    if short_basket:
        weight = 1.0 / len(short_basket)
        short_assets = [{"asset": a['coin'], "weight": weight} for a in short_basket]
    
    # Get execution parameters from signal
    execution = pair_json.get('execution', {})
    sl_percent = execution.get('stop_loss_percent', 8.0)
    tp_percent = execution.get('take_profit_percent', 20.0)
    # Force higher slippage for basket trades to avoid failures
    slippage = 0.08  # 8% slippage for multi-asset baskets
    
    position_data = {
        "executionType": "MARKET",
        "slippage": slippage,
        "leverage": 2,
        "usdValue": usd_value,
        "longAssets": long_assets,
        "shortAssets": short_assets,
        # Optional: Add stop loss / take profit
        # "stopLoss": {"type": "PERCENTAGE", "value": sl_percent},
        # "takeProfit": {"type": "PERCENTAGE", "value": tp_percent}
    }
    
    print("📋 Position Parameters:")
    print(f"   USD Value: ${position_data['usdValue']}")
    print(f"   Leverage: {position_data['leverage']}x")
    print(f"   Slippage: {position_data['slippage']*100}%")
    print(f"   Stop Loss: {sl_percent}%")
    print(f"   Take Profit: {tp_percent}%")
    print()
    print(f"   Long Assets: {len(long_assets)}")
    for asset in long_assets:
        print(f"      {asset['asset']:6s}: {asset['weight']*100:5.1f}%")
    print()
    print(f"   Short Assets: {len(short_assets)}")
    for asset in short_assets:
        print(f"      {asset['asset']:6s}: {asset['weight']*100:5.1f}%")
    
    # =========================================================================
    # STEP 4: EXECUTE (or save for manual execution)
    # =========================================================================
    print()
    print("=" * 80)
    print("STEP 4: EXECUTION")
    print("=" * 80)
    print()
    
    # Save signal and position data
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    
    output_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "signal": signal,
        "pair_json": pair_json,
        "position_data": position_data,
        "execution_status": "pending"
    }
    
    if execute_trade and meets_threshold:
        print("⚡ EXECUTING TRADE...")
        print()
        
        try:
            client = create_pear_client()
            result = client.post("/positions", position_data)
            
            if result.get('success'):
                print("✅ POSITION CREATED SUCCESSFULLY!")
                print()
                
                data = result.get('data', {})
                order_id = data.get('orderId', 'N/A')
                fills = data.get('fills', [])
                
                print(f"🎯 Order ID: {order_id}")
                print(f"📋 Fills: {len(fills)}")
                
                for i, fill in enumerate(fills, 1):
                    coin = fill.get('coin', 'Unknown')
                    size = fill.get('sz', 'N/A')
                    price = fill.get('px', 'N/A')
                    side = 'BUY' if fill.get('side') == 'B' else 'SELL'
                    fee = fill.get('fee', 'N/A')
                    
                    print(f"   {i}. {coin}: {side} {size} @ ${price} (fee: ${fee})")
                
                output_data['execution_status'] = 'success'
                output_data['execution_result'] = result
                
            else:
                print("❌ EXECUTION FAILED")
                print(f"   Error: {result.get('error', 'Unknown')}")
                if result.get('details'):
                    print(f"   Details: {result.get('details')}")
                print()
                print("   Request sent:")
                print(f"   {position_data}")
                output_data['execution_status'] = 'failed'
                output_data['execution_error'] = result.get('error')
                output_data['execution_details'] = result.get('details')
                
        except Exception as e:
            print(f"❌ Execution error: {e}")
            output_data['execution_status'] = 'error'
            output_data['execution_error'] = str(e)
    else:
        if not meets_threshold:
            print("⏸️  Signal below confidence threshold - NOT EXECUTING")
            output_data['execution_status'] = 'skipped_low_confidence'
        else:
            print("💾 DRY RUN - Position data prepared but not executed")
            print()
            print("To execute this trade:")
            print(f"   1. Review the signal and position data")
            print(f"   2. Run: python generate_crypto_signal.py --execute")
            output_data['execution_status'] = 'dry_run'
    
    # Save to file
    filename = f"crypto_signal_{timestamp}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, default=str)
    
    print()
    print(f"💾 Saved to: {filename}")
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    print()
    print("=" * 80)
    print("✅ PIPELINE COMPLETE")
    print("=" * 80)
    print()
    print(f"Signal: {signal.get('basket_category', 'N/A')}")
    print(f"Confidence: {signal.get('confidence', 0)}/10")
    print(f"Execution: {output_data['execution_status']}")
    print(f"Output: {filename}")
    print()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate and execute crypto pair trading signals')
    parser.add_argument('--mock', action='store_true', help='Use mock LLM instead of OpenAI')
    parser.add_argument('--execute', action='store_true', help='Actually execute the trade')
    parser.add_argument('--usd', type=float, default=20, help='Position size in USD (default: 20, range: 20-30)')
    
    args = parser.parse_args()
    
    generate_and_execute_crypto_signal(
        use_mock=args.mock,
        execute_trade=args.execute,
        usd_value=args.usd
    )
