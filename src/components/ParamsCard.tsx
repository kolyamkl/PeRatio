import { useState, useEffect } from 'react'
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
  betAmount?: number
  onProportionChange?: (longPct: number) => void
  onRiskChange?: (stopLoss: number, takeProfit: number) => void
  onLeverageChange?: (leverage: number) => void
  onBetAmountChange?: (amount: number) => void
}

export function ParamsCard({ 
  proportion, 
  risk, 
  leverage,
  betAmount = 20,
  onProportionChange,
  onRiskChange,
  onLeverageChange,
  onBetAmountChange
}: ParamsCardProps) {
  const [localStopLoss, setLocalStopLoss] = useState(risk.stopLossPct)
  const [localTakeProfit, setLocalTakeProfit] = useState(risk.takeProfitPct)
  const [localLeverage, setLocalLeverage] = useState(leverage)
  const [localLongPct, setLocalLongPct] = useState(proportion.longPct)
  const [localBetAmount, setLocalBetAmount] = useState(betAmount)

  // Sync local state with prop changes (e.g., from URL params)
  useEffect(() => {
    setLocalStopLoss(risk.stopLossPct)
  }, [risk.stopLossPct])

  useEffect(() => {
    setLocalTakeProfit(risk.takeProfitPct)
  }, [risk.takeProfitPct])

  useEffect(() => {
    setLocalLeverage(leverage)
  }, [leverage])

  useEffect(() => {
    setLocalBetAmount(betAmount)
  }, [betAmount])

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

  const handleBetAmountChange = (delta: number) => {
    hapticFeedback('selection')
    const newValue = Math.max(10, Math.min(1000, localBetAmount + delta))
    setLocalBetAmount(newValue)
    onBetAmountChange?.(newValue)
  }

  const leverageOptions = [1, 2, 3, 5, 7, 10, 15, 20, 25]
  
  return (
    <div className="card p-5 space-y-5 animate-fade-up" style={{ animationDelay: '200ms' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Trade Parameters
        </span>
      </div>
      
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
      
      {/* Bet Amount Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text-secondary">Bet Amount</span>
          <div className="flex items-center">
            <span className="text-sm font-bold text-accent-primary">$</span>
            <input
              type="number"
              value={localBetAmount}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val) && val >= 10) {
                  setLocalBetAmount(val)
                  onBetAmountChange?.(val)
                  hapticFeedback('selection')
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value)
                if (isNaN(val) || val < 10) {
                  setLocalBetAmount(10)
                  onBetAmountChange?.(10)
                }
              }}
              className="w-16 text-sm font-bold text-accent-primary bg-transparent text-right outline-none focus:ring-2 focus:ring-accent-primary/30 rounded py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min="10"
              step="10"
            />
          </div>
        </div>
        
        {/* Bet Amount Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleBetAmountChange(-10)}
            disabled={localBetAmount <= 10}
            className="w-10 h-10 rounded-xl bg-accent-danger/10 border border-accent-danger/20 flex items-center justify-center hover:bg-accent-danger/20 transition-colors btn-press disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Minus className="w-5 h-5 text-accent-danger" />
          </button>
          
          {/* Amount visualization bar */}
          <div className="flex-1 h-6 rounded-full overflow-hidden relative border border-border bg-bg-tertiary">
            <div 
              className="h-full transition-all duration-300 relative"
              style={{ 
                width: `${Math.min(100, (localBetAmount / 200) * 100)}%`,
                background: 'linear-gradient(135deg, #a3e635 0%, #65a30d 50%, #a3e635 100%)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white drop-shadow-sm">${localBetAmount}</span>
            </div>
          </div>
          
          <button
            onClick={() => handleBetAmountChange(10)}
            className="w-10 h-10 rounded-xl bg-accent-success/10 border border-accent-success/20 flex items-center justify-center hover:bg-accent-success/20 transition-colors btn-press"
          >
            <Plus className="w-5 h-5 text-accent-success" />
          </button>
        </div>
        
        {/* Quick amount buttons */}
        <div className="flex gap-2 mt-3">
          {[20, 50, 100, 200].map((amount) => (
            <button
              key={amount}
              onClick={() => {
                hapticFeedback('selection')
                setLocalBetAmount(amount)
                onBetAmountChange?.(amount)
              }}
              className={`
                flex-1 py-2 rounded-lg text-xs font-bold transition-all btn-press
                ${localBetAmount === amount 
                  ? 'bg-accent-primary text-black' 
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80'}
              `}
            >
              ${amount}
            </button>
          ))}
        </div>
        
        <p className="text-xs text-text-muted mt-2">Min: $10 • Split equally between long & short</p>
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
