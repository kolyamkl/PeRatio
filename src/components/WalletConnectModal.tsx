/**
 * Wallet Connection Modal
 * Handles wallet selection, Pear authentication, and agent wallet setup
 */

import { useState, useEffect } from 'react'
import { useWallet } from '../lib/walletProvider'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { getDeviceInfo } from '../lib/deviceDetection'
import { Wallet, ExternalLink, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'

interface WalletConnectModalProps {
  isOpen: boolean
  onClose: () => void
}

type ConnectionStep = 'select' | 'connecting' | 'authenticate' | 'agent-setup' | 'approval' | 'ready'

export function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const {
    isConnected,
    displayAddress,
    error,
    isPearAuthenticated,
    isPearAuthenticating,
    agentWallet,
    needsApproval,
    connect,
    authenticatePear,
    setupAgentWallet,
    getApprovalUrl,
  } = useWallet()

  const [step, setStep] = useState<ConnectionStep>('select')
  const [localError, setLocalError] = useState<string | null>(null)

  // Determine current step based on state
  useEffect(() => {
    if (!isConnected) {
      setStep('select')
    } else if (!isPearAuthenticated) {
      setStep('authenticate')
    } else if (!agentWallet) {
      setStep('agent-setup')
    } else if (needsApproval) {
      setStep('approval')
    } else {
      setStep('ready')
    }
  }, [isConnected, isPearAuthenticated, agentWallet, needsApproval])

  const { open: openWeb3Modal } = useWeb3Modal()
  const deviceInfo = getDeviceInfo()

  const handleWalletSelect = async (walletType: 'metamask' | 'walletconnect' | 'coinbase') => {
    setLocalError(null)
    setStep('connecting')
    
    // Special handling for WalletConnect - use Web3Modal
    if (walletType === 'walletconnect') {
      console.log('[WalletConnectModal] Opening Web3Modal for WalletConnect')
      console.log('[WalletConnectModal] Device:', deviceInfo)
      
      try {
        // Open Web3Modal - it will show QR code on desktop or redirect to wallet app on mobile
        await openWeb3Modal()
        
        // Web3Modal handles the connection, so we don't call connect() here
        // The wallet state will be updated automatically when connection succeeds
        console.log('[WalletConnectModal] Web3Modal opened successfully')
      } catch (error: any) {
        console.error('[WalletConnectModal] Failed to open Web3Modal:', error)
        setLocalError('Failed to open wallet connection. Please try again.')
        setStep('select')
      }
      return
    }
    
    // For browser extension wallets (MetaMask, Coinbase)
    const success = await connect(walletType)
    
    if (!success) {
      setLocalError('Failed to connect wallet. Please try again.')
      setStep('select')
    }
  }

  const handleAuthenticate = async () => {
    setLocalError(null)
    
    const success = await authenticatePear()
    
    if (!success) {
      setLocalError('Authentication failed. Please try again.')
    }
  }

  const handleSetupAgent = async () => {
    setLocalError(null)
    
    const result = await setupAgentWallet()
    
    if (!result) {
      setLocalError('Failed to setup agent wallet. Please try again.')
    }
  }

  const handleOpenApproval = () => {
    const url = getApprovalUrl()
    if (url) {
      window.open(url, '_blank')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1b23] rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Display */}
          {(error || localError) && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error || localError}</p>
            </div>
          )}

          {/* Step: Select Wallet */}
          {step === 'select' && (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm mb-4">
                Connect your wallet to start trading on Pear Protocol
              </p>
              
              <button
                onClick={() => handleWalletSelect('metamask')}
                className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-10 h-10" />
                <div className="text-left">
                  <p className="font-semibold text-white">MetaMask</p>
                  <p className="text-sm text-gray-400">Connect using browser extension</p>
                </div>
              </button>

              <button
                onClick={() => handleWalletSelect('walletconnect')}
                className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors"
              >
                <img src="https://docs.walletconnect.com/img/walletconnect-logo.svg" alt="WalletConnect" className="w-10 h-10" />
                <div className="text-left">
                  <p className="font-semibold text-white">WalletConnect</p>
                  <p className="text-sm text-gray-400">Scan QR code with mobile wallet</p>
                </div>
              </button>

              <button
                onClick={() => handleWalletSelect('coinbase')}
                className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">Coinbase Wallet</p>
                  <p className="text-sm text-gray-400">Connect using Coinbase</p>
                </div>
              </button>
            </div>
          )}

          {/* Step: Connecting */}
          {step === 'connecting' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
              <p className="text-white font-semibold">Connecting Wallet...</p>
              <p className="text-gray-400 text-sm mt-2">Please approve the connection in your wallet</p>
            </div>
          )}

          {/* Step: Authenticate with Pear */}
          {step === 'authenticate' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-white font-semibold">Wallet Connected</p>
                  <p className="text-sm text-gray-400">{displayAddress}</p>
                </div>
              </div>

              <p className="text-gray-400 text-sm">
                Sign a message to authenticate with Pear Protocol. This doesn't cost any gas.
              </p>

              <button
                onClick={handleAuthenticate}
                disabled={isPearAuthenticating}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
              >
                {isPearAuthenticating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing...
                  </>
                ) : (
                  'Sign to Authenticate'
                )}
              </button>
            </div>
          )}

          {/* Step: Agent Wallet Setup */}
          {step === 'agent-setup' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-white font-semibold">Authenticated</p>
                  <p className="text-sm text-gray-400">Connected to Pear Protocol</p>
                </div>
              </div>

              <p className="text-gray-400 text-sm">
                Create an agent wallet to execute trades. Pear never holds your funds - you maintain full custody.
              </p>

              <button
                onClick={handleSetupAgent}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-semibold text-white transition-all"
              >
                Setup Agent Wallet
              </button>
            </div>
          )}

          {/* Step: Approval Required */}
          {step === 'approval' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
                <div>
                  <p className="text-white font-semibold">Approval Required</p>
                  <p className="text-sm text-gray-400">Approve agent wallet on Hyperliquid</p>
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-xl">
                <p className="text-sm text-gray-400 mb-2">Agent Wallet Address:</p>
                <p className="text-white font-mono text-sm break-all">{agentWallet}</p>
              </div>

              <p className="text-gray-400 text-sm">
                Click below to approve your agent wallet on Hyperliquid Exchange. This is a one-time setup.
              </p>

              <button
                onClick={handleOpenApproval}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                Approve on Hyperliquid
              </button>

              <button
                onClick={handleSetupAgent}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium text-gray-300 transition-all"
              >
                I've Approved - Check Status
              </button>
            </div>
          )}

          {/* Step: Ready */}
          {step === 'ready' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-white font-semibold">Ready to Trade!</p>
                  <p className="text-sm text-gray-400">{displayAddress}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-green-400 font-semibold">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Agent Wallet</span>
                  <span className="text-white font-mono text-sm">
                    {agentWallet?.slice(0, 6)}...{agentWallet?.slice(-4)}
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-semibold text-white transition-all"
              >
                Start Trading
              </button>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="px-6 pb-6">
          <div className="flex gap-2">
            {['select', 'authenticate', 'agent-setup', 'ready'].map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  ['select', 'connecting'].includes(step) && i === 0 ? 'bg-purple-500' :
                  step === 'authenticate' && i <= 1 ? 'bg-purple-500' :
                  ['agent-setup', 'approval'].includes(step) && i <= 2 ? 'bg-purple-500' :
                  step === 'ready' ? 'bg-purple-500' :
                  'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
