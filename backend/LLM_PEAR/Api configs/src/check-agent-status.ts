import { authenticate } from './utils/auth.js';
import axios from 'axios';
import { config } from 'dotenv';

config();

const API_URL = process.env.API_URL || 'https://hl-v2.pearprotocol.io';
const CLIENT_ID = process.env.CLIENT_ID || 'HLHackathon9';

async function checkAgentWalletStatus() {
  console.log('🔍 Checking Agent Wallet Status\n');

  try {
    // Authenticate first
    console.log('🔐 Authenticating...');
    const accessToken = await authenticate();
    
    if (!accessToken) {
      console.error('❌ Authentication failed');
      return;
    }

    console.log('✅ Authenticated!\n');

    // Check agent wallet status
    console.log('📊 Fetching agent wallet status...');
    const response = await axios.get(`${API_URL}/agentWallet`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        clientId: CLIENT_ID,
      },
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 AGENT WALLET STATUS');
    console.log('═══════════════════════════════════════════════════');
    
    if (response.data && response.data.agentWalletAddress) {
      console.log('✅ Status: ACTIVE');
      console.log(`🏦 Agent Wallet Address: ${response.data.agentWalletAddress}`);
      
      if (response.data.createdAt) {
        console.log(`📅 Created At: ${response.data.createdAt}`);
      }
      if (response.data.expiresAt) {
        console.log(`⏰ Expires At: ${response.data.expiresAt}`);
      }
      if (response.data.status) {
        console.log(`📋 Status Details: ${response.data.status}`);
      }
      
      console.log('\n💡 Your agent wallet is ready for trading!');
    } else {
      console.log('⚠️  Status: NOT_FOUND or PENDING');
      console.log('💡 Agent wallet may need to be created or approved.');
    }
    
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📄 Full Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log();

  } catch (error: any) {
    console.error('\n❌ Error checking agent wallet status:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 404) {
        console.log('\n💡 No agent wallet found. Run `npm start` to create one.');
      }
    } else {
      console.error(`   Error: ${error.message}`);
    }
  }
}

checkAgentWalletStatus();

