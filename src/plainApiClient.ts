import { getApiKitConfig, getEngine } from './config';
import { ApiRequestConfig, ApiError, ApiResponse } from './types';

async function request<T = any>(
  methodOrConfig: ApiRequestConfig | string,
  urlOrConfig?: string | any,
  data?: any,
  config?: Partial<ApiRequestConfig>
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

  const apiConfig = getApiKitConfig();
  const engine = getEngine();

  if (!apiConfig.baseUrl && !url.startsWith('http')) {
    return { data: null, error: { message: 'ApiKit: baseUrl not configured. Please call configureApiKit first.' } };
  }

  const maxRetries = typeof apiConfig.retry === 'number' ? apiConfig.retry : 0;
  let attempt = 0;
  let lastError: ApiError | null = null;
  // --- Caching logic (GET only) ---
  const isGet = (typeof methodOrConfig === 'string' ? methodOrConfig : (methodOrConfig as any).method) === 'GET';
  let cacheKey = '';
  if (isGet && apiConfig.cache) {
    // Build cache key from URL and params
    let url = typeof methodOrConfig === 'string' ? urlOrConfig as string : (methodOrConfig as any).url;
    let params = (config && config.params) || (typeof methodOrConfig === 'object' && methodOrConfig.params);
    cacheKey = url;
    if (params) {
      cacheKey += '?' + Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
    }
    const cached = await apiConfig.cache.get<{ data: T; status: number; raw?: any }>(cacheKey);
    if (cached) {
      return { data: cached.data, error: null, status: cached.status, raw: cached.raw };
    }
  }
  while (attempt <= maxRetries) {
    try {
      // Get token if storage is configured
      let token: string | null = null;
      if (apiConfig.tokenStorage) {
        try {
          token = await apiConfig.tokenStorage.getToken();
        } catch (error) {
          // ignore
        }
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
        ...finalConfig.headers,
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Build full URL
      const fullUrl = url.startsWith('http') ? url : `${apiConfig.baseUrl}${url}`;
      let finalUrl = fullUrl;
      if (finalConfig.params) {
        const params = new URLSearchParams();
        Object.entries(finalConfig.params).forEach(([key, value]) => {
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

      // Make request
      const response: ApiResponse<T> = await engine.request<T>(interceptedRequestConfig);

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
        await apiConfig.cache.set(cacheKey, { data: interceptedResponse.data, status: interceptedResponse.status, raw: interceptedResponse.raw }, ttl);
      }
      return { data: interceptedResponse.data, error: null, status: interceptedResponse.status, raw: interceptedResponse.raw };
    } catch (error: any) {
      let apiError: ApiError;
      if (error.name === 'AbortError') {
        apiError = { message: 'Request cancelled', isNetworkError: false };
      } else if (error.message?.includes('Network request failed')) {
        apiError = { message: 'No internet connection', isNetworkError: true };
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        apiError = { message: 'Request timeout', isTimeout: true };
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
      return { data: null, error: apiError };
    }
  }
  // If all retries failed
  return { data: null, error: lastError };
}

export const apiClient = {
  async get<T = any>(url: string, config?: Partial<ApiRequestConfig>) {
    return request<T>('GET', url, undefined, config);
  },
  async post<T = any>(url: string, data?: any, config?: Partial<ApiRequestConfig>) {
    return request<T>('POST', url, data, config);
  },
  async put<T = any>(url: string, data?: any, config?: Partial<ApiRequestConfig>) {
    return request<T>('PUT', url, data, config);
  },
  async patch<T = any>(url: string, data?: any, config?: Partial<ApiRequestConfig>) {
    return request<T>('PATCH', url, data, config);
  },
  async del<T = any>(url: string, config?: Partial<ApiRequestConfig>) {
    return request<T>('DELETE', url, undefined, config);
  },
  async request<T = any>(config: ApiRequestConfig) {
    return request<T>(config);
  },
}; 