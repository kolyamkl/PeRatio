interface ShimmerProps {
  width?: string
  height?: string
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

export function Shimmer({ 
  width = '100%', 
  height = '20px', 
  className = '',
  rounded = 'lg'
}: ShimmerProps) {
  const roundedClass = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }[rounded]

  return (
    <div 
      className={`relative overflow-hidden bg-bg-tertiary ${roundedClass} ${className}`}
      style={{ width, height }}
    >
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

interface ShimmerCardProps {
  lines?: number
  className?: string
}

export function ShimmerCard({ lines = 3, className = '' }: ShimmerCardProps) {
  return (
    <div className={`p-4 bg-bg-secondary rounded-2xl ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Shimmer width="48px" height="48px" rounded="full" />
        <div className="flex-1 space-y-2">
          <Shimmer width="60%" height="16px" />
          <Shimmer width="40%" height="12px" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer 
          key={i} 
          width={`${70 + Math.random() * 30}%`} 
          height="14px" 
          className={i > 0 ? 'mt-2' : ''} 
        />
      ))}
    </div>
  )
}

interface ShimmerTextProps {
  width?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ShimmerText({ width = '100px', size = 'md', className = '' }: ShimmerTextProps) {
  const heightMap = { sm: '12px', md: '16px', lg: '24px' }
  return <Shimmer width={width} height={heightMap[size]} className={className} />
}

interface ShimmerButtonProps {
  width?: string
  className?: string
}

export function ShimmerButton({ width = '100%', className = '' }: ShimmerButtonProps) {
  return <Shimmer width={width} height="48px" rounded="xl" className={className} />
}

interface ShimmerTradeCardProps {
  className?: string
}

export function ShimmerTradeCard({ className = '' }: ShimmerTradeCardProps) {
  return (
    <div className={`p-4 bg-bg-secondary rounded-2xl border border-border-primary ${className}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <Shimmer width="32px" height="32px" rounded="full" />
            <Shimmer width="32px" height="32px" rounded="full" />
          </div>
          <div className="space-y-1">
            <Shimmer width="80px" height="14px" />
            <Shimmer width="50px" height="10px" />
          </div>
        </div>
        <Shimmer width="60px" height="24px" rounded="full" />
      </div>
      <div className="flex justify-between items-center">
        <Shimmer width="70px" height="14px" />
        <Shimmer width="50px" height="14px" />
      </div>
    </div>
  )
}
