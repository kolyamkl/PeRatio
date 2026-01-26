# Quick Integration Example

## The Issue

Your app currently has a **hardcoded backend wallet** that auto-connects. The new WalletConnect system is now available, but you need to add UI for users to connect their own wallets.

## Current State

✅ **App.tsx** - Updated with Web3Provider and WalletConnectProvider
✅ **WalletConnect System** - Fully implemented with mobile deep linking
❌ **UI Integration** - Need to add "Connect Wallet" button somewhere

## Quick Fix: Add Connect Button to TopBar

Here's how to add a wallet connect button to your TopBar:

```tsx
// src/components/layout/TopBar.tsx
import { Wallet } from 'lucide-react'
import { useState } from 'react'
import { useWalletConnect } from '../../lib/walletConnectProvider'
import { WalletConnectModal } from '../wallet/WalletConnectModal'

export function TopBar() {
  const { isConnected, displayAddress, disconnect } = useWalletConnect()
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="top-bar">
      {/* Your existing TopBar content */}
      
      {/* Add this wallet button */}
      {!isConnected ? (
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary rounded-xl"
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm">{displayAddress}</span>
          <button onClick={disconnect} className="text-xs">
            Disconnect
          </button>
        </div>
      )}

      <WalletConnectModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </div>
  )
}
```

## Alternative: Replace BalanceCard with WalletConnect

If you want to replace the hardcoded wallet display with a real wallet connection:

```tsx
// In your TradeConfirmPage.tsx or wherever you show the wallet
import { useWalletConnect } from '../lib/walletConnectProvider'
import { BalanceCard } from '../components/wallet/BalanceCard'
import { WalletConnectModal } from '../components/wallet/WalletConnectModal'

export function YourPage() {
  const { 
    isConnected, 
    address, 
    displayAddress, 
    balance, 
    balanceLoading,
    disconnect 
  } = useWalletConnect()
  
  const [showModal, setShowModal] = useState(false)

  if (!isConnected) {
    return (
      <>
        <button onClick={() => setShowModal(true)}>
          Connect Your Wallet
        </button>
        <WalletConnectModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
        />
      </>
    )
  }

  return (
    <BalanceCard
      balance={parseFloat(balance)}
      currency="USDC"
      isLoading={balanceLoading}
      connectedWallet="metamask"
      walletAddress={displayAddress}
      onDisconnect={disconnect}
    />
  )
}
```

## Understanding the Two Wallets

Your app has TWO wallet concepts:

### 1. Backend Trading Wallet (Current - Hardcoded)
- **Purpose**: Executes trades on Pear Protocol
- **Location**: Backend server
- **Address**: `0x76F9398Ee268b9fdc06C0dff402B20532922fFAE`
- **Shown in**: TradeConfirmPage as "Trading Wallet"
- **This is fine to keep hardcoded** - it's the bot's wallet

### 2. User's Personal Wallet (New - WalletConnect)
- **Purpose**: User's own funds, could be used for deposits/withdrawals
- **Location**: User's device (MetaMask, Trust Wallet, etc.)
- **Address**: User connects via WalletConnect
- **Shown in**: Wherever you add the connect button
- **This is what you just implemented**

## Do You Need Both?

**Option A: Keep Backend Wallet Only (Current)**
- Users don't connect their own wallets
- All trades execute through your backend wallet
- Simpler UX, but less decentralized

**Option B: Add User Wallet Connection (New)**
- Users connect their own wallets
- Could be used for deposits, withdrawals, or signing
- More decentralized, but more complex

**Option C: Hybrid (Recommended)**
- Backend wallet executes trades (current)
- User wallet for authentication/verification (new)
- Best of both worlds

## Next Steps

1. **Decide**: Do you want users to connect their own wallets?
   
2. **If YES**: Add a "Connect Wallet" button somewhere (TopBar, TradesPage, etc.)

3. **If NO**: You can remove the WalletConnect system and keep the current hardcoded wallet

4. **Test**: Make sure the backend is still running and test the flow

## Quick Test

To test the new WalletConnect system:

1. Make sure backend is running
2. Open your app
3. Look for where you want to add the connect button
4. Add the code from examples above
5. Click "Connect Wallet"
6. On mobile: Select wallet → Opens app → Approve
7. On desktop: Click QR → Scan → Approve

The wallet will now be connected and you can use `useWalletConnect()` to access the address and balance anywhere in your app!
