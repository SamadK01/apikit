import { useState, useCallback, useRef, useEffect } from 'react';
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

  const abortControllers = useRef<Record<string, AbortController>>({});

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

    // Setup AbortController
    let controller: AbortController | undefined;
    let signal: AbortSignal | undefined = config?.signal;
    if (!signal) {
      controller = new AbortController();
      signal = controller.signal;
      abortControllers.current[url] = controller;
    }

    // Prepare request config
    const requestConfig: ApiRequestConfig = {
      url: finalUrl,
      method,
      data: method !== 'GET' ? data : undefined,
      headers,
      timeout: config?.timeout || apiConfig.timeout,
      signal,
    };

    const maxRetries = typeof apiConfig.retry === 'number' ? apiConfig.retry : 0;
    let attempt = 0;
    let lastError: ApiError | null = null;
    while (attempt <= maxRetries) {
      try {
        // --- Interceptor: onRequest ---
        let interceptedRequestConfig = requestConfig;
        if (apiConfig.onRequest) {
          interceptedRequestConfig = await apiConfig.onRequest(requestConfig);
        }

        // Caching logic (GET only)
        const isGet = method === 'GET';
        let cacheKey = '';
        if (isGet && apiConfig.cache) {
          cacheKey = url;
          if (config?.params) {
            cacheKey += '?' + Object.entries(config.params).map(([k, v]) => `${k}=${v}`).join('&');
          }
          const cached = await apiConfig.cache.get<{ data: T; status: number }>(cacheKey);
          if (cached) {
            setState({ loading: false, error: null, data: cached.data });
            return;
          }
        }

        // Make request
        const response = await engine.request<T>(interceptedRequestConfig);

        // --- Interceptor: onResponse ---
        let interceptedResponse = response;
        if (apiConfig.onResponse) {
          interceptedResponse = await apiConfig.onResponse(response);
        }

        // Handle 401 globally
        if (interceptedResponse.status === 401 && apiConfig.onUnauthorized) {
          apiConfig.onUnauthorized();
        }

        // After successful GET, store in cache
        if (isGet && apiConfig.cache && interceptedResponse.data !== undefined) {
          const ttl = (config && (config as any).cacheTtlMs) || 60000; // 1 min default
          await apiConfig.cache.set(cacheKey, { data: interceptedResponse.data, status: interceptedResponse.status }, ttl);
        }

        setState({
          loading: false,
          error: null,
          data: interceptedResponse.data,
        });
        return;
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
        // --- Interceptor: onError ---
        if (apiConfig.onError) {
          apiError = await apiConfig.onError(apiError);
        }
        lastError = apiError;
        // Only retry on network error or timeout
        if ((apiError.isNetworkError || apiError.isTimeout) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 200; // Exponential backoff: 200ms, 400ms, 800ms, ...
          await new Promise(res => setTimeout(res, delay));
          attempt++;
          continue;
        }
        setState({
          loading: false,
          error: apiError,
          data: null,
        });
        return;
      }
    }
    // If all retries failed
    setState({
      loading: false,
      error: lastError,
      data: null,
    });
    // After request completes, clean up controller
    if (controller) delete abortControllers.current[url];
  }, []);

  // Helper to wrap each method to return cancel
  function withCancel(fn: any) {
    return (...args: any[]) => {
      let url = args[0];
      let controller: AbortController | undefined;
      const promise = fn(...args);
      if (abortControllers.current[url]) {
        controller = abortControllers.current[url];
      }
      return {
        promise,
        cancel: () => controller?.abort(),
      };
    };
  }

  return {
    ...state,
    get: withCancel((url: string, config?: ApiRequestConfig) => makeRequest('GET', url, undefined, config)),
    post: withCancel((url: string, data?: any, config?: ApiRequestConfig) => makeRequest('POST', url, data, config)),
    put: withCancel((url: string, data?: any, config?: ApiRequestConfig) => makeRequest('PUT', url, data, config)),
    patch: withCancel((url: string, data?: any, config?: ApiRequestConfig) => makeRequest('PATCH', url, data, config)),
    del: withCancel((url: string, config?: ApiRequestConfig) => makeRequest('DELETE', url, undefined, config)),
    reset,
  };
}

// Paginated API hook
export function usePaginatedApi<T = any>(
  url: string,
  {
    pageSize = 20,
    initialPage = 1,
    params = {},
    config,
  }: {
    pageSize?: number;
    initialPage?: number;
    params?: Record<string, any>;
    config?: ApiRequestConfig;
  } = {}
) {
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const apiConfig = getApiKitConfig();
  const engine = getEngine();

  const fetchPage = async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const fullParams = { ...params, page: pageNum, pageSize };
      const fullUrl = url;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
        ...(config?.headers || {}),
      };
      const requestConfig: ApiRequestConfig = {
        url: fullUrl,
        method: 'GET',
        params: fullParams,
        headers,
        timeout: config?.timeout || apiConfig.timeout,
        signal: config?.signal,
      };
      const response = await engine.request<T[]>(requestConfig);
      if (response.status === 401 && apiConfig.onUnauthorized) {
        apiConfig.onUnauthorized();
      }
      setData(prev => (pageNum === 1 ? response.data : [...prev, ...response.data]));
      setHasMore(response.data.length === pageSize);
    } catch (err: any) {
      setError({ message: err.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, url, JSON.stringify(params)]);

  const nextPage = () => {
    if (hasMore && !loading) setPage(p => p + 1);
  };
  const prevPage = () => {
    if (page > 1 && !loading) setPage(p => p - 1);
  };
  const reset = () => {
    setPage(initialPage);
    setData([]);
    setHasMore(true);
    setError(null);
  };

  return { page, data, loading, error, hasMore, nextPage, prevPage, reset };
}
