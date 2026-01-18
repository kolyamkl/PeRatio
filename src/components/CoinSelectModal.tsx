import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, TrendingUp, TrendingDown, Star, Flame, Cpu, Coins, Gamepad2, Layers } from 'lucide-react'
import { type Coin } from '../lib/mockData'
import { hapticFeedback } from '../lib/telegram'
import { fetchPrices, formatPrice } from '../lib/priceService'

// Coin icons as simple colored circles with letters or symbols
const CoinIcon = ({ ticker, size = 32 }: { ticker: string; size?: number }) => {
  const colors: Record<string, string> = {
    BTC: 'bg-orange-500',
    ETH: 'bg-blue-500',
    SOL: 'bg-gradient-to-br from-purple-500 to-cyan-400',
    AVAX: 'bg-red-500',
    ARB: 'bg-blue-400',
    OP: 'bg-red-500',
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
    ACE: 'bg-gray-500',
    XAI: 'bg-red-600',
    MAVIA: 'bg-indigo-500',
    NOT: 'bg-black',
    HMSTR: 'bg-orange-600',
    SAND: 'bg-cyan-400',
    ATOM: 'bg-purple-700',
    UNI: 'bg-pink-600',
    AAVE: 'bg-cyan-600',
    SUI: 'bg-blue-500',
    APT: 'bg-black',
    SEI: 'bg-red-400',
    INJ: 'bg-blue-600',
    TIA: 'bg-purple-500',
    NEAR: 'bg-black',
    TAO: 'bg-black',
    WLD: 'bg-black',
    PEPE: 'bg-green-500',
    WIF: 'bg-amber-500',
    BONK: 'bg-orange-500',
    FLOKI: 'bg-yellow-600',
    RNDR: 'bg-red-500',
    FET: 'bg-purple-500',
  }

  const bgColor = colors[ticker] || 'bg-accent-primary/20'

  return (
    <div 
      className={`${bgColor} rounded-full flex items-center justify-center font-bold text-white shadow-lg`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {ticker.slice(0, 2)}
    </div>
  )
}

interface CoinSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (coin: Coin) => void
  type: 'long' | 'short'
  excludeCoins?: string[]
}

// Extended coin list with categories
const allCoinsData: (Coin & { category: string[] })[] = [
  // Crypto majors
  { name: 'Bitcoin', ticker: 'BTC', price: 43250.50, category: ['all', 'hot', 'defi'] },
  { name: 'Ethereum', ticker: 'ETH', price: 2450.00, category: ['all', 'hot', 'defi'] },
  { name: 'Solana', ticker: 'SOL', price: 98.50, category: ['all', 'hot', 'hip3'] },
  { name: 'Avalanche', ticker: 'AVAX', price: 35.80, category: ['all', 'hot'] },
  { name: 'Arbitrum', ticker: 'ARB', price: 0.80, category: ['all', 'hot', 'defi'] },
  { name: 'Optimism', ticker: 'OP', price: 1.80, category: ['all', 'hot', 'defi'] },
  { name: 'Polkadot', ticker: 'DOT', price: 7.25, category: ['all', 'defi'] },
  { name: 'Chainlink', ticker: 'LINK', price: 14.80, category: ['all', 'defi', 'ai'] },
  { name: 'Polygon', ticker: 'MATIC', price: 0.85, category: ['all', 'defi'] },
  { name: 'Cardano', ticker: 'ADA', price: 0.52, category: ['all'] },
  { name: 'Ripple', ticker: 'XRP', price: 0.62, category: ['all'] },
  { name: 'Cosmos', ticker: 'ATOM', price: 9.50, category: ['all', 'defi'] },
  { name: 'Uniswap', ticker: 'UNI', price: 6.25, category: ['all', 'defi'] },
  { name: 'Aave', ticker: 'AAVE', price: 92.30, category: ['all', 'defi'] },
  { name: 'Sui', ticker: 'SUI', price: 1.20, category: ['all', 'hot', 'hip3'] },
  { name: 'Aptos', ticker: 'APT', price: 8.50, category: ['all', 'hot', 'hip3'] },
  { name: 'Sei', ticker: 'SEI', price: 0.45, category: ['all', 'hot', 'hip3'] },
  { name: 'Injective', ticker: 'INJ', price: 22.50, category: ['all', 'hot', 'defi'] },
  { name: 'Celestia', ticker: 'TIA', price: 8.20, category: ['all', 'hot'] },
  { name: 'Near', ticker: 'NEAR', price: 4.80, category: ['all', 'defi'] },
  // Gaming
  { name: 'ApeCoin', ticker: 'APE', price: 1.85, category: ['all', 'gaming'] },
  { name: 'Yield Guild', ticker: 'YGG', price: 0.72, category: ['all', 'gaming'] },
  { name: 'ImmutableX', ticker: 'IMX', price: 2.15, category: ['all', 'gaming', 'hip3'] },
  { name: 'STEPN', ticker: 'GMT', price: 0.22, category: ['all', 'gaming'] },
  { name: 'SuperVerse', ticker: 'SUPER', price: 0.95, category: ['all', 'gaming'] },
  { name: 'Gala', ticker: 'GALA', price: 0.028, category: ['all', 'gaming'] },
  { name: 'Ace', ticker: 'ACE', price: 5.60, category: ['all', 'gaming'] },
  { name: 'Xai', ticker: 'XAI', price: 0.85, category: ['all', 'gaming', 'ai'] },
  { name: 'Mavia', ticker: 'MAVIA', price: 3.20, category: ['all', 'gaming'] },
  { name: 'Notcoin', ticker: 'NOT', price: 0.012, category: ['all', 'gaming', 'hot'] },
  { name: 'Hamster', ticker: 'HMSTR', price: 0.005, category: ['all', 'gaming', 'hot'] },
  { name: 'Sandbox', ticker: 'SAND', price: 0.45, category: ['all', 'gaming'] },
  // AI tokens
  { name: 'Render', ticker: 'RNDR', price: 7.50, category: ['all', 'ai'] },
  { name: 'Fetch.ai', ticker: 'FET', price: 2.30, category: ['all', 'ai'] },
  { name: 'Ocean', ticker: 'OCEAN', price: 0.95, category: ['all', 'ai'] },
  { name: 'SingularityNET', ticker: 'AGIX', price: 0.88, category: ['all', 'ai'] },
  { name: 'Bittensor', ticker: 'TAO', price: 450.00, category: ['all', 'ai', 'hot'] },
  { name: 'Worldcoin', ticker: 'WLD', price: 2.20, category: ['all', 'ai'] },
  // Memes
  { name: 'Dogecoin', ticker: 'DOGE', price: 0.082, category: ['all', 'hot'] },
  { name: 'Shiba Inu', ticker: 'SHIB', price: 0.000025, category: ['all', 'hot'] },
  { name: 'Pepe', ticker: 'PEPE', price: 0.000012, category: ['all', 'hot'] },
  { name: 'Dogwifhat', ticker: 'WIF', price: 2.50, category: ['all', 'hot'] },
  { name: 'Bonk', ticker: 'BONK', price: 0.000025, category: ['all', 'hot'] },
  { name: 'Floki', ticker: 'FLOKI', price: 0.00018, category: ['all', 'hot'] },
]

const categories = [
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'all', label: 'All Coins', icon: Coins },
  { id: 'hot', label: 'Hot', icon: Flame, emoji: '🔥' },
  { id: 'hip3', label: 'HIP-3', icon: Layers },
  { id: 'ai', label: 'AI', icon: Cpu },
  { id: 'defi', label: 'DeFi', icon: TrendingUp },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
]

export function CoinSelectModal({ isOpen, onClose, onSelect, type, excludeCoins = [] }: CoinSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [favorites, setFavorites] = useState<string[]>(['BTC', 'ETH', 'SOL'])
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})

  // Fetch real-time prices when modal opens
  useEffect(() => {
    if (isOpen) {
      const tickers = allCoinsData.map(c => c.ticker)
      fetchPrices(tickers).then(prices => {
        setLivePrices(prices)
      })
    }
  }, [isOpen])

  const filteredCoins = useMemo(() => {
    let coins = allCoinsData.filter(coin => !excludeCoins.includes(coin.ticker))
    
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
    
    // Update prices with live data
    return coins.map(coin => ({
      ...coin,
      price: livePrices[coin.ticker] ?? coin.price
    }))
  }, [searchQuery, activeCategory, favorites, excludeCoins, livePrices])

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
            {categories.map((cat) => (
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
          {filteredCoins.length === 0 ? (
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
