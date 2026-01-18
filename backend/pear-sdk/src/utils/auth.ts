import { ethers } from 'ethers';
import axios from 'axios';
import { config } from 'dotenv';

config();

const API_URL = process.env.API_URL || 'https://hl-v2.pearprotocol.io';
const CLIENT_ID = process.env.CLIENT_ID || 'HLHackathon9';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

/**
 * Authenticate with Pear Protocol and get access token
 * @returns Access token or null if authentication fails
 */
export async function authenticate(): Promise<string | null> {
  if (!PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not found in .env');
    return null;
  }

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`🔐 Authenticating as ${wallet.address}`);

  try {
    // Step 1: Get EIP-712 message
    const msgResponse = await axios.get(`${API_URL}/auth/eip712-message`, {
      params: { address: wallet.address, clientId: CLIENT_ID },
    });
    const eipData = msgResponse.data;

    // Step 2: Sign the message
    const domain = eipData.domain;
    const types = { ...eipData.types };
    const value = eipData.message;

    if (types.EIP712Domain) {
      delete types.EIP712Domain;
    }

    const signature = await wallet.signTypedData(domain, types, value);

    // Step 3: Login
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      method: 'eip712',
      address: wallet.address,
      clientId: CLIENT_ID,
      details: { signature, timestamp: value.timestamp },
    });

    console.log("✅ Authentication successful!");
    return loginResponse.data.accessToken;
  } catch (error: any) {
    console.error("❌ Authentication failed:", error.response?.data || error.message);
    return null;
  }
}

/**
 * Get current wallet address from private key
 */
export function getWalletAddress(): string | null {
  if (!PRIVATE_KEY) {
    return null;
  }
  const wallet = new ethers.Wallet(PRIVATE_KEY);
  return wallet.address;
}

/**
 * Get API configuration
 */
export function getConfig() {
  return {
    apiUrl: API_URL,
    clientId: CLIENT_ID,
  };
}

