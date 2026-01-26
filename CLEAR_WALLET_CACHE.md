# Clear Wallet Cache

If you see a wallet still connected after refreshing, it's because Wagmi stores the connection in browser localStorage.

## Quick Fix - Clear in Browser Console

1. Open your app: `http://localhost:5173`
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Paste this command and press Enter:

```javascript
localStorage.clear()
location.reload()
```

This will clear all cached wallet connections and reload the page.

## What You Should See Now

After clearing cache and reloading:

1. **Top-right corner**: You should see a "Connect" button (no wallet connected)
2. **Click "Connect"**: Opens the WalletConnect modal
3. **On Mobile**: Shows wallet selection (MetaMask, Trust Wallet, etc.)
4. **On Desktop**: Shows "Show QR Code" button

## How to Disconnect

Once a wallet is connected:

1. **Top-right corner**: Shows your wallet address (e.g., `0x1234...5678`)
2. **Click the address**: Opens disconnect menu
3. **Click "Disconnect Wallet"**: Disconnects and clears the connection

## How to Connect a Different Wallet

1. Click your current wallet address (top-right)
2. Click "Disconnect Wallet"
3. Click "Connect" button
4. Select a different wallet from the modal

## Troubleshooting

**Problem**: Wallet still shows as connected after clearing cache
- **Solution**: Hard refresh with Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

**Problem**: "Connect" button doesn't appear
- **Solution**: Check browser console (F12) for errors and share them

**Problem**: Can't disconnect wallet
- **Solution**: Clear localStorage again and refresh
