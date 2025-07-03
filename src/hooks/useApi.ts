import { useState, useCallback } from 'react';
import { ApiKitConfig, UseApiReturn, ApiError, ApiRequestConfig, ApiEngine } from '../types';
import { fetchEngine } from '../engine/fetchEngine';

// TODO: import asyncStorageToken, secureStoreToken, and allow custom storage

let globalConfig: ApiKitConfig = {};

export function configureApiKit(config: ApiKitConfig) {
  globalConfig = config;
}

export function useApi<T = any>(): UseApiReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<T | null>(null);

  // Select engine
  const engine: ApiEngine =
    typeof globalConfig.engine === 'string'
      ? globalConfig.engine === 'axios'
        ? require('../engine/axiosEngine').axiosEngine
        : fetchEngine
      : globalConfig.engine || fetchEngine;

  // TODO: token injection using globalConfig.tokenStorage
  // TODO: network status detection
  // TODO: timeout, cancel, retry logic
  // TODO: global 401 handling
  // TODO: friendly error messages

  const request = useCallback(
    async (method: string, url: string, body?: any, config?: ApiRequestConfig) => {
      setLoading(true);
      setError(null);
      try {
        // TODO: inject token, merge headers, handle params
        const response = await engine.request<T>({
          url: (globalConfig.baseUrl || '') + url,
          method: method as any,
          data: body,
          ...globalConfig,
          ...config,
        });
        setData(response.data);
      } catch (err: any) {
        // TODO: parse error, handle network/server/validation errors
        setError({ message: err.message || 'Unknown error' });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    data,
    get: (url, config) => request('GET', url, undefined, config),
    post: (url, body, config) => request('POST', url, body, config),
    put: (url, body, config) => request('PUT', url, body, config),
    patch: (url, body, config) => request('PATCH', url, body, config),
    del: (url, config) => request('DELETE', url, undefined, config),
    reset: () => {
      setData(null);
      setError(null);
      setLoading(false);
    },
  };
}
