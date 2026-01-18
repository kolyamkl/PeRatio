# Pear Protocol Agent Wallet Setup

## ✅ Setup Complete!

Your agent wallet has been successfully created and approved on Hyperliquid Exchange.

### 🔑 Your Credentials

- **User Wallet**: `0xE7AD793764B736dFF8ddF659D10CD3d98328c034`
- **Agent Wallet**: `0x97964055012046D6C85416248D78B20D95d55ce6`
- **Status**: ✅ ACTIVE & APPROVED

---

## 📁 Project Structure

```
apiPear/
├── src/
│   ├── create-agent-wallet.ts    # Authentication & wallet creation
│   └── trading-operations.ts     # Trading/API operations
├── index.html                     # Browser-based authentication UI
├── package.json
└── README.md                      # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Create `.env` file
Create a `.env` file in the project root:

```env
# Pear Protocol Configuration
API_URL=https://hl-v2.pearprotocol.io
CLIENT_ID=HLHackathon9

# Your wallet private key (keep secret!)
PRIVATE_KEY=0xyour_private_key_here

# Access token (generated from npm start)
ACCESS_TOKEN=your_access_token_here
```

### 3. Authenticate & Create Agent Wallet
```bash
npm start
```

This will:
- Authenticate with Pear Protocol
- Check agent wallet status
- Create agent wallet if needed
- Display your access token

### 4. Test Trading Operations
```bash
npm run trade
```

This will verify your agent wallet is working.

---

## 📚 What We Accomplished

### Phase 1: Authentication ✅
- Implemented EIP-712 signature authentication
- Successfully authenticated with Pear Protocol API
- Generated access token (valid for ~30 days)

### Phase 2: Agent Wallet Creation ✅
- Created agent wallet via Pear Protocol API
- Agent Wallet Address: `0x97964055012046D6C85416248D78B20D95d55ce6`
- Manually approved on Hyperliquid Exchange

### Phase 3: Verification ✅
- Confirmed agent wallet is active
- Access token is working
- Ready for trading operations

---

## 🔌 Available API Endpoints

### Working Endpoints:

#### ✅ Get Agent Wallet Status
```typescript
GET https://hl-v2.pearprotocol.io/agentWallet?clientId=HLHackathon9
Headers: {
  Authorization: Bearer <access_token>
}
```

Returns:
```json
{
  "agentWalletAddress": "0x97964055012046D6C85416248D78B20D95d55ce6"
}
```

### To Explore:
- Trading endpoints (place order, cancel order, etc.)
- Market data endpoints
- Account balance/position endpoints

---

## 🛠️ Next Steps

1. **Find Available Endpoints**
   - Check Pear Protocol official documentation
   - Look for trading, market data, and account endpoints
   - Test endpoints with your access token

2. **Implement Trading Logic**
   - Place orders
   - Monitor positions
   - Manage risk

3. **Error Handling**
   - Token refresh logic (when it expires)
   - Network error handling
   - Rate limiting

4. **Security**
   - Never commit `.env` file
   - Keep private keys secure
   - Rotate access tokens regularly

---

## 📖 Code Examples

### Authentication Flow

```typescript
// 1. Get EIP-712 message
const msgResponse = await axios.get(`${API_URL}/auth/eip712-message`, {
  params: { address: wallet.address, clientId: CLIENT_ID }
});

// 2. Sign the message
const signature = await wallet.signTypedData(domain, types, value);

// 3. Login and get access token
const loginResponse = await axios.post(`${API_URL}/auth/login`, {
  method: 'eip712',
  address: wallet.address,
  clientId: CLIENT_ID,
  details: { signature, timestamp }
});

const accessToken = loginResponse.data.accessToken;
```

### Check Agent Wallet

```typescript
const response = await axios.get(`${API_URL}/agentWallet`, {
  headers: { 'Authorization': `Bearer ${accessToken}` },
  params: { clientId: CLIENT_ID }
});

console.log(response.data.agentWalletAddress);
```

---

## 🔐 Security Notes

- ✅ `.env` is in `.gitignore` - private keys won't be committed
- ✅ Access tokens expire after ~30 days
- ✅ Agent wallet requires Hyperliquid approval before use
- ⚠️ Never share your private key or access token
- ⚠️ Always use HTTPS for API calls

---

## 📞 Support

For Pear Protocol documentation and support:
- Website: https://pearprotocol.io
- Documentation: https://docs.pearprotocol.io

For Hyperliquid Exchange:
- Website: https://app.hyperliquid.xyz

---

## ✨ Summary

You now have:
1. ✅ Working authentication with Pear Protocol
2. ✅ Active agent wallet on Hyperliquid
3. ✅ Valid access token for API calls
4. ✅ Code structure ready for trading operations

**You're ready to start trading! 🚀**

Next: Explore the Pear Protocol API documentation to find trading endpoints and implement your trading strategy.

