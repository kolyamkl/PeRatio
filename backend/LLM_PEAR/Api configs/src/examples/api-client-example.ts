/**
 * API Client Example - Using the PearApiClient class
 * 
 * This shows how to use the API client for making requests
 */

import { authenticate } from '../utils/auth.js';
import { createApiClient } from '../utils/api-client.js';

async function main() {
  console.log('🚀 API Client Example\n');

  // Step 1: Authenticate
  const accessToken = await authenticate();
  
  if (!accessToken) {
    console.error('❌ Authentication failed');
    return;
  }

  console.log('✅ Authenticated!\n');

  // Step 2: Create API client
  const api = createApiClient(accessToken);
  
  // Step 3: Use the API client
  try {
    // Get agent wallet
    console.log('📊 Fetching agent wallet...');
    const agentWallet = await api.getAgentWallet();
    console.log('Agent Wallet:', agentWallet);

    // Example: Make other API calls
    // const orders = await api.get('/orders', { clientId: 'HLHackathon9' });
    // const userState = await api.get('/hl/user-state');
    
    console.log('\n✅ API Client is working!');
    console.log('💡 You can now use api.get(), api.post(), api.delete() for any endpoint');
    
  } catch (error) {
    console.error('❌ API call failed:', error);
  }
}

main().catch(console.error);

