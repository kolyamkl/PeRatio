# 📦 Portable Pear Protocol Package

This guide shows you how to use Pear Protocol + Hyperliquid in a **different codebase**.

---

## 📋 What You Need to Copy

### 1. Required Files

Copy these files/folders to your new project:

```
src/
├── utils/
│   ├── auth.ts              # Authentication utilities
│   ├── agent-wallet.ts      # Agent wallet management
│   └── api-client.ts        # API client class
├── config/
│   └── app.config.ts        # Configuration
└── examples/
    └── integration-example.ts  # Integration example
```

### 2. Required Dependencies

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

---

## 🔑 Required Credentials

You need these values in your `.env` file:

```env
# Your main wallet private key
PRIVATE_KEY=0x0bdf16a63e821edbe14b8b0ec75378ce6bff7268a2f5ff6b2ec5911ad9e4099f

# Pear Protocol API
API_URL=https://hl-v2.pearprotocol.io
CLIENT_ID=HLHackathon9

# Your agent wallet (from Pear Protocol)
AGENT_WALLET_ADDRESS=0x97964055012046D6C85416248D78B20D95d55ce6

# Builder address (Pear Protocol builder)
BUILDER_ADDRESS=0xA47D4d99191db54A4829cdf3de2417E527c3b042
```

---

## 📦 Minimal Package Structure

Here's the minimal structure you need:

```
your-project/
├── src/
│   ├── pear-protocol/
│   │   ├── auth.ts
│   │   ├── agent-wallet.ts
│   │   └── api-client.ts
│   └── your-code.ts
├── .env
├── package.json
└── tsconfig.json
```

---

## 🚀 Quick Integration

### Step 1: Copy Utilities

Copy the `src/utils/` folder to your new project.

### Step 2: Install Dependencies

```bash
npm install ethers axios dotenv @nktkas/hyperliquid viem
```

### Step 3: Set Up .env

Create `.env` with your credentials (see above).

### Step 4: Use in Your Code

```typescript
import { authenticate } from './pear-protocol/auth.js';
import { createApiClient } from './pear-protocol/api-client.js';

async function myFunction() {
  // Authenticate
  const token = await authenticate();
  
  // Create API client
  const api = createApiClient(token);
  
  // Use it!
  const wallet = await api.getAgentWallet();
  console.log('Agent wallet:', wallet.agentWalletAddress);
}
```

---

## 📝 What Data to Export

### Minimal Required Data:

```typescript
export const PEAR_CONFIG = {
  // Your credentials
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  API_URL: process.env.API_URL || 'https://hl-v2.pearprotocol.io',
  CLIENT_ID: process.env.CLIENT_ID || 'HLHackathon9',
  
  // Your wallet addresses
  USER_WALLET: '0xE7AD793764B736dFF8ddF659D10CD3d98328c034',
  AGENT_WALLET: '0x97964055012046D6C85416248D78B20D95d55ce6',
  BUILDER_ADDRESS: '0xA47D4d99191db54A4829cdf3de2417E527c3b042',
};
```

---

## 🔐 Security Notes

- ✅ **Never commit `.env` file** to Git
- ✅ **Never share private keys** publicly
- ✅ **Use environment variables** for all secrets
- ✅ **Rotate tokens** regularly

---

## 📚 Next Steps

1. Copy the utility files
2. Install dependencies
3. Set up `.env` file
4. Import and use in your code

See `INTEGRATION_EXAMPLE.md` for complete examples!

