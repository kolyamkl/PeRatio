import { useState, useRef } from 'react'
import { Loader2, Check, Sparkles, Wallet } from 'lucide-react'
import { hapticFeedback } from '../lib/telegram'
import { useToast } from './Toast'

type ConfirmState = 'idle' | 'submitting' | 'confirmed'

interface TradeData {
  pair: {
    long: { symbol: string; notional: number; leverage: number }
    short: { symbol: string; notional: number; leverage: number }
  }
  takeProfitRatio: number
  stopLossRatio: number
}

interface StickyConfirmProps {
  disabled?: boolean
  tradeId?: string
  tradeData?: TradeData
}

// Backend URL - uses env var in production, empty for dev (Vite proxy)
const backendUrl = import.meta.env.VITE_BACKEND_URL || ''

export function StickyConfirm({ disabled = false, tradeId, tradeData }: StickyConfirmProps) {
  const [state, setState] = useState<ConfirmState>('idle')
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { showToast } = useToast()
  
  const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (state !== 'idle' || disabled) return
    
    // Create ripple effect
    const button = buttonRef.current
    if (button) {
      const rect = button.getBoundingClientRect()
      setRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setTimeout(() => setRipple(null), 600)
    }
    
    // Trigger haptic feedback
    hapticFeedback('impact', 'medium')
    
    setState('submitting')
    
    try {
      if (tradeId && tradeData) {
        // Call real execute API
        const apiUrl = `${backendUrl}/api/trades/${tradeId}/execute`
        console.log('[StickyConfirm] 🚀 Executing trade:', tradeId)
        console.log('[StickyConfirm] API URL:', apiUrl)
        console.log('[StickyConfirm] Trade data:', JSON.stringify(tradeData, null, 2))
        
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pair: tradeData.pair,
            takeProfitRatio: tradeData.takeProfitRatio,
            stopLossRatio: tradeData.stopLossRatio,
          }),
        })
        
        console.log('[StickyConfirm] Response status:', res.status)
        
        if (!res.ok) {
          const error = await res.json()
          console.error('[StickyConfirm] ❌ Error response:', error)
          throw new Error(error.detail || 'Trade execution failed')
        }
        
        const result = await res.json()
        console.log('[StickyConfirm] ✅ Trade executed:', result)
        
        setState('confirmed')
        hapticFeedback('notification', 'success')
        showToast('Trade executed via Pear Protocol!', 'success')
      } else {
        // Demo mode - no tradeId
        console.log('[StickyConfirm] ⚠️ Demo mode - simulating trade (no tradeId)')
        await new Promise(resolve => setTimeout(resolve, 1500))
        setState('confirmed')
        hapticFeedback('notification', 'success')
        showToast('Trade submitted (demo)', 'success')
      }
    } catch (err: unknown) {
      const error = err as Error
      console.error('[StickyConfirm] Error:', error)
      setState('idle')
      hapticFeedback('notification', 'error')
      showToast(error.message || 'Trade failed', 'error')
    }
  }
  
  const buttonContent = () => {
    switch (state) {
      case 'submitting':
        return (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Loader2 className="w-5 h-5 animate-spin" />
              <div className="absolute inset-0 animate-ping">
                <Loader2 className="w-5 h-5 opacity-30" />
              </div>
            </div>
            <span className="animate-pulse">Executing...</span>
          </div>
        )
      case 'confirmed':
        return (
          <div className="flex items-center gap-2 animate-pop">
            <div className="relative">
              <Check className="w-5 h-5" strokeWidth={3} />
              <svg className="absolute inset-0 w-5 h-5" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="63"
                  strokeDashoffset="63"
                  className="animate-[checkDraw_500ms_ease-out_forwards]"
                  style={{
                    animation: 'checkDraw 500ms ease-out forwards',
                  }}
                />
              </svg>
            </div>
            <span>Confirmed!</span>
            <Sparkles className="w-4 h-4 animate-bounce-soft" />
          </div>
        )
      default:
        if (disabled) {
          return (
            <span className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              <span>Wallet Not Ready</span>
            </span>
          )
        }
        return (
          <span className="flex items-center gap-2">
            <span>Confirm Trade</span>
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        )
    }
  }
  
  const buttonClass = () => {
    const base = 'group relative w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-300 overflow-hidden'
    
    if (disabled) {
      return `${base} bg-bg-tertiary text-text-muted cursor-not-allowed`
    }
    if (state === 'confirmed') {
      return `${base} bg-accent-success text-black scale-[1.02]`
    }
    if (state === 'submitting') {
      return `${base} bg-accent-primary/80 text-black cursor-not-allowed`
    }
    return `${base} bg-accent-primary text-black btn-glow hover:scale-[1.02] hover:shadow-lg hover:shadow-accent-primary/25 active:scale-[0.98]`
  }
  
  return (
    <div className="sticky bottom-0 left-0 right-0 p-4 safe-bottom z-20">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/95 to-transparent backdrop-blur-sm" />
      
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleConfirm}
          disabled={state !== 'idle' || disabled}
          className={buttonClass()}
        >
          {/* Ripple effect */}
          {ripple && (
            <span
              className="absolute bg-white/30 rounded-full animate-scale-in pointer-events-none"
              style={{
                left: ripple.x - 50,
                top: ripple.y - 50,
                width: 100,
                height: 100,
                transform: 'scale(0)',
                animation: 'rippleExpand 600ms ease-out forwards',
              }}
            />
          )}
          
          {/* Shine effect on hover */}
          {state === 'idle' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          )}
          
          {/* Progress bar for submitting state */}
          {state === 'submitting' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 overflow-hidden">
              <div className="h-full bg-black/40 animate-[progressBar_1.5s_ease-in-out]" />
            </div>
          )}
          
          {buttonContent()}
        </button>
        
        <p className="text-center text-xs text-text-muted mt-3 transition-opacity duration-300">
          {state === 'confirmed' ? (
            <span className="text-accent-success animate-fade-in">Transaction sent successfully</span>
          ) : disabled ? (
            'Please connect your wallet to proceed'
          ) : (
            'By confirming you allow execution via Pear.'
          )}
        </p>
      </div>
      
      <style>{`
        @keyframes rippleExpand {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        @keyframes progressBar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
