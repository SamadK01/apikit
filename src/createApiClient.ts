import { useState, useCallback, useRef, useEffect } from 'react';
import { ApiKitConfig, ApiRequestConfig, ApiEngine, CancelableRequest, UseApiReturn, ApiError } from './types';
import { fetchEngine } from './engine/fetchEngine';
import { axiosEngine } from './engine/axiosEngine';
import { executeRequest } from './plainApiClient';
import { uploadFile } from './utils/uploader';

export function createApiClient(customConfig: ApiKitConfig) {
  let config: ApiKitConfig = {
    baseUrl: '',
    engine: 'fetch',
    retry: 0,
    timeout: 10000,
    headers: {},
    ...customConfig,
  };

  let engine: ApiEngine = fetchEngine;
  if (config.engine === 'axios') {
    try {
      engine = axiosEngine;
    } catch {
      engine = fetchEngine;
    }
  } else if (config.engine === 'fetch') {
    engine = fetchEngine;
  } else if (config.engine) {
    engine = config.engine;
  }

  const client = {
    config,
    async get<T = any>(url: string, reqConfig?: Partial<ApiRequestConfig>) {
      return executeRequest<T>('GET', url, undefined, reqConfig, config, engine);
    },
    async post<T = any>(url: string, data?: any, reqConfig?: Partial<ApiRequestConfig>) {
      return executeRequest<T>('POST', url, data, reqConfig, config, engine);
    },
    async put<T = any>(url: string, data?: any, reqConfig?: Partial<ApiRequestConfig>) {
      return executeRequest<T>('PUT', url, data, reqConfig, config, engine);
    },
    async patch<T = any>(url: string, data?: any, reqConfig?: Partial<ApiRequestConfig>) {
      return executeRequest<T>('PATCH', url, data, reqConfig, config, engine);
    },
    async del<T = any>(url: string, reqConfig?: Partial<ApiRequestConfig>) {
      return executeRequest<T>('DELETE', url, undefined, reqConfig, config, engine);
    },
    async request<T = any>(reqConfig: ApiRequestConfig) {
      return executeRequest<T>(reqConfig, undefined, undefined, undefined, config, engine);
    },
    async upload<T = any>(url: string, formData: any, reqConfig?: Partial<ApiRequestConfig>) {
      const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `${config.baseUrl}${url}`;
      let token: string | null = null;
      if (config.tokenStorage && !reqConfig?.skipToken) {
        try {
          token = await config.tokenStorage.getToken();
        } catch {
          // Ignore
        }
      }
      const headers = { ...config.headers, ...reqConfig?.headers };
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        const { promise } = uploadFile<T>(fullUrl, formData, { ...reqConfig, headers });
        const res = await promise;
        return { data: res.data, error: null, status: res.status, raw: res.raw };
      } catch (err: any) {
        return {
          data: null,
          error: {
            message: err.message || 'Upload failed',
            status: err.status,
            details: err.details,
            isNetworkError: err.isNetworkError,
          },
        };
      }
    },

    // Scoped useApi hook
    useApi<T = any>(): UseApiReturn<T> {
      const [state, setState] = useState<{
        loading: boolean;
        error: ApiError | null;
        data: T | null;
      }>({
        loading: false,
        error: null,
        data: null,
      });

      const abortControllers = useRef<Record<string, AbortController>>({});

      const reset = useCallback(() => {
        setState({ loading: false, error: null, data: null });
      }, []);

      const makeRequest = useCallback(async (
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        url: string,
        data?: any,
        reqConfig?: Partial<ApiRequestConfig>
      ) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        let controller: AbortController | undefined;
        let signal: AbortSignal | undefined = reqConfig?.signal;
        if (!signal && typeof AbortController !== 'undefined') {
          controller = new AbortController();
          signal = controller.signal;
          abortControllers.current[url] = controller;
        }

        const result = await executeRequest<T>(
          method,
          url,
          data,
          { ...reqConfig, signal },
          config,
          engine
        );

        if (controller) delete abortControllers.current[url];

        setState({
          loading: false,
          error: result.error,
          data: result.data,
        });

        return result;
      }, []);

      function withCancel(fn: (...args: any[]) => Promise<any>) {
        return (...args: any[]): CancelableRequest<T> => {
          const url = args[0];
          let controller: AbortController | undefined;
          if (abortControllers.current[url]) {
            controller = abortControllers.current[url];
          }
          const promise = fn(...args);
          return {
            promise,
            cancel: () => controller?.abort(),
          };
        };
      }

      return {
        ...state,
        get: withCancel((url: string, rConfig?: Partial<ApiRequestConfig>) => makeRequest('GET', url, undefined, rConfig)),
        post: withCancel((url: string, d?: any, rConfig?: Partial<ApiRequestConfig>) => makeRequest('POST', url, d, rConfig)),
        put: withCancel((url: string, d?: any, rConfig?: Partial<ApiRequestConfig>) => makeRequest('PUT', url, d, rConfig)),
        patch: withCancel((url: string, d?: any, rConfig?: Partial<ApiRequestConfig>) => makeRequest('PATCH', url, d, rConfig)),
        del: withCancel((url: string, rConfig?: Partial<ApiRequestConfig>) => makeRequest('DELETE', url, undefined, rConfig)),
        reset,
      };
    },
  };

  return client;
}
