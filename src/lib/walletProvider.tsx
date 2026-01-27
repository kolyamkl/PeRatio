/**
 * Enhanced Wallet Provider with Pear Protocol Integration
 * Handles Web3 wallet connection, Pear authentication, and agent wallet management
 */

import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react'
import {
  authenticateWithPear,
  checkAgentWallet,
  createAgentWallet,
  getStoredAuthState,
  clearAuthState,
  getUserState,
  getPositions,
  executePearTrade,
  buildApprovalMessage,
  AgentWalletInfo,
} from './pearAuth'

export type WalletType = 'metamask' | 'walletconnect' | 'coinbase' | 'phantom'

export interface WalletState {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  address: string | null
  walletType: WalletType | null
  displayAddress: string | null
  chainId: number | null
  error: string | null
  provider: any | null
  
  // Balance state
  balance: number
  balanceLoading: boolean
  currency: string
  
  // Pear Protocol state
  isPearAuthenticated: boolean
  isPearAuthenticating: boolean
  pearAccessToken: string | null
  agentWallet: string | null
  agentWalletStatus: 'NOT_FOUND' | 'PENDING_APPROVAL' | 'ACTIVE' | null
  needsApproval: boolean
  
  // Positions
  positions: any[]
  positionsLoading: boolean
}

interface WalletContextType extends WalletState {
  connect: (walletType: WalletType) => Promise<boolean>
  disconnect: () => Promise<void>
  refreshBalance: () => Promise<void>
  openModal: () => void
  
  // Pear Protocol methods
  authenticatePear: () => Promise<boolean>
  setupAgentWallet: () => Promise<AgentWalletInfo | null>
  refreshPositions: () => Promise<void>
  executeTrade: (params: TradeExecutionParams) => Promise<any>
  getApprovalUrl: () => string | null
}

export interface TradeExecutionParams {
  longAssets: Array<{ asset: string; weight: number }>
  shortAssets: Array<{ asset: string; weight: number }>
  usdValue: number
  leverage: number
  takeProfitPercent?: number
  stopLossPercent?: number
}

const defaultState: WalletState = {
  isConnected: false,
  isConnecting: false,
  address: null,
  walletType: null,
  displayAddress: null,
  chainId: null,
  error: null,
  provider: null,
  balance: 0,
  balanceLoading: false,
  currency: 'USDC',
  isPearAuthenticated: false,
  isPearAuthenticating: false,
  pearAccessToken: null,
  agentWallet: null,
  agentWalletStatus: null,
  needsApproval: false,
  positions: [],
  positionsLoading: false,
}

const WalletContext = createContext<WalletContextType | null>(null)

interface WalletProviderProps {
  children: ReactNode
}

/**
 * Detect available wallet provider
 */
function getProvider(walletType: WalletType): any {
  if (typeof window === 'undefined') return null
  
  switch (walletType) {
    case 'metamask':
      return (window as any).ethereum
    case 'coinbase':
      return (window as any).coinbaseWalletExtension || (window as any).ethereum
    case 'phantom':
      return (window as any).phantom?.ethereum
    default:
      return (window as any).ethereum
  }
}

/**
 * Fetch USDC balance from Arbitrum blockchain
 */
async function fetchUSDCBalance(address: string): Promise<number> {
  try {
    const usdcContract = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
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
    return Number(balanceRaw) / 1e6
  } catch (err) {
    console.error('[Wallet] Error fetching USDC balance:', err)
    return 0
  }
}

/**
 * WalletProvider - Manages wallet connection and Pear Protocol integration
 */
export function WalletProvider({ children }: WalletProviderProps) {
  const [state, setState] = useState<WalletState>(defaultState)

  // Check for existing auth on mount
  useEffect(() => {
    try {
      const storedAuth = getStoredAuthState()
      if (storedAuth.isAuthenticated && storedAuth.accessToken) {
        setState(prev => ({
          ...prev,
          isPearAuthenticated: true,
          pearAccessToken: storedAuth.accessToken,
          agentWallet: storedAuth.agentWallet,
        }))
      }
      
      // Check if wallet is already connected (page refresh)
      const checkExistingConnection = async () => {
        try {
          if (typeof window === 'undefined') return
          
          const provider = (window as any).ethereum
          if (provider && provider.selectedAddress) {
            const address = provider.selectedAddress
            setState(prev => ({
              ...prev,
              isConnected: true,
              address,
              displayAddress: `${address.slice(0, 6)}...${address.slice(-4)}`,
              walletType: 'metamask',
              provider,
              chainId: parseInt(provider.chainId, 16),
            }))
            
            // Fetch balance
            const balance = await fetchUSDCBalance(address)
            setState(prev => ({ ...prev, balance, balanceLoading: false }))
          }
        } catch (error) {
          console.error('[Wallet] Error checking existing connection:', error)
        }
      }
      
      checkExistingConnection()
    } catch (error) {
      console.error('[Wallet] Error in initialization:', error)
    }
  }, [])

  // Listen for account changes
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      
      const provider = (window as any).ethereum
      if (!provider) return
      
      const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // Disconnected
        setState(() => ({
          ...defaultState,
        }))
        clearAuthState()
      } else {
        const address = accounts[0]
        setState(prev => ({
          ...prev,
          address,
          displayAddress: `${address.slice(0, 6)}...${address.slice(-4)}`,
          // Clear Pear auth when account changes
          isPearAuthenticated: false,
          pearAccessToken: null,
          agentWallet: null,
        }))
        clearAuthState()
      }
    }
    
    const handleChainChanged = (chainId: string) => {
      setState(prev => ({
        ...prev,
        chainId: parseInt(chainId, 16),
      }))
    }
    
      provider.on('accountsChanged', handleAccountsChanged)
      provider.on('chainChanged', handleChainChanged)
      
      return () => {
        provider.removeListener('accountsChanged', handleAccountsChanged)
        provider.removeListener('chainChanged', handleChainChanged)
      }
    } catch (error) {
      console.error('[Wallet] Error setting up event listeners:', error)
    }
  }, [])

  /**
   * Connect wallet
   */
  const connect = useCallback(async (walletType: WalletType): Promise<boolean> => {
    console.log('[Wallet] 🔗 Connecting wallet:', walletType)
    
    setState(prev => ({ ...prev, isConnecting: true, error: null }))
    
    try {
      const provider = getProvider(walletType)
      
      if (!provider) {
        throw new Error(`${walletType} wallet not installed`)
      }
      
      // Request accounts
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }
      
      const address = accounts[0]
      const chainId = parseInt(await provider.request({ method: 'eth_chainId' }), 16)
      
      console.log('[Wallet] ✅ Connected:', address)
      
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        address,
        displayAddress: `${address.slice(0, 6)}...${address.slice(-4)}`,
        walletType,
        provider,
        chainId,
        balanceLoading: true,
      }))
      
      // Fetch balance
      const balance = await fetchUSDCBalance(address)
      setState(prev => ({ ...prev, balance, balanceLoading: false }))
      
      return true
    } catch (error: any) {
      console.error('[Wallet] ❌ Connection failed:', error)
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet',
      }))
      return false
    }
  }, [])

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(async (): Promise<void> => {
    console.log('[Wallet] 🔌 Disconnecting wallet')
    clearAuthState()
    setState(defaultState)
  }, [])

  /**
   * Refresh balance
   */
  const refreshBalance = useCallback(async (): Promise<void> => {
    if (!state.address) return
    
    setState(prev => ({ ...prev, balanceLoading: true }))
    const balance = await fetchUSDCBalance(state.address)
    setState(prev => ({ ...prev, balance, balanceLoading: false }))
  }, [state.address])

  /**
   * Authenticate with Pear Protocol
   */
  const authenticatePear = useCallback(async (): Promise<boolean> => {
    if (!state.address || !state.provider) {
      console.error('[Wallet] Cannot authenticate: wallet not connected')
      return false
    }
    
    console.log('[Wallet] 🔐 Authenticating with Pear Protocol...')
    setState(prev => ({ ...prev, isPearAuthenticating: true, error: null }))
    
    try {
      const { accessToken } = await authenticateWithPear(state.address, state.provider)
      
      console.log('[Wallet] ✅ Pear authentication successful')
      
      setState(prev => ({
        ...prev,
        isPearAuthenticated: true,
        isPearAuthenticating: false,
        pearAccessToken: accessToken,
      }))
      
      return true
    } catch (error: any) {
      console.error('[Wallet] ❌ Pear authentication failed:', error)
      setState(prev => ({
        ...prev,
        isPearAuthenticating: false,
        error: error.message || 'Pear authentication failed',
      }))
      return false
    }
  }, [state.address, state.provider])

  /**
   * Setup agent wallet (check existing or create new)
   */
  const setupAgentWallet = useCallback(async (): Promise<AgentWalletInfo | null> => {
    if (!state.pearAccessToken) {
      console.error('[Wallet] Cannot setup agent wallet: not authenticated')
      return null
    }
    
    console.log('[Wallet] 🔧 Setting up agent wallet...')
    
    try {
      // Check if agent wallet exists
      let agentInfo = await checkAgentWallet(state.pearAccessToken)
      
      if (!agentInfo) {
        // Create new agent wallet
        console.log('[Wallet] 📝 Creating new agent wallet...')
        agentInfo = await createAgentWallet(state.pearAccessToken)
        
        setState(prev => ({
          ...prev,
          agentWallet: agentInfo!.agentWalletAddress,
          agentWalletStatus: 'PENDING_APPROVAL',
          needsApproval: true,
        }))
      } else {
        // Check if approved by trying to get user state
        try {
          await getUserState(state.pearAccessToken)
          setState(prev => ({
            ...prev,
            agentWallet: agentInfo!.agentWalletAddress,
            agentWalletStatus: 'ACTIVE',
            needsApproval: false,
          }))
        } catch {
          setState(prev => ({
            ...prev,
            agentWallet: agentInfo!.agentWalletAddress,
            agentWalletStatus: 'PENDING_APPROVAL',
            needsApproval: true,
          }))
        }
      }
      
      return agentInfo
    } catch (error: any) {
      console.error('[Wallet] ❌ Agent wallet setup failed:', error)
      setState(prev => ({
        ...prev,
        error: error.message || 'Agent wallet setup failed',
      }))
      return null
    }
  }, [state.pearAccessToken])

  /**
   * Refresh positions
   */
  const refreshPositions = useCallback(async (): Promise<void> => {
    if (!state.pearAccessToken) return
    
    setState(prev => ({ ...prev, positionsLoading: true }))
    
    try {
      const positions = await getPositions(state.pearAccessToken)
      setState(prev => ({ ...prev, positions, positionsLoading: false }))
    } catch (error) {
      console.error('[Wallet] Failed to fetch positions:', error)
      setState(prev => ({ ...prev, positionsLoading: false }))
    }
  }, [state.pearAccessToken])

  /**
   * Execute trade via Pear Protocol
   */
  const executeTrade = useCallback(async (params: TradeExecutionParams): Promise<any> => {
    if (!state.pearAccessToken) {
      throw new Error('Not authenticated with Pear Protocol')
    }
    
    if (state.needsApproval) {
      throw new Error('Agent wallet needs approval on Hyperliquid first')
    }
    
    const tradeParams = {
      longAssets: params.longAssets,
      shortAssets: params.shortAssets,
      usdValue: params.usdValue,
      leverage: params.leverage,
      ...(params.takeProfitPercent && {
        takeProfit: { type: 'PERCENTAGE', value: params.takeProfitPercent }
      }),
      ...(params.stopLossPercent && {
        stopLoss: { type: 'PERCENTAGE', value: params.stopLossPercent }
      }),
    }
    
    const result = await executePearTrade(state.pearAccessToken, tradeParams)
    
    // Refresh positions after trade
    await refreshPositions()
    
    return result
  }, [state.pearAccessToken, state.needsApproval, refreshPositions])

  /**
   * Get Hyperliquid approval URL
   */
  const getApprovalUrl = useCallback((): string | null => {
    if (!state.agentWallet) return null
    return buildApprovalMessage(state.agentWallet).url
  }, [state.agentWallet])

  const contextValue: WalletContextType = {
    ...state,
    connect,
    disconnect,
    refreshBalance,
    openModal: () => {
      console.log('[Wallet] Opening wallet modal')
    },
    authenticatePear,
    setupAgentWallet,
    refreshPositions,
    executeTrade,
    getApprovalUrl,
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

/**
 * useWallet hook
 */
export function useWallet(): WalletContextType {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
