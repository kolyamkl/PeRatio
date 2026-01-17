#!/usr/bin/env python3
"""
LLM + Pear Protocol Integration Test (with fresh authentication)
=================================================================
This script:
1. Authenticates with Pear Protocol to get a fresh token
2. Uses OpenAI LLM to generate a trading signal
3. Executes the signal via Pear Protocol API
"""

import os
import json
import requests
from eth_account import Account
from eth_account.messages import encode_typed_data
from openai import OpenAI
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from backend/.env
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
PEAR_API_URL = os.getenv('PEAR_API_URL', 'https://hl-v2.pearprotocol.io')
PEAR_PRIVATE_KEY = os.getenv('PEAR_PRIVATE_KEY')
PEAR_CLIENT_ID = os.getenv('PEAR_CLIENT_ID', 'HLHackathon9')

print("=" * 60)
print("🧪 LLM + PEAR PROTOCOL INTEGRATION TEST")
print("=" * 60)

# Step 1: Authenticate with Pear Protocol
print("\n🔐 Step 1: Authenticating with Pear Protocol...")

if not PEAR_PRIVATE_KEY:
    print("❌ PEAR_PRIVATE_KEY not found in .env")
    exit(1)

account = Account.from_key(PEAR_PRIVATE_KEY)
wallet_address = account.address
print(f"   Wallet: {wallet_address}")

try:
    # Get EIP-712 message
    msg_response = requests.get(
        f'{PEAR_API_URL}/auth/eip712-message',
        params={'address': wallet_address, 'clientId': PEAR_CLIENT_ID}
    )
    msg_response.raise_for_status()
    eip_data = msg_response.json()
    
    # Prepare for signing
    domain = eip_data['domain']
    types = {k: v for k, v in eip_data['types'].items() if k != 'EIP712Domain'}
    message = eip_data['message']
    
    # Create the typed data structure for eth_account
    full_typed_data = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
            ],
            **types
        },
        "domain": domain,
        "primaryType": list(types.keys())[0],
        "message": message
    }
    
    # Sign the message
    signable_message = encode_typed_data(full_message=full_typed_data)
    signed = account.sign_message(signable_message)
    signature = signed.signature.hex()
    if not signature.startswith('0x'):
        signature = '0x' + signature
    
    # Login
    login_response = requests.post(
        f'{PEAR_API_URL}/auth/login',
        json={
            'method': 'eip712',
            'address': wallet_address,
            'clientId': PEAR_CLIENT_ID,
            'details': {
                'signature': signature,
                'timestamp': message['timestamp']
            }
        }
    )
    login_response.raise_for_status()
    access_token = login_response.json()['accessToken']
    print("✅ Authentication successful!")
    
except Exception as e:
    print(f"❌ Authentication failed: {e}")
    print("💡 Using existing token from .env")
    access_token = os.getenv('PEAR_ACCESS_TOKEN')
    if not access_token:
        print("❌ No access token available")
        exit(1)

# Step 2: Initialize OpenAI Client
print("\n📡 Step 2: Initializing OpenAI Client...")
if not OPENAI_API_KEY:
    print("❌ OPENAI_API_KEY not found in .env")
    exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)
print("✅ OpenAI client initialized")

# Step 3: Generate Trading Signal via LLM
print("\n🤖 Step 3: Asking LLM to generate a trading signal...")

signal_prompt = """You are a crypto trading signal generator. Generate a single trading signal for the Pear Protocol API.

Current market context:
- BTC is currently around $100,000
- ETH is currently around $3,500
- SOL is around $200
- Market sentiment is cautiously bullish

Generate a trading signal in the following JSON format:
{
    "asset": "BTC or ETH or SOL",
    "direction": "long or short",
    "usdValue": 10,
    "leverage": 2,
    "reasoning": "Brief explanation of why this trade"
}

Requirements:
- Use usdValue of exactly 10 (this is a test trade)
- Use leverage of exactly 2
- Pick one asset and direction
- Provide brief reasoning

Return ONLY the JSON, no other text."""

try:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a professional crypto trader assistant. Return only valid JSON."},
            {"role": "user", "content": signal_prompt}
        ],
        temperature=0.7,
        max_tokens=300
    )
    
    signal_text = response.choices[0].message.content.strip()
    
    # Parse the JSON from the response
    if signal_text.startswith("```"):
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
    print("=" * 40)

except Exception as e:
    print(f"❌ Error generating signal: {e}")
    exit(1)

# Step 4: Convert signal to Pear Protocol format
print("\n⚙️ Step 4: Converting signal to Pear Protocol format...")

position_data = {
    "executionType": "MARKET",
    "slippage": 0.08,
    "leverage": int(signal['leverage']),
    "usdValue": int(signal['usdValue']),
}

if signal['direction'].lower() == 'long':
    position_data['longAssets'] = [{"asset": signal['asset'].upper(), "weight": 1.0}]
    position_data['shortAssets'] = []
else:
    position_data['longAssets'] = []
    position_data['shortAssets'] = [{"asset": signal['asset'].upper(), "weight": 1.0}]

print("\n📋 Pear Protocol Request:")
print(json.dumps(position_data, indent=2))

# Step 5: Execute via Pear Protocol API
print("\n🚀 Step 5: Executing trade via Pear Protocol API...")

try:
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(
        f'{PEAR_API_URL}/positions',
        json=position_data,
        headers=headers
    )
    
    print(f"\n📡 API Response Status: {response.status_code}")
    
    if response.status_code in [200, 201]:
        result = response.json()
        
        print("\n" + "=" * 60)
        print("✅ TRADE EXECUTED SUCCESSFULLY!")
        print("=" * 60)
        print("\n📊 Execution Result:")
        print(json.dumps(result, indent=2))
        
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
        elif response.status_code == 500:
            print("\n💡 Server error - may be temporary, try again")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n✨ Test complete!")
