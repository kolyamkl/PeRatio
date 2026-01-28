import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, TrendingUp, TrendingDown, Star } from 'lucide-react'
import { type Coin } from '../../lib/mockData'
import { hapticFeedback } from '../../lib/telegram'
import { fetchPrices, formatPrice } from '../../lib/priceService'
import { fetchAllAssets, assetCategories, type Asset } from '../../lib/assetService'
import { CoinIcon } from '../common/CoinIcon'

interface CoinSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (coin: Coin) => void
  type: 'long' | 'short'
  excludeCoins?: string[]
}

// Categories from asset service (already imported)

export function CoinSelectModal({ isOpen, onClose, onSelect, type, excludeCoins = [] }: CoinSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [favorites, setFavorites] = useState<string[]>(['BTC', 'ETH', 'SOL'])
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})
  const [allAssets, setAllAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch assets and prices when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      
      // Fetch all assets from Hyperliquid
      fetchAllAssets().then(assets => {
        setAllAssets(assets)
        setLoading(false)
      })
      
      // Fetch prices
      fetchPrices().then(prices => {
        setLivePrices(prices)
      })
    }
  }, [isOpen])

  const filteredCoins = useMemo(() => {
    let coins = allAssets.filter(coin => !excludeCoins.includes(coin.ticker))
    
    // Filter by category
    if (activeCategory === 'favorites') {
      coins = coins.filter(coin => favorites.includes(coin.ticker))
    } else if (activeCategory !== 'all') {
      coins = coins.filter(coin => coin.category.includes(activeCategory))
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      coins = coins.filter(coin => 
        coin.name.toLowerCase().includes(query) || 
        coin.ticker.toLowerCase().includes(query)
      )
    }
    
    // Map to Coin type with live prices
    return coins.map(coin => ({
      name: coin.name,
      ticker: coin.ticker,
      price: livePrices[coin.ticker] ?? 0,
      category: coin.category,
    }))
  }, [searchQuery, activeCategory, favorites, excludeCoins, livePrices, allAssets])

  const toggleFavorite = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation()
    hapticFeedback('selection')
    setFavorites(prev => 
      prev.includes(ticker) 
        ? prev.filter(t => t !== ticker)
        : [...prev, ticker]
    )
  }

  const handleSelect = (coin: Coin) => {
    hapticFeedback('impact')
    onSelect(coin)
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-bg-primary rounded-3xl animate-scale-in max-h-[85vh] flex flex-col shadow-2xl shadow-accent-primary/10">
        {/* Header with city background */}
        <div className="relative overflow-hidden flex-shrink-0">
          {/* City silhouette background */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: `
                linear-gradient(to bottom, transparent 0%, var(--bg-primary) 100%),
                linear-gradient(to top, var(--accent-primary) 0%, transparent 60%)
              `,
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20">
            <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
              <path 
                d="M0,100 L0,60 L20,60 L20,40 L40,40 L40,50 L60,50 L60,30 L80,30 L80,45 L100,45 L100,25 L120,25 L120,55 L140,55 L140,35 L160,35 L160,50 L180,50 L180,20 L200,20 L200,40 L220,40 L220,30 L240,30 L240,45 L260,45 L260,25 L280,25 L280,50 L300,50 L300,35 L320,35 L320,55 L340,55 L340,40 L360,40 L360,60 L380,60 L380,45 L400,45 L400,100 Z"
                fill="var(--accent-primary)"
              />
            </svg>
          </div>
          
          <div className="relative px-6 pt-6 pb-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-bg-tertiary/50 flex items-center justify-center hover:bg-bg-tertiary transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-text-primary">
                  Select {type === 'long' ? 'Long' : 'Short'} Token
                </h2>
                {type === 'long' ? (
                  <TrendingUp className="w-5 h-5 text-accent-success" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-accent-danger" />
                )}
              </div>
              <p className={`text-sm ${type === 'long' ? 'text-accent-success' : 'text-accent-danger'}`}>
                Select a token to go {type}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Search token by symbol"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-bg-secondary rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 py-3 border-b border-border overflow-x-auto flex-shrink-0">
          <div className="flex gap-2 min-w-max">
            {assetCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  hapticFeedback('selection')
                  setActiveCategory(cat.id)
                }}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                  ${activeCategory === cat.id 
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30' 
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80'}
                `}
              >
                {cat.emoji ? (
                  <span className="flex items-center gap-1.5">
                    {cat.label} <span>{cat.emoji}</span>
                  </span>
                ) : (
                  cat.label
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Coins Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-text-muted">Loading assets...</p>
            </div>
          ) : filteredCoins.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-muted">No tokens found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredCoins.map((coin) => (
                <button
                  key={coin.ticker}
                  onClick={() => handleSelect(coin)}
                  className="relative flex items-center gap-3 p-3 rounded-2xl bg-bg-secondary hover:bg-bg-tertiary transition-all group btn-press border border-transparent hover:border-accent-primary/20"
                >
                  {/* Favorite button */}
                  <button
                    onClick={(e) => toggleFavorite(coin.ticker, e)}
                    className="absolute top-2 left-2 opacity-50 group-hover:opacity-100 transition-opacity"
                  >
                    <Star 
                      className={`w-4 h-4 ${favorites.includes(coin.ticker) ? 'text-yellow-400 fill-yellow-400' : 'text-text-muted'}`}
                    />
                  </button>
                  
                  {/* Coin icon */}
                  <CoinIcon ticker={coin.ticker} size={36} />
                  
                  {/* Coin info */}
                  <div className="text-left min-w-0">
                    <p className="font-bold text-text-primary truncate">{coin.ticker}</p>
                    {coin.price && (
                      <p className="text-xs text-text-muted truncate">
                        {formatPrice(coin.price)}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
