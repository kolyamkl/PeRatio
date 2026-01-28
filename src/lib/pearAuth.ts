/**
 * Pear Protocol Authentication Service
 * Handles EIP-712 signing, token management, and agent wallet operations
 */

const PEAR_API_URL = 'https://hl-v2.pearprotocol.io'
const CLIENT_ID = 'HLHackathon9'

// Token storage keys
const TOKEN_KEY = 'pear_access_token'
const TOKEN_EXPIRY_KEY = 'pear_token_expiry'
const AGENT_WALLET_KEY = 'pear_agent_wallet'

export interface PearAuthState {
  isAuthenticated: boolean
  accessToken: string | null
  expiresAt: number | null
  agentWallet: string | null
  agentWalletStatus: 'NOT_FOUND' | 'PENDING_APPROVAL' | 'ACTIVE' | null
}

export interface AgentWalletInfo {
  agentWalletAddress: string
  status?: string
  createdAt?: string
  expiresAt?: string
}

/**
 * Get stored authentication state
 */
export function getStoredAuthState(): PearAuthState {
  const token = localStorage.getItem(TOKEN_KEY)
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
  const agentWallet = localStorage.getItem(AGENT_WALLET_KEY)
  
  const expiresAt = expiry ? parseInt(expiry, 10) : null
  const isExpired = expiresAt ? Date.now() > expiresAt : true
  
  return {
    isAuthenticated: !!token && !isExpired,
    accessToken: isExpired ? null : token,
    expiresAt: isExpired ? null : expiresAt,
    agentWallet,
    agentWalletStatus: null,
  }
}

/**
 * Store authentication tokens
 */
function storeAuthTokens(accessToken: string, expiresIn: number): void {
  const expiresAt = Date.now() + (expiresIn * 1000)
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString())
}

/**
 * Store agent wallet address
 */
function storeAgentWallet(address: string): void {
  localStorage.setItem(AGENT_WALLET_KEY, address)
}

/**
 * Clear all stored auth data
 */
export function clearAuthState(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
  localStorage.removeItem(AGENT_WALLET_KEY)
}

/**
 * Get EIP-712 message from Pear Protocol API
 */
async function getEIP712Message(address: string): Promise<any> {
  const response = await fetch(
    `${PEAR_API_URL}/auth/eip712-message?address=${address}&clientId=${CLIENT_ID}`
  )
  
  if (!response.ok) {
    throw new Error(`Failed to get EIP-712 message: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Sign EIP-712 message using wagmi's signTypedData (handles chain correctly)
 * This is called from walletProvider with the signTypedDataAsync function
 */
export async function signEIP712Message(
  address: string,
  eipData: any,
  signTypedDataAsync: (params: any) => Promise<string>
): Promise<string> {
  console.log('[PearAuth] EIP-712 data received:', JSON.stringify(eipData, null, 2))
  
  // Remove EIP712Domain from types (wagmi handles it)
  const { EIP712Domain, ...types } = eipData.types
  
  console.log('[PearAuth] Signing with wagmi signTypedDataAsync...')
  
  try {
    // Use wagmi's signTypedDataAsync which handles chain correctly
    const signature = await signTypedDataAsync({
      domain: eipData.domain,
      types: types,
      primaryType: eipData.primaryType,
      message: eipData.message,
    })
    
    console.log('[PearAuth] Signature received:', signature?.substring(0, 20) + '...')
    return signature
  } catch (error: any) {
    console.error('[PearAuth] Signing error:', error)
    console.error('[PearAuth] Error code:', error?.code)
    console.error('[PearAuth] Error message:', error?.message)
    throw error
  }
}

/**
 * Authenticate with Pear Protocol and get access token
 */
export async function authenticateWithPear(
  address: string,
  signTypedDataAsync: (params: any) => Promise<string>
): Promise<{ accessToken: string; expiresIn: number }> {
  console.log('[PearAuth] 🔐 Starting authentication for:', address)
  
  // Step 1: Get EIP-712 message
  console.log('[PearAuth] 📝 Getting EIP-712 message...')
  const eipData = await getEIP712Message(address)
  
  // Step 2: Sign the message using wagmi's signTypedDataAsync
  console.log('[PearAuth] ✍️ Requesting signature...')
  const signature = await signEIP712Message(address, eipData, signTypedDataAsync)
  console.log('[PearAuth] ✅ Message signed')
  
  // Step 3: Login with signature
  // Use the address from the EIP-712 message (Pear lowercases it)
  const loginAddress = eipData.message.address || address.toLowerCase()
  
  console.log('[PearAuth] 🔑 Authenticating with Pear Protocol...')
  console.log('[PearAuth] Login address:', loginAddress)
  console.log('[PearAuth] Timestamp:', eipData.message.timestamp)
  console.log('[PearAuth] Signature:', signature.substring(0, 30) + '...')
  
  const loginPayload = {
    method: 'eip712',
    address: loginAddress,
    clientId: CLIENT_ID,
    details: {
      signature: signature,
      timestamp: eipData.message.timestamp,
    },
  }
  
  console.log('[PearAuth] Login payload:', JSON.stringify(loginPayload, null, 2))
  
  const loginResponse = await fetch(`${PEAR_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginPayload),
  })
  
  if (!loginResponse.ok) {
    const error = await loginResponse.text()
    throw new Error(`Authentication failed: ${error}`)
  }
  
  const tokens = await loginResponse.json()
  console.log('[PearAuth] ✅ Authentication successful!')
  
  // Store tokens
  storeAuthTokens(tokens.accessToken, tokens.expiresIn)
  
  return {
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
  }
}

/**
 * Check agent wallet status
 */
export async function checkAgentWallet(
  accessToken: string
): Promise<AgentWalletInfo | null> {
  console.log('[PearAuth] 🔍 Checking agent wallet status...')
  
  try {
    const response = await fetch(`${PEAR_API_URL}/agentWallet?clientId=${CLIENT_ID}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    })
    
    if (response.status === 404) {
      console.log('[PearAuth] 📭 No agent wallet found')
      return null
    }
    
    if (!response.ok) {
      throw new Error(`Failed to check agent wallet: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (data.agentWalletAddress) {
      console.log('[PearAuth] ✅ Agent wallet found:', data.agentWalletAddress)
      storeAgentWallet(data.agentWalletAddress)
      return data
    }
    
    return null
  } catch (error: any) {
    if (error.message?.includes('404')) {
      return null
    }
    throw error
  }
}

/**
 * Create new agent wallet
 */
export async function createAgentWallet(
  accessToken: string
): Promise<AgentWalletInfo> {
  console.log('[PearAuth] 🔧 Creating agent wallet...')
  
  const response = await fetch(`${PEAR_API_URL}/agentWallet`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clientId: CLIENT_ID }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create agent wallet: ${error}`)
  }
  
  const data = await response.json()
  console.log('[PearAuth] ✅ Agent wallet created:', data.agentWalletAddress)
  
  storeAgentWallet(data.agentWalletAddress)
  
  return data
}

/**
 * Get user state (balances and positions) from Hyperliquid via Pear
 */
export async function getUserState(accessToken: string): Promise<any> {
  console.log('[PearAuth] 💰 Fetching user state...')
  
  const response = await fetch(`${PEAR_API_URL}/hl/user-state`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })
  
  if (!response.ok) {
    throw new Error(`Failed to get user state: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Get available margin from Pear Protocol (withdrawable balance)
 * This is the actual trading balance available on Pear Garden
 * 
 * Strategy:
 * 1. Get the user's wallet address from the JWT token
 * 2. Query Hyperliquid's public API directly for the user's balance
 */
export async function getAvailableMargin(accessToken: string): Promise<number> {
  console.log('[PearAuth] 💰 Fetching available margin...')
  
  // Extract user address from JWT token
  let userAddress: string | null = null
  try {
    const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
    userAddress = tokenPayload.address || tokenPayload.userId
    console.log('[PearAuth] User address from token:', userAddress)
  } catch (e) {
    console.log('[PearAuth] Could not parse JWT token')
  }
  
  // If we have the user address, query Hyperliquid directly
  if (userAddress) {
    try {
      console.log('[PearAuth] Querying Hyperliquid API for balance...')
      const hlResponse = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: userAddress,
        }),
      })
      
      if (hlResponse.ok) {
        const hlData = await hlResponse.json()
        console.log('[PearAuth] Hyperliquid response:', JSON.stringify(hlData).substring(0, 500))
        
        // Hyperliquid clearinghouseState response structure:
        // { marginSummary: { accountValue, totalMarginUsed, ... }, withdrawable, ... }
        if (hlData.withdrawable !== undefined) {
          const margin = parseFloat(hlData.withdrawable) || 0
          console.log('[PearAuth] ✅ Found withdrawable from Hyperliquid:', margin)
          return margin
        }
        if (hlData.marginSummary?.accountValue !== undefined) {
          const margin = parseFloat(hlData.marginSummary.accountValue) || 0
          console.log('[PearAuth] ✅ Found accountValue from Hyperliquid:', margin)
          return margin
        }
      }
    } catch (error) {
      console.log('[PearAuth] Hyperliquid API error:', error)
    }
  }
  
  // Fallback: Try Pear API endpoints
  // Try /hl/user-state 
  try {
    console.log('[PearAuth] Trying Pear /hl/user-state endpoint...')
    const response = await fetch(`${PEAR_API_URL}/hl/user-state`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('[PearAuth] /hl/user-state response:', JSON.stringify(data).substring(0, 500))
      
      if (data.withdrawable !== undefined) {
        const margin = parseFloat(data.withdrawable) || 0
        console.log('[PearAuth] ✅ Found withdrawable:', margin)
        return margin
      }
      if (data.marginSummary?.accountValue !== undefined) {
        const margin = parseFloat(data.marginSummary.accountValue) || 0
        console.log('[PearAuth] ✅ Found marginSummary.accountValue:', margin)
        return margin
      }
    } else {
      console.log('[PearAuth] /hl/user-state returned', response.status)
    }
  } catch (error) {
    console.log('[PearAuth] /hl/user-state error:', error)
  }
  
  console.log('[PearAuth] ⚠️ Could not fetch balance')
  return 0
}

/**
 * Get open positions from Pear Protocol
 */
export async function getPositions(accessToken: string): Promise<any[]> {
  console.log('[PearAuth] 📊 Fetching positions...')
  
  const response = await fetch(`${PEAR_API_URL}/positions`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })
  
  if (!response.ok) {
    throw new Error(`Failed to get positions: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Execute trade via Pear Protocol API
 */
export async function executePearTrade(
  accessToken: string,
  tradeParams: {
    longAssets: Array<{ asset: string; weight: number }>
    shortAssets: Array<{ asset: string; weight: number }>
    usdValue: number
    leverage: number
    takeProfit?: { type: string; value: number }
    stopLoss?: { type: string; value: number }
  }
): Promise<any> {
  console.log('[PearAuth] 🚀 Executing trade via Pear Protocol...')
  console.log('[PearAuth] Trade params:', JSON.stringify(tradeParams, null, 2))
  
  const positionData = {
    executionType: 'MARKET',
    slippage: 0.08, // 8% slippage tolerance
    leverage: tradeParams.leverage,
    usdValue: tradeParams.usdValue,
    longAssets: tradeParams.longAssets,
    shortAssets: tradeParams.shortAssets,
    ...(tradeParams.takeProfit && { takeProfit: tradeParams.takeProfit }),
    ...(tradeParams.stopLoss && { stopLoss: tradeParams.stopLoss }),
  }
  
  const response = await fetch(`${PEAR_API_URL}/positions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(positionData),
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('[PearAuth] ❌ Trade execution failed:', error)
    throw new Error(`Trade execution failed: ${error}`)
  }
  
  const result = await response.json()
  console.log('[PearAuth] ✅ Trade executed successfully:', result)
  
  return result
}

/**
 * Build Hyperliquid approval message for agent wallet
 * User needs to sign this on Hyperliquid to approve the agent
 */
export function buildApprovalMessage(agentWalletAddress: string): {
  message: string
  url: string
} {
  return {
    message: `Approve agent wallet ${agentWalletAddress} on Hyperliquid Exchange`,
    url: `https://app.hyperliquid.xyz/api-wallet?agentAddress=${agentWalletAddress}`,
  }
}

export { PEAR_API_URL, CLIENT_ID }
