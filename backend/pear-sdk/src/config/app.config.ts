import { config } from 'dotenv';

config();

export const appConfig = {
  // Your main wallet private key (the one holding funds) - MUST be set in .env
  PRIVATE_KEY: process.env.PRIVATE_KEY || '',
  
  // Pear Protocol API
  API_URL: process.env.API_URL || 'https://hl-v2.pearprotocol.io',
  CLIENT_ID: process.env.CLIENT_ID || 'HLHackathon9',
  
  // Your agent wallet address (from Pear Protocol) - loaded from .env
  AGENT_WALLET_ADDRESS: process.env.AGENT_WALLET_ADDRESS || '',
  
  // Default max fee rate for builder approvals
  DEFAULT_MAX_FEE_RATE: process.env.DEFAULT_MAX_FEE_RATE || '0.1%',
};

