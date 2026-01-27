# SDK Scripts Comparison

## Overview

This directory contains **two types of SDK tools**:

1. **Standalone Scripts** - Original CLI testing tools
2. **New SDK** - Comprehensive class-based SDK for production

## Standalone Scripts (Original)

Located in `src/` root directory.

### Purpose
Quick CLI testing and debugging of specific operations.

### Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `approve-agent-wallet.ts` | `npm run approve:agent` | Approve agent wallet on Hyperliquid |
| `check-agent-status.ts` | `npm run status` | Check agent wallet status |
| `approve-builder-direct.ts` | - | Approve builder fees (direct) |
| `approve-builder-fees.ts` | `npm run approve:builder` | Approve builder fees |
| `trading-operations.ts` | `npm run trade` | Test trading operations |
| `place-order.ts` | `npm run order` | Place single order |
| `place-order-advanced.ts` | `npm run order:adv` | Advanced order placement |

### Usage Example
```bash
# Check agent wallet status
npm run status

# Approve agent wallet
npm run approve:agent

# Place a test order
npm run order
```

### Pros
- ✅ Fast CLI testing
- ✅ Isolated operations
- ✅ Good for debugging
- ✅ One-time setup tasks

### Cons
- ❌ Not reusable in code
- ❌ No state management
- ❌ Manual token handling
- ❌ Limited error handling

---

## New SDK (Production)

Located in `src/sdk/` directory.

### Purpose
Comprehensive, production-ready SDK for programmatic use.

### Components

| File | Purpose |
|------|---------|
| `PearProtocolSDK.ts` | Main SDK class |
| `BasketTradeBuilder.ts` | Fluent basket builder |
| `AgentSignalHandler.ts` | Signal validation & execution |
| `types.ts` | TypeScript interfaces |
| `index.ts` | Main export |
| `example-usage.ts` | Usage examples |

### Usage Example
```typescript
import { createPearSDK } from './sdk/index.js';

const sdk = createPearSDK({
  privateKey: process.env.PRIVATE_KEY,
});

// Authenticate
await sdk.authenticate();

// Execute basket trade
await sdk.executeBasketTrade({
  longAssets: [{ asset: 'BTC', weight: 1.0 }],
  shortAssets: [],
  usdValue: 10,
  leverage: 1,
});
```

### Pros
- ✅ Object-oriented
- ✅ State management
- ✅ Auto token refresh
- ✅ Type-safe
- ✅ Error handling
- ✅ Python bridge compatible
- ✅ Production-ready

### Cons
- ❌ More complex setup
- ❌ Requires understanding OOP

---

## When to Use Which?

### Use Standalone Scripts When:
- 🔧 **Quick testing** - Need to test something fast
- 🐛 **Debugging** - Isolating a specific issue
- ⚙️ **One-time setup** - Approving agent wallet
- 📝 **Manual operations** - Direct control needed

### Use New SDK When:
- 🏗️ **Backend integration** - Called from Python API
- 🌐 **Frontend integration** - Programmatic trading
- 🚀 **Production use** - Reliable, tested code
- 🔄 **Complex workflows** - Multi-step operations
- 📊 **Basket trading** - Multi-asset positions

---

## Quick Test Comparison

### Standalone Script
```bash
# Check agent wallet
npm run status
```

### New SDK
```bash
# Check agent wallet (using SDK)
npm run test:quick
```

Both work, but the SDK version is more maintainable for production use.

---

## Migration Path

If you want to migrate from standalone scripts to SDK:

1. **Keep both** - They serve different purposes
2. **Use scripts for setup** - Agent wallet approval, etc.
3. **Use SDK for production** - Backend API, frontend integration
4. **Gradually migrate** - Move complex operations to SDK

---

## Recommendation

**Keep both!** They complement each other:

```
Development Workflow:
  1. Use standalone scripts for initial setup
  2. Use SDK for production integration
  3. Use scripts for debugging when needed
```

---

## Examples

### Standalone: Check Agent Status
```bash
npm run status
```

### SDK: Check Agent Status
```typescript
const sdk = createPearSDK({ privateKey: '0x...' });
await sdk.authenticate();
const wallet = await sdk.getAgentWallet();
console.log(wallet.status);
```

### Standalone: Place Order
```bash
npm run order -- BTC buy 0.001 market
```

### SDK: Place Order
```typescript
const sdk = createPearSDK({ privateKey: '0x...' });
await sdk.authenticate();
await sdk.goLong('BTC', 10, 1);
```

---

## Summary

| Feature | Standalone Scripts | New SDK |
|---------|-------------------|---------|
| **Use Case** | CLI testing | Production code |
| **Complexity** | Simple | Moderate |
| **Reusability** | Low | High |
| **Type Safety** | Partial | Full |
| **State Management** | None | Built-in |
| **Error Handling** | Basic | Comprehensive |
| **Python Compatible** | No | Yes |
| **Basket Trading** | No | Yes |
| **Agent Signals** | No | Yes |

**Conclusion:** Use standalone scripts for quick tests, use SDK for production!
