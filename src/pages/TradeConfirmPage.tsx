import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { PairCard } from '../components/trade/PairCard'
import { ParamsCard } from '../components/trade/ParamsCard'
import { StickyConfirm } from '../components/trade/StickyConfirm'
import { SettingsModal } from '../components/ui/SettingsModal'
import { MarketTicker } from '../components/layout/MarketTicker'
import { TradeSignal } from '../components/trade/TradeSignal'
import { RiskRewardCard } from '../components/trade/RiskRewardCard'
import { WalletConnectionCard } from '../components/wallet/WalletConnectionCard'
import { type Coin, availableCoins } from '../lib/mockData'
import { hapticFeedback, getTelegramUserInfo } from '../lib/telegram'

type FrequencyOption = 'never' | '1m' | '5m' | '15m' | '1h' | '2h' | '4h' | 'daily'

export function TradeConfirmPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  // Backend URL - uses env var in production (ngrok), empty for dev (Vite proxy)
  const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
  
  // Log on mount for debugging
  useEffect(() => {
    console.log('[TradeConfirm] 🚀 Component mounted')
    console.log('[TradeConfirm] Backend URL:', backendUrl || '(using proxy)')
    console.log('[TradeConfirm] Mode:', import.meta.env.MODE)
  }, [backendUrl])

  // Settings state
  const [frequency, setFrequency] = useState<FrequencyOption>('never')
  const [notificationTime, setNotificationTime] = useState('09:00')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  // Trade parameters state - default values
  const [stopLoss, setStopLoss] = useState(10)
  const [takeProfit, setTakeProfit] = useState(20)
  const [leverage, setLeverage] = useState(2)
  const [longPct, setLongPct] = useState(50)
  const [betAmount, setBetAmount] = useState(20) // Default $20 total ($10 per side) - matches backend cap

  // Get initial coins with prices - handles both "BTC" and "BTC-PERP" formats
  const getInitialCoin = (symbol: string): Coin => {
    // Strip -PERP suffix if present (backend uses BTC-PERP, frontend uses BTC)
    const ticker = symbol.replace(/-PERP$/i, '')
    const found = availableCoins.find(c => c.ticker.toUpperCase() === ticker.toUpperCase())
    return found || { name: ticker, ticker }
  }

  const [longCoins, setLongCoins] = useState<Coin[]>([
    getInitialCoin('BTC')
  ])
  
  const [shortCoins, setShortCoins] = useState<Coin[]>([
    getInitialCoin('ETH')
  ])

  // State to store tradeId from URL
  const [currentTradeId, setCurrentTradeId] = useState<string | null>(null)
  
  // State for basket data from LLM
  const [longBasket, setLongBasket] = useState<any[]>([])
  const [shortBasket, setShortBasket] = useState<any[]>([])
  const [tradeConfidence, setTradeConfidence] = useState<number | null>(null)
  const [_basketCategory, setBasketCategory] = useState<string | null>(null)

  // Read trade parameters directly from URL (more reliable than API calls due to caching)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    
    // Extract all parameters
    const tradeId = params.get('tradeId')
    const tp = params.get('tp')
    const sl = params.get('sl')
    const lev = params.get('leverage')
    const conf = params.get('confidence')
    const category = params.get('category')
    const longBasketStr = params.get('longBasket')
    const shortBasketStr = params.get('shortBasket')
    
    console.log('[TradeConfirm] 📋 URL params:', {
      tradeId,
      tp,
      sl,
      leverage: lev,
      confidence: conf,
      category,
      longBasket: longBasketStr?.substring(0, 50),
      shortBasket: shortBasketStr?.substring(0, 50)
    })
    
    if (!tradeId) {
      console.log('[TradeConfirm] ⚠️ No tradeId in URL')
      return
    }

    setCurrentTradeId(tradeId)
    
    // Apply TP/SL from URL
    if (tp) {
      const tpValue = parseFloat(tp)
      console.log('[TradeConfirm] 🎯 Setting TP from URL:', tpValue, '%')
      setTakeProfit(tpValue)
    }
    
    if (sl) {
      const slValue = parseFloat(sl)
      console.log('[TradeConfirm] 🛡 Setting SL from URL:', slValue, '%')
      setStopLoss(slValue)
    }
    
    // Apply leverage from URL
    if (lev) {
      const levValue = parseInt(lev)
      console.log('[TradeConfirm] ⚡ Setting leverage from URL:', levValue, 'x')
      setLeverage(levValue)
    }
    
    // Apply confidence from URL
    if (conf) {
      const confValue = parseFloat(conf)
      console.log('[TradeConfirm] 📊 Setting confidence from URL:', confValue)
      setTradeConfidence(confValue)
    }
    
    // Apply category from URL
    if (category) {
      console.log('[TradeConfirm] 🚀 Setting category from URL:', category)
      setBasketCategory(category)
    }
    
    // Parse and apply baskets from URL
    try {
      if (longBasketStr) {
        // URL decode and parse
        const decoded = decodeURIComponent(longBasketStr)
        const longBasketData = eval(decoded) // Safe since it's our own data
        console.log('[TradeConfirm] 📗 Setting long basket from URL:', longBasketData)
        setLongBasket(longBasketData)
        
        // Set long coins for display
        if (longBasketData.length > 0) {
          const coins = longBasketData.map((a: any) => getInitialCoin(a.coin))
          setLongCoins(coins)
        }
      }
      
      if (shortBasketStr) {
        const decoded = decodeURIComponent(shortBasketStr)
        const shortBasketData = eval(decoded)
        console.log('[TradeConfirm] 📕 Setting short basket from URL:', shortBasketData)
        setShortBasket(shortBasketData)
        
        // Set short coins for display
        if (shortBasketData.length > 0) {
          const coins = shortBasketData.map((a: any) => getInitialCoin(a.coin))
          setShortCoins(coins)
        }
      }
    } catch (err) {
      console.error('[TradeConfirm] ❌ Error parsing baskets from URL:', err)
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount

  // Load saved settings on mount
  useEffect(() => {
    const { userId } = getTelegramUserInfo()
    if (!userId) return

    const loadSettings = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/settings/notification/${userId}`, {
          headers: { 'bypass-tunnel-reminder': 'true' }
        })
        if (res.ok) {
          const data = await res.json()
          setFrequency(data.frequency || 'never')
          setNotificationTime(data.time || '09:00')
        }
      } catch (err) {
        // Fallback to local storage
        const saved = localStorage.getItem('notificationSettings')
        if (saved) {
          const { frequency: freq, time } = JSON.parse(saved)
          setFrequency(freq || 'never')
          setNotificationTime(time || '09:00')
        }
      }
    }
    loadSettings()
  }, [backendUrl])

  const handleSaveSettings = async (freq: FrequencyOption, time: string) => {
    setSavingSettings(true)
    setSettingsMessage('')

    const { userId, chatId } = getTelegramUserInfo()
    console.log('[Settings] User info:', { userId, chatId })
    
    if (!userId) {
      // For development/testing, save to localStorage only
      localStorage.setItem('notificationSettings', JSON.stringify({ frequency: freq, time }))
      setFrequency(freq)
      setNotificationTime(time)
      setSettingsMessage('✅ Settings saved locally!')
      setTimeout(() => {
        setIsSettingsOpen(false)
        setSettingsMessage('')
      }, 1500)
      setSavingSettings(false)
      return
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    try {
      console.log('[Settings] Saving to:', `${backendUrl}/api/settings/notification`)
      const res = await fetch(`${backendUrl}/api/settings/notification`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true'
        },
        body: JSON.stringify({
          userId,
          chatId: chatId || userId,
          frequency: freq,
          time,
          timezone,
        }),
      })

      console.log('[Settings] Response status:', res.status)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('[Settings] Error response:', errorText)
        throw new Error('Failed to save')
      }

      setFrequency(freq)
      setNotificationTime(time)
      localStorage.setItem('notificationSettings', JSON.stringify({ frequency: freq, time }))
      setSettingsMessage('✅ Settings saved successfully!')
      setTimeout(() => {
        setIsSettingsOpen(false)
        setSettingsMessage('')
      }, 1500)
    } catch (err) {
      console.error('[Settings] Save error:', err)
      // Fallback: save locally
      localStorage.setItem('notificationSettings', JSON.stringify({ frequency: freq, time }))
      setFrequency(freq)
      setNotificationTime(time)
      setSettingsMessage('✅ Settings saved locally!')
      setTimeout(() => {
        setIsSettingsOpen(false)
        setSettingsMessage('')
      }, 1500)
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSwap = () => {
    console.log('[TradeConfirm] 🔄 Swapping long/short positions')
    const tempLong = [...longCoins]
    setLongCoins([...shortCoins])
    setShortCoins(tempLong)
  }

  // Handler for proportion change
  const handleProportionChange = (newLongPct: number) => {
    setLongPct(newLongPct)
  }

  // Handler for risk change
  const handleRiskChange = (newStopLoss: number, newTakeProfit: number) => {
    setStopLoss(newStopLoss)
    setTakeProfit(newTakeProfit)
  }

  // Handler for leverage change
  const handleLeverageChange = (newLeverage: number) => {
    setLeverage(newLeverage)
  }

  const shortPct = 100 - longPct

  // Signal data - use LLM confidence if available, otherwise mock
  const signalData = {
    correlation: 0.8340,
    zScore: 1.61,
    confidence: tradeConfidence != null ? Math.round(tradeConfidence * 10) : 78,
    signal: 'buy' as const,
  }

  // Calculate risk/reward based on current parameters
  // betAmount is total position size (split between long and short)
  const notionalPerSide = betAmount / 2 // Split between long and short
  const potentialLoss = (betAmount * (stopLoss / 100) * leverage)
  const potentialProfit = (betAmount * (takeProfit / 100) * leverage)
  const riskRewardRatio = takeProfit / stopLoss

  const riskRewardData = {
    potentialProfit,
    potentialLoss,
    riskRewardRatio,
    leverage,
  }

  // Settings button component for TopBar rightContent
  const settingsButton = (
    <button
      onClick={() => {
        hapticFeedback('impact', 'light')
        setIsSettingsOpen(true)
      }}
      className="w-11 h-11 rounded-xl bg-bg-secondary border border-border flex items-center justify-center btn-press hover:bg-bg-tertiary transition-colors"
    >
      <Settings className="w-5 h-5 text-accent-primary" />
    </button>
  )

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Top bar with navigation and settings */}
      <TopBar rightContent={settingsButton} />
      
      {/* Live Market Ticker */}
      <MarketTicker />
      
      {/* Main content */}
      <div className="flex-1 px-4 pb-4 space-y-4 overflow-y-auto relative z-10">
        {/* Trade Signal Card */}
        <div className="mt-4">
          <TradeSignal {...signalData} />
        </div>

        {/* Wallet Connection Card */}
        <WalletConnectionCard />
        
        {/* Pair Display */}
        <PairCard 
          longCoins={longCoins}
          shortCoins={shortCoins}
          onLongCoinsChange={setLongCoins}
          onShortCoinsChange={setShortCoins}
          onSwap={handleSwap}
          marketType="Crypto"
        />

        {/* Trade Parameters */}
        <ParamsCard 
          proportion={{ longPct, shortPct }}
          risk={{ stopLossPct: stopLoss, takeProfitPct: takeProfit }}
          leverage={leverage}
          betAmount={betAmount}
          onProportionChange={handleProportionChange}
          onRiskChange={handleRiskChange}
          onLeverageChange={handleLeverageChange}
          onBetAmountChange={setBetAmount}
        />

        {/* Risk/Reward Card */}
        <RiskRewardCard {...riskRewardData} stopLoss={stopLoss} takeProfit={takeProfit} />
        
        {/* Spacer for sticky button */}
        <div className="h-28" />
      </div>
      
      {/* Sticky Confirm Button */}
      <StickyConfirm 
        disabled={false}
        tradeId={currentTradeId || undefined}
        tradeData={currentTradeId ? {
          pair: {
            long: { 
              symbol: `${longCoins[0]?.ticker || 'BTC'}-PERP`, 
              notional: notionalPerSide,  // Half of bet amount
              leverage 
            },
            short: { 
              symbol: `${shortCoins[0]?.ticker || 'ETH'}-PERP`, 
              notional: notionalPerSide,  // Half of bet amount
              leverage 
            },
          },
          takeProfitRatio: takeProfit / 100,
          stopLossRatio: -stopLoss / 100,
          longBasket: longBasket.length > 0 
            ? longBasket.map(a => ({ coin: a.coin, weight: a.weight }))
            : [{ coin: longCoins[0]?.ticker || 'BTC', weight: 1.0 }],
          shortBasket: shortBasket.length > 0
            ? shortBasket.map(a => ({ coin: a.coin, weight: a.weight }))
            : [{ coin: shortCoins[0]?.ticker || 'ETH', weight: 1.0 }],
        } : undefined}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false)
          setSettingsMessage('')
        }}
        currentFrequency={frequency}
        currentTime={notificationTime}
        onSave={handleSaveSettings}
        saveMessage={settingsMessage}
        isSaving={savingSettings}
      />
    </div>
  )
}
