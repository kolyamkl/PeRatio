/**
 * API Service - Fetches real data from PostgreSQL backend
 * Replaces all mock data with actual database queries
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || ''

export interface Trade {
  tradeId: string
  userId?: string
  // Nested format (from backend)
  pair?: {
    long: { symbol: string; notional: number; leverage: number }
    short: { symbol: string; notional: number; leverage: number }
  }
  // Flat format (alternative)
  pairLongSymbol?: string
  pairLongNotional?: number
  pairLongLeverage?: number
  pairShortSymbol?: string
  pairShortNotional?: number
  pairShortLeverage?: number
  takeProfitRatio: number
  stopLossRatio: number
  reasoning: string
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'EXPIRED'
  pearOrderId?: string | null
  createdAt: string
  updatedAt: string
  expiresAt?: string | null
  longBasket?: Array<{ coin: string; weight: number; notional: number }>
  shortBasket?: Array<{ coin: string; weight: number; notional: number }>
  basketCategory?: string | null
  confidence?: number | null
  factorAnalysis?: Record<string, any> | null
}

export interface TradeStatistics {
  total_trades: number
  pending_trades: number
  executed_trades: number
  cancelled_trades: number
  total_volume: number
  avg_confidence: number
  top_long_assets: Array<{ symbol: string; count: number }>
  top_short_assets: Array<{ symbol: string; count: number }>
  performance_by_day: Array<{ date: string; count: number }>
}

export interface PerformanceDataPoint {
  date: string
  trade_id: string
  volume: number
  cumulative_volume: number
  confidence: number
  status: string
  long_symbol: string
  short_symbol: string
}

/**
 * Fetch all trades from PostgreSQL
 */
export async function fetchTrades(userId?: string, status?: string): Promise<Trade[]> {
  const params = new URLSearchParams()
  if (userId) params.append('user_id', userId)
  if (status) params.append('trade_status', status)
  
  const url = `${API_BASE}/api/trades${params.toString() ? `?${params}` : ''}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch trades: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Fetch trade statistics from PostgreSQL
 */
export async function fetchTradeStatistics(userId?: string, days: number = 30): Promise<TradeStatistics> {
  const params = new URLSearchParams()
  if (userId) params.append('user_id', userId)
  params.append('days', days.toString())
  
  const url = `${API_BASE}/api/analytics/statistics?${params}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch statistics: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Fetch performance chart data from PostgreSQL
 */
export async function fetchPerformanceData(userId?: string, days: number = 30): Promise<PerformanceDataPoint[]> {
  const params = new URLSearchParams()
  if (userId) params.append('user_id', userId)
  params.append('days', days.toString())
  
  const url = `${API_BASE}/api/analytics/performance?${params}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch performance data: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Fetch a single trade by ID
 */
export async function fetchTradeById(tradeId: string): Promise<Trade> {
  const url = `${API_BASE}/api/trades/${tradeId}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch trade: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

/**
 * Format leverage for display
 */
export function formatLeverage(value: number): string {
  return `${value}x`
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
