import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'logo' | 'loading' | 'reveal'>('logo')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Phase 1: Logo animation
    const logoTimer = setTimeout(() => setPhase('loading'), 800)
    
    return () => clearTimeout(logoTimer)
  }, [])

  useEffect(() => {
    if (phase === 'loading') {
      // Animate progress bar
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setPhase('reveal')
            return 100
          }
          return prev + 4
        })
      }, 30)

      return () => clearInterval(interval)
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'reveal') {
      const timer = setTimeout(onComplete, 600)
      return () => clearTimeout(timer)
    }
  }, [phase, onComplete])

  return (
    <div 
      className={`fixed inset-0 z-50 bg-bg-primary flex flex-col items-center justify-center transition-all duration-500 ${
        phase === 'reveal' ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient orbs */}
        <div 
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{
            background: 'radial-gradient(circle, var(--accent-primary), transparent)',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{
            background: 'radial-gradient(circle, var(--accent-success), transparent)',
            bottom: '30%',
            left: '20%',
            animation: 'pulse 2.5s ease-in-out infinite 0.5s',
          }}
        />
        <div 
          className="absolute w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{
            background: 'radial-gradient(circle, var(--accent-danger), transparent)',
            bottom: '20%',
            right: '20%',
            animation: 'pulse 2.5s ease-in-out infinite 1s',
          }}
        />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(163, 230, 53, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(163, 230, 53, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite',
          }}
        />
      </div>

      {/* Logo */}
      <div 
        className={`relative mb-8 transition-all duration-700 ${
          phase === 'logo' ? 'scale-0 rotate-180' : 'scale-100 rotate-0'
        }`}
        style={{
          animation: phase !== 'logo' ? 'float 3s ease-in-out infinite' : 'none',
        }}
      >
        {/* Glow ring */}
        <div 
          className="absolute -inset-4 rounded-full opacity-50"
          style={{
            background: 'conic-gradient(from 0deg, var(--accent-primary), var(--accent-success), var(--accent-primary))',
            animation: 'spin 3s linear infinite',
            filter: 'blur(8px)',
          }}
        />
        
        {/* Logo container */}
        <div className="relative w-24 h-24 rounded-2xl bg-bg-secondary border border-accent-primary/30 flex items-center justify-center shadow-2xl shadow-accent-primary/20">
          <svg 
            className="w-14 h-14 text-accent-primary" 
            viewBox="0 0 24 24" 
            fill="currentColor"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(163, 230, 53, 0.5))',
            }}
          >
            <path d="M12 2C9.5 2 7.5 4 7.5 6.5C7.5 9 9 11 9 13C9 15 7 17 7 19C7 21 9 22 12 22C15 22 17 21 17 19C17 17 15 15 15 13C15 11 16.5 9 16.5 6.5C16.5 4 14.5 2 12 2Z"/>
          </svg>
        </div>
      </div>

      {/* Brand name */}
      <div 
        className={`mb-8 transition-all duration-500 delay-200 ${
          phase === 'logo' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        <h1 className="text-3xl font-bold tracking-tight text-center">
          <span className="gradient-text">PeRatio</span>
        </h1>
        <p className="text-center text-text-muted text-sm mt-1">
          Pair Trading Made Simple
        </p>
      </div>

      {/* Loading bar */}
      <div 
        className={`w-48 transition-all duration-500 delay-300 ${
          phase === 'logo' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-accent-primary via-accent-success to-accent-primary rounded-full transition-all duration-100 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
        
        {/* Loading text */}
        <div className="flex justify-between mt-2 text-xs text-text-muted">
          <span>Loading...</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-accent-primary/50"
            style={{
              animation: 'bounce 1s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
