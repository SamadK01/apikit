import { getApiKitConfig, getEngine } from './config';
import { ApiRequestConfig, ApiError, ApiResponse, ApiKitConfig, ApiEngine } from './types';
import { apiLogger } from './utils/logger';
import { parseRetryAfter, calculateBackoffWithJitter } from './utils/rateLimit';
import { uploadFile } from './utils/uploader';
import { offlineQueue } from './offline/offlineQueue';

let tokenRefreshPromise: Promise<string | null> | null = null;

export async function executeRequest<T = any>(
  methodOrConfig: ApiRequestConfig | string,
  urlOrConfig?: string | any,
  data?: any,
  config?: Partial<ApiRequestConfig>,
  customConfig?: ApiKitConfig,
  customEngine?: ApiEngine
): Promise<{ data: T | null; error: ApiError | null; status?: number; raw?: any }> {
  let method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET';
  let url = '';
  let finalConfig: Partial<ApiRequestConfig> = {};
  let body: any = undefined;

  if (typeof methodOrConfig === 'string') {
    method = methodOrConfig as any;
    url = urlOrConfig as string;
    body = data;
    finalConfig = config || {};
  } else {
    finalConfig = methodOrConfig as Partial<ApiRequestConfig>;
    method = (finalConfig.method || 'GET') as any;
    url = finalConfig.url || '';
    body = finalConfig.data;
  }

  if (!url) {
    return { data: null, error: { message: 'ApiKit: URL is required.' } };
  }

  const apiConfig = customConfig || getApiKitConfig();
  const engine = customEngine || getEngine();

  // Allow absolute URLs even if baseUrl is not configured
  if (!apiConfig.baseUrl && !url.startsWith('http://') && !url.startsWith('https://')) {
    return { data: null, error: { message: 'ApiKit: baseUrl not configured. Please call configureApiKit first.' } };
  }

  const maxRetries = typeof finalConfig.retry === 'number' 
    ? finalConfig.retry 
    : typeof apiConfig.retry === 'number' ? apiConfig.retry : 0;

  let attempt = 0;
  let lastError: ApiError | null = null;
  let hasRefreshedToken = false;

  // --- Caching logic (GET only) ---
  const isGet = method === 'GET';
  let cacheKey = '';
  if (isGet && apiConfig.cache && !finalConfig.skipCache) {
    let rawUrl = url;
    let params = finalConfig.params;
    cacheKey = rawUrl;
    if (params) {
      cacheKey += '?' + Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
    }
    const cached = await apiConfig.cache.get<{ data: T; status: number; raw?: any }>(cacheKey);
    if (cached) {
      return { data: cached.data, error: null, status: cached.status, raw: cached.raw };
    }
  }

  const startTime = Date.now();

  while (attempt <= maxRetries) {
    try {
      // 1. Get token if storage is configured
      let token: string | null = null;
      if (apiConfig.tokenStorage && !finalConfig.skipToken) {
        try {
          token = await apiConfig.tokenStorage.getToken();
        } catch {
          // Ignore
        }
      }

      // 2. Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
        ...finalConfig.headers,
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // 3. Build full URL
      const fullUrl = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `${apiConfig.baseUrl}${url}`;

      let finalUrl = fullUrl;
      if (finalConfig.params) {
        const queryParts: string[] = [];
        Object.entries(finalConfig.params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
          }
        });
        if (queryParts.length > 0) {
          finalUrl += (fullUrl.includes('?') ? '&' : '?') + queryParts.join('&');
        }
      }

      // 4. Prepare request config
      const requestConfig: ApiRequestConfig = {
        url: finalUrl,
        method,
        data: method !== 'GET' ? body : undefined,
        headers,
        timeout: finalConfig.timeout || apiConfig.timeout,
        signal: finalConfig.signal,
      };

      // --- Interceptor: onRequest ---
      let interceptedRequestConfig = requestConfig;
      if (apiConfig.onRequest) {
        interceptedRequestConfig = await apiConfig.onRequest(requestConfig);
      }

      apiLogger.logRequest(method, finalUrl, interceptedRequestConfig.headers, interceptedRequestConfig.data);

      // 5. Make request
      const response: ApiResponse<T> = await engine.request<T>(interceptedRequestConfig);

      // --- Interceptor: onResponse ---
      let interceptedResponse = response;
      if (apiConfig.onResponse) {
        interceptedResponse = await apiConfig.onResponse(response);
      }

      // 6. Handle 401 & Silent Token Refresh
      if (interceptedResponse.status === 401) {
        if (apiConfig.refreshToken && !hasRefreshedToken) {
          hasRefreshedToken = true;
          try {
            if (!tokenRefreshPromise) {
              tokenRefreshPromise = apiConfig.refreshToken();
            }
            const newToken = await tokenRefreshPromise;
            tokenRefreshPromise = null;

            if (newToken && apiConfig.tokenStorage) {
              await apiConfig.tokenStorage.setToken(newToken);
              // Retry with new token
              continue;
            }
          } catch (refreshErr) {
            tokenRefreshPromise = null;
            apiConfig.onTokenRefreshFailed?.();
          }
        }

        if (apiConfig.onUnauthorized) {
          apiConfig.onUnauthorized();
        }
      }

      // 7. Handle 429 Rate Limiting
      if (interceptedResponse.status === 429 && (apiConfig.retryAfter429 !== false || finalConfig.retryAfter429)) {
        const delayMs = parseRetryAfter(interceptedResponse.headers) || calculateBackoffWithJitter(attempt);
        if (attempt < maxRetries) {
          await new Promise(res => setTimeout(res, delayMs));
          attempt++;
          continue;
        }
      }

      // 8. Runtime Schema Validation (Zod, Yup, etc.)
      let finalData = interceptedResponse.data;
      if (finalConfig.schema) {
        if (typeof finalConfig.schema.safeParse === 'function') {
          const parseResult = finalConfig.schema.safeParse(finalData);
          if (!parseResult.success) {
            return {
              data: null,
              error: {
                message: 'ApiKit: Response schema validation failed',
                status: interceptedResponse.status,
                details: parseResult.error,
              },
              status: interceptedResponse.status,
              raw: interceptedResponse.raw,
            };
          }
          finalData = parseResult.data;
        } else if (typeof finalConfig.schema.parse === 'function') {
          try {
            finalData = finalConfig.schema.parse(finalData);
          } catch (valErr: any) {
            return {
              data: null,
              error: {
                message: 'ApiKit: Response schema validation failed',
                status: interceptedResponse.status,
                details: valErr,
              },
              status: interceptedResponse.status,
              raw: interceptedResponse.raw,
            };
          }
        }
      }

      // 9. After successful GET, store in cache
      if (isGet && apiConfig.cache && finalData !== undefined && interceptedResponse.status >= 200 && interceptedResponse.status < 300) {
        const ttl = finalConfig.cacheTtlMs || 60000;
        await apiConfig.cache.set(cacheKey, { data: finalData, status: interceptedResponse.status, raw: interceptedResponse.raw }, ttl);
      }

      const duration = Date.now() - startTime;
      apiLogger.logResponse(method, finalUrl, interceptedResponse.status, duration, finalData);

      return {
        data: finalData,
        error: interceptedResponse.status >= 400 ? {
          message: `Request failed with status ${interceptedResponse.status}`,
          status: interceptedResponse.status,
          details: finalData,
          isUnauthorized: interceptedResponse.status === 401,
          isRateLimited: interceptedResponse.status === 429,
        } : null,
        status: interceptedResponse.status,
        raw: interceptedResponse.raw,
      };
    } catch (error: any) {
      let apiError: ApiError;
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        apiError = { message: 'Request cancelled', isNetworkError: false };
      } else if (error.message?.includes('Network request failed') || error.isNetworkError) {
        apiError = { message: 'No internet connection', isNetworkError: true };
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.isTimeout) {
        apiError = { message: 'Request timeout', isTimeout: true };
      } else {
        apiError = {
          message: error.message || 'An error occurred',
          status: error.response?.status || error.status,
          details: error.response?.data || error.details,
          isUnauthorized: error.response?.status === 401 || error.status === 401,
          isRateLimited: error.response?.status === 429 || error.status === 429,
          rawError: error,
        };
      }

      // --- Interceptor: onError ---
      if (apiConfig.onError) {
        apiError = await apiConfig.onError(apiError);
      }
      lastError = apiError;

      // Handle offline mutation queue
      if (apiError.isNetworkError && finalConfig.offlineQueue && method !== 'GET') {
        await offlineQueue.add({
          url,
          method,
          data: body,
          headers: finalConfig.headers,
        });
      }

      // Retry conditions (Network errors, timeouts, or 429 rate limit)
      const shouldRetry = (apiError.isNetworkError || apiError.isTimeout || apiError.isRateLimited) && attempt < maxRetries;
      if (shouldRetry) {
        const delay = calculateBackoffWithJitter(attempt, 300, apiConfig.maxRetryDelay || 10000);
        await new Promise(res => setTimeout(res, delay));
        attempt++;
        continue;
      }

      apiLogger.logError(method, url, apiError.message, apiError.details);
      return { data: null, error: apiError };
    }
  }

  return { data: null, error: lastError };
}

export const apiClient = {
  async get<T = any>(url: string, config?: Partial<ApiRequestConfig>) {
    return executeRequest<T>('GET', url, undefined, config);
  },
  async post<T = any>(url: string, data?: any, config?: Partial<ApiRequestConfig>) {
    return executeRequest<T>('POST', url, data, config);
  },
  async put<T = any>(url: string, data?: any, config?: Partial<ApiRequestConfig>) {
    return executeRequest<T>('PUT', url, data, config);
  },
  async patch<T = any>(url: string, data?: any, config?: Partial<ApiRequestConfig>) {
    return executeRequest<T>('PATCH', url, data, config);
  },
  async del<T = any>(url: string, config?: Partial<ApiRequestConfig>) {
    return executeRequest<T>('DELETE', url, undefined, config);
  },
  async request<T = any>(config: ApiRequestConfig) {
    return executeRequest<T>(config);
  },
  async upload<T = any>(url: string, formData: any, config?: Partial<ApiRequestConfig>) {
    const apiConfig = getApiKitConfig();
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `${apiConfig.baseUrl}${url}`;

    let token: string | null = null;
    if (apiConfig.tokenStorage && !config?.skipToken) {
      try {
        token = await apiConfig.tokenStorage.getToken();
      } catch {
        // Ignore
      }
    }

    const headers: Record<string, string> = {
      ...apiConfig.headers,
      ...config?.headers,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const { promise } = uploadFile<T>(fullUrl, formData, {
        ...config,
        headers,
      });
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
  offlineQueue,
};