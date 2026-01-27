/**
 * Pear Protocol SDK - Usage Examples
 * 
 * This file demonstrates how to use the SDK for:
 * 1. User wallet connection & authentication
 * 2. Agent wallet setup
 * 3. Basket trade execution (user-defined or from Agent Pear signals)
 */

import { config } from 'dotenv';
import {
  createPearSDK,
  createBasketTrade,
  pairTrade,
  sectorRotation,
  createSignal,
  validateSignal,
  SignalQueue,
} from './index.js';

config();

// ============================================
// EXAMPLE 1: Basic Setup & Authentication
// ============================================

async function example1_BasicSetup() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('EXAMPLE 1: Basic Setup & Authentication');
  console.log('═══════════════════════════════════════════════════\n');

  // Create SDK instance (no private key needed!)
  const sdk = createPearSDK({
    apiUrl: process.env.API_URL,
    clientId: process.env.CLIENT_ID,
  });

  // Set access token from frontend
  // In production, this token comes from the frontend after user signs EIP-712 message
  const mockAccessToken = 'eyJ...'; // This would come from frontend authentication
  sdk.setAccessToken(mockAccessToken);
  
  console.log('✅ Access token set!');
  console.log('   NOTE: In production, user authenticates in frontend with their wallet\n');

  // Check/create agent wallet
  const agentWallet = await sdk.ensureAgentWallet();
  console.log(`   Agent Wallet: ${agentWallet.agentWalletAddress}`);
  console.log(`   Status: ${agentWallet.status}`);

  return sdk;
}

// ============================================
// EXAMPLE 2: Simple Trades
// ============================================

async function example2_SimpleTrades(sdk: ReturnType<typeof createPearSDK>) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('EXAMPLE 2: Simple Trades');
  console.log('═══════════════════════════════════════════════════\n');

  // Go long BTC with $10 at 2x leverage
  console.log('📈 Going long BTC...');
  const longResult = await sdk.goLong('BTC', 10, 2);
  console.log('   Result:', JSON.stringify(longResult, null, 2));

  // Go short ETH with $10 at 1x leverage
  console.log('\n📉 Going short ETH...');
  const shortResult = await sdk.goShort('ETH', 10, 1);
  console.log('   Result:', JSON.stringify(shortResult, null, 2));

  // Pair trade: Long BTC, Short ETH
  console.log('\n🔄 Pair trade: Long BTC / Short ETH...');
  const pairResult = await sdk.pairTrade('BTC', 'ETH', 10, 2);
  console.log('   Result:', JSON.stringify(pairResult, null, 2));
}

// ============================================
// EXAMPLE 3: Basket Trade Builder
// ============================================

async function example3_BasketTradeBuilder(sdk: ReturnType<typeof createPearSDK>) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('EXAMPLE 3: Basket Trade Builder');
  console.log('═══════════════════════════════════════════════════\n');

  // Build a complex basket trade using the fluent builder
  const basketConfig = createBasketTrade()
    .usdValue(50)
    .leverage(3)
    .slippage(0.05)
    .long('BTC', 0.5)    // 50% BTC
    .long('ETH', 0.3)    // 30% ETH
    .long('SOL', 0.2)    // 20% SOL
    .short('DOGE', 0.5)  // 50% DOGE
    .short('SHIB', 0.5)  // 50% SHIB
    .build();

  console.log('📋 Basket Configuration:');
  console.log(JSON.stringify(basketConfig, null, 2));

  // Execute the basket trade
  console.log('\n🚀 Executing basket trade...');
  const result = await sdk.executeBasketTrade(basketConfig);
  console.log('   Result:', JSON.stringify(result, null, 2));
}

// ============================================
// EXAMPLE 4: Preset Basket Strategies
// ============================================

async function example4_PresetStrategies(sdk: ReturnType<typeof createPearSDK>) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('EXAMPLE 4: Preset Basket Strategies');
  console.log('═══════════════════════════════════════════════════\n');

  // Simple pair trade preset
  const pairConfig = pairTrade('BTC', 'ETH', 20, 2);
  console.log('📋 Pair Trade Config:');
  console.log(JSON.stringify(pairConfig, null, 2));

  // Sector rotation: Long AI coins, Short meme coins
  const sectorConfig = sectorRotation(
    ['FET', 'RNDR', 'TAO'],      // Long: AI sector
    ['DOGE', 'SHIB', 'PEPE'],    // Short: Meme sector
    100,                          // $100 position
    2                             // 2x leverage
  );
  console.log('\n📋 Sector Rotation Config:');
  console.log(JSON.stringify(sectorConfig, null, 2));
}

// ============================================
// EXAMPLE 5: Agent Pear Signal Execution
// ============================================

async function example5_AgentSignals(sdk: ReturnType<typeof createPearSDK>) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('EXAMPLE 5: Agent Pear Signal Execution');
  console.log('═══════════════════════════════════════════════════\n');

  // Create a signal (simulating what Agent Pear would send)
  const signal = createSignal({
    longAssets: [
      { asset: 'BTC', weight: 0.6 },
      { asset: 'ETH', weight: 0.4 },
    ],
    shortAssets: [
      { asset: 'DOGE', weight: 1.0 },
    ],
    usdValue: 25,
    leverage: 2,
    confidence: 0.85,
    reasoning: 'BTC/ETH showing strength against meme coins',
    expiresInMs: 5 * 60 * 1000, // 5 minutes
  });

  console.log('📡 Received Signal:');
  console.log(JSON.stringify(signal, null, 2));

  // Validate the signal
  const validation = validateSignal(signal, {
    maxUsdValue: 100,
    maxLeverage: 5,
    minConfidence: 0.7,
  });

  console.log('\n✅ Validation Result:');
  console.log(`   Valid: ${validation.valid}`);
  if (validation.errors.length > 0) {
    console.log(`   Errors: ${validation.errors.join(', ')}`);
  }
  if (validation.warnings.length > 0) {
    console.log(`   Warnings: ${validation.warnings.join(', ')}`);
  }

  // Execute the signal
  if (validation.valid) {
    console.log('\n🚀 Executing signal...');
    const result = await sdk.executeAgentSignal(signal, {
      maxSlippage: 0.08,
    });
    console.log('   Result:', JSON.stringify(result, null, 2));
  }
}

// ============================================
// EXAMPLE 6: Signal Queue for Batch Processing
// ============================================

async function example6_SignalQueue(sdk: ReturnType<typeof createPearSDK>) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('EXAMPLE 6: Signal Queue for Batch Processing');
  console.log('═══════════════════════════════════════════════════\n');

  // Create a signal queue with safety limits
  const queue = new SignalQueue({
    maxUsdValue: 50,
    maxLeverage: 3,
    minConfidence: 0.6,
    blockedAssets: ['LUNA', 'UST'], // Block risky assets
  });

  // Add signals to queue
  const signal1 = createSignal({
    longAssets: [{ asset: 'BTC' }],
    usdValue: 20,
    confidence: 0.9,
  });

  const signal2 = createSignal({
    longAssets: [{ asset: 'ETH' }],
    shortAssets: [{ asset: 'SOL' }],
    usdValue: 30,
    confidence: 0.75,
  });

  queue.add(signal1);
  queue.add(signal2);

  console.log(`📋 Queue size: ${queue.size()}`);

  // Get best signal
  const bestSignal = queue.getBestSignal();
  if (bestSignal) {
    console.log(`\n🎯 Best signal (confidence: ${bestSignal.confidence}):`);
    console.log(JSON.stringify(bestSignal.basket, null, 2));

    // Execute best signal
    console.log('\n🚀 Executing best signal...');
    const result = await sdk.executeAgentSignal(bestSignal);
    console.log('   Result:', JSON.stringify(result, null, 2));

    // Remove from queue
    queue.remove(bestSignal.signalId);
  }
}

// ============================================
// EXAMPLE 7: Position Management
// ============================================

async function example7_PositionManagement(sdk: ReturnType<typeof createPearSDK>) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('EXAMPLE 7: Position Management');
  console.log('═══════════════════════════════════════════════════\n');

  // Get all open positions
  console.log('📊 Getting open positions...');
  const positions = await sdk.getOpenPositions();
  console.log(`   Found ${positions.length} positions`);

  for (const pos of positions) {
    console.log(`\n   Position ${pos.positionId}:`);
    console.log(`     Long: ${pos.longAssets.map(a => a.asset).join(', ') || 'None'}`);
    console.log(`     Short: ${pos.shortAssets.map(a => a.asset).join(', ') || 'None'}`);
    console.log(`     PnL: $${pos.unrealizedPnl}`);
  }

  // Close a specific position (if any exist)
  if (positions.length > 0) {
    const posToClose = positions[0];
    console.log(`\n🔒 Closing position ${posToClose.positionId}...`);
    
    const closeResult = await sdk.closePosition({
      positionId: posToClose.positionId,
      percentage: 1.0, // Close 100%
    });
    console.log('   Result:', JSON.stringify(closeResult, null, 2));
  }
}

// ============================================
// EXAMPLE 8: Frontend Integration Pattern
// ============================================

async function example8_FrontendIntegration() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('EXAMPLE 8: Frontend Integration Pattern');
  console.log('═══════════════════════════════════════════════════\n');

  // In a frontend app, you'd get the signature from the user's wallet (MetaMask, etc.)
  // Then pass the access token to the SDK

  const sdk = createPearSDK({
    apiUrl: process.env.API_URL,
    clientId: process.env.CLIENT_ID,
    // No private key - frontend will handle signing
  });

  // Simulate receiving token from frontend auth flow
  const accessToken = 'token_from_frontend_auth';
  const refreshToken = 'refresh_token_from_frontend';

  // Set tokens directly
  sdk.setAccessToken(accessToken, refreshToken);

  console.log('✅ SDK configured with frontend tokens');
  console.log('   Now you can make API calls on behalf of the user');

  // Example: Execute a basket trade from user's app
  // const result = await sdk.executeBasketTrade(userBasketConfig);
}

// ============================================
// MAIN: Run Examples
// ============================================

async function main() {
  console.log('═'.repeat(60));
  console.log('🍐 PEAR PROTOCOL SDK - USAGE EXAMPLES');
  console.log('═'.repeat(60));

  try {
    // Run examples
    const sdk = await example1_BasicSetup();
    
    // Uncomment to run trading examples (requires funded account)
    // await example2_SimpleTrades(sdk);
    // await example3_BasketTradeBuilder(sdk);
    // await example4_PresetStrategies(sdk);
    // await example5_AgentSignals(sdk);
    // await example6_SignalQueue(sdk);
    // await example7_PositionManagement(sdk);
    
    await example8_FrontendIntegration();

    console.log('\n═'.repeat(60));
    console.log('✅ ALL EXAMPLES COMPLETED');
    console.log('═'.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   API Response:', error.response.data);
    }
  }
}

// Run if executed directly
main();
