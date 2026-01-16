import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { hapticFeedback } from '../lib/telegram'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  
  if (!isOpen) return null
  
  const handleClose = () => {
    hapticFeedback('selection')
    onClose()
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={handleClose}
      />
      
      {/* Modal content */}
      <div className="relative w-full max-w-lg bg-bg-secondary rounded-t-3xl animate-slide-up safe-bottom">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-text-muted/30" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-bg-tertiary btn-press"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-5 pb-8">
          {children}
        </div>
      </div>
    </div>
  )
}

// Placeholder modal content for "Edit" actions
export function EditComingSoonModal({ isOpen, onClose, field }: { isOpen: boolean; onClose: () => void; field: string }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${field}`}>
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-primary/10 flex items-center justify-center">
          <span className="text-3xl">🔧</span>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Coming Soon
        </h3>
        <p className="text-text-secondary text-sm">
          Editing {field.toLowerCase()} will be available in a future update.
        </p>
      </div>
      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl bg-bg-tertiary text-text-primary font-medium btn-press"
      >
        Got it
      </button>
    </Modal>
  )
}
