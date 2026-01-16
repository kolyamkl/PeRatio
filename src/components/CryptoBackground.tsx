import { useEffect, useState } from 'react'

// Candlestick pattern data
const generateCandlesticks = () => {
  const candles = []
  for (let i = 0; i < 30; i++) {
    const isGreen = Math.random() > 0.45
    const height = 20 + Math.random() * 60
    const wickTop = 5 + Math.random() * 15
    const wickBottom = 5 + Math.random() * 15
    candles.push({
      x: i * 28 + 10,
      height,
      wickTop,
      wickBottom,
      isGreen,
      delay: i * 0.1,
    })
  }
  return candles
}

export function CryptoBackground() {
  const [candles] = useState(generateCandlesticks)

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Dark gradient base */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(191, 255, 0, 0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(191, 255, 0, 0.02) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.3) 0%, transparent 100%)
          `,
        }}
      />

      {/* Candlestick chart pattern - bottom */}
      <svg 
        className="absolute bottom-0 left-0 right-0 h-48 opacity-[0.04]"
        viewBox="0 0 900 200"
        preserveAspectRatio="xMidYMax slice"
      >
        {candles.map((candle, i) => (
          <g key={i} className="animate-candle-fade" style={{ animationDelay: `${candle.delay}s` }}>
            {/* Wick */}
            <line
              x1={candle.x + 8}
              y1={200 - candle.height - candle.wickTop}
              x2={candle.x + 8}
              y2={200 - candle.height + candle.wickBottom}
              stroke={candle.isGreen ? '#BFFF00' : '#FF4757'}
              strokeWidth="1"
            />
            {/* Body */}
            <rect
              x={candle.x}
              y={200 - candle.height}
              width="16"
              height={candle.height}
              fill={candle.isGreen ? '#BFFF00' : '#FF4757'}
              rx="2"
            />
          </g>
        ))}
      </svg>

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(191, 255, 0, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(191, 255, 0, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Horizontal price lines */}
      <div className="absolute inset-0">
        {[20, 35, 50, 65, 80].map((top) => (
          <div
            key={top}
            className="absolute left-0 right-0 h-px opacity-[0.03]"
            style={{
              top: `${top}%`,
              background: 'linear-gradient(90deg, transparent, rgba(191, 255, 0, 0.5) 20%, rgba(191, 255, 0, 0.5) 80%, transparent)',
            }}
          />
        ))}
      </div>

      {/* Bitcoin symbol watermark */}
      <div className="absolute top-1/4 right-8 opacity-[0.015] transform rotate-12">
        <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor" className="text-accent-primary">
          <path d="M11.5 11.5v-2h1.6c.6 0 1.1.5 1.1 1s-.5 1-1.1 1h-1.6zm0 1v2h2.1c.6 0 1.1-.5 1.1-1s-.5-1-1.1-1h-2.1zm-2-5.5h4.6c1.7 0 3.1 1.4 3.1 3.1 0 .9-.4 1.7-1 2.3.9.5 1.5 1.5 1.5 2.6 0 1.7-1.4 3.1-3.1 3.1H9.5v-11zm2.5-2V3h1v2h1V3h1v2.1c1.8.4 3.2 2 3.2 3.9 0 1-.4 2-1 2.7.9.8 1.5 1.9 1.5 3.2 0 2.2-1.7 4-3.7 4.1v2h-1v-2h-1v2h-1v-2H8.5v-11h1V5h2z"/>
        </svg>
      </div>

      {/* Ethereum symbol watermark */}
      <div className="absolute bottom-1/4 left-8 opacity-[0.015] transform -rotate-12">
        <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor" className="text-accent-primary">
          <path d="M12 1.5l-7 10.8 7 4.2 7-4.2-7-10.8zm0 13.3l-7-4.2 7 11.4 7-11.4-7 4.2z"/>
        </svg>
      </div>

      {/* Floating trend line */}
      <svg className="absolute top-0 left-0 w-full h-full opacity-[0.03]" preserveAspectRatio="none">
        <path
          d="M0,400 Q200,350 400,380 T800,300 T1200,350 T1600,280"
          fill="none"
          stroke="url(#trendGradient)"
          strokeWidth="2"
          className="animate-trend-line"
        />
        <defs>
          <linearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="20%" stopColor="#BFFF00" />
            <stop offset="80%" stopColor="#BFFF00" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-accent-primary/20 animate-float-particle"
          style={{
            left: `${5 + Math.random() * 90}%`,
            top: `${5 + Math.random() * 90}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${10 + Math.random() * 10}s`,
          }}
        />
      ))}

      {/* Glowing orbs */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full opacity-30 animate-float-slow"
        style={{
          background: 'radial-gradient(circle, rgba(191, 255, 0, 0.08) 0%, transparent 70%)',
          top: '-150px',
          right: '-150px',
          filter: 'blur(40px)',
        }}
      />
      <div 
        className="absolute w-[400px] h-[400px] rounded-full opacity-20 animate-float-slow-reverse"
        style={{
          background: 'radial-gradient(circle, rgba(191, 255, 0, 0.1) 0%, transparent 70%)',
          bottom: '50px',
          left: '-100px',
          filter: 'blur(30px)',
        }}
      />

      <style>{`
        @keyframes candle-fade {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .animate-candle-fade {
          animation: candle-fade 4s ease-in-out infinite;
        }
        @keyframes trend-line {
          0% { stroke-dashoffset: 2000; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-trend-line {
          stroke-dasharray: 2000;
          animation: trend-line 20s linear infinite;
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 20px) scale(1.05); }
        }
        @keyframes float-slow-reverse {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -20px) scale(1.05); }
        }
        @keyframes float-particle {
          0%, 100% { 
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          20% { opacity: 0.4; }
          50% { 
            transform: translateY(-80px) translateX(15px);
            opacity: 0.2;
          }
          80% { opacity: 0; }
        }
        .animate-float-slow {
          animation: float-slow 25s ease-in-out infinite;
        }
        .animate-float-slow-reverse {
          animation: float-slow-reverse 30s ease-in-out infinite;
        }
        .animate-float-particle {
          animation: float-particle 15s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
