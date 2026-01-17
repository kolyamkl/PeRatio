/**
 * Simple Example - Basic Usage
 * 
 * This shows the simplest way to authenticate and get your agent wallet
 */

import { authenticate } from '../utils/auth.js';
import { ensureAgentWallet } from '../utils/agent-wallet.js';

async function main() {
  console.log('🚀 Simple Example - Getting Started\n');

  // Step 1: Authenticate
  const accessToken = await authenticate();
  
  if (!accessToken) {
    console.error('❌ Authentication failed');
    return;
  }

  console.log('✅ Authenticated!\n');

  // Step 2: Get or create agent wallet
  const agentWalletAddress = await ensureAgentWallet(accessToken);
  
  if (agentWalletAddress) {
    console.log(`\n✅ Agent Wallet Ready: ${agentWalletAddress}`);
    console.log('\n💡 You can now use this accessToken for API calls!');
    console.log(`   Token: ${accessToken.substring(0, 50)}...`);
  } else {
    console.error('❌ Failed to get agent wallet');
  }
}

main().catch(console.error);

