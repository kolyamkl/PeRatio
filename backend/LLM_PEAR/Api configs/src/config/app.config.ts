import { config } from 'dotenv';

config();

export const appConfig = {
  // Your main wallet private key (the one holding funds)
  PRIVATE_KEY: process.env.PRIVATE_KEY || '0x0bdf16a63e821edbe14b8b0ec75378ce6bff7268a2f5ff6b2ec5911ad9e4099f',
  
  // Pear Protocol API
  API_URL: process.env.API_URL || 'https://hl-v2.pearprotocol.io',
  CLIENT_ID: process.env.CLIENT_ID || 'HLHackathon9',
  
  // Your agent wallet address (from Pear Protocol)
  AGENT_WALLET_ADDRESS: process.env.AGENT_WALLET_ADDRESS || '0x97964055012046D6C85416248D78B20D95d55ce6',
  
  // Default max fee rate for builder approvals
  DEFAULT_MAX_FEE_RATE: process.env.DEFAULT_MAX_FEE_RATE || '0.1%',
};

