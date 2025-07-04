import { ApiEngine, ApiRequestConfig, ApiResponse } from '../types';

export const axiosEngine: ApiEngine = {
  async request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    try {
      // Only import axios if this engine is used
      const axios = require('axios');
      
      const { url, method = 'GET', data, headers, timeout } = config;
      const response = await axios({
        url,
        method,
        data,
        headers,
        timeout,
        // TODO: cancel token
      });
      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
        raw: response,
      };
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('axios not installed. Please install it: npm install axios');
      }
      throw error;
    }
  },
  // TODO: cancel support
};

