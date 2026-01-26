/**
 * Web3 Provider Wrapper
 * =====================
 * Wraps the app with Web3Modal and Wagmi providers
 * This must be at the root of your app
 */

import { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { wagmiConfig, WALLETCONNECT_PROJECT_ID, WEB3_MODAL_THEME } from './walletConnectConfig'

// Create React Query client
const queryClient = new QueryClient()

// Create Web3Modal instance
createWeb3Modal({
  wagmiConfig,
  projectId: WALLETCONNECT_PROJECT_ID,
  enableAnalytics: false, // Optional: enable analytics
  enableOnramp: false, // Optional: enable on-ramp
  themeMode: WEB3_MODAL_THEME.themeMode,
  themeVariables: WEB3_MODAL_THEME.themeVariables,
})

interface Web3ProviderProps {
  children: ReactNode
}

/**
 * Web3Provider Component
 * 
 * Usage in your App.tsx:
 * 
 * import { Web3Provider } from './lib/Web3Provider'
 * import { WalletConnectProvider } from './lib/walletConnectProvider'
 * 
 * function App() {
 *   return (
 *     <Web3Provider>
 *       <WalletConnectProvider>
 *         <YourApp />
 *       </WalletConnectProvider>
 *     </Web3Provider>
 *   )
 * }
 */
export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
