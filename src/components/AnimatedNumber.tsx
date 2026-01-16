import { useEffect, useState, useRef } from 'react'

interface AnimatedNumberProps {
  value: number
  format?: (value: number) => string
  duration?: number
  className?: string
}

export function AnimatedNumber({ 
  value, 
  format = (v) => v.toFixed(2),
  duration = 1000,
  className = ''
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const startValue = useRef(0)
  const startTime = useRef<number | null>(null)
  const animationFrame = useRef<number>()
  
  useEffect(() => {
    startValue.current = displayValue
    startTime.current = null
    
    const animate = (currentTime: number) => {
      if (startTime.current === null) {
        startTime.current = currentTime
      }
      
      const elapsed = currentTime - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      
      const currentValue = startValue.current + (value - startValue.current) * easeOut
      setDisplayValue(currentValue)
      
      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate)
      }
    }
    
    animationFrame.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [value, duration])
  
  return (
    <span className={`number-animate ${className}`}>
      <span>{format(displayValue)}</span>
    </span>
  )
}

// Currency formatter
export function AnimatedCurrency({ 
  value, 
  className = '' 
}: { 
  value: number
  className?: string 
}) {
  return (
    <AnimatedNumber
      value={value}
      format={(v) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(v)}
      className={className}
    />
  )
}

// Percentage formatter
export function AnimatedPercent({ 
  value, 
  showSign = false,
  className = '' 
}: { 
  value: number
  showSign?: boolean
  className?: string 
}) {
  return (
    <AnimatedNumber
      value={value}
      format={(v) => {
        const sign = showSign && v > 0 ? '+' : ''
        return `${sign}${v.toFixed(2)}%`
      }}
      className={className}
    />
  )
}
