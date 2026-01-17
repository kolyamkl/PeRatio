# 🚀 Setup Pear Protocol in New Codebase

Complete guide to integrate Pear Protocol + Hyperliquid into a new project.

---

## 📋 Step 1: Copy Required Files

### Files to Copy:

1. **Utility Files** (from `src/utils/`):
   - `auth.ts` - Authentication
   - `agent-wallet.ts` - Agent wallet management
   - `api-client.ts` - API client class

2. **Config File** (from `src/config/`):
   - `app.config.ts` - Configuration

3. **Example** (optional):
   - `integration-example.ts` - Usage examples

### Your New Project Structure:

```
your-new-project/
├── src/
│   ├── pear-protocol/
│   │   ├── auth.ts
│   │   ├── agent-wallet.ts
│   │   └── api-client.ts
│   └── your-code.ts
├── .env
└── package.json
```

---

## 📦 Step 2: Install Dependencies

Add to your `package.json`:

```json
{
  "dependencies": {
    "ethers": "^6.13.4",
    "axios": "^1.7.9",
    "dotenv": "^16.4.7",
    "@nktkas/hyperliquid": "^0.30.2",
    "viem": "^2.21.45"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "tsx": "^4.19.2"
  }
}
```

Then run:
```bash
npm install
```

---

## 🔑 Step 3: Create .env File

Create `.env` in your project root:

```env
# Your main wallet private key
PRIVATE_KEY=0x0bdf16a63e821edbe14b8b0ec75378ce6bff7268a2f5ff6b2ec5911ad9e4099f

# Pear Protocol API
API_URL=https://hl-v2.pearprotocol.io
CLIENT_ID=HLHackathon9

# Your wallet addresses
AGENT_WALLET_ADDRESS=0x97964055012046D6C85416248D78B20D95d55ce6
BUILDER_ADDRESS=0xA47D4d99191db54A4829cdf3de2417E527c3b042
```

**⚠️ Important:** Add `.env` to `.gitignore`!

---

## 💻 Step 4: Use in Your Code

### Basic Usage:

```typescript
// your-code.ts
import { authenticate } from './pear-protocol/auth.js';
import { createApiClient } from './pear-protocol/api-client.js';

async function main() {
  // Authenticate
  const token = await authenticate();
  
  // Create API client
  const api = createApiClient(token);
  
  // Get agent wallet
  const wallet = await api.getAgentWallet();
  console.log('Agent wallet:', wallet.agentWalletAddress);
  
  // Place order
  const order = await api.placeOrder({
    symbol: 'BTC',
    side: 'buy',
    size: 0.001,
    orderType: 'market',
  });
  
  console.log('Order placed:', order);
}

main();
```

---

## 📝 Step 5: Minimal Integration Code

### Option 1: Simple Function

```typescript
import { authenticate } from './pear-protocol/auth.js';
import axios from 'axios';

const API_URL = 'https://hl-v2.pearprotocol.io';
const CLIENT_ID = 'HLHackathon9';

async function placeOrder(symbol: string, side: string, size: number) {
  const token = await authenticate();
  
  const response = await axios.post(
    `${API_URL}/hl/order`,
    {
      clientId: CLIENT_ID,
      symbol,
      side,
      orderType: 'market',
      size,
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data;
}
```

### Option 2: Using API Client

```typescript
import { authenticate } from './pear-protocol/auth.js';
import { createApiClient } from './pear-protocol/api-client.js';

async function trade() {
  const api = createApiClient(await authenticate());
  
  // Get wallet
  const wallet = await api.getAgentWallet();
  
  // Place order
  const order = await api.placeOrder({
    symbol: 'BTC',
    side: 'buy',
    size: 0.001,
    orderType: 'market',
  });
  
  return { wallet, order };
}
```

---

## 🔧 Step 6: TypeScript Configuration

If using TypeScript, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

---

## ✅ Step 7: Test It Works

Create a test file:

```typescript
// test-pear.ts
import { authenticate } from './pear-protocol/auth.js';
import { createApiClient } from './pear-protocol/api-client.js';

async function test() {
  console.log('Testing Pear Protocol integration...');
  
  const token = await authenticate();
  console.log('✅ Authenticated!');
  
  const api = createApiClient(token);
  const wallet = await api.getAgentWallet();
  console.log('✅ Agent wallet:', wallet.agentWalletAddress);
  
  console.log('✅ All tests passed!');
}

test();
```

Run it:
```bash
npx tsx test-pear.ts
```

---

## 📊 What Data You Need

### Required Credentials:

```typescript
export const PEAR_CONFIG = {
  PRIVATE_KEY: process.env.PRIVATE_KEY!,
  API_URL: process.env.API_URL || 'https://hl-v2.pearprotocol.io',
  CLIENT_ID: process.env.CLIENT_ID || 'HLHackathon9',
};
```

### Wallet Addresses:

```typescript
export const WALLETS = {
  USER: '0xE7AD793764B736dFF8ddF659D10CD3d98328c034',
  AGENT: '0x97964055012046D6C85416248D78B20D95d55ce6',
  BUILDER: '0xA47D4d99191db54A4829cdf3de2417E527c3b042',
};
```

---

## 🎯 Quick Start Template

### Minimal Working Example:

```typescript
// minimal-example.ts
import { authenticate } from './pear-protocol/auth.js';
import axios from 'axios';

const API_URL = 'https://hl-v2.pearprotocol.io';
const CLIENT_ID = 'HLHackathon9';

async function quickTrade() {
  // 1. Authenticate
  const token = await authenticate();
  
  // 2. Place order
  const order = await axios.post(
    `${API_URL}/hl/order`,
    {
      clientId: CLIENT_ID,
      symbol: 'BTC',
      side: 'buy',
      orderType: 'market',
      size: 0.001,
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return order.data;
}

quickTrade().then(console.log);
```

---

## 🔐 Security Checklist

- [ ] `.env` file created with credentials
- [ ] `.env` added to `.gitignore`
- [ ] Private key never committed to Git
- [ ] Dependencies installed
- [ ] Test script runs successfully

---

## 📚 Next Steps

1. ✅ Copy utility files
2. ✅ Install dependencies
3. ✅ Create `.env` file
4. ✅ Test authentication
5. ✅ Start trading!

---

## 🆘 Troubleshooting

**"Cannot find module"**
→ Check import paths match your folder structure

**"Authentication failed"**
→ Verify `PRIVATE_KEY` in `.env` is correct

**"Agent wallet not found"**
→ Run `npm start` in original project to verify wallet exists

**"API request failed"**
→ Check `API_URL` and `CLIENT_ID` are correct

---

## 📖 Reference

- See `EXPORT_DATA.json` for all your credentials
- See `integration-example.ts` for complete examples
- See `PORTABLE_PACKAGE.md` for file structure

---

**You're ready to integrate Pear Protocol into your new project! 🚀**

