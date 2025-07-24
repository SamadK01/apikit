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

// Cancelable request return type
export interface CancelableRequest {
  promise: Promise<void>;
  cancel: () => void | undefined;
}

// useApi hook return
export interface UseApiReturn<T = any> extends UseApiState<T> {
  get: (url: string, config?: ApiRequestConfig) => CancelableRequest;
  post: (url: string, data?: any, config?: ApiRequestConfig) => CancelableRequest;
  put: (url: string, data?: any, config?: ApiRequestConfig) => CancelableRequest;
  patch: (url: string, data?: any, config?: ApiRequestConfig) => CancelableRequest;
  del: (url: string, config?: ApiRequestConfig) => CancelableRequest;
  reset: () => void;
}

// Cache abstraction
export interface ApiCache {
  get<T = any>(key: string): Promise<T | undefined> | T | undefined;
  set<T = any>(key: string, value: T, ttlMs?: number): Promise<void> | void;
  clear?(key?: string): Promise<void> | void;
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
  // Interceptors
  onRequest?: (config: ApiRequestConfig) => Promise<ApiRequestConfig> | ApiRequestConfig;
  onResponse?: (response: ApiResponse) => Promise<ApiResponse> | ApiResponse;
  onError?: (error: ApiError) => Promise<ApiError> | ApiError;
  // Caching
  cache?: ApiCache;
}

