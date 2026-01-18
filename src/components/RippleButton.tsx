import { useState, useCallback } from 'react'

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
  rippleColor?: string
}

interface Ripple {
  id: number
  x: number
  y: number
  size: number
}

export function RippleButton({ 
  children, 
  className = '', 
  rippleColor = 'rgba(255, 255, 255, 0.3)',
  onClick,
  ...props 
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([])

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const size = Math.max(rect.width, rect.height) * 2

    const newRipple: Ripple = {
      id: Date.now(),
      x: x - size / 2,
      y: y - size / 2,
      size,
    }

    setRipples(prev => [...prev, newRipple])

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id))
    }, 600)

    onClick?.(e)
  }, [onClick])

  return (
    <button
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
      {...props}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: rippleColor,
          }}
        />
      ))}
      {children}
    </button>
  )
}

// Add this to your global CSS or index.css:
// @keyframes ripple {
//   0% { transform: scale(0); opacity: 1; }
//   100% { transform: scale(1); opacity: 0; }
// }
// .animate-ripple { animation: ripple 0.6s ease-out; }
