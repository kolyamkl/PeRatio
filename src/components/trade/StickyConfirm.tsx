import { useState, useRef } from 'react'
import { Loader2, Check, Sparkles, Wallet } from 'lucide-react'
import { hapticFeedback } from '../../lib/telegram'
import { useToast } from '../ui/Toast'
import { Confetti } from '../ui/Confetti'

type ConfirmState = 'idle' | 'submitting' | 'confirmed'

interface BasketAsset {
  coin: string
  weight: number
}

interface TradeData {
  pair: {
    long: { symbol: string; notional: number; leverage: number }
    short: { symbol: string; notional: number; leverage: number }
  }
  takeProfitRatio: number
  stopLossRatio: number
  longBasket?: BasketAsset[]
  shortBasket?: BasketAsset[]
}

interface StickyConfirmProps {
  disabled?: boolean
  tradeId?: string
  tradeData?: TradeData
  walletAddress?: string
}

// Backend URL - uses env var in production, empty for dev (Vite proxy)
const backendUrl = import.meta.env.VITE_BACKEND_URL || ''

export function StickyConfirm({ disabled = false, tradeId, tradeData, walletAddress }: StickyConfirmProps) {
  const [state, setState] = useState<ConfirmState>('idle')
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
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
    
    // Trigger haptic feedback safely
    try {
      hapticFeedback('impact', 'medium')
    } catch (e) {
      console.log('[StickyConfirm] Haptic feedback not available')
    }
    
    setState('submitting')
    
    console.log('========================================')
    console.log('[StickyConfirm] 🚀 CONFIRM BUTTON CLICKED')
    console.log('========================================')
    console.log('[StickyConfirm] State:', { tradeId, hasTradeData: !!tradeData, disabled })
    console.log('[StickyConfirm] Full tradeData:', JSON.stringify(tradeData, null, 2))
    
    try {
      if (tradeId && tradeData) {
        // Validate wallet address is provided - REQUIRED (no hardcoded fallback)
        if (!walletAddress) {
          throw new Error('Please connect your wallet to execute trades')
        }
        
        // Get user's Pear access token from localStorage (set during wallet authentication)
        const pearAccessToken = localStorage.getItem('pear_access_token')
        if (!pearAccessToken) {
          throw new Error('Please authenticate with Pear Protocol to execute trades')
        }
        
        // For direct trades (no pre-generated tradeId), call Pear API directly
        const isDirectTrade = tradeId === 'direct-trade'
        
        if (isDirectTrade) {
          // Execute directly via Pear Protocol API
          const PEAR_API_URL = 'https://hl-v2.pearprotocol.io'
          
          // Get primary assets from baskets
          const longAsset = tradeData.longBasket?.[0]?.coin || tradeData.pair.long.symbol.replace('-PERP', '')
          const shortAsset = tradeData.shortBasket?.[0]?.coin || tradeData.pair.short.symbol.replace('-PERP', '')
          
          const totalNotional = tradeData.pair.long.notional + tradeData.pair.short.notional
          
          // Build position request for Pear API
          const positionData = {
            executionType: 'MARKET',
            slippage: 0.08,
            leverage: tradeData.pair.long.leverage,
            usdValue: Math.min(totalNotional, 20), // Cap at $20
            longAssets: [{ asset: longAsset, weight: 1.0 }],
            shortAssets: [{ asset: shortAsset, weight: 1.0 }],
            takeProfit: tradeData.takeProfitRatio ? {
              type: 'PERCENTAGE',
              value: Math.abs(tradeData.takeProfitRatio * 100)
            } : undefined,
            stopLoss: tradeData.stopLossRatio ? {
              type: 'PERCENTAGE', 
              value: Math.abs(tradeData.stopLossRatio * 100)
            } : undefined,
          }
          
          console.log('[StickyConfirm] 🍐 DIRECT PEAR API EXECUTION')
          console.log('[StickyConfirm]   URL:', `${PEAR_API_URL}/positions`)
          console.log('[StickyConfirm]   Long:', longAsset)
          console.log('[StickyConfirm]   Short:', shortAsset)
          console.log('[StickyConfirm]   USD Value:', positionData.usdValue)
          console.log('[StickyConfirm]   Leverage:', positionData.leverage)
          console.log('[StickyConfirm]   Body:', JSON.stringify(positionData, null, 2))
          
          const res = await fetch(`${PEAR_API_URL}/positions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${pearAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(positionData),
          })
          
          const responseText = await res.text()
          console.log('[StickyConfirm] 📥 Pear Response:', res.status, responseText.substring(0, 500))
          
          if (!res.ok) {
            let errorMessage = 'Trade execution failed'
            try {
              const error = JSON.parse(responseText)
              errorMessage = error.message || error.error || error.detail || errorMessage
            } catch {
              errorMessage = responseText.length < 200 ? responseText : errorMessage
            }
            throw new Error(errorMessage)
          }
          
          const result = JSON.parse(responseText)
          console.log('[StickyConfirm] ✅ Trade executed via Pear!')
          console.log('[StickyConfirm]   Order ID:', result.orderId || result.id)
          
          // Notify backend for Telegram notification
          if (walletAddress) {
            try {
              const notifyRes = await fetch(`${backendUrl}/api/trades/direct/notify`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'bypass-tunnel-reminder': 'true',
                },
                body: JSON.stringify({
                  walletAddress: walletAddress,
                  longAsset: longAsset,
                  shortAsset: shortAsset,
                  usdValue: positionData.usdValue,
                  leverage: positionData.leverage,
                  takeProfitPct: tradeData.takeProfitRatio ? Math.abs(tradeData.takeProfitRatio * 100) : null,
                  stopLossPct: tradeData.stopLossRatio ? Math.abs(tradeData.stopLossRatio * 100) : null,
                  orderId: result.orderId || result.id,
                  pearAccessToken: pearAccessToken,
                }),
              })
              const notifyResult = await notifyRes.json()
              console.log('[StickyConfirm] 📱 Notification result:', notifyResult)
            } catch (notifyErr) {
              console.warn('[StickyConfirm] ⚠️ Failed to send notification:', notifyErr)
            }
          }
          
          setState('confirmed')
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 3500)
          try { hapticFeedback('notification', 'success') } catch {}
          showToast('Trade executed via Pear Protocol!', 'success')
        } else {
          // Use backend API for pre-generated trades
          const apiUrl = `${backendUrl}/api/trades/${tradeId}/execute`
          
          const requestBody = {
            pair: tradeData.pair,
            walletAddress: walletAddress,
            pearAccessToken: pearAccessToken,
            takeProfitRatio: tradeData.takeProfitRatio,
            stopLossRatio: tradeData.stopLossRatio,
            longBasket: tradeData.longBasket || [],
            shortBasket: tradeData.shortBasket || [],
          }
          
          console.log('[StickyConfirm] 📤 REQUEST DETAILS:')
          console.log('[StickyConfirm]   URL:', apiUrl)
          console.log('[StickyConfirm]   Method: POST')
          console.log('[StickyConfirm]   Wallet:', walletAddress)
          console.log('[StickyConfirm]   Body:', JSON.stringify(requestBody, null, 2))
          
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'bypass-tunnel-reminder': 'true',
            },
            body: JSON.stringify(requestBody),
          })
          
          console.log('[StickyConfirm] 📥 RESPONSE:')
          console.log('[StickyConfirm]   Status:', res.status, res.statusText)
          
          const responseText = await res.text()
          console.log('[StickyConfirm]   Body (raw):', responseText.substring(0, 500))
          
          if (!res.ok) {
            let errorMessage = 'Trade execution failed'
            try {
              const trimmedResponse = responseText.trim()
              if (trimmedResponse.startsWith('<!DOCTYPE') || 
                  trimmedResponse.startsWith('<html') || 
                  trimmedResponse.startsWith('import ') ||
                  trimmedResponse.includes('</html>')) {
                errorMessage = `Server unavailable (status ${res.status}). Please try again.`
              } else {
                const error = JSON.parse(responseText)
                errorMessage = error.detail || error.message || error.error || errorMessage
              }
            } catch {
              if (responseText.length > 200 || responseText.includes('<') || responseText.includes('import ')) {
                errorMessage = `Server error (status ${res.status}). Please try again.`
              } else {
                errorMessage = responseText || errorMessage
              }
            }
            throw new Error(errorMessage)
          }
          
          const result = JSON.parse(responseText)
          console.log('[StickyConfirm] ✅ Trade executed successfully!')
          console.log('[StickyConfirm]   Result:', result)
          
          setState('confirmed')
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 3500)
          try { hapticFeedback('notification', 'success') } catch {}
          showToast('Trade executed via Pear Protocol!', 'success')
        }
      } else {
        // No tradeData - this shouldn't happen now
        throw new Error('Trade data is missing. Please refresh and try again.')
      }
    } catch (err: unknown) {
      console.error('[StickyConfirm] ❌ EXECUTION FAILED')
      console.error('[StickyConfirm]   Error:', err)
      
      setState('idle')
      try { hapticFeedback('notification', 'error') } catch {}
      
      // Extract error message properly - handle all error types
      let displayMessage = 'Trade failed'
      
      if (err instanceof Error) {
        displayMessage = err.message || 'Trade failed'
        console.error('[StickyConfirm]   Error message:', err.message)
        console.error('[StickyConfirm]   Error stack:', err.stack)
      } else if (typeof err === 'string') {
        displayMessage = err
      } else if (err && typeof err === 'object' && 'message' in err) {
        displayMessage = String((err as any).message)
      }
      
      // Sanitize error message - don't show raw HTML/code to user
      if (displayMessage.length > 100 || displayMessage.includes('<') || displayMessage.includes('import ')) {
        displayMessage = 'Trade execution failed. Please try again.'
      }
      
      console.error('[StickyConfirm]   Display message:', displayMessage)
      showToast(displayMessage, 'error')
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
    <>
      {/* Confetti celebration on successful trade */}
      <Confetti isActive={showConfetti} duration={3000} particleCount={60} />
      
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
    </>
  )
}
