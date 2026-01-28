import { useState } from 'react'

interface CoinIconProps {
  ticker: string
  size?: number
  className?: string
}

// Fallback colors for when image fails
const fallbackColors: Record<string, string> = {
  BTC: 'bg-orange-500',
  ETH: 'bg-blue-500',
  SOL: 'bg-gradient-to-br from-purple-500 to-cyan-400',
  AVAX: 'bg-red-500',
  ARB: 'bg-blue-400',
  OP: 'bg-red-500',
  DOGE: 'bg-yellow-500',
  PEPE: 'bg-green-500',
  SUI: 'bg-blue-500',
  LINK: 'bg-blue-600',
  DOT: 'bg-pink-500',
  MATIC: 'bg-purple-600',
  ADA: 'bg-blue-400',
  XRP: 'bg-gray-400',
  ATOM: 'bg-purple-700',
  UNI: 'bg-pink-600',
  AAVE: 'bg-cyan-600',
  APT: 'bg-black',
  SEI: 'bg-red-400',
  INJ: 'bg-blue-600',
  TIA: 'bg-purple-500',
  NEAR: 'bg-teal-500',
  TAO: 'bg-black',
  WLD: 'bg-black',
  WIF: 'bg-amber-500',
  BONK: 'bg-orange-500',
  FLOKI: 'bg-yellow-600',
  RNDR: 'bg-red-500',
  FET: 'bg-purple-500',
  TON: 'bg-blue-500',
  TRX: 'bg-red-500',
  BNB: 'bg-yellow-500',
  LTC: 'bg-gray-400',
  BCH: 'bg-green-500',
  XLM: 'bg-blue-400',
  HBAR: 'bg-black',
  VET: 'bg-blue-500',
  ALGO: 'bg-black',
  FIL: 'bg-blue-400',
  ICP: 'bg-purple-600',
  SAND: 'bg-cyan-400',
  MANA: 'bg-red-500',
  AXS: 'bg-blue-500',
  IMX: 'bg-cyan-500',
  GALA: 'bg-gray-600',
  ENJ: 'bg-purple-500',
  CHZ: 'bg-red-500',
  APE: 'bg-blue-700',
  GMT: 'bg-yellow-600',
  BLUR: 'bg-orange-500',
  JUP: 'bg-green-500',
  PYTH: 'bg-purple-500',
  STX: 'bg-purple-600',
  ORDI: 'bg-orange-500',
  KAS: 'bg-teal-500',
  RUNE: 'bg-green-600',
  GMX: 'bg-blue-600',
  PENDLE: 'bg-cyan-500',
  LDO: 'bg-blue-400',
  MKR: 'bg-teal-600',
  CRV: 'bg-yellow-500',
  SNX: 'bg-cyan-400',
  GRT: 'bg-purple-500',
  ENS: 'bg-blue-500',
  SHIB: 'bg-orange-400',
  NOT: 'bg-black',
  HMSTR: 'bg-orange-600',
  MEME: 'bg-pink-500',
  POPCAT: 'bg-green-400',
  TRUMP: 'bg-red-600',
  HYPE: 'bg-purple-500',
}

// Icon URL sources - we try multiple CDNs
const getIconUrls = (ticker: string): string[] => {
  const t = ticker.toLowerCase()
  const tUpper = ticker.toUpperCase()
  return [
    // Hyperliquid's own icons (most reliable for HL assets)
    `https://app.hyperliquid.xyz/coins/${tUpper}.svg`,
    // CoinCap (reliable CDN)
    `https://assets.coincap.io/assets/icons/${t}@2x.png`,
    // Cryptocurrency Icons repo (good coverage)
    `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${t}.png`,
    // CryptoLogos
    `https://cryptologos.cc/logos/${t}-${t}-logo.png`,
  ]
}

// Special mapping for coins with different icon names
const iconNameMap: Record<string, string> = {
  // Add any special mappings here if needed
}

export function CoinIcon({ ticker, size = 32, className = '' }: CoinIconProps) {
  const [sourceIndex, setSourceIndex] = useState(0)
  const [useFallback, setUseFallback] = useState(false)
  
  const mappedTicker = iconNameMap[ticker] || ticker
  const iconUrls = getIconUrls(mappedTicker)
  const bgColor = fallbackColors[ticker] || 'bg-accent-primary/30'

  if (useFallback) {
    return (
      <div 
        className={`${bgColor} rounded-full flex items-center justify-center font-bold text-white shadow-lg ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {ticker.slice(0, 2)}
      </div>
    )
  }

  return (
    <img
      src={iconUrls[sourceIndex]}
      alt={ticker}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => {
        if (sourceIndex < iconUrls.length - 1) {
          setSourceIndex(prev => prev + 1)
        } else {
          setUseFallback(true)
        }
      }}
    />
  )
}

export default CoinIcon
