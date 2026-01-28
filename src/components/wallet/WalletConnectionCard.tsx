/**
 * Wallet Connection Card
 * Shows wallet connection status with connect/disconnect functionality
 * Displays below AI Signal Analysis in the main page
 */

import { useState } from 'react'
import { Wallet, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useWallet } from '../../lib/walletProvider'
import { WalletModal } from './WalletModal'
import { hapticFeedback } from '../../lib/telegram'

export function WalletConnectionCard() {
  const { isConnected, displayAddress, balance, balanceLoading, disconnect, isPearAuthenticated, isPearAuthenticating, authenticateWithPearManual } = useWallet()
  const [showModal, setShowModal] = useState(false)

  const handleConnect = () => {
    console.log('[WalletConnectionCard] Connect button clicked')
    hapticFeedback('selection')
    setShowModal(true)
    console.log('[WalletConnectionCard] Modal state set to true')
  }

  const handleDisconnect = async () => {
    hapticFeedback('impact', 'medium')
    await disconnect()
  }

  if (!isConnected) {
    // Not connected state - show connect button
    return (
      <>
        <div className="card w-full p-5 animate-fade-up border-orange-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-orange-500" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-text-primary">Connect Your Wallet</h3>
                <p className="text-sm text-text-muted">Connect to view your balance</p>
              </div>
            </div>
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-xl font-medium transition-colors"
            >
              Connect
            </button>
          </div>
        </div>

        <WalletModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
        />
      </>
    )
  }

  // Connected state - show wallet info
  return (
    <div className="card w-full p-5 animate-fade-up">
      {/* Header row with title and status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Trading Wallet</h3>
            <p className="text-xs text-text-muted">Arbitrum Mainnet</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-green-500">Connected</span>
        </div>
      </div>

      {/* Wallet details row */}
      <div className="flex items-center justify-between p-3 bg-bg-secondary/50 rounded-xl">
        <div>
          <p className="text-xs text-text-muted mb-0.5">Address</p>
          <p className="text-sm font-mono text-text-primary">{displayAddress}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted mb-0.5">Balance</p>
          {balanceLoading ? (
            <p className="text-sm text-text-muted animate-pulse">Loading...</p>
          ) : (
            <p className="text-sm font-semibold text-green-400">
              {balance > 0 
                ? `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '$0.00'
              }
              <span className="text-text-muted font-normal ml-1">USDC</span>
            </p>
          )}
        </div>
      </div>

      {/* Pear Authentication Status */}
      <div className="mt-4 p-3 bg-bg-secondary/30 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPearAuthenticated ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : isPearAuthenticating ? (
              <RefreshCw className="w-4 h-4 text-accent-primary animate-spin" />
            ) : (
              <AlertCircle className="w-4 h-4 text-orange-500" />
            )}
            <span className="text-xs text-text-muted">
              {isPearAuthenticated 
                ? 'Pear Protocol: Ready to Trade' 
                : isPearAuthenticating 
                  ? 'Preparing Pear Protocol...' 
                  : 'Pear Protocol: Setup Required'}
            </span>
          </div>
          {isPearAuthenticated && (
            <span className="text-xs font-medium text-green-500">Active</span>
          )}
        </div>
        {isPearAuthenticating && (
          <p className="text-xs text-text-muted mt-2">
            Switch to Arbitrum One in your wallet now. A signature request will appear shortly...
          </p>
        )}
        {!isPearAuthenticated && !isPearAuthenticating && (
          <p className="text-xs text-text-muted mt-2">
            Authentication failed. Reconnect wallet to retry.
          </p>
        )}
      </div>

      {/* Disconnect button */}
      <button
        onClick={handleDisconnect}
        className="w-full mt-4 py-2.5 text-sm font-medium text-text-muted hover:text-accent-danger hover:bg-accent-danger/5 rounded-xl transition-colors"
      >
        Disconnect Wallet
      </button>
    </div>
  )
}
