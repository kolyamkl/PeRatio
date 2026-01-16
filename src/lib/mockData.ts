// Mock data for the trading app
// Structure is ready to be replaced with API calls

export interface Coin {
  name: string
  ticker: string
  price?: number
}

// Available coins for selection
export const availableCoins: Coin[] = [
  { name: 'Bitcoin', ticker: 'BTC', price: 42150 },
  { name: 'Ethereum', ticker: 'ETH', price: 2450 },
  { name: 'Solana', ticker: 'SOL', price: 98.50 },
  { name: 'Cardano', ticker: 'ADA', price: 0.52 },
  { name: 'Polkadot', ticker: 'DOT', price: 6.80 },
  { name: 'Avalanche', ticker: 'AVAX', price: 35.20 },
  { name: 'Chainlink', ticker: 'LINK', price: 14.80 },
  { name: 'Polygon', ticker: 'MATIC', price: 0.92 },
  { name: 'Litecoin', ticker: 'LTC', price: 72.50 },
  { name: 'Uniswap', ticker: 'UNI', price: 6.20 },
  { name: 'Cosmos', ticker: 'ATOM', price: 9.50 },
  { name: 'Hyperliquid', ticker: 'HYPE', price: 24.59 },
  { name: 'Arbitrum', ticker: 'ARB', price: 1.12 },
  { name: 'Optimism', ticker: 'OP', price: 2.85 },
  { name: 'Near Protocol', ticker: 'NEAR', price: 4.20 },
]

export interface PresetTrade {
  walletBalance: number
  longCoin: Coin
  shortCoin: Coin
  proportion: {
    longPct: number
    shortPct: number
  }
  risk: {
    stopLossPct: number
    takeProfitPct: number
  }
  leverage: number
  marketType: 'Crypto' | 'Equity'
}

export interface TradeDetails {
  entryPriceLong: number
  entryPriceShort: number
  currentPriceLong: number
  currentPriceShort: number
  orderId: string
  strategyTag: string
  // Advanced stats like Pear
  correlation: number
  cointegration: boolean
  halfLife: number
  zScore: number
  hedgeRatio: number
  winRate: number
  sharpeRatio: number
  volatility: number
  timeframe: string
  tradingEngine: 'Hyperliquid' | 'SYMM' | 'Both'
  remarks?: string
}

export interface Trade {
  id: string
  longCoin: Coin
  shortCoin: Coin
  status: 'open' | 'closed'
  openedAt: string
  closedAt: string | null
  notionalUsd: number
  leverage: number
  stopLossPct: number
  takeProfitPct: number
  longPct: number
  shortPct: number
  pnlUsd: number
  pnlPct: number
  details: TradeDetails
}

// Preset trade configuration for TradeConfirmPage
export const presetTrade: PresetTrade = {
  walletBalance: 12450.23,
  longCoin: {
    name: 'Solana',
    ticker: 'SOL',
  },
  shortCoin: {
    name: 'Ethereum',
    ticker: 'ETH',
  },
  proportion: {
    longPct: 60,
    shortPct: 40,
  },
  risk: {
    stopLossPct: 1.5,
    takeProfitPct: 3.0,
  },
  leverage: 5,
  marketType: 'Crypto',
}

// Mock trades for TradesPage
export const mockTrades: Trade[] = [
  {
    id: 'TRD-001',
    longCoin: { name: 'Solana', ticker: 'SOL' },
    shortCoin: { name: 'Ethereum', ticker: 'ETH' },
    status: 'open',
    openedAt: '2026-01-15T09:30:00Z',
    closedAt: null,
    notionalUsd: 200,
    leverage: 5,
    stopLossPct: 1.5,
    takeProfitPct: 3.0,
    longPct: 60,
    shortPct: 40,
    pnlUsd: 12.45,
    pnlPct: 1.24,
    details: {
      entryPriceLong: 98.50,
      entryPriceShort: 2450.00,
      currentPriceLong: 101.25,
      currentPriceShort: 2420.00,
      orderId: 'ORD-2026-001-XYZ',
      strategyTag: 'Momentum Pair',
      correlation: 0.834,
      cointegration: true,
      halfLife: 1.2,
      zScore: 1.61,
      hedgeRatio: 0.57,
      winRate: 85,
      sharpeRatio: 15.55,
      volatility: 28.89,
      timeframe: '1h',
      tradingEngine: 'Hyperliquid',
      remarks: 'Strong momentum divergence detected between SOL and ETH, entering based on mean reversion signal.',
    },
  },
  {
    id: 'TRD-002',
    longCoin: { name: 'Bitcoin', ticker: 'BTC' },
    shortCoin: { name: 'Litecoin', ticker: 'LTC' },
    status: 'open',
    openedAt: '2026-01-14T14:15:00Z',
    closedAt: null,
    notionalUsd: 500,
    leverage: 3,
    stopLossPct: 2.0,
    takeProfitPct: 4.0,
    longPct: 70,
    shortPct: 30,
    pnlUsd: -8.75,
    pnlPct: -0.58,
    details: {
      entryPriceLong: 42150.00,
      entryPriceShort: 72.50,
      currentPriceLong: 41980.00,
      currentPriceShort: 73.20,
      orderId: 'ORD-2026-002-ABC',
      strategyTag: 'Mean Reversion',
      correlation: 0.72,
      cointegration: true,
      halfLife: 2.4,
      zScore: -0.45,
      hedgeRatio: 0.82,
      winRate: 78,
      sharpeRatio: 12.30,
      volatility: 22.15,
      timeframe: '4h',
      tradingEngine: 'Both',
      remarks: 'BTC/LTC pair showing mean reversion opportunity. Z-score approaching neutral.',
    },
  },
  {
    id: 'TRD-003',
    longCoin: { name: 'Cardano', ticker: 'ADA' },
    shortCoin: { name: 'Polkadot', ticker: 'DOT' },
    status: 'open',
    openedAt: '2026-01-13T11:00:00Z',
    closedAt: null,
    notionalUsd: 150,
    leverage: 4,
    stopLossPct: 1.0,
    takeProfitPct: 2.5,
    longPct: 50,
    shortPct: 50,
    pnlUsd: 4.20,
    pnlPct: 0.70,
    details: {
      entryPriceLong: 0.52,
      entryPriceShort: 6.80,
      currentPriceLong: 0.535,
      currentPriceShort: 6.72,
      orderId: 'ORD-2026-003-DEF',
      strategyTag: 'Sector Rotation',
      correlation: 0.91,
      cointegration: true,
      halfLife: 0.8,
      zScore: 2.15,
      hedgeRatio: 0.45,
      winRate: 82,
      sharpeRatio: 18.20,
      volatility: 35.42,
      timeframe: '1h',
      tradingEngine: 'Hyperliquid',
    },
  },
  {
    id: 'TRD-004',
    longCoin: { name: 'Avalanche', ticker: 'AVAX' },
    shortCoin: { name: 'Polygon', ticker: 'MATIC' },
    status: 'closed',
    openedAt: '2026-01-10T08:45:00Z',
    closedAt: '2026-01-12T16:30:00Z',
    notionalUsd: 300,
    leverage: 5,
    stopLossPct: 1.5,
    takeProfitPct: 3.0,
    longPct: 55,
    shortPct: 45,
    pnlUsd: 27.00,
    pnlPct: 3.0,
    details: {
      entryPriceLong: 35.20,
      entryPriceShort: 0.92,
      currentPriceLong: 37.50,
      currentPriceShort: 0.88,
      orderId: 'ORD-2026-004-GHI',
      strategyTag: 'Layer 1 Spread',
      correlation: 0.88,
      cointegration: true,
      halfLife: 1.5,
      zScore: 0.34,
      hedgeRatio: 0.62,
      winRate: 90,
      sharpeRatio: 21.50,
      volatility: 19.80,
      timeframe: '4h',
      tradingEngine: 'SYMM',
      remarks: 'Layer 1 spread trade closed at take profit. Strong cointegration maintained throughout.',
    },
  },
  {
    id: 'TRD-005',
    longCoin: { name: 'Chainlink', ticker: 'LINK' },
    shortCoin: { name: 'Uniswap', ticker: 'UNI' },
    status: 'closed',
    openedAt: '2026-01-08T10:00:00Z',
    closedAt: '2026-01-09T14:20:00Z',
    notionalUsd: 250,
    leverage: 4,
    stopLossPct: 2.0,
    takeProfitPct: 3.5,
    longPct: 65,
    shortPct: 35,
    pnlUsd: -12.50,
    pnlPct: -1.67,
    details: {
      entryPriceLong: 14.80,
      entryPriceShort: 6.20,
      currentPriceLong: 14.20,
      currentPriceShort: 6.45,
      orderId: 'ORD-2026-005-JKL',
      strategyTag: 'DeFi Oracle',
      correlation: 0.65,
      cointegration: false,
      halfLife: 3.2,
      zScore: -1.82,
      hedgeRatio: 0.71,
      winRate: 68,
      sharpeRatio: 8.90,
      volatility: 42.30,
      timeframe: '1h',
      tradingEngine: 'Hyperliquid',
      remarks: 'DeFi oracle play hit stop loss. Cointegration broke down during volatile period.',
    },
  },
  {
    id: 'TRD-006',
    longCoin: { name: 'Solana', ticker: 'SOL' },
    shortCoin: { name: 'Cosmos', ticker: 'ATOM' },
    status: 'closed',
    openedAt: '2026-01-05T09:15:00Z',
    closedAt: '2026-01-07T11:45:00Z',
    notionalUsd: 400,
    leverage: 3,
    stopLossPct: 1.5,
    takeProfitPct: 4.0,
    longPct: 60,
    shortPct: 40,
    pnlUsd: 48.00,
    pnlPct: 4.0,
    details: {
      entryPriceLong: 92.00,
      entryPriceShort: 9.50,
      currentPriceLong: 99.20,
      currentPriceShort: 9.10,
      orderId: 'ORD-2026-006-MNO',
      strategyTag: 'Ecosystem Play',
      correlation: 0.79,
      cointegration: true,
      halfLife: 1.8,
      zScore: 0.12,
      hedgeRatio: 0.55,
      winRate: 88,
      sharpeRatio: 19.80,
      volatility: 24.50,
      timeframe: '4h',
      tradingEngine: 'Both',
      remarks: 'Ecosystem play between Solana and Cosmos hit take profit target. Excellent mean reversion execution.',
    },
  },
]

// Utility functions for data formatting
export function formatCurrency(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number, showSign: boolean = false): string {
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatLeverage(value: number): string {
  return `${value}x`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

// Filter helpers
export function getOpenTrades(): Trade[] {
  return mockTrades.filter(trade => trade.status === 'open')
}

export function getClosedTrades(): Trade[] {
  return mockTrades.filter(trade => trade.status === 'closed')
}
