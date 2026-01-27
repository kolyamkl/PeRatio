/**
 * Pear Protocol SDK Types
 */

// Authentication
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

// Agent Wallet
export interface AgentWallet {
  agentWalletAddress: string;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'EXPIRED' | 'NOT_FOUND';
  createdAt?: string;
  expiresAt?: string;
}

// Asset Weight for Basket Trading
export interface AssetWeight {
  asset: string;  // e.g., 'BTC', 'ETH', 'SOL'
  weight: number; // 0.0 to 1.0, all weights in a direction must sum to 1.0
}

// Basket Trade Configuration
export interface BasketTradeConfig {
  executionType: 'MARKET' | 'TRIGGER' | 'TWAP' | 'LADDER';
  slippage: number;        // e.g., 0.08 for 8%
  leverage: number;        // 1-100x
  usdValue: number;        // Position size in USD
  longAssets: AssetWeight[];
  shortAssets: AssetWeight[];
  // Optional for TRIGGER orders
  triggerPrice?: number;
  // Optional for TWAP orders
  twapDuration?: number;   // Duration in seconds
  twapIntervals?: number;  // Number of intervals
}

// Position Response
export interface PositionResponse {
  positionId?: string;
  orderId?: string;
  status: string;
  fills?: Fill[];
  message?: string;
}

export interface Fill {
  coin: string;
  sz: string;
  px: string;
  fee: string;
  side: string;
  time: number;
}

// Open Position
export interface OpenPosition {
  positionId: string;
  longAssets: AssetWeight[];
  shortAssets: AssetWeight[];
  leverage: number;
  usdValue: number;
  unrealizedPnl: number;
  entryPrice: number;
  currentPrice: number;
  createdAt: string;
}

// User State
export interface UserState {
  balance: number;
  equity: number;
  marginUsed: number;
  availableMargin: number;
  positions: OpenPosition[];
}

// Agent Pear Signal (from external signal provider)
export interface AgentPearSignal {
  signalId: string;
  timestamp: number;
  basket: {
    longAssets: AssetWeight[];
    shortAssets: AssetWeight[];
  };
  suggestedLeverage: number;
  suggestedUsdValue: number;
  confidence: number;      // 0.0 to 1.0
  reasoning?: string;
  expiresAt?: number;
}

// SDK Configuration
export interface PearSDKConfig {
  apiUrl?: string;
  clientId?: string;
  autoRefreshToken?: boolean;
  // NOTE: privateKey removed - authentication handled in frontend with user's wallet
}

// Order Types
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

export interface SingleOrderParams {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  size: number;
  price?: number;
  timeInForce?: TimeInForce;
  reduceOnly?: boolean;
  postOnly?: boolean;
}

// Close Position Options
export interface ClosePositionOptions {
  positionId: string;
  percentage?: number;  // 0.0 to 1.0, default 1.0 (close all)
  executionType?: 'MARKET' | 'LIMIT';
  limitPrice?: number;
}

// Modify Position Options
export interface ModifyPositionOptions {
  positionId: string;
  newLeverage?: number;
  addMargin?: number;
  removeMargin?: number;
}
