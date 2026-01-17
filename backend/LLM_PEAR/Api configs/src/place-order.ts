import { authenticate } from './utils/auth.js';
import axios from 'axios';
import { config } from 'dotenv';

config();

const API_URL = process.env.API_URL || 'https://hl-v2.pearprotocol.io';
const CLIENT_ID = process.env.CLIENT_ID || 'HLHackathon9';

/**
 * Place an order on Hyperliquid through Pear Protocol
 */
async function placeOrder() {
  console.log('🚀 Place Order on Hyperliquid via Pear Protocol\n');

  try {
    // Step 1: Authenticate
    console.log('🔐 Authenticating...');
    const accessToken = await authenticate();
    
    if (!accessToken) {
      console.error('❌ Authentication failed');
      return;
    }

    console.log('✅ Authenticated!\n');

    // Step 2: Define order parameters
    // Example: Market order for BTC (long position)
    const orderData = {
      executionType: 'MARKET',  // MARKET, TRIGGER, TWAP, LADDER
      slippage: 0.08,           // 8% slippage tolerance
      leverage: 2,              // Leverage (1-100x)
      usdValue: 10,             // Position size in USD (minimum ~$10)
      longAssets: [             // Assets to go long
        {
          asset: 'BTC',
          weight: 1.0            // 100% weight
        }
      ],
      shortAssets: []           // Empty for long-only
    };

    console.log('📋 Position Details:');
    console.log(`   Type: ${orderData.executionType}`);
    console.log(`   USD Value: $${orderData.usdValue}`);
    console.log(`   Leverage: ${orderData.leverage}x`);
    console.log(`   Long: ${orderData.longAssets.map(a => a.asset).join(', ')}`);
    console.log(`   Short: ${orderData.shortAssets.length > 0 ? orderData.shortAssets.map(a => a.asset).join(', ') : 'None'}`);
    console.log();

    // Step 3: Create the position
    console.log('📝 Creating position...');
    
    const response = await axios.post(
      `${API_URL}/positions`,
      orderData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ POSITION CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 Position Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('═══════════════════════════════════════════════════\n');

    // Extract position details if available
    if (response.data) {
      const result = response.data;
      
      if (result.orderId) {
        console.log(`🎯 Order ID: ${result.orderId}`);
      }
      if (result.fills && result.fills.length > 0) {
        console.log(`✅ Fills: ${result.fills.length}`);
        result.fills.forEach((fill: any, i: number) => {
          console.log(`   ${i + 1}. ${fill.asset || 'Unknown'}: ${fill.size || 'N/A'} @ ${fill.price || 'N/A'}`);
        });
      }
    }

    console.log('\n💡 Position created successfully!\n');

  } catch (error: any) {
    console.error('\n❌ Error creating position:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
      
      // Common error messages
      if (error.response.status === 400) {
        console.log('\n💡 Possible issues:');
        console.log('   - Invalid position parameters');
        console.log('   - Insufficient balance');
        console.log('   - Invalid asset or size');
        console.log('   - Check longAssets/shortAssets weights sum to 1.0');
      } else if (error.response.status === 401) {
        console.log('\n💡 Authentication issue - token may be expired');
      } else if (error.response.status === 404) {
        console.log('\n💡 Endpoint not found - check API documentation');
      }
    } else {
      console.error(`   Error: ${error.message}`);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const symbol = args[0] || 'BTC';
const side = args[1] || 'buy';
const size = parseFloat(args[2] || '0.001');
const orderType = args[3] || 'market';

console.log('📝 Command line args (optional):');
console.log('   npm run order -- [SYMBOL] [buy/sell] [SIZE] [market/limit]');
console.log(`   Example: npm run order -- ETH buy 0.01 market\n`);

placeOrder();

