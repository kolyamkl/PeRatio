import { ethers } from 'ethers';
import axios from 'axios';
import { config } from 'dotenv';

config();

// Configuration
const MASTER_PRIVATE_KEY = process.env.PRIVATE_KEY;
const BUILDER_ADDRESS = "0xA47D4d99191db54A4829cdf3de2417E527c3b042";
const MAX_FEE_RATE = "0.1%";
const HYPERLIQUID_CHAIN = "Mainnet";
const SIGNATURE_CHAIN_ID = "0xa4b1"; // Arbitrum One chain ID

/**
 * Main function to approve builder fees on Hyperliquid
 */
async function main() {
  console.log('🚀 Approve Builder Fee Script (Direct API)\n');

  if (!MASTER_PRIVATE_KEY) {
    console.error('❌ Error: PRIVATE_KEY not found in .env');
    return;
  }

  try {
    // Setup wallet
    const formattedPrivateKey = MASTER_PRIVATE_KEY.startsWith('0x') 
      ? MASTER_PRIVATE_KEY 
      : '0x' + MASTER_PRIVATE_KEY;

    const wallet = new ethers.Wallet(formattedPrivateKey);
    console.log(`🔐 Master Wallet: ${wallet.address}`);
    console.log(`📋 Builder Address: ${BUILDER_ADDRESS}`);
    console.log(`📊 Max Fee Rate: ${MAX_FEE_RATE}`);
    console.log();

    // Create nonce (timestamp in milliseconds)
    const nonce = Date.now();

    // Create the action object - this is what gets signed
    const action = {
      type: "approveBuilderFee",
      hyperliquidChain: HYPERLIQUID_CHAIN,
      signatureChainId: SIGNATURE_CHAIN_ID,
      builder: BUILDER_ADDRESS,
      maxFeeRate: MAX_FEE_RATE,
      nonce: nonce
    };

    console.log('📝 Action:', JSON.stringify(action, null, 2));
    console.log();

    // Define EIP-712 domain and types for Hyperliquid
    const domain = {
      name: 'HyperliquidSignTransaction',
      version: '1',
      chainId: parseInt(SIGNATURE_CHAIN_ID, 16),
      verifyingContract: '0x0000000000000000000000000000000000000000'
    };

    const types = {
      HyperliquidTransaction: [
        { name: 'type', type: 'string' },
        { name: 'hyperliquidChain', type: 'string' },
        { name: 'signatureChainId', type: 'string' },
        { name: 'builder', type: 'address' },
        { name: 'maxFeeRate', type: 'string' },
        { name: 'nonce', type: 'uint64' }
      ]
    };

    console.log('✍️ Signing transaction with EIP-712...');
    
    // Sign the typed data
    const signature = await wallet.signTypedData(domain, types, action);
    
    console.log(`✅ Signature generated: ${signature.substring(0, 20)}...`);
    console.log();

    // Prepare the request body - action and signature as separate fields
    const requestBody = {
      action: action,
      nonce: nonce,
      signature: signature
    };

    console.log('📤 Sending to Hyperliquid API...');
    console.log('   URL: https://api.hyperliquid.xyz/exchange');
    console.log();

    // Send to Hyperliquid
    const response = await axios.post(
      'https://api.hyperliquid.xyz/exchange',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Success! Builder Fee Approved!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    console.log();
    console.log(`🎉 You have approved builder ${BUILDER_ADDRESS}`);
    console.log(`   with a max fee rate of ${MAX_FEE_RATE}!`);

  } catch (error: any) {
    console.error('\n❌ Error approving builder fee:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

main();

