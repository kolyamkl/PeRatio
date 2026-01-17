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
      debug={false}
      sdkOptions={{
        dappMetadata: {
          name: 'TG Trade',
          url: window.location.origin,
        },
        // Enable QR code modal for Telegram and mobile
        modals: {
          install: ({ link }) => {
            window.open(link, '_blank')
            return {
              mount: () => {},
              unmount: () => {},
            }
          },
        },
        enableAnalytics: false,
        checkInstallationImmediately: false,
        preferDesktop: false,
      }}
    >
      <App />
    </MetaMaskProvider>
  </React.StrictMode>,
)
