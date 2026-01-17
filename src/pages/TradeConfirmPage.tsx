import { useEffect, useState } from 'react'
import { Wallet, Settings, CheckCircle, ExternalLink } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { PairCard } from '../components/PairCard'
import { ParamsCard } from '../components/ParamsCard'
import { StickyConfirm } from '../components/StickyConfirm'
import { SettingsModal } from '../components/SettingsModal'
import { MarketTicker } from '../components/MarketTicker'
import { TradeSignal } from '../components/TradeSignal'
import { RiskRewardCard } from '../components/RiskRewardCard'
import { presetTrade, type Coin, availableCoins } from '../lib/mockData'
import { hapticFeedback, getTelegramUserInfo } from '../lib/telegram'

type FrequencyOption = 'never' | '1m' | '5m' | '15m' | '1h' | '2h' | '4h' | 'daily'

export function TradeConfirmPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  // Backend trading wallet state (no user wallet needed)
  const [backendWallet, setBackendWallet] = useState<{
    walletAddress: string
    displayAddress: string
    hasCredentials: boolean
    status: string
    network: string
  } | null>(null)
  const [walletLoading, setWalletLoading] = useState(true)
  
  // Backend URL - uses env var in production (ngrok), empty for dev (Vite proxy)
  const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
  
  // Log backend URL on mount for debugging
  useEffect(() => {
    console.log('[TradeConfirm] 🚀 Component mounted')
    console.log('[TradeConfirm] Backend URL:', backendUrl || '(using proxy)')
    console.log('[TradeConfirm] Mode:', import.meta.env.MODE)
  }, [backendUrl])

  // Fetch backend trading wallet info
  useEffect(() => {
    const fetchWalletInfo = async () => {
      console.log('[TradeConfirm] 💰 Fetching backend wallet info...')
      setWalletLoading(true)
      try {
        const res = await fetch(`${backendUrl}/api/wallet/info`)
        console.log('[TradeConfirm] Wallet API response status:', res.status)
        
        if (res.ok) {
          const data = await res.json()
          console.log('[TradeConfirm] ✅ Backend wallet info:', data)
          setBackendWallet(data)
        } else {
          console.error('[TradeConfirm] ❌ Failed to fetch wallet info:', res.status)
          setBackendWallet(null)
        }
      } catch (err) {
        console.error('[TradeConfirm] ❌ Error fetching wallet info:', err)
        setBackendWallet(null)
      } finally {
        setWalletLoading(false)
      }
    }
    
    fetchWalletInfo()
  }, [backendUrl])

  // Settings state
  const [frequency, setFrequency] = useState<FrequencyOption>('never')
  const [notificationTime, setNotificationTime] = useState('09:00')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  // Trade parameters state
  const [stopLoss, setStopLoss] = useState(presetTrade.risk.stopLossPct)
  const [takeProfit, setTakeProfit] = useState(presetTrade.risk.takeProfitPct)
  const [leverage, setLeverage] = useState(presetTrade.leverage)
  const [longPct, setLongPct] = useState(50)

  // Get initial coins with prices - handles both "BTC" and "BTC-PERP" formats
  const getInitialCoin = (symbol: string): Coin => {
    // Strip -PERP suffix if present (backend uses BTC-PERP, frontend uses BTC)
    const ticker = symbol.replace(/-PERP$/i, '')
    const found = availableCoins.find(c => c.ticker.toUpperCase() === ticker.toUpperCase())
    return found || { name: ticker, ticker }
  }

  const [longCoins, setLongCoins] = useState<Coin[]>([
    getInitialCoin(presetTrade.longCoin.ticker)
  ])
  
  const [shortCoins, setShortCoins] = useState<Coin[]>([
    getInitialCoin(presetTrade.shortCoin.ticker)
  ])

  // State to store tradeId from URL
  const [currentTradeId, setCurrentTradeId] = useState<string | null>(null)
  
  // State for basket data from LLM
  const [longBasket, setLongBasket] = useState<any[]>([])
  const [shortBasket, setShortBasket] = useState<any[]>([])
  const [tradeConfidence, setTradeConfidence] = useState<number | null>(null)
  const [basketCategory, setBasketCategory] = useState<string | null>(null)

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
        const res = await fetch(`${backendUrl}/api/settings/notification/${userId}`)
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
        headers: { 'Content-Type': 'application/json' },
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
  const notionalAmount = 1000 // Base notional for calculation
  const potentialLoss = (notionalAmount * (stopLoss / 100) * leverage)
  const potentialProfit = (notionalAmount * (takeProfit / 100) * leverage)
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

        {/* Backend Trading Wallet Card */}
        {walletLoading ? (
          <div className="card w-full p-5 animate-fade-up">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-bg-tertiary animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-bg-tertiary rounded animate-pulse w-32" />
                <div className="h-4 bg-bg-tertiary rounded animate-pulse w-48" />
              </div>
            </div>
          </div>
        ) : backendWallet?.hasCredentials ? (
          <div className="card w-full p-5 animate-fade-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center relative">
                  <Wallet className="w-7 h-7 text-green-500" />
                  <CheckCircle className="absolute -bottom-1 -right-1 w-5 h-5 text-green-500 bg-bg-secondary rounded-full" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-text-primary">Trading Wallet</h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-500 rounded-full">Connected</span>
                  </div>
                  <p className="text-sm text-text-muted font-mono">{backendWallet.displayAddress}</p>
                  <p className="text-xs text-text-muted mt-1">{backendWallet.network}</p>
                </div>
              </div>
              <a 
                href={`https://hyperliquid.xyz/address/${backendWallet.walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-secondary transition-colors"
              >
                <ExternalLink className="w-5 h-5 text-text-muted" />
              </a>
            </div>
          </div>
        ) : (
          <div className="card w-full p-5 animate-fade-up border-orange-500/30">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-orange-500" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-text-primary">Wallet Not Configured</h3>
                <p className="text-sm text-text-muted">Backend wallet credentials missing. Contact admin.</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Pair Display */}
        <PairCard 
          longCoins={longCoins}
          shortCoins={shortCoins}
          onLongCoinsChange={setLongCoins}
          onShortCoinsChange={setShortCoins}
          onSwap={handleSwap}
          marketType={presetTrade.marketType}
        />

        {/* Basket Composition - Show if LLM generated basket */}
        {(longBasket.length > 0 || shortBasket.length > 0) && (
          <div className="card p-4 space-y-3 animate-fade-up" style={{ animationDelay: '150ms' }}>
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
              🧺 Basket Composition
            </div>
            
            {longBasket.length > 0 && (
              <div>
                <div className="text-sm font-medium text-accent-success mb-2">📗 Long Basket</div>
                <div className="flex flex-wrap gap-2">
                  {longBasket.map((asset, idx) => (
                    <div key={idx} className="px-3 py-1.5 bg-accent-success/10 border border-accent-success/20 rounded-lg text-xs">
                      <span className="font-medium">{asset.coin}</span>
                      <span className="text-text-muted ml-1">({(asset.weight * 100).toFixed(0)}%)</span>
                      <span className="text-text-muted ml-2">${asset.notional?.toFixed(0) || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {shortBasket.length > 0 && (
              <div>
                <div className="text-sm font-medium text-accent-danger mb-2">📕 Short Basket</div>
                <div className="flex flex-wrap gap-2">
                  {shortBasket.map((asset, idx) => (
                    <div key={idx} className="px-3 py-1.5 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-xs">
                      <span className="font-medium">{asset.coin}</span>
                      <span className="text-text-muted ml-1">({(asset.weight * 100).toFixed(0)}%)</span>
                      <span className="text-text-muted ml-2">${asset.notional?.toFixed(0) || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {basketCategory && (
              <div className="pt-2 border-t border-border">
                <span className="px-3 py-1.5 bg-accent-primary/10 text-accent-primary rounded-lg text-xs font-medium">
                  🚀 Strategy: {basketCategory.replace(/_/g, ' ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Trade Parameters */}
        <ParamsCard 
          proportion={{ longPct, shortPct }}
          risk={{ stopLossPct: stopLoss, takeProfitPct: takeProfit }}
          leverage={leverage}
          onProportionChange={handleProportionChange}
          onRiskChange={handleRiskChange}
          onLeverageChange={handleLeverageChange}
        />

        {/* Risk/Reward Card */}
        <RiskRewardCard {...riskRewardData} stopLoss={stopLoss} takeProfit={takeProfit} />
        
        {/* Spacer for sticky button */}
        <div className="h-28" />
      </div>
      
      {/* Sticky Confirm Button - enabled when backend wallet is configured */}
      <StickyConfirm 
        disabled={!backendWallet?.hasCredentials}
        tradeId={currentTradeId || undefined}
        tradeData={currentTradeId ? {
          pair: {
            long: { 
              symbol: `${longCoins[0]?.ticker || 'BTC'}-PERP`, 
              notional: 200 * (longPct / 100), 
              leverage 
            },
            short: { 
              symbol: `${shortCoins[0]?.ticker || 'ETH'}-PERP`, 
              notional: 200 * (shortPct / 100), 
              leverage 
            },
          },
          takeProfitRatio: takeProfit / 100,
          stopLossRatio: -stopLoss / 100,
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
