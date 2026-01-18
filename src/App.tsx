import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { TradeConfirmPage } from './pages/TradeConfirmPage'
import { TradesPage } from './pages/TradesPage'
import { Toast, ToastProvider } from './components/ui/Toast'
import { SplashScreen } from './components/layout/SplashScreen'
import { CryptoBackground } from './components/layout/CryptoBackground'
import { WalletProvider } from './lib/wallet'
import { getThemeParams } from './lib/telegram'

function AppContent() {
  const location = useLocation()
  
  return (
    <div className="page-enter" key={location.pathname}>
      <Routes>
        <Route path="/" element={<AppShell><TradeConfirmPage /></AppShell>} />
        <Route path="/trades" element={<AppShell><TradesPage /></AppShell>} />
      </Routes>
    </div>
  )
}

function App() {
  const [themeClass, setThemeClass] = useState('')
  const [showSplash, setShowSplash] = useState(true)
  const [appReady, setAppReady] = useState(false)
  
  useEffect(() => {
    const theme = getThemeParams()
    // Use Telegram's theme if available, otherwise default to dark
    if (theme.isLight) {
      setThemeClass('theme-light')
      document.documentElement.classList.add('theme-light')
    } else {
      document.documentElement.classList.remove('theme-light')
    }
  }, [])

  const handleSplashComplete = () => {
    setShowSplash(false)
    // Small delay before showing content for smooth transition
    setTimeout(() => setAppReady(true), 100)
  }

  return (
    <div className={themeClass}>
      {/* Global crypto-themed background */}
      {appReady && <CryptoBackground />}
      
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      
      <div className={`transition-opacity duration-500 ${appReady ? 'opacity-100' : 'opacity-0'}`}>
        <WalletProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
            <Toast />
          </ToastProvider>
        </WalletProvider>
      </div>
    </div>
  )
}

export default App
