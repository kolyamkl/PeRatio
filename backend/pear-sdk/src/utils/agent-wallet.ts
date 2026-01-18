import axios from 'axios';
import { getConfig } from './auth.js';

const { apiUrl, clientId } = getConfig();

/**
 * Check agent wallet status
 * @param accessToken - Your access token from authentication
 * @returns Agent wallet data or null
 */
export async function getAgentWalletStatus(accessToken: string) {
  try {
    const response = await axios.get(`${apiUrl}/agentWallet`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        clientId: clientId,
      },
    });

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { status: 'NOT_FOUND' };
    }
    console.error('Error checking agent wallet:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Create a new agent wallet
 * @param accessToken - Your access token from authentication
 * @returns Agent wallet data or null
 */
export async function createAgentWallet(accessToken: string) {
  try {
    const response = await axios.post(
      `${apiUrl}/agentWallet`,
      {
        clientId: clientId,
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Agent Wallet Created!');
    console.log(`   Address: ${response.data.agentWalletAddress}`);
    console.log('⚠️  You must approve this wallet on Hyperliquid Exchange');
    
    return response.data;
  } catch (error: any) {
    console.error('Error creating agent wallet:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Get or create agent wallet (convenience function)
 * @param accessToken - Your access token from authentication
 * @returns Agent wallet address or null
 */
export async function ensureAgentWallet(accessToken: string): Promise<string | null> {
  // Check if wallet exists
  const status = await getAgentWalletStatus(accessToken);
  
  if (status && status.agentWalletAddress) {
    console.log(`✅ Agent Wallet Found: ${status.agentWalletAddress}`);
    return status.agentWalletAddress;
  }
  
  // Create if doesn't exist
  if (status?.status === 'NOT_FOUND') {
    console.log('📝 Creating new agent wallet...');
    const newWallet = await createAgentWallet(accessToken);
    return newWallet?.agentWalletAddress || null;
  }
  
  return null;
}

