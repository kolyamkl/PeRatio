/**
 * WalletConnect Provider for Telegram Mini App
 * =============================================
 * Implements proper WalletConnect flow with:
 * - Mobile deep linking for Telegram mobile app
 * - QR code modal for Telegram desktop
 * - Device detection and automatic flow selection
 */

import { createContext, useContext, ReactNode, useEffect, useState, useCallback, useRef } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { getDeviceInfo, logDeviceInfo } from './deviceDetection'
import { openWalletApp, WalletType } from './walletConnectConfig'
import { getTelegramUserInfo } from './telegram'

export interface WalletState {
  isConnected: boolean
  isConnecting: boolean
  address: string | null
  displayAddress: string | null
  balance: string
  balanceLoading: boolean
  chainId: number | null
  error: string | null
  deviceInfo: ReturnType<typeof getDeviceInfo>
}

interface WalletContextType extends WalletState {
  connect: (preferredWallet?: WalletType) => Promise<void>
  disconnect: () => Promise<void>
  openModal: () => void
  connectMobile: (walletType: WalletType) => Promise<void>
  connectDesktop: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | null>(null)

interface WalletProviderProps {
  children: ReactNode
}

/**
 * WalletConnect Provider with Mobile Deep Linking
 * 
 * Flow:
 * 1. User clicks "Connect Wallet"
 * 2. Detect device type (mobile vs desktop)
 * 3. Mobile: Generate WC URI → Open wallet app via deep link
 * 4. Desktop: Show QR code modal
 * 5. Handle connection success/failure
 */
export function WalletConnectProvider({ children }: WalletProviderProps) {
  const deviceInfo = getDeviceInfo()
  const { address, isConnected, chainId } = useAccount()
  const { connect: wagmiConnect, connectors, isPending } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { open: openWeb3Modal } = useWeb3Modal()
  
  // Get balance (USDC on Arbitrum)
  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address: address,
    token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
    chainId: 42161,
  })

  const [error, setError] = useState<string | null>(null)

  // Track if we've already linked this wallet
  const linkedWalletRef = useRef<string | null>(null)
  
  // Log device info on mount
  useEffect(() => {
    logDeviceInfo()
  }, [])
  
  // Link wallet to Telegram user when connected
  useEffect(() => {
    const linkWalletToTelegram = async () => {
      if (!isConnected || !address) return
      
      // Skip if already linked this wallet
      if (linkedWalletRef.current === address.toLowerCase()) {
        console.log('[WalletConnect] Wallet already linked, skipping')
        return
      }
      
      const telegramUser = getTelegramUserInfo()
      
      if (!telegramUser.userId || !telegramUser.chatId) {
        console.log('[WalletConnect] No Telegram user info available, skipping wallet link')
        return
      }
      
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
        console.log(`[WalletConnect] 🔗 Linking wallet ${address.slice(0, 10)}... to Telegram user ${telegramUser.userId}`)
        
        const response = await fetch(`${backendUrl}/api/wallet/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: address,
            telegramUserId: telegramUser.userId,
            telegramChatId: telegramUser.chatId,
            telegramUsername: telegramUser.username
          })
        })
        
        if (response.ok) {
          linkedWalletRef.current = address.toLowerCase()
          console.log('[WalletConnect] ✅ Wallet linked to Telegram successfully')
        } else {
          console.error('[WalletConnect] ❌ Failed to link wallet:', await response.text())
        }
      } catch (err) {
        console.error('[WalletConnect] ❌ Error linking wallet to Telegram:', err)
      }
    }
    
    linkWalletToTelegram()
  }, [isConnected, address])

  // Format display address
  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null

  // Format balance
  const balance = balanceData
    ? parseFloat(balanceData.formatted).toFixed(2)
    : '0.00'

  /**
   * Connect on Mobile - Deep Link Flow
   * 
   * This is the key function for mobile Telegram app:
   * 1. Get WalletConnect connector
   * 2. Initiate connection (generates WC URI)
   * 3. Extract URI from connector
   * 4. Open wallet app with deep link
   */
  const connectMobile = useCallback(async (walletType: WalletType) => {
    try {
      console.log(`[WalletConnect] 📱 Mobile connect flow for ${walletType}`)
      setError(null)

      // Find WalletConnect connector
      const wcConnector = connectors.find(c => c.id === 'walletConnect')
      
      if (!wcConnector) {
        throw new Error('WalletConnect connector not found')
      }

      console.log('[WalletConnect] Found WalletConnect connector:', wcConnector.name)

      // Start connection (this generates the WC URI)
      const connectPromise = wagmiConnect({ connector: wcConnector })

      // Wait a moment for URI to be generated
      await new Promise(resolve => setTimeout(resolve, 500))

      // Get the WalletConnect URI
      // The URI is available on the connector's provider
      const provider = await wcConnector.getProvider()
      const uri = (provider as any)?.connector?.uri

      if (uri) {
        console.log('[WalletConnect] Got WC URI, opening wallet app...')
        console.log('[WalletConnect] URI:', uri.substring(0, 50) + '...')
        
        // Open the wallet app with deep link
        openWalletApp(walletType, uri)
      } else {
        console.warn('[WalletConnect] No URI found, falling back to default flow')
      }

      // Wait for connection to complete
      await connectPromise

      console.log('[WalletConnect] ✅ Mobile connection successful')
    } catch (err: any) {
      console.error('[WalletConnect] ❌ Mobile connection failed:', err)
      setError(err.message || 'Failed to connect wallet')
      throw err
    }
  }, [connectors, wagmiConnect])

  /**
   * Connect on Desktop - QR Code Flow
   * 
   * Opens Web3Modal which automatically shows QR code
   */
  const connectDesktop = useCallback(async () => {
    try {
      console.log('[WalletConnect] 🖥️ Desktop connect flow - opening QR modal')
      setError(null)
      
      // Open Web3Modal - it handles QR code display automatically
      await openWeb3Modal()
      
      console.log('[WalletConnect] ✅ Desktop modal opened')
    } catch (err: any) {
      console.error('[WalletConnect] ❌ Desktop connection failed:', err)
      setError(err.message || 'Failed to open wallet modal')
      throw err
    }
  }, [openWeb3Modal])

  /**
   * Smart Connect - Automatically chooses mobile or desktop flow
   */
  const connect = useCallback(async (preferredWallet: WalletType = 'metamask') => {
    try {
      console.log('[WalletConnect] 🔗 Smart connect initiated')
      console.log('[WalletConnect] Device:', deviceInfo)
      
      if (deviceInfo.isMobile) {
        // Mobile: Use deep link
        await connectMobile(preferredWallet)
      } else {
        // Desktop: Show QR code
        await connectDesktop()
      }
    } catch (err) {
      console.error('[WalletConnect] Connection failed:', err)
      // Error already set in connectMobile/connectDesktop
    }
  }, [deviceInfo, connectMobile, connectDesktop])

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(async () => {
    try {
      console.log('[WalletConnect] Disconnecting...')
      await wagmiDisconnect()
      setError(null)
      console.log('[WalletConnect] ✅ Disconnected')
    } catch (err: any) {
      console.error('[WalletConnect] Disconnect failed:', err)
      setError(err.message)
    }
  }, [wagmiDisconnect])

  /**
   * Open modal (for manual QR code access)
   */
  const openModal = useCallback(() => {
    openWeb3Modal()
  }, [openWeb3Modal])

  const contextValue: WalletContextType = {
    isConnected,
    isConnecting: isPending,
    address: address || null,
    displayAddress,
    balance,
    balanceLoading,
    chainId: chainId || null,
    error,
    deviceInfo,
    connect,
    disconnect,
    openModal,
    connectMobile,
    connectDesktop,
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

/**
 * useWalletConnect hook
 * Access wallet state and connection functions
 */
export function useWalletConnect(): WalletContextType {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWalletConnect must be used within WalletConnectProvider')
  }
  return context
}
