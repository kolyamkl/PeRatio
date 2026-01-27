/**
 * Demo SDK - Shows SDK structure without requiring authentication
 */

import { createPearSDK, createBasketTrade } from './sdk/index.js';

console.log('════════════════════════════════════════════════════════');
console.log('🍐 PEAR PROTOCOL SDK - DEMO');
console.log('════════════════════════════════════════════════════════\n');

// 1. Show SDK Creation
console.log('📦 EXAMPLE 1: Creating SDK Instance\n');
console.log('const sdk = createPearSDK({');
console.log('  privateKey: "0x...",');
console.log('  apiUrl: "https://hl-v2.pearprotocol.io",');
console.log('  clientId: "APITRADER"');
console.log('});\n');

const sdk = createPearSDK({
  apiUrl: 'https://hl-v2.pearprotocol.io',
  clientId: 'APITRADER',
});

console.log('✅ SDK instance created');
console.log(`   API URL: https://hl-v2.pearprotocol.io`);
console.log(`   Client ID: APITRADER\n`);

// 2. Show Basket Builder
console.log('════════════════════════════════════════════════════════');
console.log('📊 EXAMPLE 2: Building Basket Trades\n');

console.log('Simple Long Position:');
const longConfig = createBasketTrade()
  .long('BTC', 1.0)
  .usdValue(10)
  .leverage(1)
  .build();

console.log('  Long: BTC (100%)');
console.log('  USD Value: $10');
console.log('  Leverage: 1x\n');

console.log('Pair Trade (Long BTC, Short ETH):');
const pairConfig = createBasketTrade()
  .long('BTC', 1.0)
  .short('ETH', 1.0)
  .usdValue(20)
  .leverage(2)
  .build();

console.log('  Long: BTC (100%)');
console.log('  Short: ETH (100%)');
console.log('  USD Value: $20');
console.log('  Leverage: 2x\n');

console.log('Multi-Asset Basket:');
const basketConfig = createBasketTrade()
  .long('BTC', 0.6)
  .long('ETH', 0.4)
  .short('DOGE', 0.5)
  .short('SHIB', 0.5)
  .usdValue(50)
  .leverage(3)
  .slippage(0.08)
  .build();

console.log('  Long: BTC (60%), ETH (40%)');
console.log('  Short: DOGE (50%), SHIB (50%)');
console.log('  USD Value: $50');
console.log('  Leverage: 3x');
console.log('  Slippage: 8%\n');

// 3. Show API Methods Available
console.log('════════════════════════════════════════════════════════');
console.log('🔧 EXAMPLE 3: Available SDK Methods\n');

console.log('Authentication:');
console.log('  • sdk.authenticate()');
console.log('  • sdk.setAccessToken(token)');
console.log('  • sdk.refreshAccessToken()');
console.log('  • sdk.logout()\n');

console.log('Agent Wallet:');
console.log('  • sdk.getAgentWallet()');
console.log('  • sdk.createAgentWallet()');
console.log('  • sdk.ensureAgentWallet()\n');

console.log('Trading:');
console.log('  • sdk.executeBasketTrade(config)');
console.log('  • sdk.goLong(asset, usdValue, leverage)');
console.log('  • sdk.goShort(asset, usdValue, leverage)');
console.log('  • sdk.pairTrade(long, short, usdValue, leverage)');
console.log('  • sdk.executeAgentSignal(signal)\n');

console.log('Position Management:');
console.log('  • sdk.getOpenPositions()');
console.log('  • sdk.getPosition(positionId)');
console.log('  • sdk.closePosition(options)');
console.log('  • sdk.closeAllPositions()');
console.log('  • sdk.modifyPosition(options)\n');

console.log('Market Data:');
console.log('  • sdk.getAvailableAssets()');
console.log('  • sdk.getMarketInfo(asset)');
console.log('  • sdk.getPrice(asset)\n');

console.log('Account:');
console.log('  • sdk.getUserState()');
console.log('  • sdk.getBalance()');
console.log('  • sdk.getAvailableMargin()\n');

// 4. Show Integration Pattern
console.log('════════════════════════════════════════════════════════');
console.log('🔗 EXAMPLE 4: Backend Integration Pattern\n');

console.log('Python Backend → TypeScript SDK:');
console.log('');
console.log('1. User connects wallet in frontend');
console.log('2. Frontend authenticates with Pear Protocol');
console.log('3. Backend receives access token');
console.log('4. Backend calls SDK via Python bridge:');
console.log('');
console.log('   from pear_sdk_bridge import PearSDKBridge');
console.log('   bridge = PearSDKBridge()');
console.log('   result = bridge.execute_basket_trade(');
console.log('       access_token=token,');
console.log('       long_assets=[{"asset": "BTC", "weight": 1.0}],');
console.log('       short_assets=[],');
console.log('       usd_value=10,');
console.log('       leverage=1');
console.log('   )');
console.log('');
console.log('5. SDK executes trade on Pear Protocol');
console.log('6. Results returned to frontend\n');

console.log('════════════════════════════════════════════════════════');
console.log('✅ SDK Demo Complete!\n');
console.log('To test with real authentication:');
console.log('1. Add PRIVATE_KEY to .env file');
console.log('2. Run: npm run sdk:example');
console.log('');
console.log('To use in backend:');
console.log('1. Start backend: cd backend && uvicorn main:app --reload');
console.log('2. Test API: curl http://localhost:8000/api/basket/...');
console.log('');
console.log('📚 See BASKET_TRADING_GUIDE.md for full documentation');
console.log('════════════════════════════════════════════════════════\n');
