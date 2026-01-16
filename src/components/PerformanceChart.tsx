import { useState, useMemo, useEffect, useRef } from 'react'
import { X, TrendingUp, TrendingDown, Sparkles } from 'lucide-react'
import { mockTrades, formatCurrency } from '../lib/mockData'
import { hapticFeedback } from '../lib/telegram'

type TimeRange = '1D' | '1W' | '1M' | '3M' | 'ALL'

interface PerformanceChartProps {
  isOpen: boolean
  onClose: () => void
}

interface DataPoint {
  date: Date
  pnl: number
  cumulative: number
  label: string
}

export function PerformanceChart({ isOpen, onClose }: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M')
  const [isAnimating, setIsAnimating] = useState(false)
  const [showLine, setShowLine] = useState(false)
  const [showPoints, setShowPoints] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [animatedPnl, setAnimatedPnl] = useState(0)
  const lineRef = useRef<SVGPathElement>(null)

  // Reset and trigger animations when opening or changing time range
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      setShowLine(false)
      setShowPoints(false)
      setShowStats(false)
      setAnimatedPnl(0)
      
      // Staggered animation sequence
      const lineTimer = setTimeout(() => setShowLine(true), 300)
      const pointsTimer = setTimeout(() => setShowPoints(true), 800)
      const statsTimer = setTimeout(() => setShowStats(true), 1200)
      const endTimer = setTimeout(() => setIsAnimating(false), 2000)
      
      return () => {
        clearTimeout(lineTimer)
        clearTimeout(pointsTimer)
        clearTimeout(statsTimer)
        clearTimeout(endTimer)
      }
    }
  }, [isOpen, timeRange])

  const chartData = useMemo(() => {
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case '1D':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '1W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '1M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '3M':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'ALL':
      default:
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    }

    const filteredTrades = mockTrades.filter(trade => {
      const tradeDate = new Date(trade.openedAt)
      return tradeDate >= startDate && tradeDate <= now
    })

    const sortedTrades = [...filteredTrades].sort(
      (a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime()
    )

    const dataPoints: DataPoint[] = []
    let cumulative = 0

    dataPoints.push({
      date: startDate,
      pnl: 0,
      cumulative: 0,
      label: formatDateLabel(startDate, timeRange),
    })

    sortedTrades.forEach(trade => {
      cumulative += trade.pnlUsd
      dataPoints.push({
        date: new Date(trade.openedAt),
        pnl: trade.pnlUsd,
        cumulative,
        label: formatDateLabel(new Date(trade.openedAt), timeRange),
      })
    })

    if (dataPoints.length > 0) {
      const lastPoint = dataPoints[dataPoints.length - 1]
      if (lastPoint.date < now) {
        dataPoints.push({
          date: now,
          pnl: 0,
          cumulative: lastPoint.cumulative,
          label: 'Now',
        })
      }
    }

    return dataPoints
  }, [timeRange])

  const stats = useMemo(() => {
    const totalPnl = chartData.length > 0 ? chartData[chartData.length - 1].cumulative : 0
    const trades = mockTrades.filter(t => {
      const now = new Date()
      let startDate: Date
      switch (timeRange) {
        case '1D':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '1W':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '1M':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '3M':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0)
      }
      return new Date(t.openedAt) >= startDate
    })
    
    const winningTrades = trades.filter(t => t.pnlUsd > 0).length
    const losingTrades = trades.filter(t => t.pnlUsd < 0).length
    const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0
    const avgPnl = trades.length > 0 ? totalPnl / trades.length : 0

    return {
      totalPnl,
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      winRate,
      avgPnl,
    }
  }, [chartData, timeRange])

  // Animate the P&L number
  useEffect(() => {
    if (showStats && stats.totalPnl !== 0) {
      const duration = 1500
      const steps = 60
      const increment = stats.totalPnl / steps
      let current = 0
      let step = 0
      
      const interval = setInterval(() => {
        step++
        current += increment
        if (step >= steps) {
          setAnimatedPnl(stats.totalPnl)
          clearInterval(interval)
        } else {
          setAnimatedPnl(current)
        }
      }, duration / steps)
      
      return () => clearInterval(interval)
    }
  }, [showStats, stats.totalPnl])

  if (!isOpen) return null

  // Chart dimensions - wider now
  const chartWidth = 380
  const chartHeight = 220
  const padding = { top: 30, right: 30, bottom: 40, left: 60 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  const values = chartData.map(d => d.cumulative)
  const minValue = Math.min(0, ...values)
  const maxValue = Math.max(0, ...values)
  const range = maxValue - minValue || 1

  const getX = (index: number) => padding.left + (index / (chartData.length - 1 || 1)) * innerWidth
  const getY = (value: number) => padding.top + innerHeight - ((value - minValue) / range) * innerHeight

  const linePath = chartData
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(point.cumulative)}`)
    .join(' ')

  const areaPath = `${linePath} L ${getX(chartData.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`

  const isPositive = stats.totalPnl >= 0
  const lineColor = isPositive ? '#BFFF00' : '#FF4757'
  const glowColor = isPositive ? 'rgba(191, 255, 0, 0.6)' : 'rgba(255, 71, 87, 0.6)'

  // Calculate path length for animation
  const pathLength = chartData.length > 1 ? 1000 : 0

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: isPositive ? 'rgba(191, 255, 0, 0.3)' : 'rgba(255, 71, 87, 0.3)',
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div 
        className="w-full max-w-[100vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-2 sm:mx-4 bg-bg-primary/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl animate-slide-up overflow-hidden border border-border/50 shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{
          boxShadow: `0 0 100px ${glowColor}`,
        }}
      >
        {/* Animated header glow */}
        <div 
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center top, ${glowColor} 0%, transparent 70%)`,
            opacity: showLine ? 0.5 : 0,
            transition: 'opacity 1s ease-out',
          }}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between p-4 sm:p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className={`
              w-12 h-12 rounded-2xl flex items-center justify-center relative overflow-hidden
              ${isPositive ? 'bg-accent-success/20' : 'bg-accent-danger/20'}
            `}>
              <div 
                className="absolute inset-0 animate-pulse-glow"
                style={{ backgroundColor: glowColor, opacity: 0.3 }}
              />
              {isPositive ? (
                <TrendingUp className="w-6 h-6 text-accent-success relative z-10" />
              ) : (
                <TrendingDown className="w-6 h-6 text-accent-danger relative z-10" />
              )}
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-accent-primary animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                Performance
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary animate-pulse">
                  LIVE
                </span>
              </h3>
              <p className="text-sm text-text-muted">Trade history analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center hover:bg-bg-tertiary transition-all hover:rotate-90 duration-300"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Time Range Selector */}
        <div className="px-4 sm:px-5 py-4 border-b border-border/30">
          <div className="flex gap-2 p-1 bg-bg-secondary/50 rounded-xl">
            {(['1D', '1W', '1M', '3M', 'ALL'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => {
                  hapticFeedback('selection')
                  setTimeRange(range)
                }}
                className={`
                  flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-300 relative overflow-hidden
                  ${timeRange === range 
                    ? 'bg-accent-primary text-black shadow-lg' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  }
                `}
                style={{
                  boxShadow: timeRange === range ? `0 0 20px ${glowColor}` : 'none',
                }}
              >
                {timeRange === range && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                )}
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-5">
          {/* Main PnL Display */}
          <div className="text-center mb-6 relative">
            <p className="text-sm text-text-muted mb-2">Total P&L</p>
            <div className="relative inline-block">
              <p 
                className={`text-5xl sm:text-6xl font-black tracking-tight ${isPositive ? 'text-accent-success' : 'text-accent-danger'}`}
                style={{
                  textShadow: `0 0 40px ${glowColor}`,
                }}
              >
                {isPositive ? '+' : ''}{formatCurrency(showStats ? animatedPnl : 0)}
              </p>
              {/* Animated underline */}
              <div 
                className="absolute -bottom-2 left-0 h-1 rounded-full transition-all duration-1000"
                style={{
                  width: showStats ? '100%' : '0%',
                  background: `linear-gradient(90deg, transparent, ${lineColor}, transparent)`,
                }}
              />
            </div>
          </div>

          {/* Chart Container */}
          <div className="relative bg-bg-secondary/50 rounded-2xl p-4 mb-5 overflow-hidden border border-border/30">
            {/* Animated background grid */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `
                  linear-gradient(${lineColor} 1px, transparent 1px),
                  linear-gradient(90deg, ${lineColor} 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
                animation: 'grid-move 20s linear infinite',
              }}
            />

            <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible relative z-10">
              {/* Glow filter */}
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                
                <linearGradient id="gradient-positive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#BFFF00" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#BFFF00" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradient-negative" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#FF4757" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#FF4757" stopOpacity={0} />
                </linearGradient>
                
                <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.5} />
                  <stop offset="50%" stopColor={lineColor} stopOpacity={1} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0.5} />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                <line
                  key={i}
                  x1={padding.left}
                  y1={padding.top + innerHeight * ratio}
                  x2={chartWidth - padding.right}
                  y2={padding.top + innerHeight * ratio}
                  stroke="var(--border)"
                  strokeOpacity={0.3}
                  strokeDasharray="4 4"
                />
              ))}
              
              {/* Zero line */}
              <line 
                x1={padding.left} 
                y1={getY(0)} 
                x2={chartWidth - padding.right} 
                y2={getY(0)} 
                stroke={lineColor}
                strokeOpacity={0.5}
                strokeWidth={1}
                strokeDasharray="8 4"
              />

              {/* Y-axis labels */}
              <text 
                x={padding.left - 12} 
                y={getY(0)} 
                fill="var(--text-muted)" 
                fontSize="11" 
                textAnchor="end" 
                dominantBaseline="middle"
                fontWeight="500"
              >
                $0
              </text>
              {maxValue !== 0 && (
                <text 
                  x={padding.left - 12} 
                  y={getY(maxValue)} 
                  fill={lineColor}
                  fontSize="11" 
                  textAnchor="end" 
                  dominantBaseline="middle"
                  fontWeight="600"
                >
                  {formatCurrency(maxValue, 0)}
                </text>
              )}
              {minValue !== 0 && (
                <text 
                  x={padding.left - 12} 
                  y={getY(minValue)} 
                  fill="#FF4757"
                  fontSize="11" 
                  textAnchor="end" 
                  dominantBaseline="middle"
                  fontWeight="600"
                >
                  {formatCurrency(minValue, 0)}
                </text>
              )}

              {/* Area fill with animation */}
              {chartData.length > 1 && (
                <path
                  d={areaPath}
                  fill={`url(#gradient-${isPositive ? 'positive' : 'negative'})`}
                  opacity={showLine ? 0.6 : 0}
                  style={{
                    transition: 'opacity 0.8s ease-out',
                  }}
                />
              )}

              {/* Animated line with glow */}
              {chartData.length > 1 && (
                <>
                  {/* Glow layer */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                    opacity={showLine ? 0.5 : 0}
                    style={{
                      transition: 'opacity 0.5s ease-out',
                    }}
                  />
                  {/* Main line with draw animation */}
                  <path
                    ref={lineRef}
                    d={linePath}
                    fill="none"
                    stroke="url(#line-gradient)"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={pathLength}
                    strokeDashoffset={showLine ? 0 : pathLength}
                    style={{
                      transition: 'stroke-dashoffset 1.5s ease-out',
                    }}
                  />
                </>
              )}

              {/* Animated data points */}
              {chartData.map((point, i) => (
                <g key={i}>
                  {/* Pulse ring */}
                  <circle
                    cx={getX(i)}
                    cy={getY(point.cumulative)}
                    r={showPoints ? 12 : 0}
                    fill={lineColor}
                    opacity={0.2}
                    style={{
                      transition: `all 0.5s ease-out ${i * 0.1}s`,
                    }}
                  />
                  {/* Point */}
                  <circle
                    cx={getX(i)}
                    cy={getY(point.cumulative)}
                    r={showPoints ? 5 : 0}
                    fill={lineColor}
                    stroke="var(--bg-primary)"
                    strokeWidth={2}
                    filter="url(#glow)"
                    style={{
                      transition: `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.1}s`,
                    }}
                  />
                </g>
              ))}

              {/* X-axis labels */}
              {chartData.length > 0 && (
                <>
                  <text 
                    x={padding.left} 
                    y={chartHeight - 10} 
                    fill="var(--text-muted)" 
                    fontSize="11" 
                    textAnchor="start"
                    fontWeight="500"
                  >
                    {chartData[0].label}
                  </text>
                  <text 
                    x={chartWidth - padding.right} 
                    y={chartHeight - 10} 
                    fill={lineColor}
                    fontSize="11" 
                    textAnchor="end"
                    fontWeight="600"
                  >
                    {chartData[chartData.length - 1].label}
                  </text>
                </>
              )}
            </svg>

            {/* Scanning line effect */}
            {isAnimating && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-accent-primary to-transparent animate-scan-line"
                style={{ left: '10%' }}
              />
            )}
          </div>

          {/* Stats Grid with staggered animation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Trades', value: stats.totalTrades.toString(), color: 'text-text-primary' },
              { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? 'text-accent-success' : 'text-accent-danger' },
              { label: 'Wins / Losses', value: `${stats.winningTrades} / ${stats.losingTrades}`, color: 'text-text-primary', isDouble: true },
              { label: 'Avg P&L', value: `${stats.avgPnl >= 0 ? '+' : ''}${formatCurrency(stats.avgPnl)}`, color: stats.avgPnl >= 0 ? 'text-accent-success' : 'text-accent-danger' },
            ].map((stat, i) => (
              <div 
                key={stat.label}
                className="relative bg-bg-secondary/50 rounded-xl p-4 border border-border/30 overflow-hidden group hover:border-accent-primary/30 transition-all duration-300"
                style={{
                  opacity: showStats ? 1 : 0,
                  transform: showStats ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 * i}s`,
                }}
              >
                {/* Hover glow effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
                    opacity: 0.1,
                  }}
                />
                <p className="text-xs text-text-muted mb-1 relative z-10">{stat.label}</p>
                <p className={`text-xl sm:text-2xl font-bold ${stat.color} relative z-10`}>
                  {stat.isDouble ? (
                    <>
                      <span className="text-accent-success">{stats.winningTrades}</span>
                      <span className="text-text-muted mx-1">/</span>
                      <span className="text-accent-danger">{stats.losingTrades}</span>
                    </>
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom safe area for mobile */}
        <div className="h-safe-bottom" />
      </div>

      <style>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
        
        @keyframes scan-line {
          0% { left: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 95%; opacity: 0; }
        }
        
        @keyframes float-particle {
          0%, 100% { 
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% { opacity: 1; }
          50% { 
            transform: translateY(-100px) scale(1.5);
            opacity: 0.5;
          }
          90% { opacity: 0; }
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        
        .animate-scan-line {
          animation: scan-line 2s ease-in-out forwards;
        }
        
        .animate-float-particle {
          animation: float-particle 5s ease-in-out infinite;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

function formatDateLabel(date: Date, timeRange: TimeRange): string {
  switch (timeRange) {
    case '1D':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    case '1W':
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    case '1M':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    case '3M':
    case 'ALL':
    default:
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}
