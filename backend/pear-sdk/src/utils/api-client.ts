import axios, { AxiosRequestConfig } from 'axios';
import { getConfig } from './auth.js';

const { apiUrl, clientId } = getConfig();

/**
 * Create an API client with authentication
 */
export class PearApiClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make a GET request to Pear Protocol API
   */
  async get(endpoint: string, params?: any) {
    try {
      const response = await axios.get(`${apiUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        params: params,
      });
      return response.data;
    } catch (error: any) {
      console.error(`GET ${endpoint} failed:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Make a POST request to Pear Protocol API
   */
  async post(endpoint: string, data?: any) {
    try {
      const response = await axios.post(`${apiUrl}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error(`POST ${endpoint} failed:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Make a DELETE request to Pear Protocol API
   */
  async delete(endpoint: string, params?: any) {
    try {
      const response = await axios.delete(`${apiUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        params: params,
      });
      return response.data;
    } catch (error: any) {
      console.error(`DELETE ${endpoint} failed:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get agent wallet status
   */
  async getAgentWallet() {
    return this.get('/agentWallet', { clientId });
  }

  /**
   * Create agent wallet
   */
  async createAgentWallet() {
    return this.post('/agentWallet', { clientId });
  }

  // Add more API methods as you discover them...
  
  /**
   * Example: Place an order (endpoint may vary)
   */
  async placeOrder(orderData: any) {
    return this.post('/orders', { ...orderData, clientId });
  }

  /**
   * Example: Cancel an order (endpoint may vary)
   */
  async cancelOrder(orderId: string) {
    return this.delete(`/orders/${orderId}`, { clientId });
  }
}

/**
 * Create a new API client instance
 */
export function createApiClient(accessToken: string): PearApiClient {
  return new PearApiClient(accessToken);
}

