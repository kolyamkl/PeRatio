// Coin data structure - used for price lookups
export interface Coin {
  name: string
  ticker: string
  price: number
}

// Trade type for display components
export interface Trade {
  id: string
  longCoin: Coin
  shortCoin: Coin
  notionalUsd: number
  leverage: number
  pnlUsd: number
  pnlPct: number
  status: 'open' | 'closed'
  details: {
    takeProfitPct: number
    stopLossPct: number
    currentPriceLong: number
    currentPriceShort: number
    entryPriceLong: number
    entryPriceShort: number
    orderId: string
    strategyTag: string
    correlation: number
    cointegration: boolean
    halfLife: number
    hedgeRatio?: number
    remarks?: string
    winRate?: number
    sharpeRatio?: number
    volatility?: number
    timeframe?: string
    zScore?: number
    tradingEngine?: string
  }
  openedAt: Date
  closedAt?: Date
  createdAt: Date
  expiresAt?: Date
}

// Utility functions
export function formatCurrency(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number, withSign: boolean = false): string {
  const sign = withSign && value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatLeverage(value: number): string {
  return `${value}x`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Available coins for trading
export const availableCoins: Coin[] = [
  { name: 'Bitcoin', ticker: 'BTC', price: 43250.00 },
  { name: 'Ethereum', ticker: 'ETH', price: 2305.50 },
  { name: 'Solana', ticker: 'SOL', price: 98.75 },
  { name: 'Arbitrum', ticker: 'ARB', price: 1.85 },
  { name: 'Optimism', ticker: 'OP', price: 2.42 },
  { name: 'Polygon', ticker: 'MATIC', price: 0.89 },
  { name: 'Avalanche', ticker: 'AVAX', price: 36.20 },
  { name: 'Chainlink', ticker: 'LINK', price: 14.85 },
  { name: 'Uniswap', ticker: 'UNI', price: 6.45 },
  { name: 'Aave', ticker: 'AAVE', price: 95.30 },
  { name: 'Sui', ticker: 'SUI', price: 1.12 },
  { name: 'Aptos', ticker: 'APT', price: 8.95 },
  { name: 'Cosmos', ticker: 'ATOM', price: 10.25 },
  { name: 'Polkadot', ticker: 'DOT', price: 7.15 },
  { name: 'Near', ticker: 'NEAR', price: 3.85 },
  { name: 'Cardano', ticker: 'ADA', price: 0.52 },
  { name: 'Dogecoin', ticker: 'DOGE', price: 0.082 },
  { name: 'Shiba Inu', ticker: 'SHIB', price: 0.000009 },
  { name: 'Pepe', ticker: 'PEPE', price: 0.0000012 },
  { name: 'Bonk', ticker: 'BONK', price: 0.000015 },
  { name: 'Render', ticker: 'RNDR', price: 7.25 },
  { name: 'Immutable', ticker: 'IMX', price: 2.15 },
  { name: 'Axie Infinity', ticker: 'AXS', price: 6.85 },
  { name: 'The Sandbox', ticker: 'SAND', price: 0.48 },
  { name: 'Decentraland', ticker: 'MANA', price: 0.42 },
  { name: 'Gala', ticker: 'GALA', price: 0.035 },
  { name: 'Enjin', ticker: 'ENJ', price: 0.38 },
  { name: 'Flow', ticker: 'FLOW', price: 0.95 },
  { name: 'XRP', ticker: 'XRP', price: 0.62 },
]
