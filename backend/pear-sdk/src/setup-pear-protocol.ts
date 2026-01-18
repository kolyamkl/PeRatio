import { ExchangeClient, HttpTransport } from "@nktkas/hyperliquid";
import { privateKeyToAccount } from "viem/accounts";
import { config } from 'dotenv';

config();

// Official Pear Protocol Builder Address from documentation
const PEAR_BUILDER_ADDRESS = "0x563b4cc82aa48e5b4ee0be1564ad7f547f5f399a";

// Your custom agent address (from Pear Protocol API)
const CUSTOM_AGENT_ADDRESS = "0xA47D4d99191db54A4829cdf3de2417E527c3b042";

async function setupPearProtocol(privateKey: string) {
  if (!privateKey) {
    console.error('❌ Error: PRIVATE_KEY not found');
    return;
  }

  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
  const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);

  const transport = new HttpTransport({
    url: "https://api.hyperliquid.xyz",
  });

  const client = new ExchangeClient({
    transport,
    account,
  });

  console.log('🚀 Setting up Pear Protocol\n');
  console.log("👤 User Wallet:", account.address);
  console.log("🏗️  Pear Builder:", PEAR_BUILDER_ADDRESS);
  console.log("🤖 Agent Wallet:", CUSTOM_AGENT_ADDRESS);
  console.log();

  try {
    // Step 1: Approve builder fee
    console.log("📝 Step 1: Approving Pear Protocol builder...");
    const builderResult = await client.approveBuilderFee({
      builder: PEAR_BUILDER_ADDRESS as `0x${string}`,
      maxFeeRate: "1%" as `${string}%`,
    });
    console.log("✅ Builder approved:", JSON.stringify(builderResult, null, 2));
    console.log();

    // Step 2: Approve agent wallet
    console.log("📝 Step 2: Approving agent wallet...");
    const agentResult = await client.approveAgent({
      agentAddress: CUSTOM_AGENT_ADDRESS as `0x${string}`,
      agentName: "PearProtocol",
    });
    console.log("✅ Agent wallet approved:", JSON.stringify(agentResult, null, 2));
    console.log();

    // Summary
    console.log("\n═══════════════════════════════════════════════════");
    console.log("🎉 Setup Complete!");
    console.log("═══════════════════════════════════════════════════");
    console.log("User address:", account.address);
    console.log("Agent address:", CUSTOM_AGENT_ADDRESS);
    console.log("Pear Builder:", PEAR_BUILDER_ADDRESS);
    console.log("\n✅ Your agent wallet is now approved and ready to trade!");
    console.log("═══════════════════════════════════════════════════\n");

    return {
      userAddress: account.address,
      agentAddress: CUSTOM_AGENT_ADDRESS,
      pearBuilder: PEAR_BUILDER_ADDRESS,
    };

  } catch (error: any) {
    console.error("\n❌ Error during setup:");
    console.error(error.message);
    if (error.response) {
      console.error("Response:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Run the setup
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ PRIVATE_KEY not found in .env');
  process.exit(1);
}

setupPearProtocol(privateKey)
  .then(() => {
    console.log('✅ All done! You can now use Pear Protocol API.');
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });

