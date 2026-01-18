import { useState, useEffect } from 'react'
import { ExternalLink, LogOut, ChevronDown } from 'lucide-react'
import { AnimatedCurrency } from '../ui/AnimatedNumber'
import { WalletIcon } from './WalletIcons'
import { hapticFeedback } from '../../lib/telegram'

const walletNames: Record<string, string> = {
  tonconnect: 'TON Wallet',
  phantom: 'Phantom',
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase',
  trust: 'Trust',
  rainbow: 'Rainbow',
  okx: 'OKX',
  rabby: 'Rabby',
}

interface BalanceCardProps {
  balance: number
  currency?: string
  isLoading?: boolean
  connectedWallet?: string | null
  walletAddress?: string
  onDisconnect?: () => void
}

// Format balance with appropriate decimals based on currency
function formatBalance(balance: number, currency: string): string {
  if (currency === 'USD') {
    return `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  
  // For crypto, show more precision for small amounts
  if (balance < 0.001) {
    return balance.toFixed(8)
  } else if (balance < 1) {
    return balance.toFixed(6)
  } else if (balance < 100) {
    return balance.toFixed(4)
  } else {
    return balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
}

export function BalanceCard({ balance, currency = 'USD', isLoading = false, connectedWallet, walletAddress, onDisconnect }: BalanceCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleDisconnect = () => {
    hapticFeedback('impact', 'medium')
    setShowMenu(false)
    onDisconnect?.()
  }
  
  if (isLoading) {
    return (
      <div className="card p-5 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="shimmer h-3 w-24 rounded" />
            <div className="shimmer h-9 w-40 rounded-lg" />
          </div>
          <div className="shimmer w-12 h-12 rounded-xl" />
        </div>
      </div>
    )
  }
  
  return (
    <div className="card p-5 animate-fade-up overflow-hidden relative group gradient-border">
      {/* Connected wallet badge */}
      {connectedWallet && (
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden">
              <WalletIcon walletId={connectedWallet} className="w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-text-secondary">
                {walletNames[connectedWallet] || 'Wallet'}
              </span>
              {walletAddress && (
                <span className="text-xs text-text-muted font-mono">
                  {walletAddress}
                </span>
              )}
            </div>
            <span className="px-2 py-0.5 rounded-full bg-accent-success/10 text-accent-success text-xs font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-success"></span>
              Connected
            </span>
          </div>
          
          {/* Wallet menu dropdown */}
          <div className="relative">
            <button 
              onClick={() => {
                hapticFeedback('selection')
                setShowMenu(!showMenu)
              }}
              className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-bg-tertiary"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown menu */}
            {showMenu && (
              <>
                {/* Backdrop to close menu */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMenu(false)}
                />
                
                <div className="absolute right-0 top-full mt-2 w-48 bg-bg-secondary border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-up">
                  <button
                    onClick={() => window.open('https://etherscan.io', '_blank')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-text-muted" />
                    View on Explorer
                  </button>
                  <div className="h-px bg-border" />
                  <button
                    onClick={handleDisconnect}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-accent-danger hover:bg-accent-danger/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
            {currency === 'USD' ? 'Available Margin' : `${currency} Balance`}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-success"></span>
            </span>
          </span>
          <div className="text-3xl font-bold text-text-primary tracking-tight">
            {isVisible ? (
              currency === 'USD' ? (
                <AnimatedCurrency value={balance} />
              ) : (
                <span className="flex items-baseline gap-1.5">
                  <span>{formatBalance(balance, currency)}</span>
                  <span className="text-lg text-text-muted font-medium">{currency}</span>
                </span>
              )
            ) : (
              <span className="opacity-0">0.00</span>
            )}
          </div>
        </div>
        
        {/* Pear logo accent with float animation */}
        <div className="w-14 h-14 rounded-xl bg-accent-primary/10 flex items-center justify-center float-icon group-hover:animate-bounce-soft transition-all duration-300 group-hover:bg-accent-primary/20">
          <svg className="w-8 h-8 text-accent-primary transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C9.5 2 7.5 4 7.5 6.5C7.5 9 9 11 9 13C9 15 7 17 7 19C7 21 9 22 12 22C15 22 17 21 17 19C17 17 15 15 15 13C15 11 16.5 9 16.5 6.5C16.5 4 14.5 2 12 2Z"/>
          </svg>
        </div>
      </div>
      
      {/* Animated gradient background */}
      <div 
        className="absolute -top-20 -right-20 w-60 h-60 opacity-20 pointer-events-none blur-3xl transition-all duration-500 group-hover:opacity-30 group-hover:scale-110"
        style={{
          background: 'radial-gradient(circle, var(--accent-primary), transparent 70%)',
        }}
      />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-muted) 1px, transparent 0)`,
          backgroundSize: '20px 20px',
        }}
      />
    </div>
  )
}
