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
import { 
  fetchTrades, 
  formatCurrency, 
  type Trade as ApiTrade
} from '../lib/api'
import { availableCoins, type Coin } from '../lib/mockData'
import { hapticFeedback } from '../lib/telegram'

type TabValue = 'Open' | 'Closed'

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

// Convert API trade to display format
function convertApiToDisplay(apiTrade: ApiTrade): DisplayTrade {
  // Handle both nested pair format and flat format from backend
  let longSymbol: string
  let shortSymbol: string
  let longNotional: number
  let shortNotional: number
  let leverage: number
  
  if (apiTrade.pair) {
    // Nested format: { pair: { long: {...}, short: {...} } }
    longSymbol = apiTrade.pair.long.symbol.replace('-PERP', '')
    shortSymbol = apiTrade.pair.short.symbol.replace('-PERP', '')
    longNotional = apiTrade.pair.long.notional
    shortNotional = apiTrade.pair.short.notional
    leverage = apiTrade.pair.long.leverage
  } else {
    // Flat format: { pairLongSymbol, pairShortSymbol, ... }
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
  
  // Map status to display format
  const status: 'open' | 'closed' = 
    apiTrade.status === 'EXECUTED' ? 'open' : 'closed'
  
  return {
    id: apiTrade.tradeId,
    longCoin,
    shortCoin,
    notionalUsd: longNotional + shortNotional,
    leverage,
    pnlUsd: 0, // TODO: Calculate from current prices
    pnlPct: 0,
    status,
    details: {
      takeProfitPct: (apiTrade.takeProfitRatio || 0.1) * 100,
      stopLossPct: (apiTrade.stopLossRatio || -0.05) * 100,
      currentPriceLong: longCoin.price,
      currentPriceShort: shortCoin.price,
      entryPriceLong: longCoin.price,
      entryPriceShort: shortCoin.price,
      orderId: apiTrade.tradeId,
      strategyTag: apiTrade.basketCategory || 'AI Signal',
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
  const [activeTab, setActiveTab] = useState<TabValue>('Open')
  const [searchQuery, setSearchQuery] = useState('')
  const [showChart, setShowChart] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allTrades, setAllTrades] = useState<DisplayTrade[]>([])
  
  // Fetch trades from PostgreSQL
  const loadTrades = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('[TradesPage] 📊 Fetching trades from PostgreSQL...')
      const apiTrades = await fetchTrades()
      console.log('[TradesPage] ✅ Received', apiTrades.length, 'trades from database')
      
      const displayTrades = apiTrades.map(convertApiToDisplay)
      setAllTrades(displayTrades)
    } catch (err) {
      console.error('[TradesPage] ❌ Error fetching trades:', err)
      setError(err instanceof Error ? err.message : 'Failed to load trades')
      setAllTrades([])
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadTrades()
  }, [])
  
  // Filter trades by status
  const filteredTrades = useMemo(() => {
    const statusFilter = activeTab === 'Open' ? 'open' : 'closed'
    return allTrades.filter(t => t.status === statusFilter)
  }, [allTrades, activeTab])
  
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
              className={`p-2 rounded-xl transition-colors ${
                showChart 
                  ? 'bg-accent-primary text-white' 
                  : 'bg-bg-secondary text-text-muted hover:text-text-primary'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
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
        
        {/* Performance chart */}
        {showChart && (
          <PerformanceChart 
            isOpen={showChart}
            trades={filteredTrades}
            onClose={() => setShowChart(false)}
          />
        )}
        
        {/* Tabs */}
        <SegmentedSwitch
          value={activeTab}
          onChange={handleTabChange}
          options={[
            { value: 'Open', label: 'Open', count: allTrades.filter(t => t.status === 'open').length },
            { value: 'Closed', label: 'Closed', count: allTrades.filter(t => t.status === 'closed').length }
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
