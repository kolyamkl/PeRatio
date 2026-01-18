import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TickerItem {
  symbol: string
  name: string
  price: number
  change24h: number
}

// Fetch real prices from CoinGecko API
async function fetchCryptoPrices(): Promise<TickerItem[]> {
  const coins = ['bitcoin', 'ethereum', 'solana', 'avalanche-2', 'polkadot', 'chainlink', 'matic-network', 'cardano', 'dogecoin', 'ripple']
  
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(',')}&vs_currencies=usd&include_24hr_change=true`,
      { 
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    const symbolMap: Record<string, string> = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'solana': 'SOL',
      'avalanche-2': 'AVAX',
      'polkadot': 'DOT',
      'chainlink': 'LINK',
      'matic-network': 'MATIC',
      'cardano': 'ADA',
      'dogecoin': 'DOGE',
      'ripple': 'XRP',
    }
    
    return coins.map(coin => ({
      symbol: symbolMap[coin] || coin.toUpperCase(),
      name: coin,
      price: data[coin]?.usd || 0,
      change24h: data[coin]?.usd_24h_change || 0,
    })).filter(item => item.price > 0)
    
  } catch (error) {
    console.error('[MarketTicker] API Error:', error)
    return []
  }
}

// Fallback data when API fails
const fallbackData: TickerItem[] = [
  { symbol: 'BTC', name: 'bitcoin', price: 95000, change24h: 2.5 },
  { symbol: 'ETH', name: 'ethereum', price: 3400, change24h: -1.2 },
  { symbol: 'SOL', name: 'solana', price: 180, change24h: 5.3 },
  { symbol: 'AVAX', name: 'avalanche', price: 35, change24h: 3.1 },
  { symbol: 'DOT', name: 'polkadot', price: 7, change24h: -0.8 },
  { symbol: 'LINK', name: 'chainlink', price: 15, change24h: 1.9 },
  { symbol: 'MATIC', name: 'polygon', price: 0.85, change24h: 2.2 },
  { symbol: 'ADA', name: 'cardano', price: 0.55, change24h: -1.5 },
  { symbol: 'DOGE', name: 'dogecoin', price: 0.32, change24h: 4.1 },
  { symbol: 'XRP', name: 'ripple', price: 2.3, change24h: 1.7 },
]

export function MarketTicker() {
  const [items, setItems] = useState<TickerItem[]>(fallbackData)
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch prices on mount and every 30 seconds
  useEffect(() => {
    const loadPrices = async () => {
      console.log('[MarketTicker] Fetching prices...')
      const prices = await fetchCryptoPrices()
      
      if (prices.length > 0) {
        setItems(prices)
        console.log('[MarketTicker] ✅ Prices updated:', prices.length, 'coins')
      } else {
        console.log('[MarketTicker] Using fallback data')
      }
      
      setIsLoading(false)
    }

    // Initial load
    loadPrices()

    // Refresh every 30 seconds
    intervalRef.current = setInterval(loadPrices, 30000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Double items for seamless loop
  const displayItems = [...items, ...items]

  // Format price based on value
  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    } else if (price >= 1) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } else {
      return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
    }
  }

  return (
    <div className="relative overflow-hidden bg-bg-secondary/50 border-y border-border/30 py-2">
      {/* Gradient masks */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent-primary/30 overflow-hidden">
          <div className="h-full w-1/3 bg-accent-primary animate-pulse" />
        </div>
      )}
      
      <div className="flex animate-ticker">
        {displayItems.map((item, index) => (
          <div 
            key={`${item.symbol}-${index}`}
            className="flex items-center gap-3 px-4 whitespace-nowrap"
          >
            <span className="text-sm font-semibold text-text-primary">{item.symbol}</span>
            <span className="text-sm text-text-secondary font-mono">
              ${formatPrice(item.price)}
            </span>
            <span className={`flex items-center gap-0.5 text-xs font-medium ${
              item.change24h >= 0 ? 'text-accent-success' : 'text-accent-danger'
            }`}>
              {item.change24h >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
            </span>
            <span className="text-border/50">|</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 40s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
