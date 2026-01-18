"""
Send Signal to Pear Protocol
=============================
Quick script to generate and send a signal to Pear Protocol.
Executes long and short baskets as individual orders.
"""

from signal_generator import SignalGenerator
import json

print("="*60)
print("SENDING SIGNAL TO PEAR PROTOCOL")
print("="*60)

# Generate signal
gen = SignalGenerator(use_mock=True)
signal = gen.generate_signal()
pair = gen.signal_to_pair_json(signal)

print(f"\n📊 Signal Generated:")
print(f"   Pair ID: {pair['pair_id']}")
print(f"   Category: {pair['basket_category']}")
print(f"   Confidence: {pair['confidence']}/10")
print(f"   Long: {pair['long']['symbols']}")
print(f"   Short: {pair['short']['symbols']}")
print(f"   Execution: {pair['execution']['type']}")
print(f"   Stop Loss: {pair['execution']['stop_loss_percent']}%")
print(f"   Take Profit: {pair['execution']['take_profit_percent']}%")

# Get the Pear API client
client = gen.pair_generator.pear_client

print("\n" + "="*60)
print("EXECUTING ORDERS VIA PEAR PROTOCOL")
print("="*60)

# Define order size (in USD value - adjust as needed)
BASE_SIZE = 0.001  # Minimum order size

results = {
    "pair_id": pair["pair_id"],
    "long_orders": [],
    "short_orders": []
}

# Execute LONG orders (buy)
print("\n📈 LONG ORDERS:")
for asset in pair["long"]["assets"]:
    symbol = asset["coin"]
    weight = asset["weight"]
    size = BASE_SIZE * weight  # Scale by weight
    
    print(f"   Buying {symbol} (weight: {weight*100:.0f}%, size: {size:.6f})")
    
    result = client.place_market_order(
        symbol=symbol,
        side="buy",
        size=size
    )
    results["long_orders"].append({
        "symbol": symbol,
        "side": "buy",
        "size": size,
        "response": result
    })
    
    if result.get("success"):
        print(f"   ✅ {symbol} order placed")
    else:
        print(f"   ⚠️ {symbol}: {result.get('error', 'Unknown error')}")

# Execute SHORT orders (sell)
print("\n📉 SHORT ORDERS:")
for asset in pair["short"]["assets"]:
    symbol = asset["coin"]
    weight = asset["weight"]
    size = BASE_SIZE * weight
    
    print(f"   Selling {symbol} (weight: {weight*100:.0f}%, size: {size:.6f})")
    
    result = client.place_market_order(
        symbol=symbol,
        side="sell",
        size=size
    )
    results["short_orders"].append({
        "symbol": symbol,
        "side": "sell",
        "size": size,
        "response": result
    })
    
    if result.get("success"):
        print(f"   ✅ {symbol} order placed")
    else:
        print(f"   ⚠️ {symbol}: {result.get('error', 'Unknown error')}")

# Summary
print("\n" + "="*60)
print("EXECUTION SUMMARY")
print("="*60)

long_success = sum(1 for o in results["long_orders"] if o["response"].get("success"))
short_success = sum(1 for o in results["short_orders"] if o["response"].get("success"))

print(f"Long orders:  {long_success}/{len(results['long_orders'])} successful")
print(f"Short orders: {short_success}/{len(results['short_orders'])} successful")

# Save results
with open("execution_result.json", "w") as f:
    json.dump(results, f, indent=2, default=str)
print(f"\n💾 Results saved to: execution_result.json")

print("\n" + "="*60)
print(json.dumps(results, indent=2, default=str))
