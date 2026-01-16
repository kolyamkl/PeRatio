interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height 
}: SkeletonProps) {
  const baseClass = 'shimmer bg-bg-tertiary'
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  }
  
  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  }
  
  return (
    <div 
      className={`${baseClass} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  )
}

// Card skeleton for loading states
export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <Skeleton variant="rectangular" height={48} />
      <div className="flex gap-3">
        <Skeleton variant="rectangular" className="flex-1" height={60} />
        <Skeleton variant="rectangular" className="flex-1" height={60} />
      </div>
    </div>
  )
}

// Trade card skeleton
export function TradeCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="circular" width={32} height={32} />
          </div>
          <div className="space-y-1">
            <Skeleton variant="text" width={80} />
            <Skeleton variant="text" width={100} height={10} />
          </div>
        </div>
        <Skeleton variant="rectangular" width={50} height={24} className="rounded-full" />
      </div>
      <div className="flex justify-between">
        <div className="flex gap-3">
          <Skeleton variant="text" width={40} />
          <Skeleton variant="text" width={24} />
          <Skeleton variant="text" width={36} />
        </div>
        <div className="text-right space-y-1">
          <Skeleton variant="text" width={60} />
          <Skeleton variant="text" width={40} height={10} />
        </div>
      </div>
    </div>
  )
}

// Full page loading skeleton
export function PageSkeleton() {
  return (
    <div className="flex flex-col min-h-screen p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="rectangular" width={44} height={44} className="rounded-xl" />
        <Skeleton variant="text" width={100} />
        <Skeleton variant="rectangular" width={44} height={44} className="rounded-xl" />
      </div>
      <CardSkeleton />
      <CardSkeleton />
      <div className="mt-auto">
        <Skeleton variant="rectangular" height={56} className="rounded-2xl" />
      </div>
    </div>
  )
}
