import { useEffect, useState } from 'react'
import { Wallet, Sparkles, Settings } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { BalanceCard } from '../components/BalanceCard'
import { PairCard } from '../components/PairCard'
import { ParamsCard } from '../components/ParamsCard'
import { StickyConfirm } from '../components/StickyConfirm'
import { WalletModal } from '../components/WalletModal'
import { SettingsModal } from '../components/SettingsModal'
import { WalletIcon } from '../components/WalletIcons'
import { MarketTicker } from '../components/MarketTicker'
import { TradeSignal } from '../components/TradeSignal'
import { RiskRewardCard } from '../components/RiskRewardCard'
import { presetTrade, type Coin, availableCoins } from '../lib/mockData'
import { hapticFeedback, getTelegramUserInfo } from '../lib/telegram'
import { useWallet } from '../lib/wallet'

type FrequencyOption = 'never' | '1m' | '5m' | '15m' | '1h' | '2h' | '4h' | 'daily'

export function TradeConfirmPage() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { isConnected, walletType, displayAddress, disconnect, balance, currency } = useWallet()
  
  // Backend URL - empty string uses relative URLs (proxied by Vite in dev, same-origin in prod)
  const backendUrl = ''

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

  // Prefill from backend tradeId if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tradeId = params.get('tradeId')
    if (!tradeId) {
      console.log('[TradeConfirm] No tradeId in URL params')
      return
    }

    console.log('[TradeConfirm] Fetching trade:', tradeId, 'from:', backendUrl)

    let cancelled = false
    const fetchTrade = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/trades/${tradeId}`)
        console.log('[TradeConfirm] Fetch response status:', res.status)
        
        if (!res.ok) {
          console.error('[TradeConfirm] Failed to fetch trade, status:', res.status)
          return
        }
        
        const trade = await res.json()
        console.log('[TradeConfirm] Received trade data:', trade)
        
        if (cancelled) return

        const longLeg = trade?.pair?.long
        const shortLeg = trade?.pair?.short
        
        console.log('[TradeConfirm] Long leg:', longLeg)
        console.log('[TradeConfirm] Short leg:', shortLeg)
        
        // Set long/short coins from bot data
        if (longLeg?.symbol) {
          const longCoin = getInitialCoin(longLeg.symbol)
          console.log('[TradeConfirm] Setting long coin:', longCoin)
          setLongCoins([longCoin])
        }
        if (shortLeg?.symbol) {
          const shortCoin = getInitialCoin(shortLeg.symbol)
          console.log('[TradeConfirm] Setting short coin:', shortCoin)
          setShortCoins([shortCoin])
        }
        
        // Set leverage - use average of both legs if different, otherwise use long leg
        if (longLeg?.leverage != null && shortLeg?.leverage != null) {
          const avgLeverage = Math.round((Number(longLeg.leverage) + Number(shortLeg.leverage)) / 2)
          console.log('[TradeConfirm] Setting leverage:', avgLeverage)
          setLeverage(avgLeverage)
        } else if (longLeg?.leverage != null) {
          console.log('[TradeConfirm] Setting leverage (long only):', longLeg.leverage)
          setLeverage(Number(longLeg.leverage))
        }
        
        // Set take profit and stop loss from bot data
        if (trade?.takeProfitRatio != null) {
          const tp = Math.abs(Number(trade.takeProfitRatio) * 100)
          console.log('[TradeConfirm] Setting take profit:', tp)
          setTakeProfit(tp)
        }
        if (trade?.stopLossRatio != null) {
          const sl = Math.abs(Number(trade.stopLossRatio) * 100)
          console.log('[TradeConfirm] Setting stop loss:', sl)
          setStopLoss(sl)
        }
        
        // Calculate and set allocation percentage from notional amounts
        if (longLeg?.notional != null && shortLeg?.notional != null) {
          const longNotional = Number(longLeg.notional)
          const shortNotional = Number(shortLeg.notional)
          const totalNotional = longNotional + shortNotional
          if (totalNotional > 0) {
            const calculatedLongPct = Math.round((longNotional / totalNotional) * 100)
            console.log('[TradeConfirm] Setting allocation:', calculatedLongPct, '% long')
            setLongPct(calculatedLongPct)
          }
        }
      } catch (err) {
        console.error('[TradeConfirm] Failed to load trade:', err)
      }
    }
    fetchTrade()
    return () => {
      cancelled = true
    }
  }, [backendUrl])

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
    const tempLong = [...longCoins]
    setLongCoins([...shortCoins])
    setShortCoins(tempLong)
  }

  const handleConnectWallet = () => {
    hapticFeedback('selection')
    setIsWalletModalOpen(true)
  }

  const handleDisconnect = () => {
    disconnect()
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

  // Mock signal data
  const signalData = {
    correlation: 0.8340,
    zScore: 1.61,
    confidence: 78,
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

        {/* Connect Wallet Button or Balance Card */}
        {!isConnected ? (
          <button
            onClick={handleConnectWallet}
            className="card w-full p-5 animate-fade-up group relative overflow-hidden"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 flex items-center justify-center group-hover:bg-accent-primary/20 transition-colors relative">
                  <Wallet className="w-7 h-7 text-accent-primary" />
                  <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-accent-primary animate-pulse" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-text-primary">Connect Wallet</h3>
                  <p className="text-sm text-text-muted">Link your wallet to start trading</p>
                </div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-accent-primary text-black font-semibold text-sm group-hover:bg-accent-primary/90 transition-colors shadow-lg shadow-accent-primary/20">
                Connect
              </div>
            </div>
            
            {/* Supported wallets preview */}
            <div className="mt-4 pt-4 border-t border-border relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Supported wallets</span>
                <div className="flex items-center">
                  {['phantom', 'metamask', 'walletconnect', 'coinbase', 'trust'].map((walletId, i) => (
                    <div 
                      key={walletId}
                      className="w-8 h-8 rounded-lg overflow-hidden -ml-2 first:ml-0 border-2 border-bg-secondary hover:scale-110 transition-transform hover:z-10"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <WalletIcon walletId={walletId} className="w-8 h-8" />
                    </div>
                  ))}
                  <span className="text-xs text-text-muted ml-2">+3 more</span>
                </div>
              </div>
            </div>
          </button>
        ) : (
          <BalanceCard 
            balance={balance}
            currency={currency}
            connectedWallet={walletType || ''}
            walletAddress={displayAddress || undefined}
            onDisconnect={handleDisconnect}
          />
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
          onProportionChange={handleProportionChange}
          onRiskChange={handleRiskChange}
          onLeverageChange={handleLeverageChange}
        />

        {/* Risk/Reward Card */}
        <RiskRewardCard {...riskRewardData} stopLoss={stopLoss} takeProfit={takeProfit} />
        
        {/* Spacer for sticky button */}
        <div className="h-28" />
      </div>
      
      {/* Sticky Confirm Button */}
      <StickyConfirm disabled={!isConnected} />

      {/* Wallet Modal */}
      <WalletModal 
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
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
