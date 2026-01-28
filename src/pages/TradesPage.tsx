import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowRight, 
  Inbox, 
  Search, 
  BarChart3,
  RefreshCw
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { SegmentedSwitch } from '../components/ui/SegmentedSwitch'
import { TradeCard } from '../components/trade/TradeCard'
import { PerformanceChart } from '../components/trade/PerformanceChart'
import { ShimmerTradeCard } from '../components/ui/Shimmer'
import { formatCurrency, fetchTrades, type Trade as ApiTrade } from '../lib/api'
import { hapticFeedback } from '../lib/telegram'
import { availableCoins } from '../lib/mockData'

type TabValue = 'Open' | 'Closed'

// Agent Pear Signal from API
interface PearSignal {
  id: number
  message_id: number
  signal_type: 'OPEN' | 'CLOSE'
  long_asset: string
  short_asset: string
  entry_price: number | null
  exit_price: number | null
  z_score: number | null
  rolling_z_score: number | null
  correlation: number | null
  cointegration: boolean | null
  hedge_ratio: number | null
  long_weight: number | null
  short_weight: number | null
  expected_reversion_days: number | null
  backtest_win_rate: number | null
  platforms: string | null
  timeframe: string | null
  result: 'profit' | 'loss' | null
  max_returns_pct: number | null
  leverage_used: number | null
  close_reason: string | null
  signal_date: string
  created_at: string
}

// Coin type for display
interface Coin {
  name: string
  ticker: string
  price: number
}

// Frontend Trade type for TradeCard component
interface DisplayTrade {
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
  }
  openedAt: Date
  createdAt: Date
  expiresAt?: Date
}

// Convert Agent Pear signal to display format
function convertPearSignalToDisplay(signal: PearSignal): DisplayTrade {
  const longCoin: Coin = {
    name: signal.long_asset,
    ticker: signal.long_asset,
    price: signal.entry_price || 0
  }
  
  const shortCoin: Coin = {
    name: signal.short_asset,
    ticker: signal.short_asset,
    price: signal.entry_price || 0
  }
  
  // OPEN signals are "open", CLOSE signals are "closed"
  const status: 'open' | 'closed' = signal.signal_type === 'OPEN' ? 'open' : 'closed'
  
  // Calculate P&L from max_returns_pct for CLOSE signals
  const pnlPct = signal.max_returns_pct || 0
  const pnlUsd = pnlPct // Using percentage as proxy since we don't have actual USD amounts
  
  return {
    id: `pear-${signal.id}`,
    longCoin,
    shortCoin,
    notionalUsd: 0, // Not available from Pear signals
    leverage: signal.leverage_used || 2,
    pnlUsd: signal.result === 'profit' ? Math.abs(pnlPct) : -Math.abs(pnlPct),
    pnlPct: signal.result === 'profit' ? Math.abs(pnlPct) : -Math.abs(pnlPct),
    status,
    details: {
      takeProfitPct: 0,
      stopLossPct: 0,
      currentPriceLong: signal.exit_price || signal.entry_price || 0,
      currentPriceShort: signal.exit_price || signal.entry_price || 0,
      entryPriceLong: signal.entry_price || 0,
      entryPriceShort: signal.entry_price || 0,
      orderId: `MSG-${signal.message_id}`,
      strategyTag: signal.close_reason || 'Pear Statistical Arbitrage',
      correlation: signal.correlation || 0,
      cointegration: signal.cointegration || false,
      halfLife: signal.expected_reversion_days || 0
    },
    openedAt: new Date(signal.signal_date),
    createdAt: new Date(signal.created_at),
  }
}

// Convert user's API trade to display format
function convertApiTradeToDisplay(apiTrade: ApiTrade): DisplayTrade {
  let longSymbol: string
  let shortSymbol: string
  let longNotional: number
  let shortNotional: number
  let leverage: number
  
  if (apiTrade.pair) {
    longSymbol = apiTrade.pair.long.symbol.replace('-PERP', '')
    shortSymbol = apiTrade.pair.short.symbol.replace('-PERP', '')
    longNotional = apiTrade.pair.long.notional
    shortNotional = apiTrade.pair.short.notional
    leverage = apiTrade.pair.long.leverage
  } else {
    longSymbol = (apiTrade.pairLongSymbol || '').replace('-PERP', '')
    shortSymbol = (apiTrade.pairShortSymbol || '').replace('-PERP', '')
    longNotional = apiTrade.pairLongNotional || 0
    shortNotional = apiTrade.pairShortNotional || 0
    leverage = apiTrade.pairLongLeverage || 1
  }
  
  const longCoin = availableCoins.find(c => c.ticker === longSymbol) || {
    name: longSymbol,
    ticker: longSymbol,
    price: 0
  }
  
  const shortCoin = availableCoins.find(c => c.ticker === shortSymbol) || {
    name: shortSymbol,
    ticker: shortSymbol,
    price: 0
  }
  
  return {
    id: apiTrade.tradeId,
    longCoin,
    shortCoin,
    notionalUsd: longNotional + shortNotional,
    leverage,
    pnlUsd: 0,
    pnlPct: 0,
    status: 'open' as const,
    details: {
      takeProfitPct: (apiTrade.takeProfitRatio || 0.1) * 100,
      stopLossPct: (apiTrade.stopLossRatio || -0.05) * 100,
      currentPriceLong: longCoin.price,
      currentPriceShort: shortCoin.price,
      entryPriceLong: longCoin.price,
      entryPriceShort: shortCoin.price,
      orderId: apiTrade.tradeId,
      strategyTag: apiTrade.basketCategory || 'User Trade',
      correlation: 0.85,
      cointegration: true,
      halfLife: 1.2
    },
    openedAt: new Date(apiTrade.createdAt),
    createdAt: new Date(apiTrade.createdAt),
    expiresAt: apiTrade.expiresAt ? new Date(apiTrade.expiresAt) : undefined
  }
}

export function TradesPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabValue>('Closed')
  const [searchQuery, setSearchQuery] = useState('')
  const [showChart, setShowChart] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [closedTrades, setClosedTrades] = useState<DisplayTrade[]>([])
  const [openTrades, setOpenTrades] = useState<DisplayTrade[]>([])
  const [chartData, setChartData] = useState<any>(null)
  
  // Fetch data from database
  const loadTrades = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
      
      // Fetch last 30 CLOSED signals from Agent Pear (for history)
      console.log('[TradesPage] 📊 Fetching closed signals from Agent Pear...')
      const closedResponse = await fetch(`${backendUrl}/api/pear-signals/history?limit=30&signal_type=CLOSE`)
      if (closedResponse.ok) {
        const closedSignals: PearSignal[] = await closedResponse.json()
        console.log('[TradesPage] ✅ Received', closedSignals.length, 'closed signals')
        setClosedTrades(closedSignals.map(convertPearSignalToDisplay))
      }
      
      // Fetch USER's open positions (from trades table, status=EXECUTED)
      console.log('[TradesPage] 📊 Fetching user open positions...')
      const userTrades = await fetchTrades(undefined, 'EXECUTED')
      console.log('[TradesPage] ✅ Received', userTrades.length, 'user open positions')
      setOpenTrades(userTrades.map(convertApiTradeToDisplay))
      
      // Fetch chart data from full database
      console.log('[TradesPage] 📊 Fetching chart data...')
      const chartResponse = await fetch(`${backendUrl}/api/pear-signals/chart-data?days=365`)
      if (chartResponse.ok) {
        const data = await chartResponse.json()
        setChartData(data)
        console.log('[TradesPage] ✅ Chart data loaded:', data.stats)
      }
      
    } catch (err) {
      console.error('[TradesPage] ❌ Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadTrades()
  }, [])
  
  // Get trades based on active tab
  const filteredTrades = useMemo(() => {
    return activeTab === 'Open' ? openTrades : closedTrades
  }, [activeTab, openTrades, closedTrades])
  
  // Search filter
  const trades = useMemo(() => {
    if (!searchQuery.trim()) return filteredTrades
    const query = searchQuery.toLowerCase()
    return filteredTrades.filter(trade => 
      trade.longCoin.ticker.toLowerCase().includes(query) ||
      trade.shortCoin.ticker.toLowerCase().includes(query) ||
      trade.longCoin.name.toLowerCase().includes(query) ||
      trade.shortCoin.name.toLowerCase().includes(query) ||
      trade.details.strategyTag.toLowerCase().includes(query)
    )
  }, [filteredTrades, searchQuery])
  
  // Calculate stats
  const stats = useMemo(() => {
    const totalPnl = filteredTrades.reduce((sum, t) => sum + t.pnlUsd, 0)
    const totalPnlPct = filteredTrades.length > 0 
      ? filteredTrades.reduce((sum, t) => sum + t.pnlPct, 0) / filteredTrades.length 
      : 0
    const winners = filteredTrades.filter(t => t.pnlUsd >= 0).length
    const winRate = filteredTrades.length > 0 ? (winners / filteredTrades.length) * 100 : 0
    const totalVolume = filteredTrades.reduce((sum, t) => sum + t.notionalUsd, 0)
    
    return { totalPnl, totalPnlPct, winRate, totalVolume, count: filteredTrades.length }
  }, [filteredTrades])
  
  const handleBackToTrade = () => {
    hapticFeedback('selection')
    navigate('/')
  }
  
  const handleRefresh = () => {
    hapticFeedback('impact', 'light')
    loadTrades()
  }
  
  const handleTabChange = (value: string) => {
    hapticFeedback('selection')
    setActiveTab(value as TabValue)
  }
  
  const handleToggleChart = () => {
    hapticFeedback('selection')
    setShowChart(!showChart)
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary">
        <TopBar showBackButton />
        <div className="flex-1 px-4 pb-4 space-y-4 overflow-y-auto">
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map(i => <ShimmerTradeCard key={i} />)}
          </div>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary">
        <TopBar showBackButton />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-accent-danger mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-accent-primary text-white rounded-xl"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary">
      <TopBar showBackButton />
      
      {/* Header with stats */}
      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">My Trades</h1>
          <div className="flex gap-2">
            <button
              onClick={handleToggleChart}
              className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all ${
                showChart 
                  ? 'bg-accent-primary text-black shadow-lg shadow-accent-primary/30' 
                  : 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/30'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm">Chart</span>
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-bg-secondary text-text-muted hover:text-text-primary transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-xs text-text-muted mb-1">Total P&L</p>
            <p className={`text-lg font-bold ${stats.totalPnl >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
              {formatCurrency(stats.totalPnl)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-text-muted mb-1">Win Rate</p>
            <p className="text-lg font-bold text-text-primary">{stats.winRate.toFixed(1)}%</p>
          </div>
        </div>
        
        {/* Performance chart - uses full DB data */}
        {showChart && (
          <PerformanceChart 
            isOpen={showChart}
            trades={closedTrades}
            apiChartData={chartData}
            onClose={() => setShowChart(false)}
          />
        )}
        
        {/* Tabs */}
        <SegmentedSwitch
          value={activeTab}
          onChange={handleTabChange}
          options={[
            { value: 'Open', label: 'Open', count: openTrades.length },
            { value: 'Closed', label: 'Closed', count: closedTrades.length }
          ]}
        />
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            placeholder="Search trades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-bg-secondary border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors"
          />
        </div>
      </div>
      
      {/* Trades list */}
      <div className="flex-1 px-4 pb-4 mt-4 space-y-3 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Inbox className="w-16 h-16 text-text-muted mb-4" />
            <p className="text-text-muted text-center">
              {searchQuery ? 'No trades match your search' : `No ${activeTab.toLowerCase()} trades yet`}
            </p>
            {activeTab === 'Open' && !searchQuery && (
              <button
                onClick={handleBackToTrade}
                className="mt-4 px-6 py-3 bg-accent-primary text-white rounded-xl font-medium flex items-center gap-2"
              >
                Create Trade <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          trades.map((trade) => (
            <TradeCard key={trade.id} trade={trade} />
          ))
        )}
      </div>
    </div>
  )
}
