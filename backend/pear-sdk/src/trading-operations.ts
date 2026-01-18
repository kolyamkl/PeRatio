import axios from 'axios';
import { config } from 'dotenv';

config();

const API_URL = process.env.API_URL || 'https://hl-v2.pearprotocol.io';
const CLIENT_ID = process.env.CLIENT_ID || 'HLHackathon9';

// Add your access token here (from the authentication output)
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIweEU3QUQ3OTM3NjRCNzM2ZEZGOGRkRjY1OUQxMENEM2Q5ODMyOGMwMzQiLCJhZGRyZXNzIjoiMHhFN0FENzkzNzY0QjczNmRGRjhkZEY2NTlEMTBDRDNkOTgzMjhjMDM0IiwiY2xpZW50SWQiOiJITEhhY2thdGhvbjkiLCJhcHBJZCI6ImVpcDcxMiIsImlhdCI6MTc2ODY0NzE3NSwiZXhwIjoxNzcxMjM5MTc1LCJqdGkiOiI0NGQxNDVkNy1jODc4LTQ0OTItYWNkZi1mYWNlNzY5NjNjYjUiLCJhdWQiOiJwZWFyLXByb3RvY29sLWNsaWVudCIsImlzcyI6InBlYXItcHJvdG9jb2wtYXBpIn0.Wm7F7abTqg4PHf2HcrmHZ7TDEt1Q0jDizpeMpbAJiRuJ67_oG5ZVkL0drtwgf6iB6mhutSo6glPbXlo__ZmK0r18Gpa0QmCQpRwpWgiwvAjKllAHsdBkUEjGSrt-TXDq6OR3GCrCnRPrnWFLQc5AcmOwBtvyZgp7u42HMMaC--l90JOWJOwXemzC-zG7X_5la-r9RdSxnqQPur3_zlIUFLNRDWxy-RWwH1pOnEV_QUDYK-gAgSLeVmDEdOeAMiU059mvX-Pk9lN7XtK3DreOCDFySADKNKI3IwJ8LjeAiM3R1TlZk44blhI826Tb1exifsuy9A-HlGUMa7ldg_AmxQ';

console.log('🔍 DEBUG: Trading Operations Setup');
console.log(`🔍 DEBUG: API_URL = ${API_URL}`);
console.log(`🔍 DEBUG: CLIENT_ID = ${CLIENT_ID}`);
console.log(`🔍 DEBUG: Access Token loaded: ${ACCESS_TOKEN ? 'YES' : 'NO'}`);

/**
 * Get Agent Wallet Status
 * This verifies your agent wallet is approved and working
 */
async function getAgentWalletStatus() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📊 Getting Agent Wallet Status');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    const response = await axios.get(`${API_URL}/agentWallet`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      params: {
        clientId: CLIENT_ID,
      },
    });

    console.log('✅ Agent Wallet Status Retrieved');
    console.log(`🔍 DEBUG: Response status: ${response.status}`);
    console.log(`🔍 DEBUG: Agent Wallet Data:`, JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to get agent wallet status');
    if (error.response) {
      console.error(`🔍 DEBUG: Status: ${error.response.status}`);
      console.error(`🔍 DEBUG: Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`🔍 DEBUG: Error: ${error.message}`);
    }
    return null;
  }
}

/**
 * Get User State
 * Get account balances and positions
 */
async function getUserState() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('💰 Getting User State (Balances & Positions)');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    const response = await axios.get(`${API_URL}/hl/user-state`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ User State Retrieved');
    console.log(`🔍 DEBUG: Response status: ${response.status}`);
    console.log(`🔍 DEBUG: User State:`, JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to get user state');
    if (error.response) {
      console.error(`🔍 DEBUG: Status: ${error.response.status}`);
      console.error(`🔍 DEBUG: Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`🔍 DEBUG: Error: ${error.message}`);
    }
    return null;
  }
}

/**
 * Get Meta Info
 * Get general protocol information
 */
async function getMetaInfo() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📈 Getting Meta/System Info');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    const response = await axios.get(`${API_URL}/hl/meta`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Meta Info Retrieved');
    console.log(`🔍 DEBUG: Response status: ${response.status}`);
    console.log(`🔍 DEBUG: Meta Info:`, JSON.stringify(response.data, null, 2).substring(0, 500));

    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to get meta info');
    if (error.response) {
      console.error(`🔍 DEBUG: Status: ${error.response.status}`);
      console.error(`🔍 DEBUG: Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`🔍 DEBUG: Error: ${error.message}`);
    }
    return null;
  }
}

/**
 * Place a Market Order (Example - DO NOT RUN WITHOUT MODIFYING)
 * This is a template for placing orders
 */
async function placeOrder(symbol: string, side: 'buy' | 'sell', size: number) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🚀 Placing Order');
  console.log('═══════════════════════════════════════════════════\n');

  const orderData = {
    clientId: CLIENT_ID,
    symbol: symbol,
    side: side,
    size: size,
    orderType: 'market',
  };

  console.log('🔍 DEBUG: Order details:', orderData);

  try {
    const response = await axios.post(`${API_URL}/orders`, orderData, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Order Placed Successfully!');
    console.log(`🔍 DEBUG: Response status: ${response.status}`);
    console.log(`🔍 DEBUG: Order Result:`, JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to place order');
    if (error.response) {
      console.error(`🔍 DEBUG: Status: ${error.response.status}`);
      console.error(`🔍 DEBUG: Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`🔍 DEBUG: Error: ${error.message}`);
    }
    return null;
  }
}

/**
 * Main function to test all operations
 */
async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🚀 Testing Agent Wallet Trading Operations');
  console.log('═══════════════════════════════════════════════════\n');

  if (!ACCESS_TOKEN) {
    console.error('❌ No ACCESS_TOKEN provided!');
    console.log('💡 Add your access token to .env file:');
    console.log('   ACCESS_TOKEN=your_token_here');
    return;
  }

  // Test 1: Get Agent Wallet Status (verify agent wallet is approved)
  const agentWallet = await getAgentWalletStatus();
  
  if (agentWallet && agentWallet.agentWalletAddress) {
    console.log('\n✅ Agent Wallet Confirmed!');
    console.log(`   Address: ${agentWallet.agentWalletAddress}`);
  }

  // Test 2: Get User State (balances and positions)
  await getUserState();

  // Test 3: Get Meta Info (available markets, etc.)
  await getMetaInfo();

  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ Testing Complete!');
  console.log('═══════════════════════════════════════════════════');
  console.log('\n💡 Next Steps:');
  console.log('   - If account info shows your agent wallet, you\'re ready!');
  console.log('   - Use placeOrder() function to execute trades');
  console.log('   - Check Pear Protocol docs for all available endpoints\n');
}

// Run the tests
main().catch((error) => {
  console.error('🔍 DEBUG: Unhandled error:', error);
});

