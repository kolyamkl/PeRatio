import { ethers } from 'ethers';
import axios from 'axios';
import { config } from 'dotenv';

config();

const API_URL = process.env.API_URL || 'https://hl-v2.pearprotocol.io';
const CLIENT_ID = process.env.CLIENT_ID || 'HLHackathon9';
const privateKey = process.env.PRIVATE_KEY || '0x0bdf16a63e821edbe14b8b0ec75378ce6bff7268a2f5ff6b2ec5911ad9e4099f';

console.log('🔍 DEBUG: Environment configuration loaded');
console.log(`🔍 DEBUG: API_URL = ${API_URL}`);
console.log(`🔍 DEBUG: CLIENT_ID = ${CLIENT_ID}`);
console.log(`🔍 DEBUG: Private key loaded: ${privateKey ? 'YES' : 'NO'}`);

async function authenticate(): Promise<string | null> {
  console.log('\n🔍 DEBUG: Starting authentication process...');
  
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY not found in .env');
    return null;
  }

  const wallet = new ethers.Wallet(privateKey);
  console.log(`🔐 Authenticating as ${wallet.address}`);
  console.log(`🔍 DEBUG: Wallet created successfully`);

  try {
    // Step 1: Get EIP-712 message
    console.log('\n🔍 DEBUG: Step 1 - Getting EIP-712 message...');
    console.log(`🔍 DEBUG: Request URL: ${API_URL}/auth/eip712-message`);
    console.log(`🔍 DEBUG: Request params:`, { address: wallet.address, clientId: CLIENT_ID });
    
    const msgResponse = await axios.get(`${API_URL}/auth/eip712-message`, {
      params: { address: wallet.address, clientId: CLIENT_ID },
    });
    const eipData = msgResponse.data;
    
    console.log('✅ EIP-712 message received');
    console.log(`🔍 DEBUG: Response status: ${msgResponse.status}`);
    console.log(`🔍 DEBUG: EIP-712 data:`, JSON.stringify(eipData, null, 2));

    // Step 2: Sign the message
    console.log('\n🔍 DEBUG: Step 2 - Signing the message...');
    const domain = eipData.domain;
    const types = { ...eipData.types };
    const value = eipData.message;

    console.log(`🔍 DEBUG: Domain:`, JSON.stringify(domain, null, 2));
    console.log(`🔍 DEBUG: Message value:`, JSON.stringify(value, null, 2));

    if (types.EIP712Domain) {
      console.log('🔍 DEBUG: Removing EIP712Domain from types');
      delete types.EIP712Domain;
    }

    console.log(`🔍 DEBUG: Types:`, JSON.stringify(types, null, 2));
    console.log('🔍 DEBUG: Signing typed data...');
    
    const signature = await wallet.signTypedData(domain, types, value);
    
    console.log('✅ Message signed successfully');
    console.log(`🔍 DEBUG: Signature: ${signature}`);

    // Step 3: Login
    console.log('\n🔍 DEBUG: Step 3 - Logging in...');
    const loginPayload = {
      method: 'eip712',
      address: wallet.address,
      clientId: CLIENT_ID,
      details: { signature, timestamp: value.timestamp },
    };
    console.log(`🔍 DEBUG: Login URL: ${API_URL}/auth/login`);
    console.log(`🔍 DEBUG: Login payload:`, JSON.stringify(loginPayload, null, 2));
    
    const loginResponse = await axios.post(`${API_URL}/auth/login`, loginPayload);

    console.log("✅ Authentication successful!");
    console.log(`🔍 DEBUG: Login response status: ${loginResponse.status}`);
    console.log(`🔍 DEBUG: Full access token:\n${loginResponse.data.accessToken}`);
    
    return loginResponse.data.accessToken;
  } catch (error: any) {
    console.error("\n❌ Authentication failed!");
    console.error("🔍 DEBUG: Error details:");
    if (error.response) {
      console.error(`🔍 DEBUG: Response status: ${error.response.status}`);
      console.error(`🔍 DEBUG: Response data:`, JSON.stringify(error.response.data, null, 2));
      console.error(`🔍 DEBUG: Response headers:`, JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      console.error("🔍 DEBUG: No response received from server");
      console.error(`🔍 DEBUG: Request details:`, error.request);
    } else {
      console.error(`🔍 DEBUG: Error message: ${error.message}`);
    }
    console.error(`🔍 DEBUG: Error stack:`, error.stack);
    return null;
  }
}

async function checkAgentWalletStatus(token: string): Promise<any> {
  console.log('\n🔍 DEBUG: Phase 1 - Checking Agent Wallet Status...');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    const statusUrl = `${API_URL}/agentWallet`;
    console.log(`🔍 DEBUG: Request URL: ${statusUrl}`);
    console.log(`🔍 DEBUG: Authorization: Bearer ${token.substring(0, 30)}...`);
    
    const response = await axios.get(statusUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      params: {
        clientId: CLIENT_ID,
      },
    });

    console.log('✅ Agent Wallet Status Retrieved');
    console.log(`🔍 DEBUG: Response status: ${response.status}`);
    console.log(`🔍 DEBUG: Agent Wallet Data:`, JSON.stringify(response.data, null, 2));

    const agentData = response.data;
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 AGENT WALLET STATUS:');
    console.log('═══════════════════════════════════════════════════');
    
    // Check if response is empty or has no meaningful data
    if (!agentData || Object.keys(agentData).length === 0) {
      console.log('📭 Status: NOT_FOUND (Empty Response)');
      console.log('💡 No agent wallet exists yet.');
      console.log('📋 Next Step: Create a new agent wallet (Phase 2)');
      console.log('═══════════════════════════════════════════════════\n');
      return { status: 'NOT_FOUND' };
    }
    
    // Check if agent wallet address exists (even without explicit status)
    const agentAddress = agentData.agentWalletAddress || agentData.agentAddress || agentData.address;
    
    if (agentAddress) {
      console.log('✅ Status: CREATED (Pending Approval)');
      console.log(`🏦 Agent Wallet Address: ${agentAddress}`);
      
      if (agentData.createdAt) {
        console.log(`📅 Created: ${agentData.createdAt}`);
      }
      if (agentData.expiresAt) {
        console.log(`📅 Expires: ${agentData.expiresAt}`);
      }
      
      console.log('\n⚠️ IMPORTANT: Agent wallet needs approval on Hyperliquid!');
      console.log('💡 You must approve this wallet on Hyperliquid Exchange to enable trading');
      
      // Add status field for consistency
      agentData.status = agentData.status || 'PENDING_APPROVAL';
      agentData.address = agentAddress;
    } else if (agentData.status === 'ACTIVE') {
      console.log('✅ Status: ACTIVE');
      console.log(`🏦 Agent Wallet Address: ${agentData.address || 'N/A'}`);
      console.log(`📅 Created: ${agentData.createdAt || 'N/A'}`);
      console.log(`📅 Expires: ${agentData.expiresAt || 'N/A'}`);
      console.log('\n💡 Your agent wallet is ready to use for trading!');
    } else if (agentData.status === 'EXPIRED') {
      console.log('⚠️ Status: EXPIRED');
      console.log('💡 You need to create a new agent wallet (Phase 2)');
    } else {
      console.log(`ℹ️ Status: ${agentData.status || 'UNKNOWN'}`);
    }
    
    console.log('═══════════════════════════════════════════════════\n');

    return agentData;

  } catch (error: any) {
    console.log('\n⚠️ Agent Wallet Status Check:');
    
    if (error.response?.status === 404) {
      console.log('📭 Status: NOT_FOUND');
      console.log('💡 No agent wallet exists yet. You need to create one (Phase 2)');
      console.log(`🔍 DEBUG: Response:`, JSON.stringify(error.response?.data, null, 2));
      return { status: 'NOT_FOUND' };
    } else {
      console.error('❌ Failed to check agent wallet status');
      console.error('🔍 DEBUG: Error details:');
      if (error.response) {
        console.error(`🔍 DEBUG: Response status: ${error.response.status}`);
        console.error(`🔍 DEBUG: Response data:`, JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('🔍 DEBUG: No response received from server');
      } else {
        console.error(`🔍 DEBUG: Error message: ${error.message}`);
      }
      console.error(`🔍 DEBUG: Error stack:`, error.stack);
      return null;
    }
  }
}

async function createAgentWallet(token: string): Promise<any> {
  console.log('\n🔧 DEBUG: Phase 2 - Creating Agent Wallet...');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    const createUrl = `${API_URL}/agentWallet`;
    console.log(`🔍 DEBUG: Request URL: ${createUrl}`);
    console.log(`🔍 DEBUG: Authorization: Bearer ${token.substring(0, 30)}...`);
    console.log(`🔍 DEBUG: Client ID: ${CLIENT_ID}`);
    
    const response = await axios.post(
      createUrl,
      {
        clientId: CLIENT_ID,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Agent Wallet Created Successfully!');
    console.log(`🔍 DEBUG: Response status: ${response.status}`);
    console.log(`🔍 DEBUG: Response data:`, JSON.stringify(response.data, null, 2));

    const walletData = response.data;
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🎉 NEW AGENT WALLET CREATED:');
    console.log('═══════════════════════════════════════════════════');
    console.log(`🏦 Agent Wallet Address: ${walletData.agentWalletAddress || walletData.agentAddress || walletData.address || 'N/A'}`);
    console.log(`📅 Created At: ${walletData.createdAt || new Date().toISOString()}`);
    console.log(`📋 Status: ${walletData.status || 'PENDING_APPROVAL'}`);
    
    if (walletData.expiresAt) {
      console.log(`⏰ Expires At: ${walletData.expiresAt}`);
    }
    
    if (walletData.message) {
      console.log(`💬 Message: ${walletData.message}`);
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('⚠️ IMPORTANT: Agent wallet requires approval!');
    console.log('📝 Next Step: Phase 3 - Approve the agent wallet on Hyperliquid');
    console.log('💡 You must approve this wallet on Hyperliquid Exchange to enable trading\n');

    return walletData;

  } catch (error: any) {
    console.error('\n❌ Failed to create agent wallet!');
    console.error('🔍 DEBUG: Error details:');
    
    if (error.response) {
      console.error(`🔍 DEBUG: Response status: ${error.response.status}`);
      console.error(`🔍 DEBUG: Response data:`, JSON.stringify(error.response.data, null, 2));
      console.error(`🔍 DEBUG: Response headers:`, JSON.stringify(error.response.headers, null, 2));
      
      if (error.response.status === 400) {
        console.error('\n💡 Possible reasons:');
        console.error('   - Agent wallet already exists (check status first)');
        console.error('   - Invalid client ID');
        console.error('   - Missing required parameters');
      } else if (error.response.status === 401) {
        console.error('\n💡 Authentication issue - access token may be expired');
      } else if (error.response.status === 409) {
        console.error('\n💡 Agent wallet already exists for this user');
      }
    } else if (error.request) {
      console.error('🔍 DEBUG: No response received from server');
      console.error(`🔍 DEBUG: Request details:`, error.request);
    } else {
      console.error(`🔍 DEBUG: Error message: ${error.message}`);
    }
    console.error(`🔍 DEBUG: Error stack:`, error.stack);
    return null;
  }
}

async function createAgent() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🚀 Starting Agent Wallet Creation Process');
  console.log('═══════════════════════════════════════════════════\n');
  
  // Step 1: Authenticate
  const token = await authenticate();
  
  if (!token) {
    console.log('\n🔍 DEBUG: Authentication returned null token');
    console.log('❌ Failed to create agent - no access token');
    return;
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('🎉 FULL ACCESS TOKEN (copy this):');
  console.log('═══════════════════════════════════════════════════');
  console.log(token);
  console.log('═══════════════════════════════════════════════════');
  console.log(`🔍 DEBUG: Token length: ${token.length} characters`);
  console.log('\n✅ Authentication Complete - Ready to use with API requests!');
  console.log('═══════════════════════════════════════════════════\n');

  // Step 2: Check Agent Wallet Status (Phase 1)
  const agentStatus = await checkAgentWalletStatus(token);
  
  if (!agentStatus) {
    console.log('❌ Could not determine agent wallet status');
    return;
  }

  console.log('\n🔍 DEBUG: Next steps based on status:');
  
  if (agentStatus.status === 'ACTIVE') {
    console.log('✅ Agent wallet is active and ready!');
    console.log('💡 You can now proceed to use it for trading operations.');
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ All Phases Complete!');
    console.log('═══════════════════════════════════════════════════\n');
    return;
  }
  
  if (agentStatus.status === 'PENDING_APPROVAL') {
    console.log('⚠️ Agent wallet exists but needs approval on Hyperliquid');
    console.log(`🏦 Agent Wallet Address: ${agentStatus.address}`);
    console.log('\n📋 Manual Steps Required:');
    console.log('   1. Go to Hyperliquid Exchange (https://app.hyperliquid.xyz)');
    console.log('   2. Connect your wallet (0xE7AD793764B736dFF8ddF659D10CD3d98328c034)');
    console.log(`   3. Approve the agent wallet: ${agentStatus.address}`);
    console.log('   4. Once approved, you can use it for trading via Pear Protocol API');
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Agent Wallet Created - Awaiting Approval!');
    console.log('═══════════════════════════════════════════════════\n');
    return;
  }
  
  if (agentStatus.status === 'NOT_FOUND' || agentStatus.status === 'EXPIRED') {
    console.log('📋 Status indicates we need to create a new agent wallet');
    console.log('🚀 Proceeding to Phase 2...\n');
    
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Phase 1 Complete!');
    console.log('═══════════════════════════════════════════════════\n');
    
    // Step 3: Create Agent Wallet (Phase 2)
    const walletData = await createAgentWallet(token);
    
    if (!walletData) {
      console.log('❌ Could not create agent wallet');
      return;
    }
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Phase 2 Complete!');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📝 TODO: Phase 3 - Implement approval flow');
    console.log('💡 The user needs to sign an approval message to activate the wallet');
  } else {
    console.log(`⚠️ Unknown status: ${agentStatus.status}`);
  }
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ Process Complete!');
  console.log('═══════════════════════════════════════════════════\n');
}

console.log('🔍 DEBUG: Script started');
createAgent().then(() => {
  console.log('🔍 DEBUG: Script completed');
}).catch((error) => {
  console.error('🔍 DEBUG: Unhandled error in createAgent:');
  console.error(error);
});

