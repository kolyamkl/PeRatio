import { useState } from 'react'
import { AlertTriangle, Minus, Plus } from 'lucide-react'
import { formatLeverage } from '../lib/mockData'
import { hapticFeedback } from '../lib/telegram'

interface ParamsCardProps {
  proportion: {
    longPct: number
    shortPct: number
  }
  risk: {
    stopLossPct: number
    takeProfitPct: number
  }
  leverage: number
  onProportionChange?: (longPct: number) => void
  onRiskChange?: (stopLoss: number, takeProfit: number) => void
  onLeverageChange?: (leverage: number) => void
}

export function ParamsCard({ 
  proportion, 
  risk, 
  leverage, 
  onProportionChange,
  onRiskChange,
  onLeverageChange 
}: ParamsCardProps) {
  const [localStopLoss, setLocalStopLoss] = useState(risk.stopLossPct)
  const [localTakeProfit, setLocalTakeProfit] = useState(risk.takeProfitPct)
  const [localLeverage, setLocalLeverage] = useState(leverage)
  const [localLongPct, setLocalLongPct] = useState(proportion.longPct)

  const handleLongPctChange = (delta: number) => {
    hapticFeedback('selection')
    const newValue = Math.max(10, Math.min(90, localLongPct + delta))
    setLocalLongPct(newValue)
    onProportionChange?.(newValue)
  }

  const handleStopLossChange = (delta: number) => {
    hapticFeedback('selection')
    const newValue = Math.max(0.5, Math.min(10, localStopLoss + delta))
    setLocalStopLoss(newValue)
    onRiskChange?.(newValue, localTakeProfit)
  }

  const handleTakeProfitChange = (delta: number) => {
    hapticFeedback('selection')
    const newValue = Math.max(0.5, Math.min(20, localTakeProfit + delta))
    setLocalTakeProfit(newValue)
    onRiskChange?.(localStopLoss, newValue)
  }

  const handleLeverageChange = (newLeverage: number) => {
    hapticFeedback('selection')
    setLocalLeverage(newLeverage)
    onLeverageChange?.(newLeverage)
  }

  const leverageOptions = [1, 2, 3, 5, 7, 10, 15, 20, 25]
  
  return (
    <div className="card p-5 space-y-5 animate-fade-up" style={{ animationDelay: '200ms' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Trade Parameters
        </span>
      </div>
      
      {/* Proportion Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text-secondary">Allocation</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={localLongPct}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                if (!isNaN(val) && val >= 0 && val <= 100) {
                  setLocalLongPct(val)
                  onProportionChange?.(val)
                  hapticFeedback('selection')
                }
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value)
                if (isNaN(val) || val < 0) setLocalLongPct(0)
                else if (val > 100) setLocalLongPct(100)
              }}
              className="w-10 text-sm font-bold text-accent-success bg-transparent text-right outline-none focus:ring-2 focus:ring-accent-success/30 rounded py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min="0"
              max="100"
            />
            <span className="text-sm font-bold text-accent-success">%</span>
            <span className="text-text-muted mx-1">/</span>
            <span className="text-sm font-bold text-accent-danger">{100 - localLongPct}%</span>
          </div>
        </div>
        
        {/* Allocation Controls */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => handleLongPctChange(-10)}
            className="w-10 h-10 rounded-xl bg-accent-danger/10 border border-accent-danger/20 flex items-center justify-center hover:bg-accent-danger/20 transition-colors btn-press"
          >
            <Minus className="w-5 h-5 text-accent-danger" />
          </button>
          
          {/* Split bar with shine effect */}
          <div className="flex-1 h-6 rounded-full overflow-hidden flex relative border border-border">
            <div 
              className="relative transition-all duration-300"
              style={{ 
                width: `${localLongPct}%`,
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #22c55e 100%)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
            <div 
              className="relative transition-all duration-300"
              style={{ 
                width: `${100 - localLongPct}%`,
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #ef4444 100%)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ animationDelay: '1s' }} />
            </div>
          </div>
          
          <button
            onClick={() => handleLongPctChange(10)}
            className="w-10 h-10 rounded-xl bg-accent-success/10 border border-accent-success/20 flex items-center justify-center hover:bg-accent-success/20 transition-colors btn-press"
          >
            <Plus className="w-5 h-5 text-accent-success" />
          </button>
        </div>
        
        {/* Labels */}
        <div className="flex justify-between text-xs">
          <span className="text-accent-success font-medium">
            Long {localLongPct}%
          </span>
          <span className="text-accent-danger font-medium">
            Short {100 - localLongPct}%
          </span>
        </div>
      </div>
      
      {/* Divider */}
      <div className="h-px bg-border" />
      
      {/* SL/TP Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text-secondary">Risk Management</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Stop Loss - Left */}
          <div className="bg-bg-tertiary rounded-xl p-4">
            <span className="text-xs text-text-muted block mb-2">Stop Loss</span>
            <div className="flex items-center justify-between gap-1">
              <button
                onClick={() => handleStopLossChange(-0.5)}
                className="w-8 h-8 rounded-lg bg-accent-danger/10 flex items-center justify-center hover:bg-accent-danger/20 transition-colors btn-press flex-shrink-0"
              >
                <Minus className="w-4 h-4 text-accent-danger" />
              </button>
              <div className="flex items-center">
                <input
                  type="number"
                  value={localStopLoss}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val) && val >= 0.1 && val <= 50) {
                      setLocalStopLoss(val)
                      onRiskChange?.(val, localTakeProfit)
                      hapticFeedback('selection')
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value)
                    if (isNaN(val) || val < 0.1) setLocalStopLoss(0.5)
                    else if (val > 50) setLocalStopLoss(50)
                  }}
                  className="w-10 text-xl font-bold text-accent-danger bg-transparent text-right outline-none focus:ring-2 focus:ring-accent-danger/30 rounded py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  step="0.1"
                  min="0.1"
                  max="50"
                />
                <span className="text-xl font-bold text-accent-danger ml-0.5">%</span>
              </div>
              <button
                onClick={() => handleStopLossChange(0.5)}
                className="w-8 h-8 rounded-lg bg-accent-danger/10 flex items-center justify-center hover:bg-accent-danger/20 transition-colors btn-press flex-shrink-0"
              >
                <Plus className="w-4 h-4 text-accent-danger" />
              </button>
            </div>
          </div>
          
          {/* Take Profit - Right */}
          <div className="bg-bg-tertiary rounded-xl p-4">
            <span className="text-xs text-text-muted block mb-2">Take Profit</span>
            <div className="flex items-center justify-between gap-1">
              <button
                onClick={() => handleTakeProfitChange(-0.5)}
                className="w-8 h-8 rounded-lg bg-accent-success/10 flex items-center justify-center hover:bg-accent-success/20 transition-colors btn-press flex-shrink-0"
              >
                <Minus className="w-4 h-4 text-accent-success" />
              </button>
              <div className="flex items-center">
                <input
                  type="number"
                  value={localTakeProfit}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val) && val >= 0.1 && val <= 100) {
                      setLocalTakeProfit(val)
                      onRiskChange?.(localStopLoss, val)
                      hapticFeedback('selection')
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value)
                    if (isNaN(val) || val < 0.1) setLocalTakeProfit(0.5)
                    else if (val > 100) setLocalTakeProfit(100)
                  }}
                  className="w-10 text-xl font-bold text-accent-success bg-transparent text-right outline-none focus:ring-2 focus:ring-accent-success/30 rounded py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  step="0.1"
                  min="0.1"
                  max="100"
                />
                <span className="text-xl font-bold text-accent-success ml-0.5">%</span>
              </div>
              <button
                onClick={() => handleTakeProfitChange(0.5)}
                className="w-8 h-8 rounded-lg bg-accent-success/10 flex items-center justify-center hover:bg-accent-success/20 transition-colors btn-press flex-shrink-0"
              >
                <Plus className="w-4 h-4 text-accent-success" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Divider */}
      <div className="h-px bg-border" />
      
      {/* Leverage Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text-secondary">Leverage</span>
          <span className="text-xl font-black text-accent-primary">{formatLeverage(localLeverage)}</span>
        </div>
        
        {/* Leverage buttons */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {leverageOptions.slice(0, 5).map((lev) => (
            <button
              key={lev}
              onClick={() => handleLeverageChange(lev)}
              className={`
                py-2.5 rounded-xl text-sm font-bold transition-all btn-press
                ${localLeverage === lev 
                  ? 'bg-accent-primary text-black shadow-lg shadow-accent-primary/30' 
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80'}
              `}
            >
              {lev}x
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {leverageOptions.slice(5).map((lev) => (
            <button
              key={lev}
              onClick={() => handleLeverageChange(lev)}
              className={`
                py-2.5 rounded-xl text-sm font-bold transition-all btn-press
                ${localLeverage === lev 
                  ? 'bg-accent-primary text-black shadow-lg shadow-accent-primary/30' 
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80'}
              `}
            >
              {lev}x
            </button>
          ))}
        </div>
        
        {/* Leverage slider with glow effect */}
        <div className="relative mb-3 group/slider">
          <div 
            className="absolute inset-0 h-3 rounded-full overflow-hidden"
            style={{
              background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${(localLeverage / 25) * 100}%, var(--bg-tertiary) ${(localLeverage / 25) * 100}%, var(--bg-tertiary) 100%)`
            }}
          />
          <input
            type="range"
            min="1"
            max="25"
            value={localLeverage}
            onChange={(e) => handleLeverageChange(Number(e.target.value))}
            className="w-full relative z-10"
          />
        </div>
        
        {/* Leverage markers */}
        <div className="flex justify-between text-xs text-text-muted mb-4">
          <span>1x</span>
          <span>7x</span>
          <span>13x</span>
          <span>19x</span>
          <span>25x</span>
        </div>
        
        <div className={`flex items-start gap-2 p-3 rounded-lg border transition-colors ${
          localLeverage > 10 
            ? 'bg-accent-danger/10 border-accent-danger/20' 
            : localLeverage > 5 
              ? 'bg-accent-warning/10 border-accent-warning/20'
              : 'bg-accent-success/10 border-accent-success/20'
        }`}>
          <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
            localLeverage > 10 
              ? 'text-accent-danger' 
              : localLeverage > 5 
                ? 'text-accent-warning'
                : 'text-accent-success'
          }`} />
          <span className="text-xs text-text-secondary leading-relaxed">
            {localLeverage > 10 
              ? 'High leverage! Significant risk of liquidation.' 
              : localLeverage > 5 
                ? 'Moderate leverage. Trade with caution.'
                : 'Conservative leverage. Lower risk exposure.'}
          </span>
        </div>
      </div>
    </div>
  )
}
