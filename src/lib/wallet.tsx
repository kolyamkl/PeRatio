import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useSDK } from '@metamask/sdk-react'
import { hapticFeedback, isRunningInTelegram } from './telegram'

// Wallet types - visual options (all redirect to MetaMask)
export type WalletType = 'metamask' | 'walletconnect' | 'coinbase' | 'phantom' | 'tonconnect'

export interface WalletState {
  isConnected: boolean
  isConnecting: boolean
  address: string | null
  walletType: WalletType | null
  balance: number
  currency: string
  displayAddress: string | null
}

interface WalletContextType extends WalletState {
  connect: (walletType: WalletType) => Promise<boolean>
  disconnect: () => Promise<void>
  refreshBalance: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | null>(null)

interface EIP1193Provider {
  isMetaMask?: boolean
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on: (event: string, callback: (...args: unknown[]) => void) => void
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void
  selectedAddress?: string
}

// Helper to detect browser wallets
declare global {
  interface Window {
    ethereum?: EIP1193Provider & {
      providers?: EIP1193Provider[]
    }
  }
}

// Shorten address for display
function shortenAddress(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Fetch ETH balance from Ethereum provider
async function getEthBalance(provider: EIP1193Provider, address: string): Promise<number> {
  try {
    const balanceHex = await provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    }) as string
    
    // Convert from Wei to ETH (1 ETH = 10^18 Wei)
    const balanceWei = BigInt(balanceHex)
    const balanceEth = Number(balanceWei) / 1e18
    
    console.log('ETH Balance:', balanceEth)
    return balanceEth
  } catch (error) {
    console.error('Failed to get ETH balance:', error)
    return 0
  }
}

// Get MetaMask provider from window.ethereum
function getMetaMaskProvider(): EIP1193Provider | null {
  const ethereum = window.ethereum
  
  if (ethereum?.providers?.length) {
    console.log('Multiple providers found:', ethereum.providers.length)
    const mmProvider = ethereum.providers.find(p => p.isMetaMask)
    if (mmProvider) {
      console.log('Found MetaMask in providers array')
      return mmProvider
    }
  }
  
  if (ethereum?.isMetaMask) {
    console.log('Using window.ethereum (isMetaMask: true)')
    return ethereum
  }
  
  if (ethereum) {
    console.log('Using window.ethereum (generic provider)')
    return ethereum
  }
  
  console.log('No ethereum provider found')
  return null
}

interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false,
    address: null,
    walletType: null,
    balance: 0,
    currency: 'USD',
    displayAddress: null,
  })
  
  // MetaMask SDK for QR code support in Telegram
  const { sdk, connected, account } = useSDK()

  // Check for existing MetaMask connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      const ethereum = window.ethereum
      if (ethereum?.isMetaMask && ethereum.selectedAddress) {
        const address = ethereum.selectedAddress
        setState({
          isConnected: true,
          isConnecting: false,
          address,
          walletType: 'metamask',
          balance: 0,
          currency: 'ETH',
          displayAddress: shortenAddress(address),
        })
        // Fetch real balance
        const balance = await getEthBalance(ethereum, address)
        setState(prev => ({ ...prev, balance }))
      }
    }

    checkExistingConnection()
  }, [])

  // Handle MetaMask SDK connection events (for reconnection scenarios only)
  useEffect(() => {
    // Only update if SDK is connected but our state shows disconnected
    if (connected && account && !state.isConnected) {
      console.log('MetaMask SDK reconnected:', account)
      
      const updateBalance = async () => {
        try {
          const provider = sdk?.getProvider()
          if (provider) {
            const balance = await getEthBalance(provider as unknown as EIP1193Provider, account)
            setState({
              isConnected: true,
              isConnecting: false,
              address: account,
              walletType: 'metamask',
              balance,
              currency: 'ETH',
              displayAddress: shortenAddress(account),
            })
            hapticFeedback('notification', 'success')
          }
        } catch (error) {
          console.error('Error fetching balance:', error)
        }
      }
      
      updateBalance()
    }
    // Handle SDK disconnection
    else if (!connected && state.isConnected && state.walletType === 'metamask') {
      console.log('MetaMask SDK disconnected')
      setState({
        isConnected: false,
        isConnecting: false,
        address: null,
        walletType: null,
        balance: 0,
        currency: 'USD',
        displayAddress: null,
      })
    }
  }, [connected, account, sdk, state.isConnected, state.walletType])

  const connect = useCallback(async (walletType: WalletType): Promise<boolean> => {
    if (walletType !== 'metamask') {
      console.error('Only MetaMask is supported')
      return false
    }

    // Reset state to allow reconnection
    setState(prev => ({ 
      ...prev, 
      isConnecting: true,
      isConnected: false 
    }))
    hapticFeedback('impact', 'medium')

    try {
      console.log('Attempting MetaMask connection...')
      const inTelegram = isRunningInTelegram()
      console.log('Running in Telegram:', inTelegram)
      
      // Use MetaMask SDK for Telegram/mobile, browser extension for desktop
      if (inTelegram || !window.ethereum) {
        console.log('Using MetaMask SDK...')
        
        if (!sdk) {
          console.error('MetaMask SDK not initialized')
          alert('MetaMask SDK not available. Please refresh the page.')
          setState(prev => ({ ...prev, isConnecting: false }))
          return false
        }

        try {
          // Connect via SDK - SDK will show its own QR modal for mobile
          console.log('Calling SDK connect...')
          const accounts = await sdk.connect()
          
          console.log('SDK connected, accounts:', accounts)
          
          if (accounts && accounts.length > 0) {
            const address = accounts[0]
            const provider = sdk.getProvider()
            
            if (provider) {
              const balance = await getEthBalance(provider as unknown as EIP1193Provider, address)
              
              setState({
                isConnected: true,
                isConnecting: false,
                address,
                walletType: 'metamask',
                balance,
                currency: 'ETH',
                displayAddress: shortenAddress(address),
              })
              
              hapticFeedback('notification', 'success')
              return true
            }
          }
          
          setState(prev => ({ ...prev, isConnecting: false }))
          return false
          
        } catch (err) {
          console.error('MetaMask SDK connection error:', err)
          setState(prev => ({ ...prev, isConnecting: false }))
          return false
        }
      } else {
        // Desktop browser - use extension
        console.log('Using browser extension...')
        
        const ethereum = getMetaMaskProvider()
        
        if (!ethereum) {
          console.log('No MetaMask provider found')
          
          const shouldDownload = window.confirm(
            'MetaMask not detected!\n\n' +
            'If you have MetaMask installed:\n' +
            '• Click the MetaMask extension icon\n' +
            '• Make sure it\'s enabled for this site\n' +
            '• Refresh the page and try again\n\n' +
            'Click OK to download MetaMask, or Cancel to try again.'
          )
          
          if (shouldDownload) {
            window.open('https://metamask.io/download/', '_blank')
          }
          
          setState(prev => ({ ...prev, isConnecting: false }))
          return false
        }

        try {
          console.log('Requesting accounts from MetaMask...')
          const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[]
          console.log('Accounts received:', accounts)
          
          if (accounts && accounts.length > 0) {
            const address = accounts[0]
            const balance = await getEthBalance(ethereum, address)
            
            setState({
              isConnected: true,
              isConnecting: false,
              address,
              walletType: 'metamask',
              balance,
              currency: 'ETH',
              displayAddress: shortenAddress(address),
            })
            hapticFeedback('notification', 'success')
            return true
          }
        } catch (err) {
          console.error('MetaMask connection error:', err)
          setState(prev => ({ ...prev, isConnecting: false }))
          return false
        }
      }
    } catch (error) {
      console.error('Wallet connection error:', error)
      hapticFeedback('notification', 'error')
    }

    setState(prev => ({ ...prev, isConnecting: false }))
    return false
  }, [sdk])

  const disconnect = useCallback(async () => {
    hapticFeedback('impact', 'light')

    try {
      // Disconnect MetaMask SDK if connected via SDK
      if (sdk && connected) {
        try {
          await sdk.terminate()
        } catch (error) {
          console.error('Error terminating MetaMask SDK:', error)
        }
      }
      // MetaMask extension doesn't have a disconnect method, just clear state
    } catch (error) {
      console.error('Disconnect error:', error)
    }

    setState({
      isConnected: false,
      isConnecting: false,
      address: null,
      walletType: null,
      balance: 0,
      currency: 'USD',
      displayAddress: null,
    })
  }, [sdk, connected])

  // Refresh balance for current wallet
  const refreshBalance = useCallback(async () => {
    if (!state.isConnected || !state.address || state.walletType !== 'metamask') return

    try {
      const provider = getMetaMaskProvider()
      if (provider) {
        const newBalance = await getEthBalance(provider, state.address)
        setState(prev => ({ ...prev, balance: newBalance }))
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error)
    }
  }, [state.isConnected, state.address, state.walletType])

  return (
    <WalletContext.Provider value={{ 
      ...state, 
      connect, 
      disconnect, 
      refreshBalance,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
