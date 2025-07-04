// API request config
type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestConfig {
  url: string;
  method?: ApiMethod;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

// API response
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  raw: Response | any;
}

// API error
export interface ApiError {
  message: string;
  status?: number;
  details?: any;
  isNetworkError?: boolean;
  isTimeout?: boolean;
  isUnauthorized?: boolean;
}

// Engine abstraction
export interface ApiEngine {
  request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>>;
  cancel?(requestId: string): void;
}

// Token storage abstraction
export interface TokenStorage {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  removeToken(): Promise<void>;
}

// useApi hook state
export interface UseApiState<T = any> {
  loading: boolean;
  error: ApiError | null;
  data: T | null;
}

// useApi hook return
export interface UseApiReturn<T = any> extends UseApiState<T> {
  get: (url: string, config?: ApiRequestConfig) => Promise<void>;
  post: (url: string, data?: any, config?: ApiRequestConfig) => Promise<void>;
  put: (url: string, data?: any, config?: ApiRequestConfig) => Promise<void>;
  patch: (url: string, data?: any, config?: ApiRequestConfig) => Promise<void>;
  del: (url: string, config?: ApiRequestConfig) => Promise<void>;
  reset: () => void;
}

// ApiKit config
export interface ApiKitConfig {
  baseUrl?: string;
  engine?: 'fetch' | 'axios' | ApiEngine;
  tokenStorage?: TokenStorage;
  onUnauthorized?: () => void;
  retry?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

