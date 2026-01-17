import { authenticate } from './utils/auth.js';
import axios from 'axios';
import { config } from 'dotenv';

config();

const API_URL = process.env.API_URL || 'https://hl-v2.pearprotocol.io';
const CLIENT_ID = process.env.CLIENT_ID || 'HLHackathon9';

interface OrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  size: number;
  price?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  reduceOnly?: boolean;
  postOnly?: boolean;
}

/**
 * Place an order with advanced parameters
 */
async function placeOrderAdvanced(orderParams: OrderParams) {
  console.log('🚀 Advanced Order Placement\n');

  try {
    // Authenticate
    console.log('🔐 Authenticating...');
    const accessToken = await authenticate();
    
    if (!accessToken) {
      console.error('❌ Authentication failed');
      return null;
    }

    console.log('✅ Authenticated!\n');

    // Display order details
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 ORDER DETAILS:');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   Symbol: ${orderParams.symbol}`);
    console.log(`   Side: ${orderParams.side.toUpperCase()}`);
    console.log(`   Type: ${orderParams.orderType.toUpperCase()}`);
    console.log(`   Size: ${orderParams.size}`);
    
    if (orderParams.price) {
      console.log(`   Price: $${orderParams.price}`);
    }
    if (orderParams.timeInForce) {
      console.log(`   Time In Force: ${orderParams.timeInForce}`);
    }
    if (orderParams.reduceOnly) {
      console.log(`   Reduce Only: ${orderParams.reduceOnly}`);
    }
    if (orderParams.postOnly) {
      console.log(`   Post Only: ${orderParams.postOnly}`);
    }
    console.log('═══════════════════════════════════════════════════\n');

    // Validate order
    if (orderParams.orderType === 'limit' && !orderParams.price) {
      console.error('❌ Limit orders require a price!');
      return null;
    }

    // Place the order
    console.log('📝 Submitting order to Hyperliquid...');
    
    const response = await axios.post(
      `${API_URL}/hl/order`,
      {
        clientId: CLIENT_ID,
        ...orderParams,
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ ORDER PLACED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════');
    
    if (response.data) {
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    }
    
    console.log('═══════════════════════════════════════════════════\n');

    return response.data;

  } catch (error: any) {
    console.error('\n═══════════════════════════════════════════════════');
    console.error('❌ ORDER FAILED');
    console.error('═══════════════════════════════════════════════════');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    console.error('═══════════════════════════════════════════════════\n');
    return null;
  }
}

/**
 * Get current market price (example function)
 */
async function getMarketPrice(symbol: string): Promise<number | null> {
  try {
    const accessToken = await authenticate();
    if (!accessToken) return null;

    const response = await axios.get(`${API_URL}/hl/market/${symbol}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    return response.data.lastPrice || null;
  } catch (error) {
    console.error('Could not fetch market price');
    return null;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('📚 Usage Examples:\n');
  console.log('Market Orders:');
  console.log('  npm run order:adv -- market BTC buy 0.001');
  console.log('  npm run order:adv -- market ETH sell 0.01\n');
  
  console.log('Limit Orders:');
  console.log('  npm run order:adv -- limit BTC buy 0.001 45000');
  console.log('  npm run order:adv -- limit ETH sell 0.01 3500\n');
  
  console.log('Advanced Options:');
  console.log('  npm run order:adv -- limit BTC buy 0.001 45000 GTC');
  console.log('  npm run order:adv -- limit BTC buy 0.001 45000 GTC postOnly\n');
  
  process.exit(0);
}

const orderType = args[0] as 'market' | 'limit';
const symbol = args[1] || 'BTC';
const side = args[2] as 'buy' | 'sell' || 'buy';
const size = parseFloat(args[3] || '0.001');
const price = args[4] ? parseFloat(args[4]) : undefined;
const timeInForce = args[5] as 'GTC' | 'IOC' | 'FOK' | undefined;
const postOnly = args.includes('postOnly');
const reduceOnly = args.includes('reduceOnly');

const orderParams: OrderParams = {
  symbol,
  side,
  orderType,
  size,
  price,
  timeInForce,
  postOnly,
  reduceOnly,
};

// Execute the order
placeOrderAdvanced(orderParams);

