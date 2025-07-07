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

    // Make request
    const response: ApiResponse<T> = await engine.request<T>(requestConfig);

    // Handle 401 globally
    if (response.status === 401 && apiConfig.onUnauthorized) {
      apiConfig.onUnauthorized();
    }

    return { data: response.data, error: null, status: response.status, raw: response.raw };
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
    return { data: null, error: apiError };
  }
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