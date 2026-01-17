import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { hapticFeedback } from '../lib/telegram'

interface MetaMaskQRModalProps {
  isOpen: boolean
  onClose: () => void
  connectionUri: string | null
  isConnecting: boolean
  error: string | null
}

export function MetaMaskQRModal({ 
  isOpen, 
  onClose, 
  connectionUri, 
  isConnecting,
  error 
}: MetaMaskQRModalProps) {
  const [timeLeft, setTimeLeft] = useState(120) // 2 minute timeout

  useEffect(() => {
    if (!isOpen || !connectionUri) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, connectionUri])

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(120)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleClose = () => {
    hapticFeedback('impact', 'light')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.82 8.11a.54.54 0 0 0-.54-.12l-8.42 3.08a.54.54 0 0 0-.36.51v6.84c0 .3.24.54.54.54h8.42c.3 0 .54-.24.54-.54V8.48c0-.13-.06-.26-.18-.37zM2.18 8.11c-.12.11-.18.24-.18.37v11.94c0 .3.24.54.54.54h8.42c.3 0 .54-.24.54-.54v-6.84a.54.54 0 0 0-.36-.51L2.72 7.99a.54.54 0 0 0-.54.12z"/>
                <path d="M12 1.5c-3.52 0-6.77 1.67-8.82 4.49l8.82 3.23 8.82-3.23C18.77 3.17 15.52 1.5 12 1.5z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Connect MetaMask</h2>
              <p className="text-xs text-gray-400">Scan with mobile app</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={handleClose}
                className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-white transition-colors"
              >
                Close
              </button>
            </div>
          ) : isConnecting && !connectionUri ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              <p className="text-gray-400">Generating QR code...</p>
            </div>
          ) : connectionUri ? (
            <div className="text-center">
              {/* QR Code */}
              <div className="mb-4 p-4 bg-white rounded-2xl inline-block">
                <QRCodeSVG 
                  value={connectionUri}
                  size={220}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Instructions */}
              <div className="mb-4 text-left space-y-2">
                <p className="text-sm text-gray-300 font-medium mb-3">How to connect:</p>
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="flex-shrink-0 w-5 h-5 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center font-bold">1</span>
                  <span>Open MetaMask app on your phone</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="flex-shrink-0 w-5 h-5 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center font-bold">2</span>
                  <span>Tap the scan icon at the top</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="flex-shrink-0 w-5 h-5 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center font-bold">3</span>
                  <span>Scan this QR code to connect</span>
                </div>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-white/5 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-400">
                  Waiting for connection... {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>

              {timeLeft === 0 && (
                <button
                  onClick={handleClose}
                  className="w-full mt-4 py-3 px-4 bg-orange-500 hover:bg-orange-600 rounded-xl font-semibold text-white transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer tip */}
        {connectionUri && !error && (
          <div className="px-6 pb-6">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-400">
                💡 Don't have MetaMask? Download it from the App Store or Google Play
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
