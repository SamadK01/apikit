import { useState, useCallback } from 'react';
import { UseApiReturn, ApiRequestConfig, ApiError } from '../types';
import { getApiKitConfig, getEngine } from '../config';

export function useApi<T = any>(): UseApiReturn<T> {
  const [state, setState] = useState<{
    loading: boolean;
    error: ApiError | null;
    data: T | null;
  }>({
    loading: false,
    error: null,
    data: null,
  });

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      data: null,
    });
  }, []);

  const makeRequest = useCallback(async (
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    data?: any,
    config?: ApiRequestConfig
  ) => {
    const apiConfig = getApiKitConfig();
    const engine = getEngine();
    
    if (!apiConfig.baseUrl) {
      console.warn('ApiKit: baseUrl not configured. Please call configureApiKit first.');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get token if storage is configured
      let token: string | null = null;
      if (apiConfig.tokenStorage) {
        try {
          token = await apiConfig.tokenStorage.getToken();
        } catch (error) {
          console.warn('ApiKit: Failed to get token from storage:', error);
        }
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
        ...config?.headers,
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Build full URL
      const fullUrl = url.startsWith('http') ? url : `${apiConfig.baseUrl}${url}`;
      
      // Add query parameters
      let finalUrl = fullUrl;
      if (config?.params) {
        const params = new URLSearchParams();
        Object.entries(config.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
        const queryString = params.toString();
        if (queryString) {
          finalUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
        }
      }

      // Prepare request config
      const requestConfig: ApiRequestConfig = {
        url: finalUrl,
        method,
        data: method !== 'GET' ? data : undefined,
        headers,
        timeout: config?.timeout || apiConfig.timeout,
        signal: config?.signal,
      };

      // Make request
      const response = await engine.request<T>(requestConfig);

      // Handle 401 globally
      if (response.status === 401 && apiConfig.onUnauthorized) {
        apiConfig.onUnauthorized();
      }

      setState({
        loading: false,
        error: null,
        data: response.data,
      });

    } catch (error: any) {
      let apiError: ApiError;

      if (error.name === 'AbortError') {
        apiError = {
          message: 'Request cancelled',
          isNetworkError: false,
        };
      } else if (error.message?.includes('Network request failed')) {
        apiError = {
          message: 'No internet connection',
          isNetworkError: true,
        };
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        apiError = {
          message: 'Request timeout',
          isTimeout: true,
        };
      } else {
        apiError = {
          message: error.message || 'An error occurred',
          status: error.response?.status,
          details: error.response?.data,
          isUnauthorized: error.response?.status === 401,
        };
      }

      setState({
        loading: false,
        error: apiError,
        data: null,
      });
    }
  }, []);

  const get = useCallback((url: string, config?: ApiRequestConfig) => 
    makeRequest('GET', url, undefined, config), [makeRequest]);

  const post = useCallback((url: string, data?: any, config?: ApiRequestConfig) => 
    makeRequest('POST', url, data, config), [makeRequest]);

  const put = useCallback((url: string, data?: any, config?: ApiRequestConfig) => 
    makeRequest('PUT', url, data, config), [makeRequest]);

  const patch = useCallback((url: string, data?: any, config?: ApiRequestConfig) => 
    makeRequest('PATCH', url, data, config), [makeRequest]);

  const del = useCallback((url: string, config?: ApiRequestConfig) => 
    makeRequest('DELETE', url, undefined, config), [makeRequest]);

  return {
    ...state,
    get,
    post,
    put,
    patch,
    del,
    reset,
  };
}
