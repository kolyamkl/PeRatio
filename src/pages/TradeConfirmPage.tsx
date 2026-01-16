import { useState } from 'react'
import { Wallet, Sparkles } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { BalanceCard } from '../components/BalanceCard'
import { PairCard } from '../components/PairCard'
import { ParamsCard } from '../components/ParamsCard'
import { StickyConfirm } from '../components/StickyConfirm'
import { WalletModal } from '../components/WalletModal'
import { WalletIcon } from '../components/WalletIcons'
import { MarketTicker } from '../components/MarketTicker'
import { TradeSignal } from '../components/TradeSignal'
import { RiskRewardCard } from '../components/RiskRewardCard'
import { presetTrade, type Coin, availableCoins } from '../lib/mockData'
import { hapticFeedback } from '../lib/telegram'
import { useWallet } from '../lib/wallet'

export function TradeConfirmPage() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const { isConnected, walletType, displayAddress, disconnect, balance, currency } = useWallet()

  // Trade parameters state
  const [stopLoss, setStopLoss] = useState(presetTrade.risk.stopLossPct)
  const [takeProfit, setTakeProfit] = useState(presetTrade.risk.takeProfitPct)
  const [leverage, setLeverage] = useState(presetTrade.leverage)
  const [longPct, setLongPct] = useState(50)

  // Get initial coins with prices
  const getInitialCoin = (ticker: string): Coin => {
    const found = availableCoins.find(c => c.ticker === ticker)
    return found || { name: ticker, ticker }
  }

  const [longCoins, setLongCoins] = useState<Coin[]>([
    getInitialCoin(presetTrade.longCoin.ticker)
  ])
  
  const [shortCoins, setShortCoins] = useState<Coin[]>([
    getInitialCoin(presetTrade.shortCoin.ticker)
  ])

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

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Top bar with navigation */}
      <TopBar />
      
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
    </div>
  )
}
