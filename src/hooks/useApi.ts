import { useState, useCallback, useRef, useEffect } from 'react';
import { UseApiReturn, ApiRequestConfig, ApiError, CancelableRequest } from '../types';
import { executeRequest } from '../plainApiClient';
import { getApiKitConfig } from '../config';

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
    config?: Partial<ApiRequestConfig>
  ): Promise<{ data: T | null; error: ApiError | null; status?: number; raw?: any }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    // Setup AbortController
    let controller: AbortController | undefined;
    let signal: AbortSignal | undefined = config?.signal;
    if (!signal && typeof AbortController !== 'undefined') {
      controller = new AbortController();
      signal = controller.signal;
      abortControllers.current[url] = controller;
    }

    const result = await executeRequest<T>(
      method,
      url,
      data,
      { ...config, signal }
    );

    if (controller) {
      delete abortControllers.current[url];
    }

    setState({
      loading: false,
      error: result.error,
      data: result.data,
    });

    return result;
  }, []);

  // Helper to wrap each method to return cancel and strongly typed result
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
    get: withCancel((url: string, config?: Partial<ApiRequestConfig>) => makeRequest('GET', url, undefined, config)),
    post: withCancel((url: string, data?: any, config?: Partial<ApiRequestConfig>) => makeRequest('POST', url, data, config)),
    put: withCancel((url: string, data?: any, config?: Partial<ApiRequestConfig>) => makeRequest('PUT', url, data, config)),
    patch: withCancel((url: string, data?: any, config?: Partial<ApiRequestConfig>) => makeRequest('PATCH', url, data, config)),
    del: withCancel((url: string, config?: Partial<ApiRequestConfig>) => makeRequest('DELETE', url, undefined, config)),
    reset,
  };
}

export interface UsePaginatedApiOptions {
  pageSize?: number;
  initialPage?: number;
  params?: Record<string, any>;
  pageParamName?: string;
  pageSizeParamName?: string;
  config?: Partial<ApiRequestConfig>;
}

// Paginated API hook
export function usePaginatedApi<T = any>(
  url: string,
  {
    pageSize = 20,
    initialPage = 1,
    params = {},
    pageParamName = 'page',
    pageSizeParamName = 'pageSize',
    config,
  }: UsePaginatedApiOptions = {}
) {
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = async (pageNum: number, isRefresh: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = {
        ...params,
        [pageParamName]: pageNum,
        [pageSizeParamName]: pageSize,
      };

      const result = await executeRequest<any>('GET', url, undefined, {
        ...config,
        params: queryParams,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      // Handle raw array or nested items (e.g. { results: [] } or { data: [] })
      let items: T[] = [];
      const resData = result.data;
      if (Array.isArray(resData)) {
        items = resData;
      } else if (resData && Array.isArray(resData.data)) {
        items = resData.data;
      } else if (resData && Array.isArray(resData.results)) {
        items = resData.results;
      } else if (resData && Array.isArray(resData.items)) {
        items = resData.items;
      }

      setData(prev => (pageNum === 1 || isRefresh ? items : [...prev, ...items]));
      setHasMore(items.length >= pageSize);
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

  const refresh = () => {
    setPage(initialPage);
    fetchPage(initialPage, true);
  };

  const reset = () => {
    setPage(initialPage);
    setData([]);
    setHasMore(true);
    setError(null);
  };

  return { page, data, loading, error, hasMore, nextPage, prevPage, refresh, reset };
}
