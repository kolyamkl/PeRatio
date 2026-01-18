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
  
  // Wallet address for this demo
  const WALLET_ADDRESS = '0x76F9398Ee268b9fdc06C0dff402B20532922fFAE'
  
  // Backend trading wallet state
  const [backendWallet, setBackendWallet] = useState<{
    walletAddress: string
    displayAddress: string
    hasCredentials: boolean
    status: string
    network: string
    balance: number
    balanceLoading: boolean
  } | null>({
    walletAddress: WALLET_ADDRESS,
    displayAddress: `${WALLET_ADDRESS.slice(0, 6)}...${WALLET_ADDRESS.slice(-4)}`,
    hasCredentials: true,
    status: 'connected',
    network: 'Arbitrum Mainnet',
    balance: 0,
    balanceLoading: true
  })
  const [walletLoading, _setWalletLoading] = useState(false)
  
  // Backend URL - uses env var in production (ngrok), empty for dev (Vite proxy)
  const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
  
  // Fetch real wallet balance from Arbitrum
  useEffect(() => {
    const fetchWalletBalance = async () => {
      console.log('[TradeConfirm] 💰 Fetching real wallet balance for:', WALLET_ADDRESS)
      
      try {
        // Use Arbitrum public RPC to get ETH balance
        const ethBalanceResponse = await fetch('https://arb1.arbitrum.io/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [WALLET_ADDRESS, 'latest'],
            id: 1
          })
        })
        
        const ethData = await ethBalanceResponse.json()
        const ethBalanceWei = BigInt(ethData.result || '0')
        const ethBalance = Number(ethBalanceWei) / 1e18
        
        // Fetch USDC balance (Arbitrum USDC contract: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831)
        const usdcContract = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
        // balanceOf(address) function selector: 0x70a08231
        const usdcCallData = '0x70a08231000000000000000000000000' + WALLET_ADDRESS.slice(2).toLowerCase()
        
        const usdcBalanceResponse = await fetch('https://arb1.arbitrum.io/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: usdcContract,
              data: usdcCallData
            }, 'latest'],
            id: 2
          })
        })
        
        const usdcData = await usdcBalanceResponse.json()
        const usdcBalanceRaw = BigInt(usdcData.result || '0')
        const usdcBalance = Number(usdcBalanceRaw) / 1e6 // USDC has 6 decimals
        
        console.log('[TradeConfirm] ✅ ETH Balance:', ethBalance.toFixed(6), 'ETH')
        console.log('[TradeConfirm] ✅ USDC Balance:', usdcBalance.toFixed(2), 'USDC')
        
        // Update wallet state with real balance
        setBackendWallet(prev => prev ? {
          ...prev,
          balance: usdcBalance,
          balanceLoading: false
        } : null)
        
      } catch (err) {
        console.error('[TradeConfirm] ❌ Error fetching balance:', err)
        setBackendWallet(prev => prev ? {
          ...prev,
          balance: 0,
          balanceLoading: false
        } : null)
      }
    }
    
    fetchWalletBalance()
    
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchWalletBalance, 30000)
    return () => clearInterval(interval)
  }, [])
  
  // Log on mount for debugging
  useEffect(() => {
    console.log('[TradeConfirm] 🚀 Component mounted')
    console.log('[TradeConfirm] Backend URL:', backendUrl || '(using proxy)')
    console.log('[TradeConfirm] Mode:', import.meta.env.MODE)
    console.log('[TradeConfirm] 🔗 Wallet connected:', WALLET_ADDRESS)
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
  const [betAmount, setBetAmount] = useState(20) // Default $20 total ($10 per side) - matches backend cap

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
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-text-muted">{backendWallet.network}</p>
                    <span className="text-xs text-text-muted">•</span>
                    {backendWallet.balanceLoading ? (
                      <p className="text-xs text-text-muted animate-pulse">Loading balance...</p>
                    ) : (
                      <p className="text-xs font-semibold text-green-400">
                        {backendWallet.balance > 0 
                          ? `$${backendWallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
                          : '0 USDC'
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <a 
                href={`https://arbiscan.io/address/${backendWallet.walletAddress}`}
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
      
      {/* Sticky Confirm Button - enabled when backend wallet is configured */}
      <StickyConfirm 
        disabled={!backendWallet?.hasCredentials}
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
