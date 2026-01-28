// Asset service - fetches all available perpetual assets from Hyperliquid
// Provides asset metadata, categories, and icons

export interface Asset {
  name: string
  ticker: string
  maxLeverage: number
  category: string[]
  iconUrl?: string
}

// Cache for assets
let assetCache: Asset[] = []
let lastFetchTime = 0
const CACHE_DURATION = 60000 * 5 // 5 minutes

// Category mappings based on common classifications
const categoryMappings: Record<string, string[]> = {
  // Layer 1s
  BTC: ['all', 'hot', 'layer1'],
  ETH: ['all', 'hot', 'layer1', 'defi'],
  SOL: ['all', 'hot', 'layer1'],
  AVAX: ['all', 'layer1'],
  DOT: ['all', 'layer1'],
  ADA: ['all', 'layer1'],
  NEAR: ['all', 'layer1'],
  ATOM: ['all', 'layer1', 'defi'],
  SUI: ['all', 'hot', 'layer1'],
  APT: ['all', 'hot', 'layer1'],
  SEI: ['all', 'hot', 'layer1'],
  TIA: ['all', 'hot', 'layer1'],
  INJ: ['all', 'hot', 'layer1', 'defi'],
  TON: ['all', 'hot', 'layer1'],
  
  // Layer 2s
  ARB: ['all', 'hot', 'layer2', 'defi'],
  OP: ['all', 'layer2', 'defi'],
  MATIC: ['all', 'layer2'],
  STRK: ['all', 'layer2'],
  ZK: ['all', 'layer2'],
  MANTA: ['all', 'layer2'],
  METIS: ['all', 'layer2'],
  BLAST: ['all', 'layer2'],
  
  // DeFi
  LINK: ['all', 'defi', 'ai'],
  UNI: ['all', 'defi'],
  AAVE: ['all', 'defi'],
  MKR: ['all', 'defi'],
  CRV: ['all', 'defi'],
  LDO: ['all', 'defi'],
  SNX: ['all', 'defi'],
  COMP: ['all', 'defi'],
  SUSHI: ['all', 'defi'],
  YFI: ['all', 'defi'],
  PENDLE: ['all', 'hot', 'defi'],
  GMX: ['all', 'defi'],
  DYDX: ['all', 'defi'],
  JUP: ['all', 'hot', 'defi'],
  PYTH: ['all', 'defi'],
  
  // AI tokens
  RNDR: ['all', 'ai'],
  FET: ['all', 'ai'],
  OCEAN: ['all', 'ai'],
  AGIX: ['all', 'ai'],
  TAO: ['all', 'hot', 'ai'],
  WLD: ['all', 'ai'],
  ARKM: ['all', 'ai'],
  AKT: ['all', 'ai'],
  OLAS: ['all', 'ai'],
  IO: ['all', 'ai'],
  
  // Gaming / Metaverse
  APE: ['all', 'gaming'],
  YGG: ['all', 'gaming'],
  IMX: ['all', 'gaming'],
  GMT: ['all', 'gaming'],
  SUPER: ['all', 'gaming'],
  GALA: ['all', 'gaming'],
  ACE: ['all', 'gaming'],
  XAI: ['all', 'gaming'],
  MAVIA: ['all', 'gaming'],
  NOT: ['all', 'hot', 'gaming'],
  HMSTR: ['all', 'gaming'],
  SAND: ['all', 'gaming'],
  MANA: ['all', 'gaming'],
  AXS: ['all', 'gaming'],
  ILV: ['all', 'gaming'],
  BEAM: ['all', 'gaming'],
  PIXEL: ['all', 'gaming'],
  PORTAL: ['all', 'gaming'],
  PRIME: ['all', 'gaming'],
  RON: ['all', 'gaming'],
  
  // Memes
  DOGE: ['all', 'hot', 'meme'],
  SHIB: ['all', 'meme'],
  PEPE: ['all', 'hot', 'meme'],
  WIF: ['all', 'hot', 'meme'],
  BONK: ['all', 'meme'],
  FLOKI: ['all', 'meme'],
  MEME: ['all', 'meme'],
  MYRO: ['all', 'meme'],
  BOME: ['all', 'meme'],
  MEW: ['all', 'meme'],
  POPCAT: ['all', 'hot', 'meme'],
  NEIRO: ['all', 'meme'],
  GOAT: ['all', 'meme'],
  PNUT: ['all', 'meme'],
  ACT: ['all', 'meme'],
  FARTCOIN: ['all', 'meme'],
  TRUMP: ['all', 'hot', 'meme'],
  MELANIA: ['all', 'meme'],
  
  // Exchange tokens
  BNB: ['all', 'exchange'],
  FTT: ['all', 'exchange'],
  OKB: ['all', 'exchange'],
  CRO: ['all', 'exchange'],
  
  // Others
  XRP: ['all'],
  LTC: ['all'],
  BCH: ['all'],
  ETC: ['all'],
  FIL: ['all'],
  ICP: ['all'],
  HBAR: ['all'],
  VET: ['all'],
  ALGO: ['all'],
  XLM: ['all'],
  EOS: ['all'],
  XTZ: ['all'],
  EGLD: ['all'],
  FLOW: ['all'],
  KAVA: ['all'],
  MINA: ['all'],
  CFX: ['all'],
  ROSE: ['all'],
  ZIL: ['all'],
  ONE: ['all'],
  CELO: ['all'],
  QTUM: ['all'],
  IOTA: ['all'],
  NEO: ['all'],
  WAVES: ['all'],
  ZEN: ['all'],
  KSM: ['all'],
  THETA: ['all'],
  ENJ: ['all'],
  CHZ: ['all'],
  BAT: ['all'],
  ZRX: ['all'],
  ENS: ['all'],
  GRT: ['all'],
  BLUR: ['all', 'hot'],
  APT: ['all', 'hot'],
  STX: ['all'],
  ORDI: ['all', 'hot'],
  RUNE: ['all'],
  TRX: ['all'],
  KAS: ['all', 'hot'],
  HYPE: ['all', 'hot'],
}

// Get icon URL for a coin - using CoinGecko or similar CDN
export function getCoinIconUrl(ticker: string): string {
  // Use a reliable crypto icon CDN
  const tickerLower = ticker.toLowerCase()
  
  // Primary: CryptoLogos API
  return `https://cryptologos.cc/logos/${getFullCoinName(ticker)}-${tickerLower}-logo.png`
}

// Map ticker to full name for icon URLs
function getFullCoinName(ticker: string): string {
  const nameMap: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    AVAX: 'avalanche',
    ARB: 'arbitrum',
    OP: 'optimism',
    DOT: 'polkadot',
    LINK: 'chainlink',
    MATIC: 'polygon',
    ADA: 'cardano',
    XRP: 'xrp',
    DOGE: 'dogecoin',
    SHIB: 'shiba-inu',
    ATOM: 'cosmos',
    UNI: 'uniswap',
    AAVE: 'aave',
    SUI: 'sui',
    APT: 'aptos',
    SEI: 'sei',
    INJ: 'injective',
    TIA: 'celestia',
    NEAR: 'near-protocol',
    APE: 'apecoin',
    IMX: 'immutable-x',
    SAND: 'the-sandbox',
    MANA: 'decentraland',
    AXS: 'axie-infinity',
    RNDR: 'render-token',
    FET: 'fetch-ai',
    TAO: 'bittensor',
    WLD: 'worldcoin',
    PEPE: 'pepe',
    WIF: 'dogwifhat',
    BONK: 'bonk',
    FLOKI: 'floki',
    BNB: 'bnb',
    TRX: 'tron',
    LTC: 'litecoin',
    BCH: 'bitcoin-cash',
    ETC: 'ethereum-classic',
    FIL: 'filecoin',
    ICP: 'internet-computer',
    HBAR: 'hedera',
    VET: 'vechain',
    ALGO: 'algorand',
    XLM: 'stellar',
    TON: 'toncoin',
    NOT: 'notcoin',
    JUP: 'jupiter',
    PYTH: 'pyth-network',
    STX: 'stacks',
    ORDI: 'ordinals',
    KAS: 'kaspa',
    BLUR: 'blur',
    GMX: 'gmx',
    PENDLE: 'pendle',
    LDO: 'lido-dao',
    MKR: 'maker',
    CRV: 'curve-dao-token',
    SNX: 'synthetix-network-token',
    GRT: 'the-graph',
    ENS: 'ethereum-name-service',
    RUNE: 'thorchain',
  }
  
  return nameMap[ticker] || ticker.toLowerCase()
}

// Fetch all perpetual assets from Hyperliquid
export async function fetchAllAssets(): Promise<Asset[]> {
  const now = Date.now()
  
  // Return cache if still valid
  if (now - lastFetchTime < CACHE_DURATION && assetCache.length > 0) {
    return assetCache
  }

  try {
    // Fetch perpetuals metadata from Hyperliquid
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'meta' }),
      signal: AbortSignal.timeout(10000)
    })
    
    if (!response.ok) {
      console.warn('[AssetService] Hyperliquid API error:', response.status)
      return assetCache.length > 0 ? assetCache : getDefaultAssets()
    }

    const data = await response.json()
    
    // Parse universe array
    const assets: Asset[] = []
    
    if (data.universe && Array.isArray(data.universe)) {
      for (const asset of data.universe) {
        // Skip delisted assets
        if (asset.isDelisted) continue
        
        const ticker = asset.name
        const categories = categoryMappings[ticker] || ['all']
        
        assets.push({
          name: ticker,
          ticker: ticker,
          maxLeverage: asset.maxLeverage || 20,
          category: categories,
          iconUrl: getCoinIconUrl(ticker),
        })
      }
    }

    if (assets.length > 0) {
      assetCache = assets
      lastFetchTime = now
      console.log('[AssetService] Loaded', assets.length, 'assets from Hyperliquid')
    }
    
    return assetCache.length > 0 ? assetCache : getDefaultAssets()
  } catch (error) {
    console.warn('[AssetService] Fetch error:', error)
    return assetCache.length > 0 ? assetCache : getDefaultAssets()
  }
}

// Get cached assets (for synchronous access)
export function getCachedAssets(): Asset[] {
  return assetCache.length > 0 ? assetCache : getDefaultAssets()
}

// Default assets if API fails
function getDefaultAssets(): Asset[] {
  return [
    { name: 'Bitcoin', ticker: 'BTC', maxLeverage: 50, category: ['all', 'hot', 'layer1'] },
    { name: 'Ethereum', ticker: 'ETH', maxLeverage: 50, category: ['all', 'hot', 'layer1', 'defi'] },
    { name: 'Solana', ticker: 'SOL', maxLeverage: 20, category: ['all', 'hot', 'layer1'] },
    { name: 'Arbitrum', ticker: 'ARB', maxLeverage: 20, category: ['all', 'hot', 'layer2', 'defi'] },
    { name: 'Sui', ticker: 'SUI', maxLeverage: 20, category: ['all', 'hot', 'layer1'] },
    { name: 'Pepe', ticker: 'PEPE', maxLeverage: 20, category: ['all', 'hot', 'meme'] },
    { name: 'Dogecoin', ticker: 'DOGE', maxLeverage: 20, category: ['all', 'hot', 'meme'] },
  ]
}

// Categories for the UI
export const assetCategories = [
  { id: 'favorites', label: 'Favorites', emoji: '⭐' },
  { id: 'all', label: 'All Coins', emoji: null },
  { id: 'hot', label: 'Hot', emoji: '🔥' },
  { id: 'layer1', label: 'Layer 1', emoji: null },
  { id: 'layer2', label: 'Layer 2', emoji: null },
  { id: 'ai', label: 'AI', emoji: '🤖' },
  { id: 'defi', label: 'DeFi', emoji: null },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'meme', label: 'Meme', emoji: '🐸' },
]
