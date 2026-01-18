import { useState, useEffect } from 'react'
import { Zap, TrendingUp, TrendingDown, Activity, Sparkles, Target } from 'lucide-react'

interface TradeSignalProps {
  correlation: number
  zScore: number
  confidence: number
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'
}

export function TradeSignal({ correlation, zScore, confidence, signal }: TradeSignalProps) {
  const [animatedConfidence, setAnimatedConfidence] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isVisible) {
      const duration = 1500
      const steps = 60
      const increment = confidence / steps
      let current = 0
      let step = 0
      
      const interval = setInterval(() => {
        step++
        current += increment
        if (step >= steps) {
          setAnimatedConfidence(confidence)
          clearInterval(interval)
        } else {
          setAnimatedConfidence(current)
        }
      }, duration / steps)
      
      return () => clearInterval(interval)
    }
  }, [isVisible, confidence])

  const getSignalConfig = () => {
    switch (signal) {
      case 'strong_buy':
        return { 
          label: 'Strong Buy', 
          color: 'text-accent-success', 
          bg: 'bg-accent-success/10',
          border: 'border-accent-success/30',
          glow: 'rgba(191, 255, 0, 0.3)',
          icon: TrendingUp 
        }
      case 'buy':
        return { 
          label: 'Buy', 
          color: 'text-accent-success', 
          bg: 'bg-accent-success/10',
          border: 'border-accent-success/20',
          glow: 'rgba(191, 255, 0, 0.2)',
          icon: TrendingUp 
        }
      case 'neutral':
        return { 
          label: 'Neutral', 
          color: 'text-yellow-400', 
          bg: 'bg-yellow-400/10',
          border: 'border-yellow-400/20',
          glow: 'rgba(250, 204, 21, 0.2)',
          icon: Activity 
        }
      case 'sell':
        return { 
          label: 'Sell', 
          color: 'text-accent-danger', 
          bg: 'bg-accent-danger/10',
          border: 'border-accent-danger/20',
          glow: 'rgba(255, 71, 87, 0.2)',
          icon: TrendingDown 
        }
      case 'strong_sell':
        return { 
          label: 'Strong Sell', 
          color: 'text-accent-danger', 
          bg: 'bg-accent-danger/10',
          border: 'border-accent-danger/30',
          glow: 'rgba(255, 71, 87, 0.3)',
          icon: TrendingDown 
        }
    }
  }

  const config = getSignalConfig()
  const SignalIcon = config.icon

  return (
    <div 
      className={`
        card p-4 relative overflow-hidden transition-all duration-500 border
        ${config.border}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      style={{
        boxShadow: isVisible ? `0 0 40px ${config.glow}` : 'none',
      }}
    >
      {/* Animated background pulse */}
      <div 
        className="absolute inset-0 opacity-20 animate-pulse-slow"
        style={{
          background: `radial-gradient(circle at 30% 50%, ${config.glow} 0%, transparent 50%)`,
        }}
      />

      {/* Scanning line effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent-primary/50 to-transparent animate-scan-horizontal"
        />
      </div>

      <div className="relative z-10 flex items-center gap-4">
        {/* Confidence Circle */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--bg-tertiary)"
              strokeWidth="5"
            />
            {/* Animated progress circle */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 - (animatedConfidence / 100) * 2 * Math.PI * 42}
              className={`${config.color} transition-all duration-1000 ease-out`}
              style={{
                filter: `drop-shadow(0 0 8px ${config.glow})`,
              }}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className={`text-2xl font-black ${config.color} leading-none`}>
              {Math.round(animatedConfidence)}%
            </span>
            <span className="text-[9px] text-text-muted uppercase tracking-wider leading-none mt-1">
              Confidence
            </span>
          </div>
        </div>

        {/* Signal Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${config.bg}`}>
              <SignalIcon className={`w-4 h-4 ${config.color}`} />
            </div>
            <span className={`text-lg font-bold ${config.color}`}>
              {config.label}
            </span>
            <Sparkles className="w-4 h-4 text-accent-primary animate-pulse" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="flex items-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl bg-bg-tertiary/50 border border-border/30">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-accent-primary" />
              <div className="min-w-0 flex-1 text-center">
                <p className="text-[11px] sm:text-xs text-text-muted leading-tight">Correlation</p>
                <p className="text-base sm:text-lg font-bold text-accent-primary leading-tight whitespace-nowrap">
                  {correlation.toFixed(3)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl bg-bg-tertiary/50 border border-border/30">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-accent-primary" />
              <div className="min-w-0 flex-1 text-center">
                <p className="text-[11px] sm:text-xs text-text-muted leading-tight">Z-Score</p>
                <p className={`text-base sm:text-lg font-bold leading-tight whitespace-nowrap ${zScore > 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                  {zScore > 0 ? '+' : ''}{zScore.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom indicator bar */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-text-muted">
            <Zap className="w-3 h-3 text-accent-primary" />
            <span>AI Signal Analysis</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse" />
            <span className="text-accent-success">Live</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-horizontal {
          0% { left: -10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 110%; opacity: 0; }
        }
        .animate-scan-horizontal {
          animation: scan-horizontal 3s ease-in-out infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
