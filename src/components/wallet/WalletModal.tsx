import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { X, Wallet, QrCode } from 'lucide-react'
import { hapticFeedback } from '../../lib/telegram'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount } from 'wagmi'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { open } = useWeb3Modal()
  const { isConnected } = useAccount()

  // Auto-close modal when wallet connects
  useEffect(() => {
    if (isConnected && isOpen) {
      console.log('[WalletModal] ✅ Wallet connected, closing modal')
      hapticFeedback('notification', 'success')
      onClose()
    }
  }, [isConnected, isOpen, onClose])

  const handleConnect = async () => {
    console.log('[WalletModal] 🔗 Opening WalletConnect QR modal...')
    hapticFeedback('impact', 'medium')
    
    try {
      // Open Web3Modal - it will show QR code automatically
      await open()
      
      console.log('[WalletModal] ✅ Web3Modal opened')
    } catch (error) {
      console.error('[WalletModal] ❌ Failed to open Web3Modal:', error)
      hapticFeedback('notification', 'error')
    }
  }

  if (!isOpen) return null

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
              <p className="text-xs text-text-muted">Scan with your mobile wallet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Connect Button */}
        <div className="flex-1 overflow-y-auto p-5">
          <button
            onClick={handleConnect}
            className="w-full p-6 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="text-lg font-bold text-white">WalletConnect</div>
                <div className="text-sm text-white/80">Scan QR code to connect</div>
              </div>
            </div>
          </button>
          
          {/* Instructions */}
          <div className="mt-6 p-4 bg-bg-secondary/50 rounded-xl border border-border/50">
            <h4 className="text-sm font-semibold text-text-primary mb-2">How to connect:</h4>
            <ol className="text-xs text-text-muted space-y-1.5">
              <li>1. Click "WalletConnect" above</li>
              <li>2. Scan the QR code with your wallet app (MetaMask, Trust Wallet, etc.)</li>
              <li>3. Approve the connection on Arbitrum mainnet</li>
            </ol>
          </div>

          {/* Supported Wallets */}
          <div className="mt-4 p-4 bg-bg-secondary/30 rounded-xl">
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

        {/* Footer */}
        <div className="p-5 border-t border-border">
          <p className="text-xs text-text-muted text-center">
            Network: <span className="text-accent-primary font-medium">Arbitrum Mainnet</span>
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
