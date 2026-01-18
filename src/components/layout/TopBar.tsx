import { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { hapticFeedback } from '../../lib/telegram'

interface TopBarProps {
  title?: string
  showBackButton?: boolean
  rightContent?: ReactNode
}

export function TopBar({ title, showBackButton, rightContent }: TopBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  
  const isOnTrades = location.pathname === '/trades'
  
  const handleNavigation = () => {
    hapticFeedback('selection')
    if (isOnTrades) {
      navigate('/')
    } else {
      navigate('/trades')
    }
  }
  
  return (
    <div className="flex items-center justify-between px-4 py-3">
      {/* Home/Back button - LEFT */}
      <button
        onClick={handleNavigation}
        className="w-11 h-11 flex items-center justify-center rounded-xl bg-bg-secondary border border-border btn-press hover:bg-bg-tertiary transition-colors"
        aria-label={isOnTrades ? 'Back to trade' : 'View trades'}
      >
        {showBackButton || isOnTrades ? (
          <ArrowLeft className="w-5 h-5 text-accent-primary" />
        ) : (
          <Home className="w-5 h-5 text-accent-primary" />
        )}
      </button>
      
      {/* Title - CENTER (only if provided) */}
      {title ? (
        <h1 className="text-lg font-semibold text-text-primary">
          {title}
        </h1>
      ) : (
        <div className="flex-1" />
      )}
      
      {/* Right content (settings button) - RIGHT */}
      {rightContent ? (
        <div className="w-11 h-11 flex items-center justify-center">
          {rightContent}
        </div>
      ) : (
        <div className="w-11 h-11" />
      )}
    </div>
  )
}
