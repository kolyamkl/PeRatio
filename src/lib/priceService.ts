// Real-time crypto price service using Hyperliquid API
// Uses the /info endpoint to get mid prices for all perpetual assets

// Cache for prices
let priceCache: Record<string, number> = {}
let lastFetchTime = 0
const CACHE_DURATION = 10000 // 10 seconds (Hyperliquid updates frequently)

export async function fetchPrices(_tickers?: string[]): Promise<Record<string, number>> {
  const now = Date.now()
  
  // Return cache if still valid
  if (now - lastFetchTime < CACHE_DURATION && Object.keys(priceCache).length > 0) {
    return priceCache
  }

  try {
    // Hyperliquid API - get all mid prices
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'allMids' }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })
    
    if (!response.ok) {
      console.warn('[PriceService] Hyperliquid API error:', response.status)
      return priceCache
    }

    const data = await response.json()
    
    // Data comes as { "BTC": "43250.5", "ETH": "2450.0", ... }
    const newPrices: Record<string, number> = {}
    for (const [coin, priceStr] of Object.entries(data)) {
      const price = parseFloat(priceStr as string)
      if (!isNaN(price) && price > 0) {
        newPrices[coin] = price
      }
    }

    priceCache = newPrices
    lastFetchTime = now
    
    console.log('[PriceService] Updated prices from Hyperliquid for', Object.keys(newPrices).length, 'coins')
    return priceCache
  } catch (error) {
    console.warn('[PriceService] Fetch error:', error)
    return priceCache
  }
}

export function getPrice(ticker: string): number | null {
  return priceCache[ticker] ?? null
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`
  } else if (price >= 0.0001) {
    return `$${price.toFixed(6)}`
  } else {
    return `$${price.toFixed(8)}`
  }
}

// Get all available tickers from cache
export function getAvailableTickers(): string[] {
  return Object.keys(priceCache)
}
