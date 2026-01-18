import { ExchangeClient, HttpTransport } from "@nktkas/hyperliquid";
import { privateKeyToAccount } from "viem/accounts";
import { appConfig } from "./config/app.config.js";

// 1. CONFIGURATION

// Replace with your MAIN WALLET Private Key (The one that holds your funds)
// We try to load it from .env first
const MAIN_WALLET_PRIVATE_KEY = appConfig.PRIVATE_KEY;

// Default builder address to approve (Pear Protocol builder)
const DEFAULT_BUILDER_ADDRESS = "0xA47D4d99191db54A4829cdf3de2417E527c3b042";

// Default max fee rate (0.1% = 10 basis points)
const DEFAULT_MAX_FEE_RATE = "0.1%";

/**
 * Main function to approve builder fees on Hyperliquid
 */
async function main() {
  console.log('🚀 Approve Builder Fee Script\n');
  
  // Get optional arguments from CLI
  // Usage: npm run approve:builder -- [builderAddress] [maxFeeRate]
  const args = process.argv.slice(2).filter(arg => !arg.startsWith("--"));
  
  const builderAddress = args.find(arg => arg.startsWith("0x") && arg.length === 42) || DEFAULT_BUILDER_ADDRESS;
  const maxFeeRate = args.find(arg => arg.includes("%")) || DEFAULT_MAX_FEE_RATE;

  console.log(`📋 Configuration:`);
  console.log(`   Builder Address: ${builderAddress}`);
  console.log(`   Max Fee Rate: ${maxFeeRate}`);
  console.log();

  // Safety check: Private Key
  if (!MAIN_WALLET_PRIVATE_KEY || MAIN_WALLET_PRIVATE_KEY.includes("YOUR_MAIN")) {
    console.error("❌ Error: Please set your PRIVATE_KEY in .env or update the script.");
    return;
  }

  try {
    console.log("🔧 Setting up Main Wallet connection...");
    
    // Setup the wallet using Viem (Standard for this SDK)
    // Ensure private key has 0x prefix
    const formattedPrivateKey = MAIN_WALLET_PRIVATE_KEY.startsWith('0x') 
      ? MAIN_WALLET_PRIVATE_KEY 
      : '0x' + MAIN_WALLET_PRIVATE_KEY;

    const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
    
    console.log(`🔐 Authenticating as: ${account.address}`);

    // Initialize Hyperliquid Exchange Client
    // HttpTransport connects to Hyperliquid Mainnet by default
    const transport = new HttpTransport();
    
    const client = new ExchangeClient({
      wallet: account,
      transport,
    });

    console.log('✅ Connected to Hyperliquid Exchange\n');

    // 2. The Action: Approve Builder Fee
    console.log(`📝 Sending 'Approve Builder Fee' transaction...`);
    console.log(`   Builder Address: ${builderAddress}`);
    console.log(`   Max Fee Rate: ${maxFeeRate} (This signs on Hyperliquid L1, no gas fee required)`);
    
    const result = await client.approveBuilderFee({
      builder: builderAddress as `0x${string}`,
      maxFeeRate: maxFeeRate as `${string}%`,
    });

    console.log('✅ Success! Builder Fee Approved.');
    console.log(`   Status: ${result.status}`);
    console.log(`   Response: ${JSON.stringify(result.response, null, 2)}`);
    console.log(`\n🎉 You have approved a max fee rate of ${maxFeeRate} for builder ${builderAddress}!`);
    
  } catch (error: any) {
    console.error("❌ Error approving builder fee:", error);
  }
}

// Execute
main();

