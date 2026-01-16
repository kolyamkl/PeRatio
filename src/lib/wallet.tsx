import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { TonConnectUI, THEME, Wallet } from '@tonconnect/ui-react'
import { hapticFeedback } from './telegram'

// Wallet types
export type WalletType = 'tonconnect' | 'phantom' | 'metamask' | 'walletconnect' | 'coinbase' | 'trust' | 'rainbow' | 'okx' | 'rabby'

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
  tonConnectUI: TonConnectUI | null
}

const WalletContext = createContext<WalletContextType | null>(null)

// EIP-6963 types for wallet discovery
interface EIP6963ProviderInfo {
  uuid: string
  name: string
  icon: string
  rdns: string
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo
  provider: EIP1193Provider
}

interface EIP1193Provider {
  isMetaMask?: boolean
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on: (event: string, callback: (...args: unknown[]) => void) => void
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void
  selectedAddress?: string
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  detail: EIP6963ProviderDetail
}

// Store discovered wallets
const discoveredWallets: Map<string, EIP6963ProviderDetail> = new Map()

// Helper to detect browser wallets
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom?: boolean
        connect: () => Promise<{ publicKey: { toString: () => string } }>
        disconnect: () => Promise<void>
        isConnected: boolean
        publicKey?: { toString: () => string }
      }
    }
    ethereum?: EIP1193Provider & {
      providers?: EIP1193Provider[]
    }
  }
  interface WindowEventMap {
    'eip6963:announceProvider': EIP6963AnnounceProviderEvent
  }
}

// Listen for EIP-6963 wallet announcements
function setupWalletDiscovery() {
  if (typeof window === 'undefined') return
  
  window.addEventListener('eip6963:announceProvider', (event: EIP6963AnnounceProviderEvent) => {
    const { info, provider } = event.detail
    console.log('EIP-6963 wallet discovered:', info.name, info.rdns)
    discoveredWallets.set(info.rdns, { info, provider })
  })
  
  // Request wallets to announce themselves
  window.dispatchEvent(new Event('eip6963:requestProvider'))
}

// Get MetaMask provider using EIP-6963 or fallback
async function getMetaMaskProvider(): Promise<EIP1193Provider | null> {
  // First, try EIP-6963 discovered wallets
  const metamaskWallet = discoveredWallets.get('io.metamask') || 
                         discoveredWallets.get('io.metamask.flask') ||
                         Array.from(discoveredWallets.values()).find(w => 
                           w.info.name.toLowerCase().includes('metamask')
                         )
  
  if (metamaskWallet) {
    console.log('Found MetaMask via EIP-6963:', metamaskWallet.info.name)
    return metamaskWallet.provider
  }
  
  // Wait a bit and try again (wallets might announce late)
  await new Promise(resolve => setTimeout(resolve, 200))
  window.dispatchEvent(new Event('eip6963:requestProvider'))
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Check again after waiting
  const metamaskWalletRetry = discoveredWallets.get('io.metamask') || 
                              Array.from(discoveredWallets.values()).find(w => 
                                w.info.name.toLowerCase().includes('metamask')
                              )
  
  if (metamaskWalletRetry) {
    console.log('Found MetaMask via EIP-6963 (retry):', metamaskWalletRetry.info.name)
    return metamaskWalletRetry.provider
  }
  
  // Fallback to window.ethereum
  console.log('Checking window.ethereum fallback...')
  let ethereum = window.ethereum
  
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

// Initialize wallet discovery on module load
setupWalletDiscovery()

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

// Fetch SOL balance from Phantom
async function getSolBalance(address: string): Promise<number> {
  try {
    // Use Solana public RPC
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address]
      })
    })
    
    const data = await response.json()
    if (data.result?.value) {
      // Convert from lamports to SOL (1 SOL = 10^9 lamports)
      const balanceSol = data.result.value / 1e9
      console.log('SOL Balance:', balanceSol)
      return balanceSol
    }
    return 0
  } catch (error) {
    console.error('Failed to get SOL balance:', error)
    return 0
  }
}

// Fetch TON balance
async function getTonBalance(address: string): Promise<number> {
  try {
    // Use TON Center API
    const response = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${address}`)
    const data = await response.json()
    
    if (data.ok && data.result) {
      // Convert from nanotons to TON (1 TON = 10^9 nanotons)
      const balanceTon = Number(data.result) / 1e9
      console.log('TON Balance:', balanceTon)
      return balanceTon
    }
    return 0
  } catch (error) {
    console.error('Failed to get TON balance:', error)
    return 0
  }
}

interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [tonConnectUI, setTonConnectUI] = useState<TonConnectUI | null>(null)
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false,
    address: null,
    walletType: null,
    balance: 0,
    currency: 'USD',
    displayAddress: null,
  })

  // Re-request wallet providers on mount
  useEffect(() => {
    // Request EIP-6963 providers
    window.dispatchEvent(new Event('eip6963:requestProvider'))
    
    // Also log what we have
    console.log('WalletProvider mounted. window.ethereum:', window.ethereum)
    if (window.ethereum) {
      console.log('window.ethereum.isMetaMask:', window.ethereum.isMetaMask)
    }
  }, [])

  // Initialize TON Connect
  useEffect(() => {
    const ui = new TonConnectUI({
      manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
      uiPreferences: {
        theme: THEME.DARK,
      },
      walletsListConfiguration: {
        includeWallets: [
          {
            appName: "tonkeeper",
            name: "Tonkeeper",
            imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
            aboutUrl: "https://tonkeeper.com",
            universalLink: "https://app.tonkeeper.com/ton-connect",
            bridgeUrl: "https://bridge.tonapi.io/bridge",
            platforms: ["ios", "android", "chrome", "firefox"]
          },
          {
            appName: "mytonwallet",
            name: "MyTonWallet",
            imageUrl: "https://mytonwallet.io/icon-256.png",
            aboutUrl: "https://mytonwallet.io",
            universalLink: "https://connect.mytonwallet.org",
            bridgeUrl: "https://tonconnectbridge.mytonwallet.org/bridge",
            platforms: ["ios", "android", "chrome", "firefox", "linux", "macos", "windows"]
          }
        ]
      }
    })
    
    setTonConnectUI(ui)

    // Listen for connection changes
    const unsubscribe = ui.onStatusChange(async (wallet: Wallet | null) => {
      if (wallet) {
        const address = wallet.account.address
        
        // Set connected state immediately, then fetch balance
        setState({
          isConnected: true,
          isConnecting: false,
          address,
          walletType: 'tonconnect',
          balance: 0,
          currency: 'TON',
          displayAddress: shortenAddress(address),
        })
        hapticFeedback('notification', 'success')
        
        // Fetch real TON balance
        const balance = await getTonBalance(address)
        setState(prev => ({ ...prev, balance }))
      } else {
        // Check if we still have another wallet connected
        const phantom = window.phantom?.solana
        const ethereum = window.ethereum

        if (phantom?.isConnected && phantom.publicKey) {
          // Keep Phantom connection
        } else if (ethereum?.selectedAddress) {
          // Keep MetaMask connection
        } else {
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
      }
    })

    // Check if already connected
    if (ui.connected && ui.wallet) {
      const address = ui.wallet.account.address
      setState({
        isConnected: true,
        isConnecting: false,
        address,
        walletType: 'tonconnect',
        balance: 0,
        currency: 'TON',
        displayAddress: shortenAddress(address),
      })
      // Fetch balance asynchronously
      getTonBalance(address).then(balance => {
        setState(prev => ({ ...prev, balance }))
      })
    }

    return () => {
      unsubscribe()
    }
  }, [])

  // Check for existing browser wallet connections on mount
  useEffect(() => {
    const checkExistingConnections = async () => {
      // Check Phantom
      const phantom = window.phantom?.solana
      if (phantom?.isConnected && phantom.publicKey) {
        const address = phantom.publicKey.toString()
        setState({
          isConnected: true,
          isConnecting: false,
          address,
          walletType: 'phantom',
          balance: 0,
          currency: 'SOL',
          displayAddress: shortenAddress(address),
        })
        // Fetch real balance
        const balance = await getSolBalance(address)
        setState(prev => ({ ...prev, balance }))
        return
      }

      // Check MetaMask
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

    checkExistingConnections()
  }, [])

  const connect = useCallback(async (walletType: WalletType): Promise<boolean> => {
    setState(prev => ({ ...prev, isConnecting: true }))
    hapticFeedback('impact', 'medium')

    try {
      switch (walletType) {
        case 'tonconnect': {
          // TON Connect will open its own modal
          if (tonConnectUI) {
            await tonConnectUI.openModal()
            // The connection result will come through onStatusChange
            return true
          }
          break
        }

        case 'phantom': {
          const phantom = window.phantom?.solana
          if (!phantom) {
            // Redirect to Phantom if not installed
            window.open('https://phantom.app/', '_blank')
            setState(prev => ({ ...prev, isConnecting: false }))
            return false
          }

          try {
            const response = await phantom.connect()
            const address = response.publicKey.toString()
            
            // Fetch real SOL balance
            const balance = await getSolBalance(address)
            
            setState({
              isConnected: true,
              isConnecting: false,
              address,
              walletType: 'phantom',
              balance,
              currency: 'SOL',
              displayAddress: shortenAddress(address),
            })
            hapticFeedback('notification', 'success')
            return true
          } catch (err) {
            console.error('Phantom connection error:', err)
            setState(prev => ({ ...prev, isConnecting: false }))
            return false
          }
        }

        case 'metamask': {
          console.log('Attempting MetaMask connection...')
          console.log('Discovered wallets:', Array.from(discoveredWallets.keys()))
          
          // Get MetaMask provider using EIP-6963 or fallback
          const ethereum = await getMetaMaskProvider()
          
          if (!ethereum) {
            console.log('No MetaMask provider found')
            
            // Check if we're likely missing the extension vs it just not being detected
            const hasWindowEthereum = typeof window !== 'undefined' && 'ethereum' in window
            
            if (!hasWindowEthereum) {
              // Show a more helpful alert before redirecting
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
            }
            
            setState(prev => ({ ...prev, isConnecting: false }))
            return false
          }

          try {
            console.log('Requesting accounts from MetaMask...')
            // Request accounts - this will trigger MetaMask popup
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[]
            console.log('Accounts received:', accounts)
            
            if (accounts && accounts.length > 0) {
              const address = accounts[0]
              
              // Fetch real ETH balance
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
            // User rejected or other error
            setState(prev => ({ ...prev, isConnecting: false }))
            return false
          }
          break
        }

        case 'walletconnect':
        case 'coinbase':
        case 'trust':
        case 'rainbow':
        case 'okx':
        case 'rabby': {
          // For these wallets, use TON Connect if available, otherwise show coming soon
          if (tonConnectUI) {
            await tonConnectUI.openModal()
            return true
          }
          // Simulate connection for demo
          await new Promise(resolve => setTimeout(resolve, 1500))
          const mockAddress = '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6)
          setState({
            isConnected: true,
            isConnecting: false,
            address: mockAddress,
            walletType,
            balance: 0.5, // Mock balance
            currency: 'ETH',
            displayAddress: shortenAddress(mockAddress),
          })
          hapticFeedback('notification', 'success')
          return true
        }
      }
    } catch (error) {
      console.error('Wallet connection error:', error)
      hapticFeedback('notification', 'error')
    }

    setState(prev => ({ ...prev, isConnecting: false }))
    return false
  }, [tonConnectUI])

  const disconnect = useCallback(async () => {
    hapticFeedback('impact', 'light')

    try {
      switch (state.walletType) {
        case 'tonconnect':
          if (tonConnectUI) {
            await tonConnectUI.disconnect()
          }
          break

        case 'phantom': {
          const phantom = window.phantom?.solana
          if (phantom) {
            await phantom.disconnect()
          }
          break
        }

        case 'metamask':
          // MetaMask doesn't have a disconnect method, just clear state
          break

        default:
          // Just clear state for other wallets
          break
      }
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
  }, [state.walletType, tonConnectUI])

  // Refresh balance for current wallet
  const refreshBalance = useCallback(async () => {
    if (!state.isConnected || !state.address || !state.walletType) return

    try {
      let newBalance = 0

      switch (state.walletType) {
        case 'tonconnect':
          newBalance = await getTonBalance(state.address)
          break

        case 'phantom':
          newBalance = await getSolBalance(state.address)
          break

        case 'metamask': {
          const provider = await getMetaMaskProvider()
          if (provider) {
            newBalance = await getEthBalance(provider, state.address)
          }
          break
        }

        default:
          // For mock wallets, just return current balance
          return
      }

      setState(prev => ({ ...prev, balance: newBalance }))
    } catch (error) {
      console.error('Failed to refresh balance:', error)
    }
  }, [state.isConnected, state.address, state.walletType])

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, refreshBalance, tonConnectUI }}>
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
