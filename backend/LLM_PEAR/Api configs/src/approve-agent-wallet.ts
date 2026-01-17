import { ExchangeClient, HttpTransport } from "@nktkas/hyperliquid";
import { privateKeyToAccount } from "viem/accounts";
import { appConfig } from "./config/app.config.js";

// Configuration
const MAIN_WALLET_PRIVATE_KEY = appConfig.PRIVATE_KEY;

// Your agent wallet address from Pear Protocol (loaded from .env via appConfig)
const AGENT_WALLET_ADDRESS = appConfig.AGENT_WALLET_ADDRESS || "0x135E2DAA75464b4dA48141883610bBBcE46b07d8";
const AGENT_NAME = "PearProtocol";

/**
 * Main function to approve agent wallet on Hyperliquid
 */
async function main() {
  console.log('🚀 Approve Agent Wallet Script\n');

  // Get optional arguments from CLI
  const args = process.argv.slice(2).filter(arg => !arg.startsWith("--"));
  const agentAddress = args.find(arg => arg.startsWith("0x") && arg.length === 42) || AGENT_WALLET_ADDRESS;
  const agentName = args.find(arg => !arg.startsWith("0x")) || AGENT_NAME;

  console.log(`📋 Configuration:`);
  console.log(`   Agent Wallet Address: ${agentAddress}`);
  console.log(`   Agent Name: ${agentName}`);
  console.log();

  // Safety check: Private Key
  if (!MAIN_WALLET_PRIVATE_KEY || MAIN_WALLET_PRIVATE_KEY.includes("YOUR_MAIN")) {
    console.error("❌ Error: Please set your PRIVATE_KEY in .env");
    return;
  }

  try {
    console.log("🔧 Setting up Main Wallet connection...");
    
    // Setup the wallet using Viem
    const formattedPrivateKey = MAIN_WALLET_PRIVATE_KEY.startsWith('0x') 
      ? MAIN_WALLET_PRIVATE_KEY 
      : '0x' + MAIN_WALLET_PRIVATE_KEY;

    const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
    
    console.log(`🔐 User Wallet: ${account.address}`);

    // Initialize Hyperliquid Exchange Client
    const transport = new HttpTransport();
    
    const client = new ExchangeClient({
      wallet: account,
      transport,
    });

    console.log('✅ Connected to Hyperliquid Exchange\n');

    // Approve Agent Wallet
    console.log(`📝 Approving agent wallet...`);
    console.log(`   Agent Address: ${agentAddress}`);
    console.log(`   Agent Name: ${agentName}`);
    console.log(`   (This signs on Hyperliquid L1, no gas fee required)`);
    console.log();
    
    const result = await client.approveAgent({
      agentAddress: agentAddress as `0x${string}`,
      agentName: agentName,
    });

    console.log('✅ Success! Agent Wallet Approved!');
    console.log(`   Status: ${result.status}`);
    console.log(`   Response:`, JSON.stringify(result.response, null, 2));
    console.log(`\n🎉 Agent wallet ${agentAddress} is now approved!`);
    console.log('💡 You can now use it for trading via Pear Protocol API.\n');
    
  } catch (error: any) {
    console.error("\n❌ Error approving agent wallet:");
    console.error(error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
  }
}

// Execute
main();

