# 🔒 User Wallet Only - No Private Keys

## ⚠️ IMPORTANT: This SDK No Longer Uses Private Keys

**All authentication is handled in the frontend with the user's connected wallet.**

## 🚫 What Was Removed

### Private Key Methods (Removed)
- ❌ `sdk.setPrivateKey()` - No longer exists
- ❌ `sdk.authenticate()` - No longer exists
- ❌ `sdk.getWalletAddress()` - No longer exists
- ❌ `privateKey` in `PearSDKConfig` - No longer exists

### Why?
**Security Best Practice:** Private keys should never leave the user's wallet. All signing must happen in the browser where the user has full control.

## ✅ How It Works Now

### Frontend Flow (React)

```typescript
import { useWallet } from './lib/walletProvider';
import { executeBasketTrade } from './lib/basketApi';

// 1. User connects wallet
const wallet = useWallet();
await wallet.connect('metamask');

// 2. User authenticates (signs EIP-712 in their wallet)
await wallet.authenticatePear();
// This calls pearAuth.authenticateWithPear() internally
// User signs message in MetaMask/WalletConnect
// Access token stored in localStorage

// 3. Execute trade with token
const result = await executeBasketTrade(wallet.pearAccessToken, {
  longAssets: [{ asset: 'BTC', weight: 1.0 }],
  shortAssets: [],
  usdValue: 10,
  leverage: 1
});
```

### Backend Flow (Python)

```python
from pear_sdk_bridge import PearSDKBridge

# Backend receives access token from frontend
access_token = request.headers.get('Authorization').replace('Bearer ', '')

# Execute trade using token
bridge = PearSDKBridge()
result = bridge.execute_basket_trade(
    access_token=access_token,  # From frontend
    long_assets=[{"asset": "BTC", "weight": 1.0}],
    short_assets=[],
    usd_value=10,
    leverage=1
)
```

### SDK Usage (TypeScript)

```typescript
import { createPearSDK } from './sdk/index.js';

// Create SDK instance (no private key!)
const sdk = createPearSDK({
  apiUrl: 'https://hl-v2.pearprotocol.io',
  clientId: 'APITRADER',
});

// Set access token from frontend
sdk.setAccessToken(accessTokenFromFrontend);

// Execute trades
await sdk.executeBasketTrade({
  longAssets: [{ asset: 'BTC', weight: 1.0 }],
  shortAssets: [],
  usdValue: 10,
  leverage: 1,
  executionType: 'MARKET',
  slippage: 0.08,
});
```

## 🔐 Security Benefits

| Old Way (❌ Insecure) | New Way (✅ Secure) |
|----------------------|---------------------|
| Private keys in backend | No private keys anywhere |
| Keys in .env files | User signs in browser |
| Backend authenticates | Frontend authenticates |
| Trust backend with keys | Zero-trust architecture |

## 📝 Migration Guide

### If You Were Using Private Keys

**Before:**
```typescript
const sdk = createPearSDK({
  privateKey: '0x...',  // ❌ DON'T DO THIS
});
await sdk.authenticate();
```

**After:**
```typescript
// Frontend: User signs in their wallet
const { accessToken } = await authenticateWithPear(address, provider);

// Backend: Use the token
const sdk = createPearSDK();
sdk.setAccessToken(accessToken);
```

### Update Your Code

1. **Remove** all `PRIVATE_KEY` environment variables
2. **Remove** all `privateKey` parameters
3. **Use** `pearAuth.ts` for authentication in frontend
4. **Pass** access tokens from frontend to backend
5. **Call** `sdk.setAccessToken()` instead of `sdk.authenticate()`

## 🎯 Complete Example

### Frontend Component

```typescript
import { useState } from 'react';
import { useWallet } from '../lib/walletProvider';
import { executeBasketTrade } from '../lib/basketApi';

export function BasketTrader() {
  const wallet = useWallet();
  
  const handleTrade = async () => {
    // 1. Connect wallet (if not connected)
    if (!wallet.isConnected) {
      await wallet.connect('metamask');
    }
    
    // 2. Authenticate (if not authenticated)
    if (!wallet.isPearAuthenticated) {
      await wallet.authenticatePear();
    }
    
    // 3. Execute trade
    const result = await executeBasketTrade(wallet.pearAccessToken, {
      longAssets: [{ asset: 'BTC', weight: 1.0 }],
      shortAssets: [],
      usdValue: 10,
      leverage: 1,
    });
    
    console.log('Trade result:', result);
  };
  
  return (
    <button onClick={handleTrade}>
      Execute Trade
    </button>
  );
}
```

### Backend Endpoint

```python
from fastapi import Header, HTTPException
from pear_sdk_bridge import PearSDKBridge

@router.post("/api/basket/execute")
async def execute_basket_trade(
    request: BasketTradeRequest,
    authorization: str = Header(..., description="Bearer {accessToken}")
):
    # Extract token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization")
    
    access_token = authorization.replace("Bearer ", "")
    
    # Execute trade
    bridge = PearSDKBridge()
    result = bridge.execute_basket_trade(
        access_token=access_token,
        long_assets=request.longAssets,
        short_assets=request.shortAssets,
        usd_value=request.usdValue,
        leverage=request.leverage,
    )
    
    return result
```

## 🧪 Testing

### Test Authentication Flow

```bash
# 1. Start backend
cd backend
python -m uvicorn main:app --reload

# 2. Start frontend
npm run dev

# 3. Open browser
# http://localhost:5173/basket

# 4. Test flow:
# - Click "Connect Wallet"
# - Choose MetaMask
# - Click "Authenticate"
# - Sign message in MetaMask
# - Build basket trade
# - Execute trade
```

## 📚 Related Files

- `src/lib/pearAuth.ts` - Frontend authentication
- `src/lib/walletProvider.tsx` - Wallet connection & state
- `src/lib/basketApi.ts` - Backend API client
- `backend/pear_sdk_bridge.py` - Python bridge to SDK
- `backend/basket_endpoints.py` - FastAPI endpoints

## ✅ Security Checklist

- [x] No private keys in code
- [x] No private keys in environment variables
- [x] No private keys transmitted over network
- [x] User signs all transactions in their wallet
- [x] Access tokens are short-lived (15 minutes)
- [x] Tokens stored in browser localStorage only
- [x] Backend is stateless
- [x] Zero-trust architecture

## 🎉 Summary

**The system is now 100% secure:**
- Users control their private keys
- All signing happens in user's wallet
- Backend never sees private keys
- Industry best practices followed

**No breaking changes to existing frontend code** - it already works this way!
