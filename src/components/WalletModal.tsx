import { createPortal } from 'react-dom'
import { X, Wallet, ExternalLink, Check, Loader2 } from 'lucide-react'
import { hapticFeedback } from '../lib/telegram'
import { useWallet, WalletType } from '../lib/wallet'
import { WalletIcon } from './WalletIcons'

interface WalletOption {
  id: WalletType
  name: string
  description: string
  popular?: boolean
}

const wallets: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'Connect via QR code or mobile app',
    popular: true,
  },
  {
    id: 'walletconnect' as WalletType,
    name: 'WalletConnect',
    description: 'Scan with mobile wallet',
  },
  {
    id: 'coinbase' as WalletType,
    name: 'Coinbase Wallet',
    description: 'Connect Coinbase wallet',
  },
  {
    id: 'phantom' as WalletType,
    name: 'Phantom',
    description: 'Solana & multi-chain wallet',
  },
  {
    id: 'tonconnect' as WalletType,
    name: 'TON Connect',
    description: 'Connect TON wallet',
  },
]

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, isConnecting, isConnected, walletType } = useWallet()

  const handleConnect = async (wallet: WalletOption) => {
    console.log('[WalletModal] 🔗 Connect clicked:', wallet.name)
    hapticFeedback('impact', 'medium')
    
    // Only MetaMask is supported - redirect others to MetaMask
    if (wallet.id !== 'metamask') {
      console.log('[WalletModal] ⚠️ Unsupported wallet, using MetaMask instead')
      hapticFeedback('notification', 'warning')
      alert(`${wallet.name} coming soon!\n\nConnecting with MetaMask instead...`)
    }
    
    console.log('[WalletModal] 📡 Initiating MetaMask connection...')
    // Always connect with MetaMask
    const success = await connect('metamask')
    
    console.log('[WalletModal] Connection result:', success ? '✅ Success' : '❌ Failed')
    
    if (success) {
      console.log('[WalletModal] 🎉 Closing modal after successful connection')
      setTimeout(() => {
        onClose()
      }, 500)
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
              <p className="text-xs text-text-muted">Scan QR code with MetaMask app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Wallet List - MetaMask Only */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-2">
            {wallets.map((wallet) => (
              <WalletButton
                key={wallet.id}
                wallet={wallet}
                connecting={isConnecting && walletType === wallet.id}
                connected={isConnected && walletType === wallet.id}
                onClick={() => handleConnect(wallet)}
              />
            ))}
          </div>
          
          {/* Instructions */}
          <div className="mt-6 p-4 bg-bg-secondary/50 rounded-xl border border-border/50">
            <h4 className="text-sm font-semibold text-text-primary mb-2">How to connect:</h4>
            <ol className="text-xs text-text-muted space-y-1.5">
              <li>1. Click the MetaMask button above</li>
              <li>2. Scan the QR code with your MetaMask mobile app</li>
              <li>3. Approve the connection in MetaMask</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border">
          <p className="text-xs text-text-muted text-center">
            By connecting, you agree to our{' '}
            <span className="text-accent-primary">Terms of Service</span>
            {' '}and{' '}
            <span className="text-accent-primary">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}

interface WalletButtonProps {
  wallet: WalletOption
  connecting: boolean
  connected: boolean
  onClick: () => void
}

function WalletButton({ wallet, connecting, connected, onClick }: WalletButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={connecting || connected}
      className={`
        w-full flex items-center gap-4 p-4 rounded-2xl border transition-all
        ${connected 
          ? 'bg-accent-success/10 border-accent-success' 
          : 'bg-bg-secondary border-border hover:border-accent-primary/50 hover:bg-bg-tertiary'
        }
        disabled:opacity-70
      `}
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center">
        <WalletIcon walletId={wallet.id} className="w-12 h-12" />
      </div>
      <div className="flex-1 text-left">
        <div className="font-semibold text-text-primary">{wallet.name}</div>
        <div className="text-xs text-text-muted">{wallet.description}</div>
      </div>
      <div className="w-8 h-8 flex items-center justify-center">
        {connecting ? (
          <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />
        ) : connected ? (
          <div className="w-6 h-6 rounded-full bg-accent-success flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        ) : (
          <ExternalLink className="w-4 h-4 text-text-muted" />
        )}
      </div>
    </button>
  )
}
