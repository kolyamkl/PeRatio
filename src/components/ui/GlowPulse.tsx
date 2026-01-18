interface GlowPulseProps {
  children: React.ReactNode
  isActive?: boolean
  color?: 'green' | 'red' | 'cyan' | 'gold'
  intensity?: 'low' | 'medium' | 'high'
  className?: string
}

const colorMap = {
  green: {
    glow: 'rgba(0, 230, 118, VAR)',
    border: 'border-accent-success/30',
  },
  red: {
    glow: 'rgba(255, 107, 107, VAR)',
    border: 'border-accent-danger/30',
  },
  cyan: {
    glow: 'rgba(0, 217, 255, VAR)',
    border: 'border-accent-primary/30',
  },
  gold: {
    glow: 'rgba(255, 215, 0, VAR)',
    border: 'border-yellow-500/30',
  },
}

const intensityMap = {
  low: { opacity: '0.3', spread: '10px' },
  medium: { opacity: '0.5', spread: '15px' },
  high: { opacity: '0.7', spread: '20px' },
}

export function GlowPulse({ 
  children, 
  isActive = true, 
  color = 'cyan',
  intensity = 'medium',
  className = ''
}: GlowPulseProps) {
  const colorConfig = colorMap[color]
  const intensityConfig = intensityMap[intensity]

  if (!isActive) {
    return <div className={className}>{children}</div>
  }

  return (
    <div 
      className={`relative ${className}`}
      style={{
        animation: 'glow-pulse 2s ease-in-out infinite',
      }}
    >
      {/* Glow layer */}
      <div 
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: `0 0 ${intensityConfig.spread} ${colorConfig.glow.replace('VAR', intensityConfig.opacity)}`,
          animation: 'glow-pulse 2s ease-in-out infinite',
        }}
      />
      {/* Content */}
      <div className={`relative ${colorConfig.border} border rounded-2xl`}>
        {children}
      </div>
      <style>{`
        @keyframes glow-pulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.01);
          }
        }
      `}</style>
    </div>
  )
}
