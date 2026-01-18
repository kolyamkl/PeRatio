# WalletConnect Setup Instructions

## Overview
The wallet connection has been upgraded to use **WalletConnect v2** with **QR code scanning** for mobile wallets on **Arbitrum mainnet**.

## What Was Changed

### 1. Dependencies Added
- `@web3modal/wagmi` - Web3Modal for QR code UI
- `wagmi` - React Hooks for Ethereum  
- `viem` - TypeScript Ethereum library
- `@tanstack/react-query` - Data fetching for wagmi

### 2. Files Modified
- ✅ `package.json` - Added Web3 dependencies
- ✅ `src/main.tsx` - Added WagmiProvider + Web3Modal config
- ✅ `src/lib/wallet.tsx` - Integrated wagmi hooks
- ✅ `src/App.tsx` - Connected Web3Modal to wallet provider
- ✅ `src/components/WalletModal.tsx` - Simplified to single WalletConnect button
- ✅ `.env` - Added `VITE_WALLETCONNECT_PROJECT_ID`

### 3. Network Configuration
- **Chain**: Arbitrum Mainnet (Chain ID: 42161)
- **RPC**: Public RPC endpoint via wagmi
- **Wallets**: All WalletConnect-compatible wallets (MetaMask, Trust Wallet, Rainbow, Coinbase Wallet, Ledger Live, etc.)

## Setup Steps

### 1. Install Dependencies
```bash
cd /Users/macbook/Desktop/TG_TRADE
npm install
```

### 2. Get WalletConnect Project ID
1. Go to https://cloud.walletconnect.com
2. Sign up or log in
3. Create a new project: "TG Trade"
4. Copy your **Project ID**

### 3. Update .env File
```bash
# Edit .env and replace YOUR_PROJECT_ID_HERE with your actual project ID
VITE_WALLETCONNECT_PROJECT_ID=your_actual_project_id_here
```

### 4. Restart Frontend
```bash
npm run dev
```

## How It Works

### User Flow
1. User clicks "Connect Wallet" button in app
2. `WalletModal` opens with WalletConnect button
3. Clicking WalletConnect opens Web3Modal with **QR code**
4. User scans QR code with mobile wallet app (MetaMask, Trust Wallet, etc.)
5. User approves connection on **Arbitrum mainnet**
6. Wallet address appears in app

### Code Flow
```
User Click
  ↓
WalletModal.tsx → calls useWeb3Modal().open()
  ↓
Web3Modal displays QR code
  ↓
Mobile wallet scans QR
  ↓
wagmi/viem handles connection
  ↓
wallet.tsx receives address via useAccount() hook
  ↓
App displays connected wallet
```

### Supported Wallets
Any wallet that supports WalletConnect protocol:
- MetaMask Mobile
- Trust Wallet
- Rainbow Wallet
- Coinbase Wallet
- Ledger Live
- Zerion
- Argent
- 200+ others

## Testing

### 1. Test QR Code Display
```bash
# Start frontend
npm run dev

# In browser:
# 1. Click "Connect Wallet"
# 2. Click "WalletConnect"
# 3. QR code should appear
```

### 2. Test Phone Connection
```bash
# On your phone:
# 1. Open MetaMask or Trust Wallet
# 2. Go to Browser → Scan QR Code
# 3. Scan the QR code from step 1
# 4. Approve connection on Arbitrum
# 5. Check app - wallet address should appear
```

### 3. Test in Telegram Mini App
```bash
# In Telegram:
# 1. Open @peratio_bot
# 2. Click mini app button
# 3. Click "Connect Wallet"
# 4. Scan QR with phone wallet
# 5. Approve on Arbitrum
```

## Troubleshooting

### "Invalid Project ID" Error
- Go to https://cloud.walletconnect.com
- Copy your Project ID
- Update `VITE_WALLETCONNECT_PROJECT_ID` in `.env`
- Restart frontend with `npm run dev`

### QR Code Not Showing
- Check browser console for errors
- Verify all dependencies installed: `npm install`
- Check Web3Modal initialized in `main.tsx`

### Wrong Network
- Wallet MUST be on **Arbitrum Mainnet** (Chain ID 42161)
- If wallet prompts to switch network, approve it
- Some wallets auto-switch, others require manual switching

### Connection Drops
- WalletConnect sessions expire after 24 hours
- User must reconnect by scanning QR again
- Sessions persist across page refreshes

## Architecture Notes

### Simple Design
- **No browser extension detection** - only WalletConnect
- **No injected wallet logic** - pure QR code approach
- **Single chain** - Arbitrum mainnet only
- **Mobile-first** - designed for phone wallet scanning

### Backend Integration
- Frontend wallet is for **display/signing only**
- Backend still uses `PEAR_PRIVATE_KEY` for actual trade execution
- Future: Can implement EIP-712 signing on frontend → send signature to backend

### Why Arbitrum?
- Hyperliquid DEX uses Arbitrum for settlements
- Pear Protocol operates on Arbitrum
- Low gas fees for approvals
- Fast confirmation times

## Next Steps

### Optional Enhancements
1. **Add wallet balance display** - Already implemented in `wallet.tsx`
2. **Add network switch prompt** - If user connects on wrong chain
3. **Add disconnect button** - In TopBar or settings
4. **Add EIP-712 signing** - For Pear Protocol authentication
5. **Add transaction history** - Show on-chain txs from connected wallet

### Required for Production
1. ✅ Get real WalletConnect Project ID
2. ⏳ Test on Arbitrum mainnet with real wallet
3. ⏳ Add error handling for connection failures
4. ⏳ Add loading states during connection
5. ⏳ Add reconnection logic for expired sessions

## Resources

- WalletConnect Docs: https://docs.walletconnect.com/
- Web3Modal Docs: https://docs.walletconnect.com/web3modal/about
- Wagmi Docs: https://wagmi.sh/
- Arbitrum Docs: https://docs.arbitrum.io/
- Pear Protocol: https://pearprotocol.io/

---

**Status**: ✅ Implementation complete, ready for testing with WalletConnect Project ID
