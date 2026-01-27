/**
 * Pear Protocol SDK
 * 
 * A comprehensive SDK for integrating with Pear Protocol API.
 * Supports user wallet connection, authentication, agent wallet management,
 * and basket trade execution.
 */

import { ethers } from 'ethers';
import axios, { AxiosInstance } from 'axios';
import {
  AuthTokens,
  AgentWallet,
  BasketTradeConfig,
  PositionResponse,
  OpenPosition,
  UserState,
  AgentPearSignal,
  PearSDKConfig,
  SingleOrderParams,
  ClosePositionOptions,
  ModifyPositionOptions,
  AssetWeight,
} from './types.js';

const DEFAULT_API_URL = 'https://hl-v2.pearprotocol.io';
const DEFAULT_CLIENT_ID = 'APITRADER';

export class PearProtocolSDK {
  private apiUrl: string;
  private clientId: string;
  private privateKey?: string;
  private wallet?: ethers.Wallet;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: number;
  private autoRefreshToken: boolean;
  private axiosInstance: AxiosInstance;

  constructor(config: PearSDKConfig = {}) {
    this.apiUrl = config.apiUrl || DEFAULT_API_URL;
    this.clientId = config.clientId || DEFAULT_CLIENT_ID;
    this.privateKey = config.privateKey;
    this.autoRefreshToken = config.autoRefreshToken ?? true;

    if (this.privateKey) {
      this.wallet = new ethers.Wallet(this.privateKey);
    }

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auto token refresh
    this.axiosInstance.interceptors.request.use(async (config) => {
      if (this.accessToken) {
        // Check if token needs refresh
        if (this.autoRefreshToken && this.shouldRefreshToken()) {
          await this.refreshAccessToken();
        }
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  /**
   * Set private key for wallet operations
   */
  setPrivateKey(privateKey: string): void {
    this.privateKey = privateKey;
    this.wallet = new ethers.Wallet(privateKey);
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * Authenticate with Pear Protocol using EIP-712 signature
   * @returns AuthTokens containing access and refresh tokens
   */
  async authenticate(): Promise<AuthTokens> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Call setPrivateKey() first.');
    }

    // Step 1: Get EIP-712 message
    const msgResponse = await axios.get(`${this.apiUrl}/auth/eip712-message`, {
      params: { address: this.wallet.address, clientId: this.clientId },
    });
    const eipData = msgResponse.data;

    // Step 2: Sign the message
    const domain = eipData.domain;
    const types = { ...eipData.types };
    const value = eipData.message;

    // Remove EIP712Domain if present (ethers handles this automatically)
    if (types.EIP712Domain) {
      delete types.EIP712Domain;
    }

    const signature = await this.wallet.signTypedData(domain, types, value);

    // Step 3: Login and get tokens
    const loginResponse = await axios.post(`${this.apiUrl}/auth/login`, {
      method: 'eip712',
      address: this.wallet.address,
      clientId: this.clientId,
      details: { signature, timestamp: value.timestamp },
    });

    this.accessToken = loginResponse.data.accessToken;
    this.refreshToken = loginResponse.data.refreshToken;
    
    // Set token expiry (default 15 minutes from now)
    this.tokenExpiresAt = Date.now() + (15 * 60 * 1000);

    return {
      accessToken: this.accessToken!,
      refreshToken: this.refreshToken,
      expiresAt: this.tokenExpiresAt,
    };
  }

  /**
   * Set access token directly (for frontend integration)
   */
  setAccessToken(accessToken: string, refreshToken?: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiresAt = Date.now() + (15 * 60 * 1000);
  }

  /**
   * Check if token should be refreshed
   */
  private shouldRefreshToken(): boolean {
    if (!this.tokenExpiresAt) return false;
    // Refresh if less than 2 minutes remaining
    return Date.now() > (this.tokenExpiresAt - 2 * 60 * 1000);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<AuthTokens> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available. Please authenticate again.');
    }

    const response = await axios.post(`${this.apiUrl}/auth/refresh`, {
      refreshToken: this.refreshToken,
    });

    this.accessToken = response.data.accessToken;
    this.refreshToken = response.data.refreshToken || this.refreshToken;
    this.tokenExpiresAt = Date.now() + (15 * 60 * 1000);

    return {
      accessToken: this.accessToken!,
      refreshToken: this.refreshToken,
      expiresAt: this.tokenExpiresAt,
    };
  }

  /**
   * Logout and invalidate tokens
   */
  async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await axios.post(`${this.apiUrl}/auth/logout`, {
          refreshToken: this.refreshToken,
        });
      } catch (error) {
        // Ignore logout errors
      }
    }
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.tokenExpiresAt = undefined;
  }

  // ============================================
  // AGENT WALLET MANAGEMENT
  // ============================================

  /**
   * Get agent wallet status
   */
  async getAgentWallet(): Promise<AgentWallet> {
    this.ensureAuthenticated();

    try {
      const response = await this.axiosInstance.get('/agentWallet', {
        params: { clientId: this.clientId },
      });

      const data = response.data;
      const address = data.agentWalletAddress || data.agentAddress || data.address;

      return {
        agentWalletAddress: address || '',
        status: address ? (data.status || 'ACTIVE') : 'NOT_FOUND',
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          agentWalletAddress: '',
          status: 'NOT_FOUND',
        };
      }
      throw error;
    }
  }

  /**
   * Create a new agent wallet
   */
  async createAgentWallet(): Promise<AgentWallet> {
    this.ensureAuthenticated();

    const response = await this.axiosInstance.post('/agentWallet', {
      clientId: this.clientId,
    });

    const data = response.data;
    const address = data.agentWalletAddress || data.agentAddress || data.address;

    return {
      agentWalletAddress: address,
      status: 'PENDING_APPROVAL',
      createdAt: data.createdAt || new Date().toISOString(),
      expiresAt: data.expiresAt,
    };
  }

  /**
   * Ensure agent wallet exists and is active
   * Creates one if it doesn't exist
   */
  async ensureAgentWallet(): Promise<AgentWallet> {
    const wallet = await this.getAgentWallet();

    if (wallet.status === 'NOT_FOUND' || wallet.status === 'EXPIRED') {
      return await this.createAgentWallet();
    }

    return wallet;
  }

  /**
   * Get the approval data for agent wallet (user needs to sign this on Hyperliquid)
   */
  async getAgentWalletApprovalData(): Promise<{
    agentAddress: string;
    approvalMessage: string;
  }> {
    const wallet = await this.getAgentWallet();
    
    if (wallet.status === 'NOT_FOUND') {
      throw new Error('No agent wallet found. Create one first.');
    }

    return {
      agentAddress: wallet.agentWalletAddress,
      approvalMessage: `Approve agent wallet ${wallet.agentWalletAddress} for Pear Protocol trading`,
    };
  }

  // ============================================
  // BASKET TRADING
  // ============================================

  /**
   * Execute a basket trade
   * This is the main method for pair trading
   */
  async executeBasketTrade(config: BasketTradeConfig): Promise<PositionResponse> {
    this.ensureAuthenticated();
    this.validateBasketConfig(config);

    const response = await this.axiosInstance.post('/positions', config);
    return response.data;
  }

  /**
   * Execute a trade from an Agent Pear Signal
   */
  async executeAgentSignal(
    signal: AgentPearSignal,
    options?: {
      overrideUsdValue?: number;
      overrideLeverage?: number;
      maxSlippage?: number;
    }
  ): Promise<PositionResponse> {
    // Validate signal hasn't expired
    if (signal.expiresAt && Date.now() > signal.expiresAt) {
      throw new Error('Signal has expired');
    }

    const config: BasketTradeConfig = {
      executionType: 'MARKET',
      slippage: options?.maxSlippage || 0.08,
      leverage: options?.overrideLeverage || signal.suggestedLeverage,
      usdValue: options?.overrideUsdValue || signal.suggestedUsdValue,
      longAssets: signal.basket.longAssets,
      shortAssets: signal.basket.shortAssets,
    };

    return this.executeBasketTrade(config);
  }

  /**
   * Create a simple long position
   */
  async goLong(
    asset: string,
    usdValue: number,
    leverage: number = 1,
    slippage: number = 0.08
  ): Promise<PositionResponse> {
    return this.executeBasketTrade({
      executionType: 'MARKET',
      slippage,
      leverage,
      usdValue,
      longAssets: [{ asset: asset.toUpperCase(), weight: 1.0 }],
      shortAssets: [],
    });
  }

  /**
   * Create a simple short position
   */
  async goShort(
    asset: string,
    usdValue: number,
    leverage: number = 1,
    slippage: number = 0.08
  ): Promise<PositionResponse> {
    return this.executeBasketTrade({
      executionType: 'MARKET',
      slippage,
      leverage,
      usdValue,
      longAssets: [],
      shortAssets: [{ asset: asset.toUpperCase(), weight: 1.0 }],
    });
  }

  /**
   * Create a pair trade (long one asset, short another)
   */
  async pairTrade(
    longAsset: string,
    shortAsset: string,
    usdValue: number,
    leverage: number = 1,
    slippage: number = 0.08
  ): Promise<PositionResponse> {
    return this.executeBasketTrade({
      executionType: 'MARKET',
      slippage,
      leverage,
      usdValue,
      longAssets: [{ asset: longAsset.toUpperCase(), weight: 1.0 }],
      shortAssets: [{ asset: shortAsset.toUpperCase(), weight: 1.0 }],
    });
  }

  /**
   * Create a multi-asset basket trade
   */
  async basketTrade(
    longAssets: AssetWeight[],
    shortAssets: AssetWeight[],
    usdValue: number,
    leverage: number = 1,
    slippage: number = 0.08
  ): Promise<PositionResponse> {
    return this.executeBasketTrade({
      executionType: 'MARKET',
      slippage,
      leverage,
      usdValue,
      longAssets: longAssets.map(a => ({ ...a, asset: a.asset.toUpperCase() })),
      shortAssets: shortAssets.map(a => ({ ...a, asset: a.asset.toUpperCase() })),
    });
  }

  // ============================================
  // POSITION MANAGEMENT
  // ============================================

  /**
   * Get all open positions
   */
  async getOpenPositions(): Promise<OpenPosition[]> {
    this.ensureAuthenticated();

    const response = await this.axiosInstance.get('/positions');
    return response.data.positions || [];
  }

  /**
   * Get a specific position by ID
   */
  async getPosition(positionId: string): Promise<OpenPosition | null> {
    this.ensureAuthenticated();

    try {
      const response = await this.axiosInstance.get(`/positions/${positionId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Close a position
   */
  async closePosition(options: ClosePositionOptions): Promise<PositionResponse> {
    this.ensureAuthenticated();

    const response = await this.axiosInstance.post(`/positions/${options.positionId}/close`, {
      percentage: options.percentage || 1.0,
      executionType: options.executionType || 'MARKET',
      limitPrice: options.limitPrice,
    });

    return response.data;
  }

  /**
   * Close all open positions
   */
  async closeAllPositions(): Promise<PositionResponse[]> {
    const positions = await this.getOpenPositions();
    const results: PositionResponse[] = [];

    for (const position of positions) {
      const result = await this.closePosition({ positionId: position.positionId });
      results.push(result);
    }

    return results;
  }

  /**
   * Modify a position (leverage, margin)
   */
  async modifyPosition(options: ModifyPositionOptions): Promise<PositionResponse> {
    this.ensureAuthenticated();

    const response = await this.axiosInstance.patch(`/positions/${options.positionId}`, {
      leverage: options.newLeverage,
      addMargin: options.addMargin,
      removeMargin: options.removeMargin,
    });

    return response.data;
  }

  // ============================================
  // USER STATE & ACCOUNT
  // ============================================

  /**
   * Get user state (balances, positions, etc.)
   */
  async getUserState(): Promise<UserState> {
    this.ensureAuthenticated();

    const response = await this.axiosInstance.get('/hl/user-state');
    return response.data;
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<number> {
    const state = await this.getUserState();
    return state.balance;
  }

  /**
   * Get available margin
   */
  async getAvailableMargin(): Promise<number> {
    const state = await this.getUserState();
    return state.availableMargin;
  }

  // ============================================
  // MARKET DATA
  // ============================================

  /**
   * Get available trading pairs/assets
   */
  async getAvailableAssets(): Promise<string[]> {
    const response = await this.axiosInstance.get('/hl/meta');
    return response.data.universe?.map((m: any) => m.name) || [];
  }

  /**
   * Get market info for an asset
   */
  async getMarketInfo(asset: string): Promise<any> {
    const response = await this.axiosInstance.get(`/hl/market/${asset.toUpperCase()}`);
    return response.data;
  }

  /**
   * Get current price for an asset
   */
  async getPrice(asset: string): Promise<number> {
    const info = await this.getMarketInfo(asset);
    return info.lastPrice || info.markPrice || 0;
  }

  // ============================================
  // SINGLE ORDERS (Direct Hyperliquid)
  // ============================================

  /**
   * Place a single order (not basket)
   */
  async placeSingleOrder(params: SingleOrderParams): Promise<any> {
    this.ensureAuthenticated();

    const response = await this.axiosInstance.post('/hl/order', {
      clientId: this.clientId,
      ...params,
    });

    return response.data;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<any> {
    this.ensureAuthenticated();

    const response = await this.axiosInstance.delete(`/orders/${orderId}`, {
      params: { clientId: this.clientId },
    });

    return response.data;
  }

  /**
   * Get open orders
   */
  async getOpenOrders(): Promise<any[]> {
    this.ensureAuthenticated();

    const response = await this.axiosInstance.get('/orders', {
      params: { clientId: this.clientId },
    });

    return response.data.orders || [];
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Ensure user is authenticated
   */
  private ensureAuthenticated(): void {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }
  }

  /**
   * Validate basket trade configuration
   */
  private validateBasketConfig(config: BasketTradeConfig): void {
    // Validate at least one side has assets
    if (config.longAssets.length === 0 && config.shortAssets.length === 0) {
      throw new Error('Basket must have at least one long or short asset');
    }

    // Validate weights sum to 1.0 for each side
    if (config.longAssets.length > 0) {
      const longSum = config.longAssets.reduce((sum, a) => sum + a.weight, 0);
      if (Math.abs(longSum - 1.0) > 0.001) {
        throw new Error(`Long asset weights must sum to 1.0, got ${longSum}`);
      }
    }

    if (config.shortAssets.length > 0) {
      const shortSum = config.shortAssets.reduce((sum, a) => sum + a.weight, 0);
      if (Math.abs(shortSum - 1.0) > 0.001) {
        throw new Error(`Short asset weights must sum to 1.0, got ${shortSum}`);
      }
    }

    // Validate leverage
    if (config.leverage < 1 || config.leverage > 100) {
      throw new Error('Leverage must be between 1 and 100');
    }

    // Validate USD value
    if (config.usdValue < 10) {
      throw new Error('Minimum USD value is $10');
    }

    // Validate slippage
    if (config.slippage < 0 || config.slippage > 1) {
      throw new Error('Slippage must be between 0 and 1 (e.g., 0.08 for 8%)');
    }
  }

  /**
   * Get SDK configuration
   */
  getConfig(): { apiUrl: string; clientId: string; walletAddress: string | null } {
    return {
      apiUrl: this.apiUrl,
      clientId: this.clientId,
      walletAddress: this.getWalletAddress(),
    };
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

// Export singleton factory
export function createPearSDK(config?: PearSDKConfig): PearProtocolSDK {
  return new PearProtocolSDK(config);
}
