/**
 * Agent Signal Handler
 * 
 * Handles signals from Agent Pear or other signal providers.
 * Validates, transforms, and executes trading signals.
 */

import { AgentPearSignal, BasketTradeConfig, AssetWeight } from './types.js';

export interface SignalValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SignalExecutionOptions {
  maxUsdValue?: number;
  maxLeverage?: number;
  minConfidence?: number;
  allowedAssets?: string[];
  blockedAssets?: string[];
  maxSlippage?: number;
  dryRun?: boolean;
}

/**
 * Validate an Agent Pear signal
 */
export function validateSignal(
  signal: AgentPearSignal,
  options: SignalExecutionOptions = {}
): SignalValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check expiration
  if (signal.expiresAt && Date.now() > signal.expiresAt) {
    errors.push('Signal has expired');
  }

  // Check confidence threshold
  if (options.minConfidence && signal.confidence < options.minConfidence) {
    errors.push(`Signal confidence ${signal.confidence} is below minimum ${options.minConfidence}`);
  }

  // Check USD value limits
  if (options.maxUsdValue && signal.suggestedUsdValue > options.maxUsdValue) {
    warnings.push(`Suggested USD value ${signal.suggestedUsdValue} exceeds max ${options.maxUsdValue}`);
  }

  // Check leverage limits
  if (options.maxLeverage && signal.suggestedLeverage > options.maxLeverage) {
    warnings.push(`Suggested leverage ${signal.suggestedLeverage}x exceeds max ${options.maxLeverage}x`);
  }

  // Check allowed/blocked assets
  const allAssets = [
    ...signal.basket.longAssets.map(a => a.asset.toUpperCase()),
    ...signal.basket.shortAssets.map(a => a.asset.toUpperCase()),
  ];

  if (options.allowedAssets && options.allowedAssets.length > 0) {
    const allowedSet = new Set(options.allowedAssets.map(a => a.toUpperCase()));
    const disallowed = allAssets.filter(a => !allowedSet.has(a));
    if (disallowed.length > 0) {
      errors.push(`Assets not in allowed list: ${disallowed.join(', ')}`);
    }
  }

  if (options.blockedAssets && options.blockedAssets.length > 0) {
    const blockedSet = new Set(options.blockedAssets.map(a => a.toUpperCase()));
    const blocked = allAssets.filter(a => blockedSet.has(a));
    if (blocked.length > 0) {
      errors.push(`Blocked assets in signal: ${blocked.join(', ')}`);
    }
  }

  // Validate basket structure
  if (signal.basket.longAssets.length === 0 && signal.basket.shortAssets.length === 0) {
    errors.push('Signal basket has no assets');
  }

  // Validate weights
  if (signal.basket.longAssets.length > 0) {
    const longSum = signal.basket.longAssets.reduce((sum, a) => sum + a.weight, 0);
    if (Math.abs(longSum - 1.0) > 0.01) {
      warnings.push(`Long asset weights sum to ${longSum}, should be 1.0`);
    }
  }

  if (signal.basket.shortAssets.length > 0) {
    const shortSum = signal.basket.shortAssets.reduce((sum, a) => sum + a.weight, 0);
    if (Math.abs(shortSum - 1.0) > 0.01) {
      warnings.push(`Short asset weights sum to ${shortSum}, should be 1.0`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Transform a signal into a basket trade config with safety limits applied
 */
export function signalToBasketConfig(
  signal: AgentPearSignal,
  options: SignalExecutionOptions = {}
): BasketTradeConfig {
  // Apply limits
  const usdValue = options.maxUsdValue
    ? Math.min(signal.suggestedUsdValue, options.maxUsdValue)
    : signal.suggestedUsdValue;

  const leverage = options.maxLeverage
    ? Math.min(signal.suggestedLeverage, options.maxLeverage)
    : signal.suggestedLeverage;

  const slippage = options.maxSlippage || 0.08;

  // Normalize weights
  const normalizeWeights = (assets: AssetWeight[]): AssetWeight[] => {
    if (assets.length === 0) return [];
    const sum = assets.reduce((s, a) => s + a.weight, 0);
    return assets.map(a => ({
      asset: a.asset.toUpperCase(),
      weight: a.weight / sum,
    }));
  };

  return {
    executionType: 'MARKET',
    slippage,
    leverage,
    usdValue,
    longAssets: normalizeWeights(signal.basket.longAssets),
    shortAssets: normalizeWeights(signal.basket.shortAssets),
  };
}

/**
 * Parse a signal from JSON string
 */
export function parseSignal(jsonString: string): AgentPearSignal {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Validate required fields
    if (!parsed.basket) {
      throw new Error('Missing basket field');
    }
    
    // Set defaults
    return {
      signalId: parsed.signalId || `signal_${Date.now()}`,
      timestamp: parsed.timestamp || Date.now(),
      basket: {
        longAssets: parsed.basket.longAssets || [],
        shortAssets: parsed.basket.shortAssets || [],
      },
      suggestedLeverage: parsed.suggestedLeverage || 1,
      suggestedUsdValue: parsed.suggestedUsdValue || 10,
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning,
      expiresAt: parsed.expiresAt,
    };
  } catch (error: any) {
    throw new Error(`Failed to parse signal: ${error.message}`);
  }
}

/**
 * Create a signal from simple parameters
 */
export function createSignal(params: {
  longAssets?: Array<{ asset: string; weight?: number }>;
  shortAssets?: Array<{ asset: string; weight?: number }>;
  usdValue?: number;
  leverage?: number;
  confidence?: number;
  reasoning?: string;
  expiresInMs?: number;
}): AgentPearSignal {
  const now = Date.now();
  
  // Convert to AssetWeight with default weights
  const toAssetWeights = (assets?: Array<{ asset: string; weight?: number }>): AssetWeight[] => {
    if (!assets || assets.length === 0) return [];
    const defaultWeight = 1.0 / assets.length;
    return assets.map(a => ({
      asset: a.asset.toUpperCase(),
      weight: a.weight ?? defaultWeight,
    }));
  };

  return {
    signalId: `signal_${now}`,
    timestamp: now,
    basket: {
      longAssets: toAssetWeights(params.longAssets),
      shortAssets: toAssetWeights(params.shortAssets),
    },
    suggestedLeverage: params.leverage || 1,
    suggestedUsdValue: params.usdValue || 10,
    confidence: params.confidence || 1.0,
    reasoning: params.reasoning,
    expiresAt: params.expiresInMs ? now + params.expiresInMs : undefined,
  };
}

/**
 * Signal queue for batch processing
 */
export class SignalQueue {
  private signals: AgentPearSignal[] = [];
  private options: SignalExecutionOptions;

  constructor(options: SignalExecutionOptions = {}) {
    this.options = options;
  }

  /**
   * Add a signal to the queue
   */
  add(signal: AgentPearSignal): SignalValidationResult {
    const validation = validateSignal(signal, this.options);
    if (validation.valid) {
      this.signals.push(signal);
    }
    return validation;
  }

  /**
   * Get all pending signals
   */
  getPending(): AgentPearSignal[] {
    // Filter out expired signals
    const now = Date.now();
    this.signals = this.signals.filter(s => !s.expiresAt || s.expiresAt > now);
    return [...this.signals];
  }

  /**
   * Get the highest confidence signal
   */
  getBestSignal(): AgentPearSignal | null {
    const pending = this.getPending();
    if (pending.length === 0) return null;
    return pending.reduce((best, s) => s.confidence > best.confidence ? s : best);
  }

  /**
   * Remove a signal from the queue
   */
  remove(signalId: string): boolean {
    const index = this.signals.findIndex(s => s.signalId === signalId);
    if (index >= 0) {
      this.signals.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all signals
   */
  clear(): void {
    this.signals = [];
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.getPending().length;
  }
}
