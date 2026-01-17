# 📦 Integration Summary - Pear Protocol to New Codebase

## 🎯 What You Need

### 1. **Files to Copy** (from this project)

```
src/utils/
├── auth.ts              ← Copy this
├── agent-wallet.ts      ← Copy this
└── api-client.ts        ← Copy this

src/config/
└── app.config.ts        ← Copy this (or create your own)
```

### 2. **Credentials** (add to `.env` in new project)

```env
PRIVATE_KEY=0x0bdf16a63e821edbe14b8b0ec75378ce6bff7268a2f5ff6b2ec5911ad9e4099f
API_URL=https://hl-v2.pearprotocol.io
CLIENT_ID=HLHackathon9
AGENT_WALLET_ADDRESS=0x97964055012046D6C85416248D78B20D95d55ce6
BUILDER_ADDRESS=0xA47D4d99191db54A4829cdf3de2417E527c3b042
```

### 3. **Dependencies** (add to `package.json`)

```json
{
  "dependencies": {
    "ethers": "^6.13.4",
    "axios": "^1.7.9",
    "dotenv": "^16.4.7",
    "@nktkas/hyperliquid": "^0.30.2",
    "viem": "^2.21.45"
  }
}
```

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Copy Files
```bash
# In your new project
mkdir -p src/pear-protocol
cp /path/to/apiPear/src/utils/* src/pear-protocol/
```

### Step 2: Install Dependencies
```bash
npm install ethers axios dotenv @nktkas/hyperliquid viem
```

### Step 3: Create .env
```bash
# Copy credentials from EXPORT_DATA.json
# Create .env file with your credentials
```

---

## 💻 Minimal Code Example

```typescript
// your-code.ts
import { authenticate } from './pear-protocol/auth.js';
import { createApiClient } from './pear-protocol/api-client.js';

async function trade() {
  // Authenticate
  const token = await authenticate();
  
  // Create API client
  const api = createApiClient(token);
  
  // Place order
  const order = await api.placeOrder({
    symbol: 'BTC',
    side: 'buy',
    size: 0.001,
    orderType: 'market',
  });
  
  return order;
}

trade().then(console.log);
```

---

## 📊 What Data to Send/Export

### Option 1: Environment Variables (Recommended)

```env
PRIVATE_KEY=0x0bdf16a63e821edbe14b8b0ec75378ce6bff7268a2f5ff6b2ec5911ad9e4099f
API_URL=https://hl-v2.pearprotocol.io
CLIENT_ID=HLHackathon9
AGENT_WALLET_ADDRESS=0x97964055012046D6C85416248D78B20D95d55ce6
BUILDER_ADDRESS=0xA47D4d99191db54A4829cdf3de2417E527c3b042
```

### Option 2: JSON Config File

See `EXPORT_DATA.json` for complete export.

### Option 3: TypeScript Config

```typescript
export const config = {
  privateKey: '0x0bdf16a63e821edbe14b8b0ec75378ce6bff7268a2f5ff6b2ec5911ad9e4099f',
  apiUrl: 'https://hl-v2.pearprotocol.io',
  clientId: 'HLHackathon9',
  agentWallet: '0x97964055012046D6C85416248D78B20D95d55ce6',
  builderAddress: '0xA47D4d99191db54A4829cdf3de2417E527c3b042',
};
```

---

## 📁 New Project Structure

```
your-new-project/
├── src/
│   ├── pear-protocol/        ← Copy utils/ here
│   │   ├── auth.ts
│   │   ├── agent-wallet.ts
│   │   └── api-client.ts
│   └── your-code.ts          ← Your code
├── .env                      ← Your credentials
├── package.json              ← Add dependencies
└── tsconfig.json             ← TypeScript config
```

---

## ✅ Checklist

- [ ] Copy `src/utils/` files to new project
- [ ] Install dependencies (`npm install`)
- [ ] Create `.env` file with credentials
- [ ] Test authentication works
- [ ] Test API calls work
- [ ] Add `.env` to `.gitignore`

---

## 📚 Documentation Files

1. **SETUP_NEW_PROJECT.md** - Complete setup guide
2. **PORTABLE_PACKAGE.md** - What to copy
3. **EXPORT_DATA.json** - All your credentials
4. **integration-example.ts** - Code examples

---

## 🎯 Quick Reference

### Import in Your Code:
```typescript
import { authenticate } from './pear-protocol/auth.js';
import { createApiClient } from './pear-protocol/api-client.js';
```

### Use:
```typescript
const token = await authenticate();
const api = createApiClient(token);
const wallet = await api.getAgentWallet();
const order = await api.placeOrder({...});
```

---

## 🔐 Security Reminder

⚠️ **NEVER commit these to Git:**
- `.env` file
- Private keys
- Access tokens

✅ **DO commit:**
- Utility files (`auth.ts`, etc.)
- Your code
- `package.json`

---

## 🆘 Need Help?

1. Check `SETUP_NEW_PROJECT.md` for detailed steps
2. See `integration-example.ts` for code examples
3. Verify credentials in `EXPORT_DATA.json`

---

**You have everything you need! 🚀**

Copy the files, set up `.env`, and start trading!

