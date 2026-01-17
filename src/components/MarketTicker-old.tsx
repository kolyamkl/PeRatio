import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TickerItem {
  symbol: string
  price: number
  change: number
  changePercent: number
}

const mockTickerData: TickerItem[] = [
  { symbol: 'BTC', price: 43250.50, change: 1250.30, changePercent: 2.98 },
  { symbol: 'ETH', price: 2450.00, change: -45.20, changePercent: -1.81 },
  { symbol: 'SOL', price: 98.50, change: 5.30, changePercent: 5.68 },
  { symbol: 'AVAX', price: 35.80, change: 2.10, changePercent: 6.23 },
  { symbol: 'DOT', price: 7.25, change: -0.15, changePercent: -2.03 },
  { symbol: 'LINK', price: 14.80, change: 0.45, changePercent: 3.14 },
  { symbol: 'MATIC', price: 0.85, change: 0.03, changePercent: 3.66 },
  { symbol: 'ADA', price: 0.52, change: -0.02, changePercent: -3.70 },
]

export function MarketTicker() {
  const [items, setItems] = useState(mockTickerData)

  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setItems(prev => prev.map(item => {
        const changeMultiplier = (Math.random() - 0.5) * 0.002
        const newPrice = item.price * (1 + changeMultiplier)
        const newChange = newPrice - (item.price / (1 + item.changePercent / 100))
        return {
          ...item,
          price: newPrice,
          change: newChange,
          changePercent: item.changePercent + (Math.random() - 0.5) * 0.1,
        }
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Double the items for seamless loop
  const displayItems = [...items, ...items]

  return (
    <div className="relative overflow-hidden bg-bg-secondary/50 border-y border-border/30 py-2">
      {/* Gradient masks */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />
      
      <div className="flex animate-ticker">
        {displayItems.map((item, index) => (
          <div 
            key={`${item.symbol}-${index}`}
            className="flex items-center gap-3 px-4 whitespace-nowrap"
          >
            <span className="text-sm font-semibold text-text-primary">{item.symbol}</span>
            <span className="text-sm text-text-secondary font-mono">
              ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`flex items-center gap-0.5 text-xs font-medium ${item.changePercent >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
              {item.changePercent >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
            </span>
            <span className="text-border">|</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
