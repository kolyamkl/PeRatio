/**
 * WalletConnect Modal with Mobile/Desktop Flow
 * =============================================
 * Smart modal that shows:
 * - Wallet selection buttons on mobile (triggers deep links)
 * - QR code button on desktop (shows WalletConnect QR)
 * - Automatic device detection
 */

import { createPortal } from 'react-dom'
import { X, Wallet, QrCode, Smartphone, Monitor } from 'lucide-react'
import { useState } from 'react'
import { useWalletConnect } from '../../lib/walletConnectProvider'
import { WalletType } from '../../lib/walletConnectConfig'
import { hapticFeedback } from '../../lib/telegram'

interface WalletConnectModalProps {
  isOpen: boolean
  onClose: () => void
}

// Wallet options for mobile deep linking
const MOBILE_WALLETS: { id: WalletType; name: string; icon: string }[] = [
  { id: 'metamask', name: 'MetaMask', icon: '🦊' },
  { id: 'trust', name: 'Trust Wallet', icon: '🛡️' },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈' },
  { id: 'coinbase', name: 'Coinbase Wallet', icon: '💼' },
]

export function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const { deviceInfo, connectMobile, connectDesktop, isConnecting } = useWalletConnect()
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  /**
   * Handle mobile wallet selection
   * Opens the selected wallet app via deep link
   */
  const handleMobileWalletClick = async (walletType: WalletType) => {
    try {
      hapticFeedback('impact', 'medium')
      setSelectedWallet(walletType)
      setError(null)
      
      console.log(`[WalletModal] 📱 Connecting to ${walletType}...`)
      
      await connectMobile(walletType)
      
      // Close modal after initiating connection
      setTimeout(() => {
        onClose()
      }, 1000)
      
    } catch (err: any) {
      console.error('[WalletModal] Connection error:', err)
      setError(err.message || 'Failed to connect. Please try again.')
      hapticFeedback('notification', 'error')
      setSelectedWallet(null)
    }
  }

  /**
   * Handle desktop QR code flow
   * Opens Web3Modal with QR code
   */
  const handleDesktopConnect = async () => {
    try {
      hapticFeedback('impact', 'medium')
      setError(null)
      
      console.log('[WalletModal] 🖥️ Opening QR code modal...')
      
      await connectDesktop()
      
      // Close our modal after opening Web3Modal
      onClose()
      
    } catch (err: any) {
      console.error('[WalletModal] QR modal error:', err)
      setError(err.message || 'Failed to open QR code. Please try again.')
      hapticFeedback('notification', 'error')
    }
  }

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-bg-primary rounded-3xl animate-scale-in max-h-[85vh] flex flex-col shadow-2xl shadow-accent-primary/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">Connect Wallet</h3>
              <p className="text-xs text-text-muted flex items-center gap-1">
                {deviceInfo.isMobile ? (
                  <>
                    <Smartphone className="w-3 h-3" />
                    Mobile detected
                  </>
                ) : (
                  <>
                    <Monitor className="w-3 h-3" />
                    Desktop detected
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Mobile Flow - Show Wallet Options */}
          {deviceInfo.isMobile && (
            <div className="space-y-3">
              <p className="text-sm text-text-muted mb-4">
                Select your wallet app to connect:
              </p>
              
              {MOBILE_WALLETS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleMobileWalletClick(wallet.id)}
                  disabled={isConnecting}
                  className={`w-full p-4 rounded-xl border transition-all duration-200 ${
                    selectedWallet === wallet.id
                      ? 'bg-accent-primary/10 border-accent-primary'
                      : 'bg-bg-secondary border-border hover:border-accent-primary/50 hover:bg-bg-tertiary'
                  } ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{wallet.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold text-text-primary">
                        {wallet.name}
                      </div>
                      <div className="text-xs text-text-muted">
                        {selectedWallet === wallet.id ? 'Opening app...' : 'Tap to connect'}
                      </div>
                    </div>
                    {selectedWallet === wallet.id && (
                      <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </button>
              ))}

              {/* Instructions for Mobile */}
              <div className="mt-6 p-4 bg-bg-secondary/50 rounded-xl border border-border/50">
                <h4 className="text-sm font-semibold text-text-primary mb-2">How it works:</h4>
                <ol className="text-xs text-text-muted space-y-1.5">
                  <li>1. Tap your wallet above</li>
                  <li>2. Your wallet app will open automatically</li>
                  <li>3. Approve the connection request</li>
                  <li>4. Return to this app</li>
                </ol>
              </div>
            </div>
          )}

          {/* Desktop Flow - Show QR Code Button */}
          {!deviceInfo.isMobile && (
            <div className="space-y-4">
              <button
                onClick={handleDesktopConnect}
                disabled={isConnecting}
                className="w-full p-6 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-white">
                      {isConnecting ? 'Opening...' : 'Show QR Code'}
                    </div>
                    <div className="text-sm text-white/80">
                      Scan with your mobile wallet
                    </div>
                  </div>
                </div>
              </button>
              
              {/* Instructions for Desktop */}
              <div className="p-4 bg-bg-secondary/50 rounded-xl border border-border/50">
                <h4 className="text-sm font-semibold text-text-primary mb-2">How to connect:</h4>
                <ol className="text-xs text-text-muted space-y-1.5">
                  <li>1. Click "Show QR Code" above</li>
                  <li>2. Open your wallet app on your phone</li>
                  <li>3. Scan the QR code that appears</li>
                  <li>4. Approve the connection in your wallet</li>
                </ol>
              </div>

              {/* Supported Wallets */}
              <div className="p-4 bg-bg-secondary/30 rounded-xl">
                <p className="text-xs font-medium text-text-muted mb-2">Supported wallets:</p>
                <div className="flex flex-wrap gap-2">
                  {['MetaMask', 'Trust Wallet', 'Rainbow', 'Coinbase Wallet', 'Ledger Live'].map((name) => (
                    <span key={name} className="px-2 py-1 bg-bg-tertiary rounded-lg text-xs text-text-muted">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border">
          <p className="text-xs text-text-muted text-center">
            Network: <span className="text-accent-primary font-medium">Arbitrum Mainnet</span>
          </p>
          {deviceInfo.isTelegramWebApp && (
            <p className="text-xs text-text-muted/60 text-center mt-1">
              Running in Telegram {deviceInfo.isTelegramMobile ? 'Mobile' : 'Desktop'}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
