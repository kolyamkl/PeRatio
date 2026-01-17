import { createContext, useContext, ReactNode } from 'react'

// ============================================================================
// WALLET STUB - Backend handles all wallet operations
// ============================================================================
// 
// This is a minimal stub. The backend uses PEAR_PRIVATE_KEY + PEAR_USER_WALLET
// to execute trades via Pear Protocol. No frontend wallet connection needed.
//
// The WalletProvider is kept for backward compatibility but does nothing.
// ============================================================================

export type WalletType = 'metamask' | 'walletconnect' | 'coinbase' | 'phantom' | 'tonconnect'

export interface WalletState {
  isConnected: boolean
  isConnecting: boolean
  address: string | null
  walletType: WalletType | null
  balance: number
  currency: string
  displayAddress: string | null
  chainId: number | null
  error: string | null
}

interface WalletContextType extends WalletState {
  connect: (walletType: WalletType) => Promise<boolean>
  disconnect: () => Promise<void>
  refreshBalance: () => Promise<void>
}

const defaultState: WalletState = {
  isConnected: false,
  isConnecting: false,
  address: null,
  walletType: null,
  balance: 0,
  currency: 'ETH',
  displayAddress: null,
  chainId: null,
  error: null,
}

const WalletContext = createContext<WalletContextType | null>(null)

interface WalletProviderProps {
  children: ReactNode
}

/**
 * WalletProvider - Minimal stub provider
 * 
 * The actual trading wallet is configured on the backend via:
 * - PEAR_PRIVATE_KEY
 * - PEAR_USER_WALLET
 * 
 * This stub exists for backward compatibility only.
 */
export function WalletProvider({ children }: WalletProviderProps) {
  console.log('[Wallet] 📝 WalletProvider loaded (stub - backend handles wallet)')
  
  const contextValue: WalletContextType = {
    ...defaultState,
    connect: async () => {
      console.log('[Wallet] ⚠️ connect() called - backend wallet is used, no frontend connection needed')
      return false
    },
    disconnect: async () => {
      console.log('[Wallet] ⚠️ disconnect() called - backend wallet is used')
    },
    refreshBalance: async () => {
      console.log('[Wallet] ⚠️ refreshBalance() called - backend wallet is used')
    },
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

/**
 * useWallet hook - Returns stub wallet state
 */
export function useWallet(): WalletContextType {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
