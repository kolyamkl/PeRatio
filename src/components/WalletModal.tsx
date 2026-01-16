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
    id: 'tonconnect',
    name: 'TON Wallet',
    description: 'Telegram native wallet',
    popular: true,
  },
  {
    id: 'phantom',
    name: 'Phantom',
    description: 'Solana & Ethereum wallet',
    popular: true,
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'Most popular Web3 wallet',
    popular: true,
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    description: 'Connect any mobile wallet',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    description: 'Self-custody crypto wallet',
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    description: 'Multi-chain crypto wallet',
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    description: 'Multi-chain DeFi wallet',
  },
  {
    id: 'rabby',
    name: 'Rabby',
    description: 'Better security for DeFi',
  },
]

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, isConnecting, isConnected, walletType } = useWallet()

  const handleConnect = async (wallet: WalletOption) => {
    hapticFeedback('impact', 'medium')
    const success = await connect(wallet.id)
    
    if (success && wallet.id !== 'tonconnect') {
      // TON Connect has its own modal, so we don't close immediately
      setTimeout(() => {
        onClose()
      }, 500)
    }
  }

  const popularWallets = wallets.filter(w => w.popular)
  const otherWallets = wallets.filter(w => !w.popular)

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
              <p className="text-xs text-text-muted">Choose your preferred wallet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Wallet List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Popular wallets */}
          <div>
            <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
              Popular
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {popularWallets.map((wallet) => (
                <WalletButton
                  key={wallet.id}
                  wallet={wallet}
                  connecting={isConnecting && walletType === wallet.id}
                  connected={isConnected && walletType === wallet.id}
                  onClick={() => handleConnect(wallet)}
                />
              ))}
            </div>
          </div>

          {/* Other wallets */}
          <div>
            <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
              More Options
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {otherWallets.map((wallet) => (
                <WalletButtonCompact
                  key={wallet.id}
                  wallet={wallet}
                  connecting={isConnecting && walletType === wallet.id}
                  connected={isConnected && walletType === wallet.id}
                  onClick={() => handleConnect(wallet)}
                />
              ))}
            </div>
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

function WalletButtonCompact({ wallet, connecting, connected, onClick }: WalletButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={connecting || connected}
      className={`
        flex items-center gap-3 p-3 rounded-xl border transition-all
        ${connected 
          ? 'bg-accent-success/10 border-accent-success' 
          : 'bg-bg-secondary border-border hover:border-accent-primary/50 hover:bg-bg-tertiary'
        }
        disabled:opacity-70
      `}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
        <WalletIcon walletId={wallet.id} className="w-10 h-10" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="font-medium text-text-primary text-sm truncate">{wallet.name}</div>
      </div>
      {connecting ? (
        <Loader2 className="w-4 h-4 text-accent-primary animate-spin flex-shrink-0" />
      ) : connected ? (
        <Check className="w-4 h-4 text-accent-success flex-shrink-0" />
      ) : null}
    </button>
  )
}
