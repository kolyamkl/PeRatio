/**
 * Integration Example - How to use Pear Protocol in another codebase
 * 
 * Copy this file and the utils/ folder to your new project
 */

import { authenticate } from '../utils/auth.js';
import { ensureAgentWallet } from '../utils/agent-wallet.js';
import { createApiClient } from '../utils/api-client.js';
import axios from 'axios';

// Configuration - Load from .env
const API_URL = process.env.API_URL || 'https://hl-v2.pearprotocol.io';
const CLIENT_ID = process.env.CLIENT_ID || 'HLHackathon9';

/**
 * Example 1: Simple Authentication & Get Agent Wallet
 */
export async function getAgentWalletInfo() {
  // Step 1: Authenticate
  const accessToken = await authenticate();
  if (!accessToken) {
    throw new Error('Authentication failed');
  }

  // Step 2: Get agent wallet
  const agentWallet = await ensureAgentWallet(accessToken);
  
  return {
    accessToken,
    agentWallet,
  };
}

/**
 * Example 2: Place an Order
 */
export async function placeOrder(orderParams: {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  size: number;
  price?: number;
}) {
  // Authenticate
  const accessToken = await authenticate();
  if (!accessToken) {
    throw new Error('Authentication failed');
  }

  // Place order via Pear Protocol API
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

  return response.data;
}

/**
 * Example 3: Using the API Client
 */
export async function useApiClient() {
  // Authenticate
  const accessToken = await authenticate();
  if (!accessToken) {
    throw new Error('Authentication failed');
  }

  // Create API client
  const api = createApiClient(accessToken);

  // Make API calls
  const agentWallet = await api.getAgentWallet();
  
  // Place order
  const order = await api.placeOrder({
    symbol: 'BTC',
    side: 'buy',
    size: 0.001,
    orderType: 'market',
  });

  return {
    agentWallet,
    order,
  };
}

/**
 * Example 4: Complete Trading Function
 */
export async function executeTrade(
  symbol: string,
  side: 'buy' | 'sell',
  size: number,
  orderType: 'market' | 'limit' = 'market',
  price?: number
) {
  try {
    // 1. Authenticate
    const accessToken = await authenticate();
    if (!accessToken) {
      throw new Error('Authentication failed');
    }

    // 2. Verify agent wallet
    const agentWallet = await ensureAgentWallet(accessToken);
    if (!agentWallet) {
      throw new Error('Agent wallet not available');
    }

    // 3. Place order
    const order = await placeOrder({
      symbol,
      side,
      orderType,
      size,
      price,
    });

    return {
      success: true,
      agentWallet,
      order,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    console.log('🚀 Integration Example\n');
    
    // Example 1: Get agent wallet
    const walletInfo = await getAgentWalletInfo();
    console.log('Agent Wallet:', walletInfo.agentWallet);
    
    // Example 2: Place order
    // const order = await placeOrder({
    //   symbol: 'BTC',
    //   side: 'buy',
    //   orderType: 'market',
    //   size: 0.001,
    // });
    // console.log('Order:', order);
  })();
}

