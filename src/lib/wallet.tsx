import { createContext, useContext, ReactNode, useEffect, useState } from 'react'

export type WalletType = 'metamask' | 'walletconnect' | 'coinbase' | 'phantom'

// Wallet address for this session
const WALLET_ADDRESS = '0x76F9398Ee268b9fdc06C0dff402B20532922fFAE'

export interface WalletState {
  isConnected: boolean
  isConnecting: boolean
  address: string | null
  walletType: WalletType | null
  balance: number
  balanceLoading: boolean
  currency: string
  displayAddress: string | null
  chainId: number | null
  error: string | null
}

interface WalletContextType extends WalletState {
  connect: (walletType: WalletType) => Promise<boolean>
  disconnect: () => Promise<void>
  refreshBalance: () => Promise<void>
  openModal: () => void
}

const defaultState: WalletState = {
  isConnected: false,
  isConnecting: false,
  address: null,
  walletType: null,
  balance: 0,
  balanceLoading: true,
  currency: 'USDC',
  displayAddress: null,
  chainId: null,
  error: null,
}

const WalletContext = createContext<WalletContextType | null>(null)

interface WalletProviderProps {
  children: ReactNode
}

/**
 * Fetch USDC balance from Arbitrum blockchain
 */
async function fetchUSDCBalance(address: string): Promise<number> {
  try {
    // Arbitrum USDC contract
    const usdcContract = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    // balanceOf(address) function selector
    const callData = '0x70a08231000000000000000000000000' + address.slice(2).toLowerCase()
    
    const response = await fetch('https://arb1.arbitrum.io/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: usdcContract, data: callData }, 'latest'],
        id: 1
      })
    })
    
    const data = await response.json()
    const balanceRaw = BigInt(data.result || '0')
    return Number(balanceRaw) / 1e6 // USDC has 6 decimals
  } catch (err) {
    console.error('[Wallet] Error fetching USDC balance:', err)
    return 0
  }
}

/**
 * WalletProvider - Auto-connects with wallet on mount and fetches real balance
 */
export function WalletProvider({ children }: WalletProviderProps) {
  const [state, setState] = useState<WalletState>({
    ...defaultState,
    isConnected: true,
    address: WALLET_ADDRESS,
    walletType: 'metamask',
    displayAddress: `${WALLET_ADDRESS.slice(0, 6)}...${WALLET_ADDRESS.slice(-4)}`,
    chainId: 42161, // Arbitrum mainnet
  })

  // Fetch real balance on mount
  useEffect(() => {
    const loadBalance = async () => {
      console.log('[Wallet] 🔗 Connecting wallet:', WALLET_ADDRESS)
      console.log('[Wallet] 💰 Fetching USDC balance from Arbitrum...')
      
      const balance = await fetchUSDCBalance(WALLET_ADDRESS)
      
      console.log('[Wallet] ✅ USDC Balance:', balance.toFixed(2))
      
      setState(prev => ({
        ...prev,
        balance,
        balanceLoading: false,
      }))
    }
    
    loadBalance()
    
    // Refresh balance every 30 seconds
    const interval = setInterval(loadBalance, 30000)
    return () => clearInterval(interval)
  }, [])

  const refreshBalance = async () => {
    console.log('[Wallet] 🔄 Refreshing balance...')
    setState(prev => ({ ...prev, balanceLoading: true }))
    const balance = await fetchUSDCBalance(WALLET_ADDRESS)
    setState(prev => ({ ...prev, balance, balanceLoading: false }))
  }

  const contextValue: WalletContextType = {
    ...state,
    connect: async (_walletType: WalletType) => {
      console.log('[Wallet] ℹ️ Wallet already connected')
      return true
    },
    disconnect: async () => {
      console.log('[Wallet] ℹ️ Disconnect disabled for this session')
    },
    refreshBalance,
    openModal: () => {
      console.log('[Wallet] ℹ️ Modal disabled - using fixed wallet')
    },
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

/**
 * useWallet hook - Returns wallet state
 */
export function useWallet(): WalletContextType {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
