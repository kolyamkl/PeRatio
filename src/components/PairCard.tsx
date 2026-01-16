import { useState } from 'react'
import { TrendingUp, TrendingDown, ArrowUpDown, Plus, X } from 'lucide-react'
import type { Coin } from '../lib/mockData'
import { formatCurrency } from '../lib/mockData'
import { hapticFeedback } from '../lib/telegram'
import { CoinSelectModal } from './CoinSelectModal'

// Coin icon component
const CoinIcon = ({ ticker, size = 40 }: { ticker: string; size?: number }) => {
  const colors: Record<string, string> = {
    BTC: 'bg-orange-500',
    ETH: 'bg-blue-500',
    SOL: 'bg-gradient-to-br from-purple-500 to-cyan-400',
    AVAX: 'bg-red-500',
    DOT: 'bg-pink-500',
    LINK: 'bg-blue-600',
    MATIC: 'bg-purple-600',
    ADA: 'bg-blue-400',
    XRP: 'bg-gray-400',
    DOGE: 'bg-yellow-500',
    SHIB: 'bg-orange-400',
    APE: 'bg-blue-700',
    YGG: 'bg-purple-500',
    IMX: 'bg-cyan-500',
    GMT: 'bg-yellow-600',
    SUPER: 'bg-purple-400',
    GALA: 'bg-gray-600',
    ATOM: 'bg-purple-700',
    UNI: 'bg-pink-600',
    AAVE: 'bg-cyan-600',
    AAPL: 'bg-gray-300',
    TSLA: 'bg-red-500',
    GOOGL: 'bg-blue-500',
    MSFT: 'bg-green-500',
    NVDA: 'bg-green-600',
  }

  const bgColor = colors[ticker] || 'bg-accent-primary/30'

  return (
    <div 
      className={`${bgColor} rounded-full flex items-center justify-center font-bold text-white shadow-lg`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {ticker.slice(0, 2)}
    </div>
  )
}

interface PairCardProps {
  longCoins: Coin[]
  shortCoins: Coin[]
  onLongCoinsChange: (coins: Coin[]) => void
  onShortCoinsChange: (coins: Coin[]) => void
  onSwap: () => void
  marketType: 'Crypto' | 'Equity'
}

export function PairCard({ 
  longCoins, 
  shortCoins, 
  onLongCoinsChange, 
  onShortCoinsChange,
  onSwap,
  marketType 
}: PairCardProps) {
  const [isSwapping, setIsSwapping] = useState(false)
  const [showCoinSelector, setShowCoinSelector] = useState<'long' | 'short' | null>(null)

  const handleSwap = () => {
    hapticFeedback('impact', 'medium')
    setIsSwapping(true)
    
    // Wait for animation, then swap
    setTimeout(() => {
      onSwap()
      setTimeout(() => setIsSwapping(false), 300)
    }, 300)
  }

  const handleRemoveCoin = (type: 'long' | 'short', ticker: string) => {
    hapticFeedback('selection')
    if (type === 'long') {
      onLongCoinsChange(longCoins.filter(c => c.ticker !== ticker))
    } else {
      onShortCoinsChange(shortCoins.filter(c => c.ticker !== ticker))
    }
  }

  const handleAddCoin = (coin: Coin) => {
    hapticFeedback('selection')
    if (showCoinSelector === 'long') {
      if (!longCoins.find(c => c.ticker === coin.ticker)) {
        onLongCoinsChange([...longCoins, coin])
      }
    } else if (showCoinSelector === 'short') {
      if (!shortCoins.find(c => c.ticker === coin.ticker)) {
        onShortCoinsChange([...shortCoins, coin])
      }
    }
  }

  const getExcludedCoins = () => {
    return [...longCoins, ...shortCoins].map(c => c.ticker)
  }

  const renderCoinItem = (coin: Coin, type: 'long' | 'short', index: number, total: number) => {
    const isLong = type === 'long'
    const allocation = Math.round(100 / total)
    
    return (
      <div 
        key={coin.ticker}
        className={`
          relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300
          ${isLong ? 'bg-bg-long border border-accent-success/10 hover:border-accent-success/30' : 'bg-bg-short border border-accent-danger/10 hover:border-accent-danger/30'}
          ${index > 0 ? 'mt-2' : ''}
        `}
        style={{
          transform: isSwapping ? (isLong ? 'translateY(100%)' : 'translateY(-100%)') : 'translateY(0)',
          opacity: isSwapping ? 0 : 1,
          transition: 'all 0.3s ease-out',
        }}
      >
        {/* Coin Icon */}
        <CoinIcon ticker={coin.ticker} size={40} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-text-primary truncate">
              {coin.name}
            </span>
            <span className={`text-sm font-semibold ${isLong ? 'text-accent-success' : 'text-accent-danger'}`}>
              {coin.ticker}
            </span>
          </div>
          <span className="text-xs text-text-secondary">
            {coin.price ? formatCurrency(coin.price) : `${type === 'long' ? 'Long' : 'Short'} Position`}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${isLong ? 'text-accent-success' : 'text-accent-danger'}`}>
            {allocation}%
          </span>
          
          {total > 1 && (
            <button
              onClick={() => handleRemoveCoin(type, coin.ticker)}
              className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center hover:bg-accent-danger/20 transition-colors"
            >
              <X className="w-3 h-3 text-text-muted hover:text-accent-danger" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card p-5 animate-fade-up relative overflow-hidden" style={{ animationDelay: '100ms' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Pair Trade
            </span>
          </div>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
            {marketType}
          </span>
        </div>

        {/* Decorative background */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-accent-success/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-accent-danger/5 rounded-full blur-3xl pointer-events-none" />

        {/* Long Assets Section */}
        <div className="relative z-10 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-secondary">
              Long Assets ({longCoins.length})
            </span>
            <button
              onClick={() => setShowCoinSelector('long')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-accent-success hover:bg-accent-success/10 rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
          
          {longCoins.map((coin, i) => renderCoinItem(coin, 'long', i, longCoins.length))}
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-1 relative z-20">
          <button
            onClick={handleSwap}
            className={`
              w-10 h-10 rounded-full bg-bg-tertiary border border-border 
              flex items-center justify-center transition-all duration-300
              hover:border-accent-primary/50 hover:bg-bg-secondary
              active:scale-90
              ${isSwapping ? 'rotate-180 bg-accent-primary/20 border-accent-primary' : ''}
            `}
          >
            <ArrowUpDown className={`w-5 h-5 transition-colors duration-300 ${isSwapping ? 'text-accent-primary' : 'text-text-muted'}`} />
          </button>
        </div>

        {/* Short Assets Section */}
        <div className="relative z-10 mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-secondary">
              Short Assets ({shortCoins.length})
            </span>
            <button
              onClick={() => setShowCoinSelector('short')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-accent-danger hover:bg-accent-danger/10 rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
          
          {shortCoins.map((coin, i) => renderCoinItem(coin, 'short', i, shortCoins.length))}
        </div>
      </div>

      {/* New Coin Select Modal */}
      <CoinSelectModal
        isOpen={showCoinSelector !== null}
        onClose={() => setShowCoinSelector(null)}
        onSelect={handleAddCoin}
        type={showCoinSelector || 'long'}
        excludeCoins={getExcludedCoins()}
      />
    </>
  )
}
