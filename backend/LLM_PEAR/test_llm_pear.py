#!/usr/bin/env python3
"""
LLM + Pear Protocol Integration Test
=====================================
This script:
1. Uses OpenAI LLM to generate a trading signal
2. Executes the signal via Pear Protocol API
"""

import os
import json
import requests
from openai import OpenAI
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from backend/.env
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
PEAR_API_URL = os.getenv('PEAR_API_URL', 'https://hl-v2.pearprotocol.io')
PEAR_ACCESS_TOKEN = os.getenv('PEAR_ACCESS_TOKEN')
PEAR_CLIENT_ID = os.getenv('PEAR_CLIENT_ID', 'HLHackathon9')

print("=" * 60)
print("🧪 LLM + PEAR PROTOCOL INTEGRATION TEST")
print("=" * 60)

# Step 1: Initialize OpenAI Client
print("\n📡 Step 1: Initializing OpenAI Client...")
if not OPENAI_API_KEY:
    print("❌ OPENAI_API_KEY not found in .env")
    exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)
print("✅ OpenAI client initialized")

# Step 2: Generate Trading Signal via LLM
print("\n🤖 Step 2: Asking LLM to generate a trading signal...")

signal_prompt = """You are a crypto trading signal generator. Generate a single trading signal for the Pear Protocol API.

Current market context:
- BTC is currently around $100,000
- ETH is currently around $3,500
- Market sentiment is cautiously bullish

Generate a trading signal in the following JSON format:
{
    "asset": "BTC or ETH",
    "direction": "long or short",
    "usdValue": 10,
    "leverage": 2,
    "reasoning": "Brief explanation of why this trade",
    "stopLoss": optional percentage,
    "takeProfit": optional percentage
}

Requirements:
- Use minimum usdValue of 10 (this is a test trade)
- Use conservative leverage (1-5x)
- Pick one asset and direction
- Provide brief reasoning

Return ONLY the JSON, no other text."""

try:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a professional crypto trader assistant."},
            {"role": "user", "content": signal_prompt}
        ],
        temperature=0.7,
        max_tokens=500
    )
    
    signal_text = response.choices[0].message.content.strip()
    
    # Parse the JSON from the response
    if signal_text.startswith("```"):
        # Remove markdown code blocks if present
        signal_text = signal_text.replace("```json", "").replace("```", "").strip()
    
    signal = json.loads(signal_text)
    
    print("\n" + "=" * 40)
    print("📊 LLM GENERATED SIGNAL:")
    print("=" * 40)
    print(f"   Asset: {signal['asset']}")
    print(f"   Direction: {signal['direction']}")
    print(f"   USD Value: ${signal['usdValue']}")
    print(f"   Leverage: {signal['leverage']}x")
    print(f"   Reasoning: {signal['reasoning']}")
    if 'stopLoss' in signal:
        print(f"   Stop Loss: {signal['stopLoss']}%")
    if 'takeProfit' in signal:
        print(f"   Take Profit: {signal['takeProfit']}%")
    print("=" * 40)

except Exception as e:
    print(f"❌ Error generating signal: {e}")
    exit(1)

# Step 3: Convert signal to Pear Protocol format
print("\n⚙️ Step 3: Converting signal to Pear Protocol format...")

# Build the position request
position_data = {
    "executionType": "MARKET",
    "slippage": 0.08,  # 8% slippage
    "leverage": signal['leverage'],
    "usdValue": signal['usdValue'],
}

# Set long/short based on direction
if signal['direction'].lower() == 'long':
    position_data['longAssets'] = [{"asset": signal['asset'], "weight": 1.0}]
    position_data['shortAssets'] = []
else:
    position_data['longAssets'] = []
    position_data['shortAssets'] = [{"asset": signal['asset'], "weight": 1.0}]

# Note: stopLoss and takeProfit require specific object format
# For simplicity in this test, we skip them to ensure execution
# The API requires format like: {"type": "PERCENTAGE", "value": 5}

print("\n📋 Pear Protocol Request:")
print(json.dumps(position_data, indent=2))

# Step 4: Execute via Pear Protocol API
print("\n🚀 Step 4: Executing trade via Pear Protocol API...")

if not PEAR_ACCESS_TOKEN:
    print("❌ PEAR_ACCESS_TOKEN not found in .env")
    print("💡 Please authenticate first to get an access token")
    exit(1)

try:
    headers = {
        'Authorization': f'Bearer {PEAR_ACCESS_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(
        f'{PEAR_API_URL}/positions',
        json=position_data,
        headers=headers
    )
    
    print(f"\n📡 API Response Status: {response.status_code}")
    
    if response.status_code == 200 or response.status_code == 201:
        result = response.json()
        
        print("\n" + "=" * 60)
        print("✅ TRADE EXECUTED SUCCESSFULLY!")
        print("=" * 60)
        print("\n📊 Execution Result:")
        print(json.dumps(result, indent=2))
        
        # Extract key details
        if 'orderId' in result:
            print(f"\n🎯 Order ID: {result['orderId']}")
        
        if 'fills' in result and result['fills']:
            print(f"✅ Fills: {len(result['fills'])}")
            for i, fill in enumerate(result['fills'], 1):
                coin = fill.get('coin', fill.get('asset', 'Unknown'))
                size = fill.get('sz', fill.get('size', 'N/A'))
                price = fill.get('px', fill.get('price', 'N/A'))
                fee = fill.get('fee', 'N/A')
                print(f"   {i}. {coin}: {size} @ ${price} (fee: ${fee})")
        
        print("\n" + "=" * 60)
        print("🎉 LLM + PEAR PROTOCOL TEST COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        
    else:
        print(f"\n❌ API Error: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            print("\n💡 Token may be expired. Need to re-authenticate.")
        elif response.status_code == 400:
            print("\n💡 Bad request - check position parameters")
        elif response.status_code == 403:
            print("\n💡 Forbidden - check wallet permissions/approvals")

except requests.exceptions.RequestException as e:
    print(f"❌ Network error: {e}")
except Exception as e:
    print(f"❌ Error executing trade: {e}")

print("\n✨ Test complete!")
