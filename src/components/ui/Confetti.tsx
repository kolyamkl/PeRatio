import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface ConfettiPiece {
  id: number
  x: number
  y: number
  rotation: number
  color: string
  scale: number
  speedX: number
  speedY: number
  rotationSpeed: number
}

interface ConfettiProps {
  isActive: boolean
  duration?: number
  particleCount?: number
}

const COLORS = [
  '#00E676', // green
  '#FFD700', // gold
  '#00D9FF', // cyan
  '#FF6B6B', // red
  '#A855F7', // purple
  '#F59E0B', // amber
  '#EC4899', // pink
]

export function Confetti({ isActive, duration = 3000, particleCount = 50 }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isActive) {
      // Generate confetti pieces
      const newPieces: ConfettiPiece[] = []
      for (let i = 0; i < particleCount; i++) {
        newPieces.push({
          id: i,
          x: Math.random() * 100,
          y: -10 - Math.random() * 20,
          rotation: Math.random() * 360,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          scale: 0.5 + Math.random() * 0.5,
          speedX: -2 + Math.random() * 4,
          speedY: 2 + Math.random() * 3,
          rotationSpeed: -5 + Math.random() * 10,
        })
      }
      setPieces(newPieces)
      setIsVisible(true)

      // Hide after duration
      const timer = setTimeout(() => {
        setIsVisible(false)
        setPieces([])
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isActive, duration, particleCount])

  if (!isVisible || pieces.length === 0) return null

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg) scale(${piece.scale})`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confetti-fall ${1.5 + Math.random()}s ease-out forwards`,
            animationDelay: `${Math.random() * 0.3}s`,
            '--speed-x': `${piece.speedX}vw`,
            '--speed-y': `${piece.speedY}vh`,
            '--rotation': `${piece.rotationSpeed * 50}deg`,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) translateX(0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) translateX(var(--speed-x)) rotate(var(--rotation));
          }
        }
      `}</style>
    </div>,
    document.body
  )
}
