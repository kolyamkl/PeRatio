# 📈 Trading Guide - Place Orders via Pear Protocol

## 🚀 Quick Start

### Simple Market Order

```bash
npm run order
```

This places a default market buy order for 0.001 BTC.

---

## 📋 Available Commands

### 1. Simple Order (Basic)
```bash
npm run order
```

**Default:** Market buy 0.001 BTC

### 2. Advanced Order (Full Control)
```bash
npm run order:adv -- [TYPE] [SYMBOL] [SIDE] [SIZE] [PRICE] [OPTIONS]
```

---

## 💡 Examples

### Market Orders

**Buy BTC:**
```bash
npm run order:adv -- market BTC buy 0.001
```

**Sell ETH:**
```bash
npm run order:adv -- market ETH sell 0.01
```

**Buy SOL:**
```bash
npm run order:adv -- market SOL buy 1.5
```

---

### Limit Orders

**Buy BTC at $45,000:**
```bash
npm run order:adv -- limit BTC buy 0.001 45000
```

**Sell ETH at $3,500:**
```bash
npm run order:adv -- limit ETH sell 0.01 3500
```

**Buy with Time-In-Force (GTC):**
```bash
npm run order:adv -- limit BTC buy 0.001 45000 GTC
```

**Post-Only Order (Maker Only):**
```bash
npm run order:adv -- limit BTC buy 0.001 45000 GTC postOnly
```

**Reduce-Only Order (Close Position):**
```bash
npm run order:adv -- limit BTC sell 0.001 50000 GTC reduceOnly
```

---

## 📊 Order Parameters

### Required Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `TYPE` | Order type | `market` or `limit` |
| `SYMBOL` | Trading pair | `BTC`, `ETH`, `SOL` |
| `SIDE` | Buy or sell | `buy` or `sell` |
| `SIZE` | Order size | `0.001`, `0.01` |

### Optional Parameters (Limit Orders)

| Parameter | Description | Example |
|-----------|-------------|---------|
| `PRICE` | Limit price | `45000` |
| `TIME_IN_FORCE` | Order duration | `GTC`, `IOC`, `FOK` |
| `postOnly` | Maker-only flag | Add `postOnly` |
| `reduceOnly` | Close position only | Add `reduceOnly` |

---

## 🎯 Order Types

### Market Order
- Executes immediately at current market price
- Guaranteed fill (if liquidity available)
- No price control

**Use when:** You want immediate execution

### Limit Order
- Executes only at specified price or better
- Price control
- May not fill immediately

**Use when:** You want price control

---

## ⏱️ Time In Force Options

### GTC (Good-Til-Cancel)
- Order stays active until filled or canceled
- Default for most exchanges

### IOC (Immediate-Or-Cancel)
- Fills immediately or cancels
- Partial fills allowed

### FOK (Fill-Or-Kill)
- Must fill completely or cancel
- No partial fills

---

## 🛡️ Advanced Options

### Post-Only Orders
```bash
npm run order:adv -- limit BTC buy 0.001 45000 GTC postOnly
```

- Ensures order is maker (no taker fees)
- Order canceled if would execute immediately
- Always adds liquidity to order book

### Reduce-Only Orders
```bash
npm run order:adv -- limit BTC sell 0.001 50000 GTC reduceOnly
```

- Only reduces open position
- Cannot increase or open new position
- Used for taking profit or stopping loss

---

## 📈 Trading Workflow

### 1. Check Status
```bash
npm run status
```

Verify agent wallet is active.

### 2. Place Order
```bash
# Market order (instant)
npm run order:adv -- market BTC buy 0.001

# Limit order (price control)
npm run order:adv -- limit BTC buy 0.001 45000
```

### 3. Monitor Order
Check Hyperliquid Exchange to see order status.

---

## 💰 Example Trading Strategies

### Quick Scalp (Market Orders)
```bash
# Buy
npm run order:adv -- market BTC buy 0.001

# Sell (when profit target hit)
npm run order:adv -- market BTC sell 0.001
```

### Swing Trade (Limit Orders)
```bash
# Enter at support
npm run order:adv -- limit BTC buy 0.001 44000 GTC

# Take profit at resistance
npm run order:adv -- limit BTC sell 0.001 48000 GTC reduceOnly
```

### Grid Trading
```bash
# Buy orders at different levels
npm run order:adv -- limit BTC buy 0.0005 44000 GTC
npm run order:adv -- limit BTC buy 0.0005 43000 GTC
npm run order:adv -- limit BTC buy 0.0005 42000 GTC

# Sell orders at profit levels
npm run order:adv -- limit BTC sell 0.0005 46000 GTC
npm run order:adv -- limit BTC sell 0.0005 47000 GTC
npm run order:adv -- limit BTC sell 0.0005 48000 GTC
```

---

## ⚠️ Important Notes

### Risk Management
- ✅ Start with small sizes
- ✅ Use limit orders for price control
- ✅ Set stop losses
- ✅ Never risk more than you can afford to lose

### Common Errors

**"Insufficient balance"**
- Deposit funds to your wallet
- Reduce order size

**"Invalid symbol"**
- Check symbol format (BTC, not BTC/USD)
- Verify symbol is available on Hyperliquid

**"Order rejected"**
- Check order size (minimum/maximum)
- Verify price is reasonable
- Ensure agent wallet is approved

---

## 📚 Order Response

Successful order returns:
```json
{
  "orderId": "123456789",
  "status": "filled",
  "filledSize": 0.001,
  "avgFillPrice": 45123.50,
  "timestamp": "2026-01-17T12:00:00Z"
}
```

---

## 🔧 Programmatic Trading

### Use in Your Own Scripts

```typescript
import { authenticate } from './utils/auth.js';
import axios from 'axios';

async function myTradingBot() {
  const token = await authenticate();
  
  // Place market order
  const order = await axios.post(
    'https://hl-v2.pearprotocol.io/hl/order',
    {
      clientId: 'HLHackathon9',
      symbol: 'BTC',
      side: 'buy',
      orderType: 'market',
      size: 0.001,
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    }
  );
  
  console.log('Order placed:', order.data);
}
```

---

## 🎓 Tips for Success

1. **Test with Small Amounts** - Start with minimum sizes
2. **Use Limit Orders** - Better price control
3. **Set Stop Losses** - Protect your capital
4. **Monitor Positions** - Check Hyperliquid Exchange regularly
5. **Paper Trade First** - Test strategies before real money

---

## 📞 Need Help?

- Check Pear Protocol Docs: https://docs.pearprotocol.io
- Check Hyperliquid Docs: https://hyperliquid.xyz/docs
- Run `npm run status` to verify setup

---

## ✅ Complete Command Reference

```bash
# Setup & Status
npm start              # Create/check agent wallet
npm run status         # Check agent wallet status

# Approvals
npm run approve:agent    # Approve agent wallet
npm run approve:builder  # Approve builder

# Trading
npm run order           # Simple market order
npm run order:adv       # Advanced order with params

# Examples
npm run example:bot     # Trading bot example
```

---

**Happy Trading! 🚀📈**

Remember: Always trade responsibly and never risk more than you can afford to lose.

