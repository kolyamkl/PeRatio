import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastData {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

let toastId = 0

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  
  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast-${++toastId}`
    setToasts(prev => [...prev, { id, message, type }])
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])
  
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

interface ToastContainerProps {
  toasts: ToastData[]
  onDismiss: (id: string) => void
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null
  
  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex flex-col gap-2 safe-top">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: ToastData
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  }
  
  const colors = {
    success: 'text-accent-success',
    error: 'text-accent-danger',
    info: 'text-accent-primary',
  }
  
  const bgColors = {
    success: 'bg-accent-success/10 border-accent-success/20',
    error: 'bg-accent-danger/10 border-accent-danger/20',
    info: 'bg-accent-primary/10 border-accent-primary/20',
  }
  
  const Icon = icons[toast.type]
  
  // Truncate very long messages and sanitize any HTML/code content
  let displayMessage = toast.message
  if (displayMessage.length > 150) {
    displayMessage = displayMessage.substring(0, 147) + '...'
  }
  // Don't display raw HTML or code
  if (displayMessage.includes('<html') || displayMessage.includes('<!DOCTYPE') || displayMessage.includes('import ')) {
    displayMessage = 'An error occurred. Please try again.'
  }
  
  return (
    <div 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border animate-fade-up ${bgColors[toast.type]}`}
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${colors[toast.type]}`} />
      <p className="flex-1 text-sm font-medium text-text-primary line-clamp-2">
        {displayMessage}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4 text-text-secondary" />
      </button>
    </div>
  )
}

// Standalone Toast component that reads from context (for App.tsx)
export function Toast() {
  // This component is a placeholder that the ToastContainer renders within
  // The actual toast rendering happens in ToastProvider
  return null
}
