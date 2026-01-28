/**
 * Enhanced Wallet Provider with Pear Protocol Integration
 * Handles Web3 wallet connection, Pear authentication, and agent wallet management
 */

import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react'
import { useAccount, useDisconnect, useSwitchChain, useSignTypedData } from 'wagmi'
import { arbitrum } from 'wagmi/chains'
import { getDeviceInfo } from './deviceDetection'
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
  getAvailableMargin,
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
  authenticateWithPearManual: () => Promise<void>
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
  
  // Wagmi hooks for Web3Modal integration
  const { address: wagmiAddress, isConnected: wagmiIsConnected, connector, chainId: wagmiChainId } = useAccount()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()
  const { signTypedDataAsync } = useSignTypedData()

  // Sync Wagmi/Web3Modal state with WalletProvider state and auto-authenticate with Pear
  useEffect(() => {
    if (wagmiIsConnected && wagmiAddress) {
      console.log('[WalletProvider] Web3Modal connected:', wagmiAddress)
      
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        address: wagmiAddress,
        displayAddress: `${wagmiAddress.slice(0, 6)}...${wagmiAddress.slice(-4)}`,
        walletType: 'walletconnect',
        balanceLoading: true,
      }))
      
      // Auto-authenticate with Pear Protocol after wallet connection
      const authenticateWithPearProtocol = async (retryCount = 0) => {
        const MAX_RETRIES = 3
        const RETRY_DELAY = 3000
        
        // Check if already authenticated
        const storedAuth = getStoredAuthState()
        if (storedAuth.isAuthenticated && storedAuth.accessToken) {
          console.log('[WalletProvider] Already authenticated with Pear, token:', storedAuth.accessToken?.substring(0, 30) + '...')
          
          // Fetch balance from Pear API
          const pearBalance = await getAvailableMargin(storedAuth.accessToken)
          
          setState(prev => ({
            ...prev,
            isPearAuthenticated: true,
            isPearAuthenticating: false,
            pearAccessToken: storedAuth.accessToken,
            agentWallet: storedAuth.agentWallet,
            balance: pearBalance,
            balanceLoading: false,
          }))
          return
        }
        
        console.log('[WalletProvider] 🔐 Starting Pear Protocol authentication... (attempt ${retryCount + 1}/${MAX_RETRIES + 1})')
        console.log('[WalletProvider] Wallet address:', wagmiAddress)
        console.log('[WalletProvider] Connector:', connector?.name || 'unknown')
        
        try {
          // Switch to Arbitrum first if needed
          if (wagmiChainId !== arbitrum.id) {
            console.log('[WalletProvider] 🔄 Switching to Arbitrum (42161)...')
            try {
              await switchChainAsync({ chainId: arbitrum.id })
              console.log('[WalletProvider] ✅ Switched to Arbitrum')
              // Wait for the switch to propagate
              await new Promise(resolve => setTimeout(resolve, 1500))
            } catch (switchError: any) {
              console.error('[WalletProvider] Chain switch error:', switchError)
              // Continue anyway - user may have already switched manually
            }
          }
          
          // Use wagmi's signTypedDataAsync which handles chain correctly
          console.log('[WalletProvider] Using wagmi signTypedDataAsync for signing...')
          const authResult = await authenticateWithPear(wagmiAddress, signTypedDataAsync)
          
          console.log('[WalletProvider] ✅ Pear authentication successful!')
          console.log('[WalletProvider] Access token:', authResult.accessToken?.substring(0, 30) + '...')
          
          // Check/create agent wallet after authentication
          console.log('[WalletProvider] 🔍 Checking agent wallet status...')
          let agentWalletInfo = await checkAgentWallet(authResult.accessToken)
          
          if (!agentWalletInfo) {
            console.log('[WalletProvider] 📝 Creating agent wallet...')
            agentWalletInfo = await createAgentWallet(authResult.accessToken)
            console.log('[WalletProvider] ✅ Agent wallet created:', agentWalletInfo.agentWalletAddress)
          } else {
            console.log('[WalletProvider] ✅ Agent wallet exists:', agentWalletInfo.agentWalletAddress)
          }
          
          // Fetch balance from Pear API (available margin)
          console.log('[WalletProvider] 💰 Fetching Pear balance...')
          const pearBalance = await getAvailableMargin(authResult.accessToken)
          
          setState(prev => ({
            ...prev,
            isPearAuthenticated: true,
            isPearAuthenticating: false,
            pearAccessToken: authResult.accessToken,
            agentWallet: agentWalletInfo?.agentWalletAddress || null,
            balance: pearBalance,
            balanceLoading: false,
          }))
          
        } catch (error: any) {
          console.error('[WalletProvider] ❌ Pear authentication failed:', error)
          console.error('[WalletProvider] Error name:', error?.name)
          console.error('[WalletProvider] Error message:', error?.message)
          
          // Auto-retry if not max retries reached
          if (retryCount < MAX_RETRIES) {
            console.log(`[WalletProvider] 🔄 Retrying authentication in ${RETRY_DELAY/1000}s... (${retryCount + 1}/${MAX_RETRIES})`)
            setTimeout(() => {
              authenticateWithPearProtocol(retryCount + 1)
            }, RETRY_DELAY)
          } else {
            console.error('[WalletProvider] ❌ Max retries reached, authentication failed')
            setState(prev => ({ 
              ...prev, 
              isPearAuthenticating: false,
              balanceLoading: false,
              error: `Pear auth failed: ${error.message}`
            }))
          }
        }
      }
      
      // Show "preparing" state immediately, then authenticate after delay
      // This gives user time to switch chain in their wallet if needed
      setState(prev => ({ ...prev, isPearAuthenticating: true }))
      
      // 5 second delay to allow user to switch chain in wallet before signing
      setTimeout(() => {
        authenticateWithPearProtocol()
      }, 5000)
      
    } else if (!wagmiIsConnected && state.isConnected) {
      console.log('[WalletProvider] Web3Modal disconnected')
      setState(defaultState)
      clearAuthState()
    }
  }, [wagmiIsConnected, wagmiAddress, connector, wagmiChainId, switchChainAsync, signTypedDataAsync])

  // Periodic balance refresh from Pear API (every 15 seconds)
  useEffect(() => {
    if (!state.isPearAuthenticated || !state.pearAccessToken) return
    
    const refreshPearBalance = async () => {
      console.log('[WalletProvider] 🔄 Refreshing Pear balance...')
      const pearBalance = await getAvailableMargin(state.pearAccessToken!)
      setState(prev => ({ ...prev, balance: pearBalance }))
    }
    
    // Refresh immediately on auth
    refreshPearBalance()
    
    // Set up interval for periodic refresh
    const intervalId = setInterval(refreshPearBalance, 15000) // Every 15 seconds
    
    return () => clearInterval(intervalId)
  }, [state.isPearAuthenticated, state.pearAccessToken])

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
              balanceLoading: true,
            }))
            
            // If we have Pear auth, fetch balance from Pear API
            if (storedAuth.isAuthenticated && storedAuth.accessToken) {
              const pearBalance = await getAvailableMargin(storedAuth.accessToken)
              setState(prev => ({ ...prev, balance: pearBalance, balanceLoading: false }))
            } else {
              setState(prev => ({ ...prev, balanceLoading: false }))
            }
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
      // Special handling for WalletConnect - use Web3Modal
      if (walletType === 'walletconnect') {
        const deviceInfo = getDeviceInfo()
        console.log('[Wallet] Device info:', deviceInfo)
        
        // Import Web3Modal dynamically
        const { useWeb3Modal } = await import('@web3modal/wagmi/react')
        
        // For WalletConnect, we need to trigger the Web3Modal
        // This will show QR code on desktop or redirect to wallet app on mobile
        console.log('[Wallet] Opening Web3Modal for WalletConnect...')
        
        // Signal that we're waiting for WalletConnect
        setState(prev => ({ 
          ...prev, 
          error: 'Please scan QR code or approve connection in your wallet app'
        }))
        
        // The actual connection will be handled by the Web3Modal
        // For now, return false to keep the modal open
        return false
      }
      
      // For browser extension wallets (MetaMask, Coinbase)
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
    
    // Disconnect Web3Modal/Wagmi if connected
    if (wagmiIsConnected) {
      await wagmiDisconnect()
    }
    
    clearAuthState()
    setState(defaultState)
  }, [wagmiIsConnected, wagmiDisconnect])

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

  /**
   * Manual Pear authentication - for retry after network switch
   */
  const authenticateWithPearManual = useCallback(async (): Promise<void> => {
    if (!wagmiAddress) {
      console.error('[WalletProvider] Cannot authenticate - no wallet connected')
      return
    }
    
    console.log('[WalletProvider] 🔐 Manual Pear authentication triggered...')
    console.log('[WalletProvider] Current wagmi chainId:', wagmiChainId)
    console.log('[WalletProvider] Arbitrum chainId:', arbitrum.id)
    setState(prev => ({ ...prev, isPearAuthenticating: true, error: null }))
    
    try {
      // Switch to Arbitrum first if not already on it
      if (wagmiChainId !== arbitrum.id) {
        console.log('[WalletProvider] 🔄 Switching to Arbitrum (42161)...')
        try {
          await switchChainAsync({ chainId: arbitrum.id })
          console.log('[WalletProvider] ✅ Switched to Arbitrum')
          // Wait for the switch to propagate
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (switchError: any) {
          console.error('[WalletProvider] Chain switch error:', switchError)
          if (switchError.code === 4001 || switchError.message?.includes('rejected')) {
            throw new Error('Please approve the network switch to Arbitrum in your wallet')
          }
        }
      }
      
      // Use wagmi's signTypedDataAsync which handles chain correctly
      console.log('[WalletProvider] Using wagmi signTypedDataAsync for signing...')
      const authResult = await authenticateWithPear(wagmiAddress, signTypedDataAsync)
      
      console.log('[WalletProvider] ✅ Manual Pear authentication successful!')
      
      // Check/create agent wallet after authentication
      console.log('[WalletProvider] 🔍 Checking agent wallet status...')
      let agentWalletInfo = await checkAgentWallet(authResult.accessToken)
      
      if (!agentWalletInfo) {
        console.log('[WalletProvider] 📝 Creating agent wallet...')
        agentWalletInfo = await createAgentWallet(authResult.accessToken)
        console.log('[WalletProvider] ✅ Agent wallet created:', agentWalletInfo.agentWalletAddress)
        console.log('[WalletProvider] ⚠️ User needs to approve agent wallet on Hyperliquid')
      } else {
        console.log('[WalletProvider] ✅ Agent wallet exists:', agentWalletInfo.agentWalletAddress)
      }
      
      setState(prev => ({
        ...prev,
        isPearAuthenticated: true,
        isPearAuthenticating: false,
        pearAccessToken: authResult.accessToken,
        agentWallet: agentWalletInfo?.agentWalletAddress || null,
        needsApproval: !agentWalletInfo?.agentWalletAddress,
        error: null,
      }))
      
    } catch (error: any) {
      console.error('[WalletProvider] ❌ Manual Pear authentication failed:', error)
      setState(prev => ({ 
        ...prev, 
        isPearAuthenticating: false,
        error: error.message || 'Authentication failed'
      }))
    }
  }, [wagmiAddress, wagmiChainId, switchChainAsync, signTypedDataAsync])

  const contextValue: WalletContextType = {
    ...state,
    connect,
    disconnect,
    refreshBalance,
    openModal: () => {
      console.log('[Wallet] Opening wallet modal')
    },
    authenticatePear,
    authenticateWithPearManual,
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
