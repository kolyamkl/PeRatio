import { useState, useEffect } from 'react'
import { Shield, Target, AlertTriangle, Flame, Snowflake, Zap } from 'lucide-react'

interface RiskRewardCardProps {
  potentialProfit: number
  potentialLoss: number
  riskRewardRatio: number
  leverage: number
  stopLoss?: number
  takeProfit?: number
}

export function RiskRewardCard({ potentialProfit, potentialLoss, riskRewardRatio, leverage, stopLoss = 1.5, takeProfit = 3.0 }: RiskRewardCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [animatedProfit, setAnimatedProfit] = useState(0)
  const [animatedLoss, setAnimatedLoss] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isVisible) {
      const duration = 1000
      const steps = 40
      const profitIncrement = potentialProfit / steps
      const lossIncrement = potentialLoss / steps
      let step = 0
      
      const interval = setInterval(() => {
        step++
        if (step >= steps) {
          setAnimatedProfit(potentialProfit)
          setAnimatedLoss(potentialLoss)
          clearInterval(interval)
        } else {
          setAnimatedProfit(profitIncrement * step)
          setAnimatedLoss(lossIncrement * step)
        }
      }, duration / steps)
      
      return () => clearInterval(interval)
    }
  }, [isVisible, potentialProfit, potentialLoss])

  const riskLevel = leverage <= 3 ? 'low' : leverage <= 7 ? 'medium' : 'high'
  
  const riskConfig = {
    low: { 
      label: 'Low Risk', 
      color: 'text-accent-success', 
      bg: 'bg-accent-success',
      icon: Shield,
      description: 'Conservative position'
    },
    medium: { 
      label: 'Medium Risk', 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-400',
      icon: AlertTriangle,
      description: 'Balanced exposure'
    },
    high: { 
      label: 'High Risk', 
      color: 'text-accent-danger', 
      bg: 'bg-accent-danger',
      icon: Flame,
      description: 'Aggressive leverage'
    },
  }

  const config = riskConfig[riskLevel]
  const RiskIcon = config.icon

  const totalRange = potentialProfit + Math.abs(potentialLoss)
  const profitPercentage = totalRange > 0 ? (potentialProfit / totalRange) * 100 : 50

  return (
    <div 
      className={`
        card p-4 relative overflow-hidden transition-all duration-500
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${config.bg}/10`}>
            <RiskIcon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <span className={`text-base font-bold ${config.color}`}>{config.label}</span>
            <p className="text-xs text-text-muted">{config.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-muted">R:R Ratio</div>
          <div className="text-2xl font-black text-accent-primary">1:{riskRewardRatio.toFixed(1)}</div>
        </div>
      </div>

      {/* Visual Risk/Reward Bar */}
      <div className="mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-accent-danger flex items-center gap-1.5 font-medium">
            <Snowflake className="w-4 h-4" />
            Max Loss
          </span>
          <span className="text-accent-success flex items-center gap-1.5 font-medium">
            Max Profit
            <Flame className="w-4 h-4" />
          </span>
        </div>
        
        <div className="relative h-12 rounded-xl overflow-hidden bg-bg-tertiary">
          {/* Loss section */}
          <div 
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-accent-danger to-accent-danger/50 flex items-center justify-start pl-3 transition-all duration-1000"
            style={{ width: `${100 - profitPercentage}%` }}
          >
            <span className="text-lg font-bold text-white drop-shadow-lg">
              -${Math.abs(animatedLoss).toFixed(0)}
            </span>
          </div>
          
          {/* Profit section */}
          <div 
            className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-accent-success to-accent-success/50 flex items-center justify-end pr-3 transition-all duration-1000"
            style={{ width: `${profitPercentage}%` }}
          >
            <span className="text-lg font-bold text-white drop-shadow-lg">
              +${animatedProfit.toFixed(0)}
            </span>
          </div>

          {/* Center divider */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white/30 transform -translate-x-1/2 rounded-full" />
        </div>
      </div>

      {/* SL/TP and Leverage - Bigger Layout */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Stop Loss */}
        <div className="p-4 rounded-xl bg-accent-danger/5 border border-accent-danger/20">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-accent-danger" />
            <span className="text-sm text-text-muted">Stop Loss</span>
          </div>
          <p className="text-2xl font-black text-accent-danger">-{stopLoss.toFixed(1)}%</p>
        </div>
        
        {/* Take Profit */}
        <div className="p-4 rounded-xl bg-accent-success/5 border border-accent-success/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-accent-success" />
            <span className="text-sm text-text-muted">Take Profit</span>
          </div>
          <p className="text-2xl font-black text-accent-success">+{takeProfit.toFixed(1)}%</p>
        </div>
      </div>

      {/* Leverage - Full Width */}
      <div className="p-4 rounded-xl bg-bg-tertiary/50 border border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-primary/10">
              <Zap className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <span className="text-sm text-text-muted block">Leverage</span>
              <span className="text-xs text-text-muted/60">Position multiplier</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-accent-primary">{leverage}x</span>
          </div>
        </div>
      </div>
    </div>
  )
}
