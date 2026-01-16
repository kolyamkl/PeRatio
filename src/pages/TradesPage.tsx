import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowRight, 
  Inbox, 
  Search, 
  Filter,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Clock,
  BarChart3
} from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { SegmentedSwitch } from '../components/SegmentedSwitch'
import { TradeCard } from '../components/TradeCard'
import { PerformanceChart } from '../components/PerformanceChart'
import { getOpenTrades, getClosedTrades, formatCurrency, formatPercent } from '../lib/mockData'
import { hapticFeedback } from '../lib/telegram'

type TabValue = 'Open' | 'Closed'

export function TradesPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('Open')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const navigate = useNavigate()
  
  const openTrades = getOpenTrades()
  const closedTrades = getClosedTrades()
  
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
  
  return (
    <div className="flex flex-col min-h-screen bg-bg-primary">
      {/* Top bar */}
      <TopBar title="My Trades" showBackButton />
      
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
      
      {/* Performance Chart Modal */}
      <PerformanceChart 
        isOpen={showChart}
        onClose={() => setShowChart(false)}
      />
      
      {/* Trades list */}
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        {trades.length > 0 ? (
          <div className="space-y-3" key={activeTab}>
            {trades.map((trade, index) => (
              <TradeCard key={trade.id} trade={trade} index={index} />
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
