/**
 * Basket Trade Builder
 * 
 * A fluent builder for creating basket trade configurations.
 * Makes it easy to construct complex basket trades programmatically.
 */

import { AssetWeight, BasketTradeConfig } from './types.js';

export class BasketTradeBuilder {
  private config: BasketTradeConfig;

  constructor() {
    this.config = {
      executionType: 'MARKET',
      slippage: 0.08,
      leverage: 1,
      usdValue: 10,
      longAssets: [],
      shortAssets: [],
    };
  }

  /**
   * Set execution type
   */
  executionType(type: 'MARKET' | 'TRIGGER' | 'TWAP' | 'LADDER'): this {
    this.config.executionType = type;
    return this;
  }

  /**
   * Set slippage tolerance (e.g., 0.08 for 8%)
   */
  slippage(value: number): this {
    this.config.slippage = value;
    return this;
  }

  /**
   * Set leverage (1-100x)
   */
  leverage(value: number): this {
    this.config.leverage = value;
    return this;
  }

  /**
   * Set USD value for the position
   */
  usdValue(value: number): this {
    this.config.usdValue = value;
    return this;
  }

  /**
   * Add a long asset with weight
   */
  long(asset: string, weight: number = 1.0): this {
    this.config.longAssets.push({ asset: asset.toUpperCase(), weight });
    return this;
  }

  /**
   * Add a short asset with weight
   */
  short(asset: string, weight: number = 1.0): this {
    this.config.shortAssets.push({ asset: asset.toUpperCase(), weight });
    return this;
  }

  /**
   * Set multiple long assets at once
   */
  longAssets(assets: AssetWeight[]): this {
    this.config.longAssets = assets.map(a => ({
      asset: a.asset.toUpperCase(),
      weight: a.weight,
    }));
    return this;
  }

  /**
   * Set multiple short assets at once
   */
  shortAssets(assets: AssetWeight[]): this {
    this.config.shortAssets = assets.map(a => ({
      asset: a.asset.toUpperCase(),
      weight: a.weight,
    }));
    return this;
  }

  /**
   * Set trigger price (for TRIGGER execution type)
   */
  triggerPrice(price: number): this {
    this.config.triggerPrice = price;
    return this;
  }

  /**
   * Set TWAP parameters
   */
  twap(duration: number, intervals: number): this {
    this.config.executionType = 'TWAP';
    this.config.twapDuration = duration;
    this.config.twapIntervals = intervals;
    return this;
  }

  /**
   * Normalize weights to sum to 1.0
   */
  normalizeWeights(): this {
    if (this.config.longAssets.length > 0) {
      const longSum = this.config.longAssets.reduce((sum, a) => sum + a.weight, 0);
      if (longSum > 0) {
        this.config.longAssets = this.config.longAssets.map(a => ({
          ...a,
          weight: a.weight / longSum,
        }));
      }
    }

    if (this.config.shortAssets.length > 0) {
      const shortSum = this.config.shortAssets.reduce((sum, a) => sum + a.weight, 0);
      if (shortSum > 0) {
        this.config.shortAssets = this.config.shortAssets.map(a => ({
          ...a,
          weight: a.weight / shortSum,
        }));
      }
    }

    return this;
  }

  /**
   * Build and return the configuration
   */
  build(): BasketTradeConfig {
    // Auto-normalize if weights don't sum to 1.0
    this.normalizeWeights();
    return { ...this.config };
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.config = {
      executionType: 'MARKET',
      slippage: 0.08,
      leverage: 1,
      usdValue: 10,
      longAssets: [],
      shortAssets: [],
    };
    return this;
  }
}

/**
 * Create a new basket trade builder
 */
export function createBasketTrade(): BasketTradeBuilder {
  return new BasketTradeBuilder();
}

// ============================================
// PRESET BASKET CONFIGURATIONS
// ============================================

/**
 * Create a simple long position
 */
export function simpleLong(asset: string, usdValue: number, leverage: number = 1): BasketTradeConfig {
  return createBasketTrade()
    .long(asset)
    .usdValue(usdValue)
    .leverage(leverage)
    .build();
}

/**
 * Create a simple short position
 */
export function simpleShort(asset: string, usdValue: number, leverage: number = 1): BasketTradeConfig {
  return createBasketTrade()
    .short(asset)
    .usdValue(usdValue)
    .leverage(leverage)
    .build();
}

/**
 * Create a pair trade (long one, short another)
 */
export function pairTrade(
  longAsset: string,
  shortAsset: string,
  usdValue: number,
  leverage: number = 1
): BasketTradeConfig {
  return createBasketTrade()
    .long(longAsset)
    .short(shortAsset)
    .usdValue(usdValue)
    .leverage(leverage)
    .build();
}

/**
 * Create a sector rotation basket
 * Example: Long AI coins, Short meme coins
 */
export function sectorRotation(
  longSector: string[],
  shortSector: string[],
  usdValue: number,
  leverage: number = 1
): BasketTradeConfig {
  const builder = createBasketTrade()
    .usdValue(usdValue)
    .leverage(leverage);

  // Equal weight distribution
  const longWeight = 1.0 / longSector.length;
  const shortWeight = 1.0 / shortSector.length;

  longSector.forEach(asset => builder.long(asset, longWeight));
  shortSector.forEach(asset => builder.short(asset, shortWeight));

  return builder.build();
}

/**
 * Create a market neutral basket (equal long and short exposure)
 */
export function marketNeutral(
  longAssets: string[],
  shortAssets: string[],
  usdValue: number
): BasketTradeConfig {
  return sectorRotation(longAssets, shortAssets, usdValue, 1);
}
