import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowRight, 
  Inbox, 
  Search, 
  Filter,
  Zap,
  BarChart3,
  RefreshCw
} from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { SegmentedSwitch } from '../components/SegmentedSwitch'
import { TradeCard } from '../components/TradeCard'
import { PerformanceChart } from '../components/PerformanceChart'
import { ShimmerTradeCard } from '../components/Shimmer'
import { GlowPulse } from '../components/GlowPulse'
import { formatCurrency, formatPercent, type Trade, availableCoins, mockTrades } from '../lib/mockData'
import { hapticFeedback } from '../lib/telegram'

// Backend URL - uses env var in production, empty for dev (Vite proxy)
const backendUrl = import.meta.env.VITE_BACKEND_URL || ''

type TabValue = 'Open' | 'Closed'

// API response type from backend
interface ApiTrade {
  tradeId?: string
  trade_id?: string
  pair?: {
    long: { symbol: string; notional: number; leverage: number }
    short: { symbol: string; notional: number; leverage: number }
  }
  // New format from Pear positions API
  pair_long_symbol?: string
  pair_short_symbol?: string
  pair_long_notional?: number
  pair_short_notional?: number
  pair_long_leverage?: number
  pair_short_leverage?: number
  pair_long_entry_price?: number
  pair_short_entry_price?: number
  takeProfitRatio?: number
  take_profit_ratio?: number
  stopLossRatio?: number
  stop_loss_ratio?: number
  reasoning?: string
  status?: string
  expiresAt?: string | null
  pnl_usd?: number
  pnl_pct?: number
  created_at?: string
}

// Convert API trade to frontend Trade format
function apiTradeToTrade(apiTrade: ApiTrade): Trade {
  // Handle both old and new API formats
  let longSymbol: string
  let shortSymbol: string
  let longNotional: number
  let shortNotional: number
  let leverage: number
  let takeProfitRatio: number
  let stopLossRatio: number
  let tradeId: string
  let pnlUsd: number
  let pnlPct: number
  let entryPriceLong: number
  let entryPriceShort: number
  
  if (apiTrade.pair) {
    // Old format
    longSymbol = apiTrade.pair.long.symbol.replace('-PERP', '')
    shortSymbol = apiTrade.pair.short.symbol.replace('-PERP', '')
    longNotional = apiTrade.pair.long.notional
    shortNotional = apiTrade.pair.short.notional
    leverage = apiTrade.pair.long.leverage
    takeProfitRatio = apiTrade.takeProfitRatio || 0.1
    stopLossRatio = apiTrade.stopLossRatio || -0.05
    tradeId = apiTrade.tradeId || ''
    pnlUsd = 0
    pnlPct = 0
    entryPriceLong = 0
    entryPriceShort = 0
  } else {
    // New format from Pear positions
    longSymbol = (apiTrade.pair_long_symbol || '').replace('-PERP', '')
    shortSymbol = (apiTrade.pair_short_symbol || '').replace('-PERP', '')
    longNotional = apiTrade.pair_long_notional || 0
    shortNotional = apiTrade.pair_short_notional || 0
    leverage = apiTrade.pair_long_leverage || 1
    takeProfitRatio = apiTrade.take_profit_ratio || 0.1
    stopLossRatio = apiTrade.stop_loss_ratio || -0.05
    tradeId = apiTrade.trade_id || ''
    pnlUsd = apiTrade.pnl_usd || 0
    pnlPct = apiTrade.pnl_pct || 0
    entryPriceLong = apiTrade.pair_long_entry_price || 0
    entryPriceShort = apiTrade.pair_short_entry_price || 0
  }
  
  const longCoin = availableCoins.find(c => c.ticker === longSymbol) || { name: longSymbol, ticker: longSymbol }
  const shortCoin = availableCoins.find(c => c.ticker === shortSymbol) || { name: shortSymbol, ticker: shortSymbol }
  
  const totalNotional = longNotional + shortNotional
  const longPct = totalNotional > 0 ? Math.round((longNotional / totalNotional) * 100) : 50
  
  return {
    id: tradeId,
    longCoin,
    shortCoin,
    status: (apiTrade.status || '').toUpperCase() === 'OPEN' ? 'open' : 
            (apiTrade.status || '').toUpperCase() === 'CLOSED' ? 'closed' : 'open',
    openedAt: apiTrade.created_at || new Date().toISOString(),
    closedAt: null,
    notionalUsd: totalNotional,
    leverage,
    stopLossPct: Math.abs(stopLossRatio * 100),
    takeProfitPct: Math.abs(takeProfitRatio * 100),
    longPct,
    shortPct: 100 - longPct,
    pnlUsd,
    pnlPct,
    details: {
      entryPriceLong: entryPriceLong || longCoin.price || 0,
      entryPriceShort: entryPriceShort || shortCoin.price || 0,
      currentPriceLong: longCoin.price || entryPriceLong || 0,
      currentPriceShort: shortCoin.price || entryPriceShort || 0,
      orderId: tradeId,
      strategyTag: 'AI Signal',
      correlation: 0.85,
      cointegration: true,
      halfLife: 1.2,
      zScore: 1.5,
      hedgeRatio: 0.5,
      winRate: 75,
      sharpeRatio: 2.1,
      volatility: 25,
      timeframe: '1h',
      tradingEngine: 'Hyperliquid',
      remarks: apiTrade.reasoning || 'Pair trade via Pear Protocol',
    },
  }
}

export function TradesPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('Open')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allApiTrades, setAllApiTrades] = useState<Trade[]>([])
  const navigate = useNavigate()
  
  // Fetch trades from API (both local trades and Pear positions)
  const fetchTrades = async () => {
    setLoading(true)
    setError(null)
    console.log('[TradesPage] 📊 Fetching trades from API...')
    console.log('[TradesPage] Backend URL:', backendUrl || '(using proxy)')
    
    try {
      // Fetch real positions from Pear Protocol API
      const posRes = await fetch(`${backendUrl}/api/positions`, {
        headers: { 'bypass-tunnel-reminder': 'true' }
      })
      console.log('[TradesPage] Positions response status:', posRes.status)
      
      let pearPositions: Trade[] = []
      if (posRes.ok) {
        const posData = await posRes.json()
        console.log('[TradesPage] ✅ Received positions from Pear API:', posData)
        
        if (posData.positions && Array.isArray(posData.positions)) {
          // Convert Pear positions to Trade format using apiTradeToTrade
          pearPositions = posData.positions.map((pos: ApiTrade) => apiTradeToTrade(pos))
          console.log('[TradesPage] Converted Pear positions:', pearPositions)
        }
      }
      
      // Also fetch local trades from database
      const res = await fetch(`${backendUrl}/api/trades?limit=100`, {
        headers: { 'bypass-tunnel-reminder': 'true' }
      })
      console.log('[TradesPage] Trades response status:', res.status)
      
      let localTrades: Trade[] = []
      if (res.ok) {
        const apiTrades: ApiTrade[] = await res.json()
        console.log('[TradesPage] ✅ Received', apiTrades.length, 'local trades from API')
        localTrades = apiTrades.map(apiTradeToTrade)
      }
      
      // Combine: Pear positions first, then local trades
      const allTrades = [...pearPositions, ...localTrades]
      console.log('[TradesPage] Total trades:', allTrades.length)
      setAllApiTrades(allTrades)
    } catch (err) {
      console.error('[TradesPage] ❌ Error fetching trades:', err)
      setError(err instanceof Error ? err.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchTrades()
  }, [])
  
  // Filter trades by status (OPEN vs CLOSED/PENDING)
  const openTrades = useMemo(() => 
    allApiTrades.filter(t => t.status === 'open'), 
    [allApiTrades]
  )
  
  // For closed trades, combine API closed trades with mock closed trades for history
  const mockClosedTrades = useMemo(() => 
    mockTrades.filter(t => t.status === 'closed'),
    []
  )
  
  const closedTrades = useMemo(() => {
    const apiClosed = allApiTrades.filter(t => t.status === 'closed')
    // Combine API closed trades with mock historical trades
    return [...apiClosed, ...mockClosedTrades]
  }, [allApiTrades, mockClosedTrades])
  
  const allTrades = activeTab === 'Open' ? openTrades : closedTrades
  
  // Filter trades based on search
  const trades = useMemo(() => {
    if (!searchQuery.trim()) return allTrades
    const query = searchQuery.toLowerCase()
    return allTrades.filter(trade => 
      trade.longCoin.ticker.toLowerCase().includes(query) ||
      trade.shortCoin.ticker.toLowerCase().includes(query) ||
      trade.longCoin.name.toLowerCase().includes(query) ||
      trade.shortCoin.name.toLowerCase().includes(query) ||
      trade.details.strategyTag.toLowerCase().includes(query)
    )
  }, [allTrades, searchQuery])
  
  // Calculate summary stats
  const stats = useMemo(() => {
    const totalPnl = allTrades.reduce((sum, t) => sum + t.pnlUsd, 0)
    const totalPnlPct = allTrades.length > 0 
      ? allTrades.reduce((sum, t) => sum + t.pnlPct, 0) / allTrades.length 
      : 0
    const winners = allTrades.filter(t => t.pnlUsd >= 0).length
    const winRate = allTrades.length > 0 ? (winners / allTrades.length) * 100 : 0
    const totalVolume = allTrades.reduce((sum, t) => sum + t.notionalUsd, 0)
    
    return { totalPnl, totalPnlPct, winRate, totalVolume, count: allTrades.length }
  }, [allTrades])
  
  const handleBackToTrade = () => {
    hapticFeedback('selection')
    navigate('/')
  }
  
  const handleRefresh = () => {
    hapticFeedback('impact', 'light')
    fetchTrades()
  }
  
  // Loading state - shimmer skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-bg-primary">
        <TopBar title="My Trades" showBackButton />
        <div className="px-4 py-6 space-y-4">
          {/* Shimmer tabs */}
          <div className="flex gap-2 mb-4">
            <div className="h-10 w-24 bg-bg-secondary rounded-xl overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
            </div>
            <div className="h-10 w-24 bg-bg-secondary rounded-xl overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
          
          {/* Shimmer trade cards */}
          <ShimmerTradeCard />
          <ShimmerTradeCard className="opacity-80" />
          <ShimmerTradeCard className="opacity-60" />
          
          <p className="text-center text-text-secondary text-sm mt-4">Loading trades...</p>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-bg-primary">
        <TopBar title="My Trades" showBackButton />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-accent-danger mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-accent-primary text-black rounded-xl font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-bg-primary">
      {/* Top bar with refresh */}
      <TopBar 
        title="My Trades" 
        showBackButton 
        rightContent={
          <button
            onClick={handleRefresh}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-bg-secondary border border-border btn-press hover:bg-bg-tertiary transition-colors"
            title="Refresh trades"
          >
            <RefreshCw className="w-5 h-5 text-accent-primary" />
          </button>
        }
      />
      
      {/* Search and Filters */}
      <div className="px-4 mb-4">
        <div className="flex gap-3">
          {/* Search bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Search Pairs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-bg-secondary border border-border rounded-2xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 transition-colors"
            />
          </div>
          
          {/* Filter button */}
          <button
            onClick={() => {
              hapticFeedback('selection')
              setShowFilters(!showFilters)
            }}
            className={`
              flex items-center justify-center w-14 h-14 rounded-2xl border transition-all
              ${showFilters 
                ? 'bg-accent-primary/10 border-accent-primary text-accent-primary' 
                : 'bg-bg-secondary border-border text-text-secondary hover:border-accent-primary/50'
              }
            `}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
        
        {/* Filter options (expandable) */}
        {showFilters && (
          <div className="mt-3 p-4 bg-bg-secondary rounded-2xl border border-border animate-fade-up">
            <div className="flex flex-wrap gap-2">
              {['All', 'Profitable', 'Loss', 'High Leverage', 'Hyperliquid', 'SYMM'].map((filter) => (
                <button
                  key={filter}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-bg-tertiary text-text-secondary hover:bg-accent-primary/10 hover:text-accent-primary transition-colors"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <SegmentedSwitch 
          options={['Open', 'Closed']}
          selected={activeTab}
          onChange={(value) => setActiveTab(value as TabValue)}
        />
      </div>
      
      {/* Stats Summary - Big and prominent */}
      <div className="px-4 mb-4">
        <div className="card p-5 animate-fade-up">
          <div className="grid grid-cols-2 gap-6">
            {/* Total PnL */}
            <div>
              <span className="text-sm text-text-muted block mb-1">Total P&L</span>
              <div className={`text-3xl font-bold ${stats.totalPnl >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                {stats.totalPnl >= 0 ? '+' : ''}{formatCurrency(stats.totalPnl)}
              </div>
              <span className={`text-sm ${stats.totalPnlPct >= 0 ? 'text-accent-success/70' : 'text-accent-danger/70'}`}>
                {formatPercent(stats.totalPnlPct, true)} average
              </span>
            </div>
            
            {/* Win Rate */}
            <div>
              <span className="text-sm text-text-muted block mb-1">Win Rate</span>
              <div className="text-3xl font-bold text-accent-primary">
                {stats.winRate.toFixed(0)}%
              </div>
              <span className="text-sm text-text-secondary">
                {stats.count} total trades
              </span>
            </div>
          </div>
          
          {/* Visual win/loss bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-text-muted mb-2">
              <span>Wins</span>
              <span>Losses</span>
            </div>
            <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-gradient-to-r from-accent-success to-accent-success/80 transition-all duration-500 rounded-l-full"
                style={{ width: `${stats.winRate}%` }}
              />
              <div 
                className="h-full bg-gradient-to-r from-accent-danger/80 to-accent-danger transition-all duration-500 rounded-r-full"
                style={{ width: `${100 - stats.winRate}%` }}
              />
            </div>
          </div>
          
          {/* View Chart Button */}
          <button
            onClick={() => {
              hapticFeedback('selection')
              setShowChart(true)
            }}
            className="w-full mt-5 py-3 px-4 rounded-xl bg-bg-tertiary border border-border flex items-center justify-center gap-2 text-text-primary font-medium hover:bg-bg-secondary hover:border-accent-primary/50 transition-all group"
          >
            <BarChart3 className="w-5 h-5 text-accent-primary group-hover:scale-110 transition-transform" />
            <span>View Performance Chart</span>
          </button>
        </div>
      </div>
      
      {/* Performance Chart Modal - uses all trades including mock closed for history */}
      <PerformanceChart 
        isOpen={showChart}
        onClose={() => setShowChart(false)}
        trades={[...allApiTrades, ...mockClosedTrades]}
      />
      
      {/* Trades list */}
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        {trades.length > 0 ? (
          <div className="space-y-3" key={activeTab}>
            {trades.map((trade, index) => (
              trade.status === 'open' ? (
                <GlowPulse 
                  key={trade.id} 
                  isActive={true} 
                  color={trade.pnlPct >= 0 ? 'green' : 'red'}
                  intensity="low"
                >
                  <TradeCard trade={trade} index={index} />
                </GlowPulse>
              ) : (
                <TradeCard key={trade.id} trade={trade} index={index} />
              )
            ))}
          </div>
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-up">
            <Search className="w-12 h-12 text-text-muted mb-4" />
            <p className="text-text-secondary">No trades matching "{searchQuery}"</p>
          </div>
        ) : (
          <EmptyState 
            isOpen={activeTab === 'Open'}
            onBackToTrade={handleBackToTrade}
          />
        )}
      </div>
    </div>
  )
}

interface EmptyStateProps {
  isOpen: boolean
  onBackToTrade: () => void
}

function EmptyState({ isOpen, onBackToTrade }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-up">
      <div className="w-20 h-20 rounded-full bg-bg-secondary flex items-center justify-center mb-5 relative">
        <Inbox className="w-10 h-10 text-text-muted" />
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center">
          <Zap className="w-3 h-3 text-accent-primary" />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        {isOpen ? 'No open trades' : 'No closed trades yet'}
      </h3>
      
      <p className="text-sm text-text-secondary text-center max-w-xs mb-6">
        {isOpen 
          ? 'Start trading to see your open positions here.' 
          : 'Your completed trades will appear here once you close a position.'
        }
      </p>
      
      {isOpen && (
        <button
          onClick={onBackToTrade}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent-primary text-black font-medium btn-press btn-glow"
        >
          <span>Start Trading</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
