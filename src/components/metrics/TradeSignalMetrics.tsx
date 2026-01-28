import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'

interface Metrics {
  total_trades: number
  win_rate: number
  apy: number
  total_return_with_leverage: number
  total_return_without_leverage: number
  avg_trades_per_day: number
  avg_returns_per_day: number
  profit_factor: number
  avg_duration_hours: number
}

interface MetricRowProps {
  label: string
  value: string | number
  tooltip?: string
}

function MetricRow({ label, value, tooltip }: MetricRowProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  return (
    <div className="flex justify-between items-center py-3 border-b border-white/10 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="text-text-muted text-sm">{label}</span>
        {tooltip && (
          <div className="relative">
            <Info 
              size={14} 
              className="text-text-muted/60 cursor-help"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
            />
            {showTooltip && (
              <div className="absolute left-6 top-0 z-50 bg-surface-card border border-white/10 rounded-lg p-2 text-xs text-text-muted w-48 shadow-lg">
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>
      <span className="text-white font-semibold">{value}</span>
    </div>
  )
}

export function TradeSignalMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
        const response = await fetch(`${backendUrl}/api/pear-signals/metrics`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch metrics')
        }
        
        const data = await response.json()
        setMetrics(data)
      } catch (err) {
        console.error('Error fetching metrics:', err)
        setError('Failed to load metrics')
      } finally {
        setLoading(false)
      }
    }
    
    fetchMetrics()
  }, [])
  
  if (loading) {
    return (
      <div className="bg-surface-card rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/10 rounded w-48 mb-2"></div>
          <div className="h-4 bg-white/10 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-white/10 rounded w-32"></div>
                <div className="h-4 bg-white/10 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  if (error || !metrics) {
    return (
      <div className="bg-surface-card rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-2">Trade Signal Metrics</h2>
        <p className="text-text-muted text-sm">Unable to load metrics</p>
      </div>
    )
  }
  
  // Format duration
  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours < 24) return `${Math.round(hours)}h`
    return `${Math.round(hours / 24)}d`
  }
  
  return (
    <div className="bg-surface-card rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-1">Trade Signal Metrics</h2>
      <p className="text-text-muted text-sm mb-6">Performance Metrics for all trade signals shared</p>
      
      <div className="space-y-0">
        <MetricRow 
          label="Total trades" 
          value={metrics.total_trades.toLocaleString()}
          tooltip="Total number of completed trades"
        />
        <MetricRow 
          label="Win rate" 
          value={`${metrics.win_rate}%`}
          tooltip="Percentage of trades that resulted in profit"
        />
        <MetricRow 
          label="APY" 
          value={`${metrics.apy}%`}
          tooltip="Annualized percentage yield based on daily returns"
        />
        <MetricRow 
          label="Total Return with leverage" 
          value={`${metrics.total_return_with_leverage.toLocaleString()}%`}
          tooltip="Cumulative returns including leverage multiplier"
        />
        <MetricRow 
          label="Total Return without leverage" 
          value={`${metrics.total_return_without_leverage.toLocaleString()}%`}
          tooltip="Cumulative returns without leverage"
        />
        <MetricRow 
          label="Avg number of trades per day" 
          value={metrics.avg_trades_per_day}
          tooltip="Average trades executed per day"
        />
        <MetricRow 
          label="Avg returns per day" 
          value={`${metrics.avg_returns_per_day}%`}
          tooltip="Average daily return percentage"
        />
        <MetricRow 
          label="Profit Factor" 
          value={metrics.profit_factor}
          tooltip="Ratio of gross profit to gross loss. Higher is better."
        />
        <MetricRow 
          label="Average Duration" 
          value={formatDuration(metrics.avg_duration_hours)}
          tooltip="Average time a trade is held open"
        />
      </div>
    </div>
  )
}
