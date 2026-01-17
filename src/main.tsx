import React from 'react'
import ReactDOM from 'react-dom/client'
import { MetaMaskProvider } from '@metamask/sdk-react'
import App from './App'
import './index.css'
import { initTelegram } from './lib/telegram'

// Initialize Telegram WebApp
initTelegram()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MetaMaskProvider
      debug={true}
      sdkOptions={{
        dappMetadata: {
          name: 'TG Trade',
          url: window.location.origin,
        },
        enableAnalytics: false,
        checkInstallationImmediately: false,
        preferDesktop: false,
        useDeeplink: true,
        // Force QR modal for mobile environments
        openDeeplink: (link: string) => {
          console.log('MetaMask deeplink:', link)
          window.open(link, '_blank')
        },
      }}
    >
      <App />
    </MetaMaskProvider>
  </React.StrictMode>,
)
