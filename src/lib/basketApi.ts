/**
 * Basket Trading API Client
 * Connects frontend to backend basket trading endpoints
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export interface AssetWeight {
  asset: string;
  weight: number;
}

export interface BasketTradeRequest {
  longAssets: AssetWeight[];
  shortAssets: AssetWeight[];
  usdValue: number;
  leverage: number;
  slippage?: number;
}

export interface AgentSignal {
  signalId: string;
  timestamp: number;
  basket: {
    longAssets: AssetWeight[];
    shortAssets: AssetWeight[];
  };
  suggestedLeverage: number;
  suggestedUsdValue: number;
  confidence: number;
  expiresAt?: number;
}

/**
 * Authenticate user wallet with Pear Protocol via backend
 */
export async function authenticateWallet(privateKey: string): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  walletAddress?: string;
  expiresAt?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/basket/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privateKey }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Authentication failed');
    }

    return data;
  } catch (error: any) {
    console.error('[BasketAPI] Authentication error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute basket trade
 */
export async function executeBasketTrade(
  accessToken: string,
  request: BasketTradeRequest
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/basket/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Trade execution failed');
    }

    return data;
  } catch (error: any) {
    console.error('[BasketAPI] Execute trade error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute Agent Pear signal
 */
export async function executeAgentSignal(
  accessToken: string,
  signal: AgentSignal,
  overrideUsdValue?: number,
  overrideLeverage?: number
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/basket/execute-signal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        signal,
        overrideUsdValue,
        overrideLeverage,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Signal execution failed');
    }

    return data;
  } catch (error: any) {
    console.error('[BasketAPI] Execute signal error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get open positions
 */
export async function getPositions(accessToken: string): Promise<{
  success: boolean;
  positions?: any[];
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/basket/positions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to get positions');
    }

    return data;
  } catch (error: any) {
    console.error('[BasketAPI] Get positions error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Close position
 */
export async function closePosition(
  accessToken: string,
  positionId: string,
  percentage: number = 1.0
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/basket/close-position`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ positionId, percentage }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to close position');
    }

    return data;
  } catch (error: any) {
    console.error('[BasketAPI] Close position error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get agent wallet status
 */
export async function getAgentWalletStatus(accessToken: string): Promise<{
  success: boolean;
  agentWallet?: any;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/basket/agent-wallet/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to get agent wallet status');
    }

    return data;
  } catch (error: any) {
    console.error('[BasketAPI] Get agent wallet status error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create agent wallet
 */
export async function createAgentWallet(accessToken: string): Promise<{
  success: boolean;
  agentWallet?: any;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/basket/agent-wallet/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to create agent wallet');
    }

    return data;
  } catch (error: any) {
    console.error('[BasketAPI] Create agent wallet error:', error);
    return { success: false, error: error.message };
  }
}
