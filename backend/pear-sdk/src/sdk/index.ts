/**
 * Pear Protocol SDK - Main Export
 */

// Main SDK
export { PearProtocolSDK, createPearSDK } from './PearProtocolSDK.js';

// Basket Trade Builder
export {
  BasketTradeBuilder,
  createBasketTrade,
  simpleLong,
  simpleShort,
  pairTrade,
  sectorRotation,
  marketNeutral,
} from './BasketTradeBuilder.js';

// Agent Signal Handler
export {
  validateSignal,
  signalToBasketConfig,
  parseSignal,
  createSignal,
  SignalQueue,
} from './AgentSignalHandler.js';

export type {
  SignalValidationResult,
  SignalExecutionOptions,
} from './AgentSignalHandler.js';

// Types
export type {
  AuthTokens,
  AgentWallet,
  AssetWeight,
  BasketTradeConfig,
  PositionResponse,
  Fill,
  OpenPosition,
  UserState,
  AgentPearSignal,
  PearSDKConfig,
  OrderSide,
  OrderType,
  TimeInForce,
  SingleOrderParams,
  ClosePositionOptions,
  ModifyPositionOptions,
} from './types.js';
