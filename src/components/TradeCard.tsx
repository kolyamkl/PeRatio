import { useState } from 'react'
import { 
  ChevronDown, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { 
  type Trade, 
  formatCurrency, 
  formatPercent, 
  formatLeverage, 
  formatDate 
} from '../lib/mockData'
import { hapticFeedback } from '../lib/telegram'

interface TradeCardProps {
  trade: Trade
  index?: number
}

export function TradeCard({ trade, index = 0 }: TradeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const isProfitable = trade.pnlUsd >= 0
  const isOpen = trade.status === 'open'
  
  const handleToggle = () => {
    hapticFeedback('selection')
    setIsExpanded(!isExpanded)
  }

  // Format time ago
  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    return 'Just now'
  }
  
  return (
    <div 
      className="card overflow-hidden stagger-item group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header with pair tokens - Pear style */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          {/* Token pair badges */}
          <div className="flex items-center">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-l-lg bg-bg-long border border-accent-success/20">
              <TrendingUp className="w-3.5 h-3.5 text-accent-success" />
              <span className="text-sm font-bold text-text-primary">{trade.longCoin.ticker}</span>
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-r-lg bg-bg-short border border-accent-danger/20 -ml-px">
              <TrendingDown className="w-3.5 h-3.5 text-accent-danger" />
              <span className="text-sm font-bold text-text-primary">{trade.shortCoin.ticker}</span>
            </div>
          </div>
          
          {/* Time and status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">{getTimeAgo(trade.openedAt)}</span>
            {isExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(false)
                }}
                className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center hover:bg-bg-primary"
              >
                <ChevronDown className="w-4 h-4 text-text-muted rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main clickable area */}
      <button 
        onClick={handleToggle}
        className="w-full p-4 pt-0 text-left"
      >
        {/* Quick Stats Grid - Pear style */}
        <div className="bg-bg-tertiary/50 rounded-xl p-3 mb-3 border border-border/50">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Entry Price:</span>
              <span className="text-accent-primary font-medium">{formatCurrency(trade.details.entryPriceLong)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Correlation:</span>
              <span className="text-text-primary font-medium">{trade.details.correlation.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Z-Score:</span>
              <span className="text-text-primary font-medium">{trade.details.zScore.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Co-integration:</span>
              <span className={`font-medium ${trade.details.cointegration ? 'text-accent-success' : 'text-accent-danger'}`}>
                {trade.details.cointegration ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Half-Life:</span>
              <span className="text-text-primary font-medium">{trade.details.halfLife} Days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Leverage:</span>
              <span className="text-text-primary font-medium">{formatLeverage(trade.leverage)}</span>
            </div>
          </div>
        </div>
        
        {/* Trading Engine badges */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-text-muted">Trading Engine(s):</span>
          <div className="flex gap-2">
            {(trade.details.tradingEngine === 'Hyperliquid' || trade.details.tradingEngine === 'Both') && (
              <span className="px-2 py-1 text-xs font-medium rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                Hyperliquid
              </span>
            )}
            {(trade.details.tradingEngine === 'SYMM' || trade.details.tradingEngine === 'Both') && (
              <span className="px-2 py-1 text-xs font-medium rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                SYMM
              </span>
            )}
          </div>
        </div>

        {/* PnL Display */}
        <div className={`
          flex items-center justify-between p-3 rounded-xl
          ${isProfitable ? 'bg-accent-success/10 border border-accent-success/20' : 'bg-accent-danger/10 border border-accent-danger/20'}
        `}>
          <div className="flex items-center gap-2">
            {isProfitable ? (
              <CheckCircle2 className="w-5 h-5 text-accent-success" />
            ) : (
              <XCircle className="w-5 h-5 text-accent-danger" />
            )}
            <span className="text-sm text-text-secondary">
              Result ({formatLeverage(trade.leverage)} leverage)
            </span>
          </div>
          <div className={`text-lg font-bold ${isProfitable ? 'text-accent-success' : 'text-accent-danger'}`}>
            {formatPercent(trade.pnlPct, true)} {isProfitable ? 'Profit' : 'Loss'}
          </div>
        </div>
        
        {/* Status row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-accent-success animate-pulse' : 'bg-text-muted'}`} />
            <span className="text-sm text-text-secondary">
              {isOpen ? 'Position Open' : 'Closed'}
            </span>
          </div>
          
          {/* Strategy tag */}
          <span className="px-2 py-1 text-xs font-medium rounded-lg bg-accent-primary/10 text-accent-primary">
            {trade.details.strategyTag}
          </span>
        </div>

        {/* Expand indicator */}
        {!isExpanded && (
          <div className="flex justify-center mt-3">
            <ChevronDown className="w-4 h-4 text-text-muted" />
          </div>
        )}
      </button>
      
      {/* Expanded details */}
      <div 
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 border-t border-border">
            {/* Advanced Stats - Two columns like Pear */}
            <div className="pt-4 grid grid-cols-2 gap-4">
              {/* Left column */}
              <div className="space-y-3">
                <StatRow label="Entry Price" value={formatCurrency(trade.details.entryPriceLong)} highlight />
                <StatRow label="Current Price" value={formatCurrency(trade.details.currentPriceLong)} />
                <StatRow label="Hedge Ratio" value={trade.details.hedgeRatio.toFixed(2)} />
                <StatRow label="Half Life" value={`${trade.details.halfLife} days`} />
              </div>
              
              {/* Right column */}
              <div className="space-y-3">
                <StatRow label="Backtest Win Rate" value={`${trade.details.winRate}%`} highlight />
                <StatRow label="Sharpe Ratio" value={trade.details.sharpeRatio.toFixed(2)} />
                <StatRow label="Volatility" value={trade.details.volatility.toFixed(2)} />
                <StatRow label="Timeframe" value={trade.details.timeframe} />
              </div>
            </div>
            
            {/* Timestamps */}
            <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
              <Clock className="w-3.5 h-3.5" />
              <span>Opened {formatDate(trade.openedAt)}</span>
              {trade.closedAt && (
                <>
                  <span className="text-text-muted">·</span>
                  <span>Closed {formatDate(trade.closedAt)}</span>
                </>
              )}
            </div>

            {/* Action buttons - Pear style */}
            {isOpen && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button className="py-3 px-4 rounded-xl bg-accent-primary text-black font-medium text-sm hover:bg-accent-primary/90 transition-colors">
                  Close on Hyperliquid
                </button>
                <button className="py-3 px-4 rounded-xl bg-bg-tertiary border border-border text-text-primary font-medium text-sm hover:border-accent-primary/50 transition-colors">
                  Close on SYMM
                </button>
              </div>
            )}
            
            {/* Remarks section */}
            {trade.details.remarks && (
              <div className="mt-4 p-3 rounded-xl bg-bg-tertiary border border-border">
                <h4 className="text-sm font-semibold text-text-primary mb-2">Remarks:</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {trade.details.remarks}
                </p>
              </div>
            )}
            
            {/* Order ID */}
            <div className="mt-3 text-xs text-text-muted">
              Order: <span className="font-mono text-text-secondary">{trade.details.orderId}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-accent-primary' : 'text-text-primary'}`}>
        {value}
      </span>
    </div>
  )
}
