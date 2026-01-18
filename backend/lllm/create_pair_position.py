#!/usr/bin/env python3
"""
Create Pair Trading Positions via Pear Protocol
================================================
Uses the correct Pear Protocol API to create basket trades with long and short positions.
"""

from pear_api_client import create_pear_client
from signal_generator import SignalGenerator
import json
from datetime import datetime, timezone

def create_pair_from_signal(use_mock=True):
    """Generate a signal and create a pair position on Pear Protocol"""
    
    print("=" * 70)
    print("PEAR PROTOCOL PAIR TRADING")
    print("=" * 70)
    
    # Generate signal
    print("\n🤖 Generating trading signal...")
    generator = SignalGenerator(use_live_data=False, use_mock=use_mock)
    signal = generator.generate_signal("Generate a crypto pairs trading signal")
    
    print(f"\n📊 Signal Category: {signal.get('basket_category', 'N/A')}")
    print(f"   Confidence: {signal.get('confidence', 0)}/10")
    
    long_coins = [asset['coin'] for asset in signal.get('long_basket', [])]
    short_coins = [asset['coin'] for asset in signal.get('short_basket', [])]
    
    print(f"   Long: {', '.join(long_coins)}")
    print(f"   Short: {', '.join(short_coins)}")
    
    # Convert to Pear Protocol format
    pair_json = generator.signal_to_pair_json(signal)
    
    # Create Pear client
    client = create_pear_client()
    
    # Prepare position data for Pear Protocol
    # Using equal weights for all assets in each basket
    long_assets = []
    long_basket = pair_json.get('long', {}).get('assets', [])
    if long_basket:
        weight_per_asset = 1.0 / len(long_basket)
        long_assets = [
            {"asset": asset['coin'], "weight": weight_per_asset}
            for asset in long_basket
        ]
    
    short_assets = []
    short_basket = pair_json.get('short', {}).get('assets', [])
    if short_basket:
        weight_per_asset = 1.0 / len(short_basket)
        short_assets = [
            {"asset": asset['coin'], "weight": weight_per_asset}
            for asset in short_basket
        ]
    
    # Position parameters
    usd_value = 20  # $20 position size
    leverage = 4    # 4x leverage
    slippage = 0.08  # 8% slippage tolerance
    
    # Get TP/SL from signal
    stop_loss_percent = signal.get('position_sizing', {}).get('recommended_sl_percent', 8.0)
    take_profit_percent = signal.get('position_sizing', {}).get('recommended_tp_percent', 40.0)
    
    print("\n" + "=" * 70)
    print("CREATING POSITION ON PEAR PROTOCOL")
    print("=" * 70)
    print(f"\n💰 Position Size: ${usd_value}")
    print(f"📊 Leverage: {leverage}x")
    print(f"📈 Slippage: {slippage * 100}%")
    print(f"🎯 Take Profit: {take_profit_percent}%")
    print(f"🛡️ Stop Loss: {stop_loss_percent}%")
    
    print(f"\n📈 LONG ({len(long_assets)} assets):")
    for asset in long_assets:
        print(f"   • {asset['asset']}: {asset['weight'] * 100:.1f}%")
    
    print(f"\n📉 SHORT ({len(short_assets)} assets):")
    for asset in short_assets:
        print(f"   • {asset['asset']}: {asset['weight'] * 100:.1f}%")
    
    # Create position via API
    # Use proper TP/SL format as objects with type and value
    position_data = {
        "executionType": "MARKET",
        "slippage": slippage,
        "leverage": leverage,
        "usdValue": usd_value,
        "longAssets": long_assets,
        "shortAssets": short_assets,
        "stopLoss": {
            "type": "PERCENTAGE",
            "value": stop_loss_percent
        },
        "takeProfit": {
            "type": "PERCENTAGE",
            "value": take_profit_percent
        }
    }
    
    print("\n⏳ Submitting position to Pear Protocol API...")
    result = client.post("/positions", position_data)
    
    # Display results
    print("\n" + "=" * 70)
    if result.get('success'):
        print("✅ POSITION CREATED SUCCESSFULLY!")
        print("=" * 70)
        
        data = result.get('data', {})
        order_id = data.get('orderId', 'N/A')
        fills = data.get('fills', [])
        
        print(f"\n🎯 Order ID: {order_id}")
        print(f"\n📋 Fills ({len(fills)}):")
        
        for i, fill in enumerate(fills, 1):
            coin = fill.get('coin', 'Unknown')
            size = fill.get('sz', 'N/A')
            price = fill.get('px', 'N/A')
            side = 'BUY' if fill.get('side') == 'B' else 'SELL'
            fee = fill.get('fee', 'N/A')
            
            print(f"   {i}. {coin}: {side} {size} @ ${price} (fee: ${fee})")
        
        # Save to file
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        output = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "signal": signal,
            "pair_config": pair_json,
            "position_params": position_data,
            "result": result
        }
        
        filename = f"pair_position_{timestamp}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2)
        
        print(f"\n💾 Saved to: {filename}")
        
    else:
        print("❌ POSITION CREATION FAILED")
        print("=" * 70)
        print(f"\n⚠️ Error: {result.get('error', 'Unknown error')}")
        print(f"\n📋 Details:")
        print(json.dumps(result.get('details', {}), indent=2))
    
    print("\n" + "=" * 70)
    return result

def main():
    """Main entry point"""
    import sys
    
    use_mock = True  # Default to mock mode
    
    if len(sys.argv) > 1:
        if sys.argv[1].lower() in ['live', 'real', 'true']:
            use_mock = False
            print("⚠️ Using LIVE LLM mode (requires OpenAI API key)")
        else:
            print("ℹ️ Using MOCK mode (no LLM API calls)")
    else:
        print("ℹ️ Using MOCK mode by default")
        print("   To use live LLM: python create_pair_position.py live\n")
    
    create_pair_from_signal(use_mock=use_mock)

if __name__ == "__main__":
    main()
