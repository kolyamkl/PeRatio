import { useState, useEffect } from 'react'
import { ArrowUpDown, Plus, X } from 'lucide-react'
import type { Coin } from '../../lib/mockData'
import { hapticFeedback } from '../../lib/telegram'
import { CoinSelectModal } from './CoinSelectModal'
import { fetchPrices, formatPrice } from '../../lib/priceService'
import { CoinIcon } from '../common/CoinIcon'

// Extended coin type with weight
export interface CoinWithWeight extends Coin {
  weight: number
}

interface PairCardProps {
  longCoins: CoinWithWeight[]
  shortCoins: CoinWithWeight[]
  onLongCoinsChange: (coins: CoinWithWeight[]) => void
  onShortCoinsChange: (coins: CoinWithWeight[]) => void
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
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})

  // Fetch real-time prices from Hyperliquid
  useEffect(() => {
    const loadPrices = async () => {
      const prices = await fetchPrices()
      setLivePrices(prices)
    }
    
    loadPrices()
    // Refresh prices every 10 seconds
    const interval = setInterval(loadPrices, 10000)
    return () => clearInterval(interval)
  }, [])

  // Get live price for a coin
  const getLivePrice = (ticker: string, fallbackPrice?: number): number => {
    return livePrices[ticker] ?? fallbackPrice ?? 0
  }

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
    // Add coin with default weight, then redistribute weights evenly
    const coinWithWeight: CoinWithWeight = { ...coin, weight: 1 }
    
    if (showCoinSelector === 'long') {
      if (!longCoins.find(c => c.ticker === coin.ticker)) {
        const newCoins = [...longCoins, coinWithWeight]
        // Redistribute weights evenly
        const evenWeight = 100 / newCoins.length
        onLongCoinsChange(newCoins.map(c => ({ ...c, weight: evenWeight })))
      }
    } else if (showCoinSelector === 'short') {
      if (!shortCoins.find(c => c.ticker === coin.ticker)) {
        const newCoins = [...shortCoins, coinWithWeight]
        // Redistribute weights evenly
        const evenWeight = 100 / newCoins.length
        onShortCoinsChange(newCoins.map(c => ({ ...c, weight: evenWeight })))
      }
    }
  }

  // Update weight for a specific coin
  const handleWeightChange = (type: 'long' | 'short', ticker: string, newWeight: number) => {
    hapticFeedback('selection')
    const coins = type === 'long' ? longCoins : shortCoins
    const updatedCoins = coins.map(c => 
      c.ticker === ticker ? { ...c, weight: newWeight } : c
    )
    
    if (type === 'long') {
      onLongCoinsChange(updatedCoins)
    } else {
      onShortCoinsChange(updatedCoins)
    }
  }

  const getExcludedCoins = () => {
    return [...longCoins, ...shortCoins].map(c => c.ticker)
  }

  const renderCoinItem = (coin: CoinWithWeight, type: 'long' | 'short', index: number, total: number) => {
    const isLong = type === 'long'
    const livePrice = getLivePrice(coin.ticker, coin.price)
    // Use the coin's weight (stored as percentage 0-100)
    const displayWeight = Math.round(coin.weight)
    
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
            {livePrice > 0 ? formatPrice(livePrice) : `${type === 'long' ? 'Long' : 'Short'} Position`}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Editable weight input */}
          <div className="flex items-center">
            <input
              type="number"
              value={displayWeight}
              onChange={(e) => {
                const val = Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                handleWeightChange(type, coin.ticker, val)
              }}
              className={`w-12 text-right text-sm font-bold bg-transparent border-b border-dashed focus:outline-none focus:border-solid ${isLong ? 'text-accent-success border-accent-success/30' : 'text-accent-danger border-accent-danger/30'}`}
              min="1"
              max="100"
            />
            <span className={`text-sm font-bold ml-0.5 ${isLong ? 'text-accent-success' : 'text-accent-danger'}`}>%</span>
          </div>
          
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
