/**
 * Quick Test Script - Uses New SDK
 * 
 * This demonstrates how to use the new SDK for quick testing
 * (alternative to the standalone scripts)
 */

import { createPearSDK } from './sdk/index.js';
import { config } from 'dotenv';

config();

async function main() {
  console.log('🚀 Quick Test - Using New SDK\n');

  try {
    // Create SDK instance
    const sdk = createPearSDK({
      apiUrl: process.env.API_URL,
      clientId: process.env.CLIENT_ID || 'APITRADER',
    });

    // 1. Set access token (from frontend authentication)
    console.log('🔐 Setting access token...');
    console.log('   NOTE: In production, this comes from frontend after user signs EIP-712');
    const mockToken = 'mock_token_for_testing';
    sdk.setAccessToken(mockToken);
    console.log(`✅ Token set\n`);

    // 2. Check agent wallet
    console.log('📊 Checking agent wallet...');
    const agentWallet = await sdk.getAgentWallet();
    console.log(`   Status: ${agentWallet.status}`);
    console.log(`   Address: ${agentWallet.agentWalletAddress || 'N/A'}\n`);

    // 3. Get user state
    console.log('💰 Getting user state...');
    const userState = await sdk.getUserState();
    console.log(`   Balance: $${userState.balance}`);
    console.log(`   Positions: ${userState.positions?.length || 0}\n`);

    // 4. Get open positions
    console.log('📈 Getting open positions...');
    const positions = await sdk.getOpenPositions();
    console.log(`   Found ${positions.length} positions\n`);

    console.log('✅ All checks passed!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   API Response:', error.response.data);
    }
  }
}

main();
