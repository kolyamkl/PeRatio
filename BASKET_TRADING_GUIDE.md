# Pear Protocol Basket Trading Integration Guide

## Overview

This guide explains how to test the new **user wallet-based basket trading** functionality that integrates the Pear Protocol SDK with your backend and frontend.

## Architecture

```
Frontend (React + Wagmi)
    ↓ User connects wallet (MetaMask, WalletConnect)
    ↓ Signs EIP-712 message
    ↓
Backend (FastAPI)
    ↓ /api/basket/authenticate → Get access token
    ↓ /api/basket/execute → Execute basket trade
    ↓
Python Bridge (subprocess)
    ↓ Calls TypeScript SDK via tsx
    ↓
Pear Protocol SDK (TypeScript)
    ↓ Makes API calls to Pear Protocol
    ↓
Pear Protocol API (hl-v2.pearprotocol.io)
    ↓
Hyperliquid Exchange
```

## Setup Options

### Option 1: Local Development (Recommended for Testing)

#### Prerequisites
```bash
# Install Node.js dependencies for SDK
cd backend/pear-sdk
npm install

# Verify tsx is available
npx tsx --version
```

#### Backend Setup
```bash
cd backend

# Create/update .env file
cat > .env << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tg_trade
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
BACKEND_URL=http://localhost:8000
LOG_DIR=./logs

# Pear Protocol SDK Configuration
API_URL=https://hl-v2.pearprotocol.io
CLIENT_ID=APITRADER
EOF

# Install Python dependencies
pip install -r requirements.txt

# Run backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup
```bash
cd ..  # Back to root

# Install frontend dependencies
npm install

# Run frontend dev server
npm run dev
```

**Access:**
- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs

---

### Option 2: Docker Deployment

#### Update Docker Configuration

1. **Ensure Node.js is available in backend container:**

Edit `backend/Dockerfile` to add Node.js:

```dockerfile
FROM python:3.11-slim

# Install Node.js for SDK
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Rest of Dockerfile...
```

2. **Update docker-compose.yml to install SDK dependencies:**

Add to backend service:

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  # ... existing config ...
  command: >
    sh -c "
    cd /app/pear-sdk && npm install &&
    cd /app && uvicorn main:app --host 0.0.0.0 --port 8000
    "
```

3. **Build and run:**

```bash
docker-compose up --build
```

---

## API Endpoints

### 1. Authenticate User Wallet

**POST** `/api/basket/authenticate`

```json
{
  "privateKey": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJ...",
  "refreshToken": "...",
  "walletAddress": "0x...",
  "expiresAt": 1234567890
}
```

### 2. Execute Basket Trade

**POST** `/api/basket/execute`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Body:**
```json
{
  "longAssets": [
    {"asset": "BTC", "weight": 0.5},
    {"asset": "ETH", "weight": 0.5}
  ],
  "shortAssets": [
    {"asset": "DOGE", "weight": 1.0}
  ],
  "usdValue": 50,
  "leverage": 2,
  "slippage": 0.08
}
```

### 3. Execute Agent Pear Signal

**POST** `/api/basket/execute-signal`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Body:**
```json
{
  "signal": {
    "signalId": "signal_123",
    "timestamp": 1234567890,
    "basket": {
      "longAssets": [{"asset": "BTC", "weight": 1.0}],
      "shortAssets": []
    },
    "suggestedLeverage": 2,
    "suggestedUsdValue": 25,
    "confidence": 0.85
  },
  "overrideUsdValue": 50,
  "overrideLeverage": 3
}
```

### 4. Get Open Positions

**GET** `/api/basket/positions`

**Headers:**
```
Authorization: Bearer {accessToken}
```

### 5. Close Position

**POST** `/api/basket/close-position`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Body:**
```json
{
  "positionId": "pos_123",
  "percentage": 1.0
}
```

### 6. Agent Wallet Management

**GET** `/api/basket/agent-wallet/status`
**POST** `/api/basket/agent-wallet/create`

---

## Testing Flow

### Test 1: Authentication

```bash
curl -X POST http://localhost:8000/api/basket/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": "0x..."
  }'
```

Save the `accessToken` from response.

### Test 2: Simple Long Trade

```bash
curl -X POST http://localhost:8000/api/basket/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "longAssets": [{"asset": "BTC", "weight": 1.0}],
    "shortAssets": [],
    "usdValue": 10,
    "leverage": 1,
    "slippage": 0.08
  }'
```

### Test 3: Pair Trade

```bash
curl -X POST http://localhost:8000/api/basket/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "longAssets": [{"asset": "BTC", "weight": 1.0}],
    "shortAssets": [{"asset": "ETH", "weight": 1.0}],
    "usdValue": 20,
    "leverage": 2,
    "slippage": 0.08
  }'
```

### Test 4: Multi-Asset Basket

```bash
curl -X POST http://localhost:8000/api/basket/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "longAssets": [
      {"asset": "BTC", "weight": 0.6},
      {"asset": "ETH", "weight": 0.4}
    ],
    "shortAssets": [
      {"asset": "DOGE", "weight": 0.5},
      {"asset": "SHIB", "weight": 0.5}
    ],
    "usdValue": 50,
    "leverage": 3,
    "slippage": 0.08
  }'
```

---

## Frontend Integration

### Connect Wallet & Authenticate

```typescript
import { useAccount, useSignTypedData } from 'wagmi';

// 1. User connects wallet via Web3Modal
const { address } = useAccount();

// 2. Get EIP-712 message from Pear Protocol
const response = await fetch('https://hl-v2.pearprotocol.io/auth/eip712-message', {
  params: { address, clientId: 'APITRADER' }
});
const eipData = await response.json();

// 3. Sign with user's wallet
const { signTypedData } = useSignTypedData();
const signature = await signTypedData({
  domain: eipData.domain,
  types: eipData.types,
  message: eipData.message
});

// 4. Authenticate with backend (or directly with Pear)
const authResponse = await fetch('http://localhost:8000/api/basket/authenticate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ privateKey: '...' }) // Or use signature
});

const { accessToken } = await authResponse.json();
```

### Execute Basket Trade

```typescript
const executeBasket = async (basket: BasketConfig) => {
  const response = await fetch('http://localhost:8000/api/basket/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(basket)
  });
  
  return await response.json();
};
```

---

## Troubleshooting

### Issue: "Cannot find module 'ethers'"
**Solution:** Run `npm install` in `backend/pear-sdk` directory.

### Issue: "tsx command not found"
**Solution:** Install tsx globally: `npm install -g tsx` or use `npx tsx`.

### Issue: "Authentication failed"
**Solution:** 
- Check private key format (must start with 0x)
- Verify Pear Protocol API is accessible
- Check backend logs for detailed error

### Issue: "Agent wallet not found"
**Solution:** Create agent wallet first:
```bash
curl -X POST http://localhost:8000/api/basket/agent-wallet/create \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Then approve it on Hyperliquid Exchange.

### Issue: Docker container can't run SDK
**Solution:** 
- Ensure Node.js is installed in container
- Verify npm dependencies are installed
- Check container logs: `docker logs tg_trade_backend`

---

## Security Notes

⚠️ **IMPORTANT:**
- Never commit private keys to git
- Store access tokens securely
- Use HTTPS in production
- Implement proper token refresh logic
- Validate all user inputs
- Rate limit API endpoints

---

## Next Steps

1. **Test locally first** - Verify all endpoints work
2. **Add frontend UI** - Create basket builder component
3. **Implement wallet connection** - Use Web3Modal/Wagmi
4. **Add position management** - Display open positions, PnL
5. **Deploy to production** - Update Docker config, deploy

---

## Support

- Pear Protocol Docs: https://docs.pearprotocol.io
- Hyperliquid Docs: https://hyperliquid.gitbook.io
- Backend API Docs: http://localhost:8000/docs
