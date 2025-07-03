import { ApiEngine, ApiRequestConfig, ApiResponse } from '../types';
// @ts-ignore
import axios from 'axios';

export const axiosEngine: ApiEngine = {
  async request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    // TODO: Support cancel tokens, interceptors, params serialization, and smart response parsing
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
  },
  // TODO: cancel support
};
