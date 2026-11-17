import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, ApiRequestConfig, CancelableRequest, PaginationResult, UseApiReturn, UsePaginatedApiOptions, UsePaginatedApiReturn } from '../types';
import { executeRequest } from '../plainApiClient';

type Result<T> = { data: T | null; error: ApiError | null; status?: number; raw?: any };
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export function useApi<T = any>(): UseApiReturn<T> {
  const [state, setState] = useState({ loading: false, error: null as ApiError | null, data: null as T | null });
  const controllers = useRef(new Set<AbortController>());
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; controllers.current.forEach(controller => controller.abort()); controllers.current.clear(); }, []);

  const request = useCallback((method: Method, url: string, data?: unknown, config?: Partial<ApiRequestConfig>): CancelableRequest<T> => {
    const controller = !config?.signal && typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    if (controller) controllers.current.add(controller);
    if (mounted.current) setState(previous => ({ ...previous, loading: true, error: null }));
    const promise: Promise<Result<T>> = executeRequest<T>(method, url, data, { ...config, signal: config?.signal || controller?.signal })
      .then(result => { if (mounted.current) setState({ loading: false, error: result.error, data: result.data }); return result; })
      .finally(() => { if (controller) controllers.current.delete(controller); });
    return { promise, cancel: () => controller?.abort() };
  }, []);

  return {
    ...state,
    get: (url, config) => request('GET', url, undefined, config),
    post: (url, data, config) => request('POST', url, data, config),
    put: (url, data, config) => request('PUT', url, data, config),
    patch: (url, data, config) => request('PATCH', url, data, config),
    del: (url, config) => request('DELETE', url, undefined, config),
    reset: () => { if (mounted.current) setState({ loading: false, error: null, data: null }); },
  };
}

function defaultPage<T>(response: unknown): PaginationResult<T> {
  if (Array.isArray(response)) return { items: response as T[] };
  const value = (response || {}) as Record<string, any>;
  const items = Array.isArray(value.items) ? value.items : Array.isArray(value.data) ? value.data : Array.isArray(value.results) ? value.results : [];
  const meta = value.meta || value.pagination || {};
  return { items, hasMore: typeof value.hasMore === 'boolean' ? value.hasMore : typeof meta.hasMore === 'boolean' ? meta.hasMore : undefined, nextCursor: value.nextCursor ?? value.next_cursor ?? meta.nextCursor ?? meta.next_cursor ?? null };
}

/** Infinite pagination for offset/page APIs and cursor APIs. */
export function usePaginatedApi<T = any>(url: string, options: UsePaginatedApiOptions<T> = {}): UsePaginatedApiReturn<T> {
  const { mode = 'offset', pageSize = 20, initialPage = 1, initialCursor = null, params = {}, pageParamName = 'page', cursorParamName = 'cursor', pageSizeParamName = 'limit', config, getPage = defaultPage<T> } = options;
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(initialPage);
  const [nextCursor, setNextCursor] = useState<string | number | null>(initialCursor);
  const state = useRef({ page: initialPage, cursor: initialCursor as string | number | null, hasMore: true, requestId: 0, busy: false });
  const mounted = useRef(true);
  const configRef = useRef(config);
  const getPageRef = useRef(getPage);
  configRef.current = config;
  getPageRef.current = getPage;
  const paramsKey = JSON.stringify(params);
  useEffect(() => () => { mounted.current = false; }, []);

  const fetchPage = useCallback(async (kind: 'initial' | 'more' | 'refresh') => {
    if (kind === 'more' && (!state.current.hasMore || state.current.busy)) return;
    const requestId = ++state.current.requestId;
    state.current.busy = true;
    if (kind === 'more') setIsLoadingMore(true); else if (kind === 'refresh') setIsRefreshing(true); else setIsLoading(true);
    setError(null);
    const first = kind !== 'more';
    const targetPage = first ? initialPage : state.current.page + 1;
    const targetCursor = first ? initialCursor : state.current.cursor;
    const requestParams: Record<string, unknown> = { ...params, [pageSizeParamName]: pageSize };
    if (mode === 'cursor') { if (targetCursor !== null && targetCursor !== undefined) requestParams[cursorParamName] = targetCursor; }
    else requestParams[pageParamName] = targetPage;
    const result = await executeRequest<unknown>('GET', url, undefined, { ...configRef.current, params: requestParams });
    if (!mounted.current || requestId !== state.current.requestId) return;
    if (result.error) setError(result.error);
    else {
      const resolved = getPageRef.current(result.data);
      const more = resolved.hasMore ?? (mode === 'cursor' ? resolved.nextCursor !== null && resolved.nextCursor !== undefined : resolved.items.length >= pageSize);
      setData(previous => first ? resolved.items : [...previous, ...resolved.items]);
      setHasMore(more); setPage(targetPage); setNextCursor(resolved.nextCursor ?? null);
      state.current = { ...state.current, page: targetPage, cursor: resolved.nextCursor ?? null, hasMore: more, busy: false };
    }
    state.current.busy = false;
    if (mounted.current && requestId === state.current.requestId) { setIsLoading(false); setIsLoadingMore(false); setIsRefreshing(false); }
  }, [cursorParamName, initialCursor, initialPage, mode, pageParamName, pageSize, pageSizeParamName, paramsKey, url]);

  useEffect(() => { void fetchPage('initial'); }, [fetchPage]);
  const loadMore = useCallback(async () => { await fetchPage('more'); }, [fetchPage]);
  const refresh = useCallback(async () => { await fetchPage('refresh'); }, [fetchPage]);
  const reset = useCallback(() => { state.current = { page: initialPage, cursor: initialCursor, hasMore: true, requestId: state.current.requestId + 1, busy: false }; setData([]); setError(null); setHasMore(true); setPage(initialPage); setNextCursor(initialCursor); }, [initialCursor, initialPage]);
  return { data, error, hasMore, isLoading, isLoadingMore, isRefreshing, page, nextCursor, loadMore, nextPage: loadMore, refresh, reset };
}
