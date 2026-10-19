export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export interface UploadProgress {
    loaded: number;
    total: number;
    percent: number;
}
export interface SchemaValidator<T = any> {
    parse?: (data: unknown) => T;
    safeParse?: (data: unknown) => {
        success: true;
        data: T;
    } | {
        success: false;
        error: any;
    };
}
export interface ApiRequestConfig {
    url: string;
    method?: ApiMethod;
    data?: any;
    params?: Record<string, any>;
    headers?: Record<string, string>;
    timeout?: number;
    signal?: AbortSignal;
    retry?: number;
    retryAfter429?: boolean;
    skipToken?: boolean;
    schema?: SchemaValidator<any>;
    cacheTtlMs?: number;
    skipCache?: boolean;
    onUploadProgress?: (progress: UploadProgress) => void;
    offlineQueue?: boolean;
}
export interface ApiResponse<T = any> {
    data: T;
    status: number;
    headers: Record<string, string>;
    raw: Response | any;
}
export interface ApiError {
    message: string;
    status?: number;
    details?: any;
    isNetworkError?: boolean;
    isTimeout?: boolean;
    isUnauthorized?: boolean;
    isRateLimited?: boolean;
    retryAfterMs?: number;
    rawError?: any;
}
export interface ApiEngine {
    request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>>;
    cancel?(requestId: string): void;
}
export interface TokenStorage {
    getToken(): Promise<string | null>;
    setToken(token: string): Promise<void>;
    removeToken(): Promise<void>;
}
export interface UseApiState<T = any> {
    loading: boolean;
    error: ApiError | null;
    data: T | null;
}
export interface CancelableRequest<T = any> {
    promise: Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
    cancel: () => void;
}
export interface UseApiReturn<T = any> extends UseApiState<T> {
    get: (url: string, config?: Partial<ApiRequestConfig>) => CancelableRequest<T>;
    post: (url: string, data?: any, config?: Partial<ApiRequestConfig>) => CancelableRequest<T>;
    put: (url: string, data?: any, config?: Partial<ApiRequestConfig>) => CancelableRequest<T>;
    patch: (url: string, data?: any, config?: Partial<ApiRequestConfig>) => CancelableRequest<T>;
    del: (url: string, config?: Partial<ApiRequestConfig>) => CancelableRequest<T>;
    reset: () => void;
}
export interface ApiCache {
    get<T = any>(key: string): Promise<T | undefined> | T | undefined;
    set<T = any>(key: string, value: T, ttlMs?: number): Promise<void> | void;
    clear?(key?: string): Promise<void> | void;
}
export interface ApiKitConfig {
    baseUrl?: string;
    engine?: 'fetch' | 'axios' | ApiEngine;
    tokenStorage?: TokenStorage;
    onUnauthorized?: () => void;
    refreshToken?: () => Promise<string | null>;
    onTokenRefreshFailed?: () => void;
    retry?: number;
    retryAfter429?: boolean;
    maxRetryDelay?: number;
    timeout?: number;
    headers?: Record<string, string>;
    debug?: boolean;
    onRequest?: (config: ApiRequestConfig) => Promise<ApiRequestConfig> | ApiRequestConfig;
    onResponse?: (response: ApiResponse) => Promise<ApiResponse> | ApiResponse;
    onError?: (error: ApiError) => Promise<ApiError> | ApiError;
    cache?: ApiCache;
}
export interface AiStreamConfig {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: any;
    mode?: 'sse' | 'text' | 'openai';
    onToken?: (token: string, accumulated: string) => void;
    onComplete?: (accumulated: string) => void;
    onError?: (error: ApiError) => void;
    signal?: AbortSignal;
}
export interface UseAiStreamReturn<T = string> {
    text: string;
    data: T | null;
    isStreaming: boolean;
    error: ApiError | null;
    tokensCount: number;
    stream: (url: string, config?: AiStreamConfig) => Promise<string>;
    stop: () => void;
    reset: () => void;
}
export interface OfflineMutation {
    id: string;
    url: string;
    method: ApiMethod;
    data?: any;
    headers?: Record<string, string>;
    timestamp: number;
    retryCount: number;
}
export interface OfflineSyncResult {
    mutation: OfflineMutation;
    success: boolean;
    response?: any;
    error?: ApiError;
}
export interface ApiClientInstance {
    config: ApiKitConfig;
    get<T = any>(url: string, config?: Partial<ApiRequestConfig>): Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
    post<T = any>(url: string, data?: any, config?: Partial<ApiRequestConfig>): Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
    put<T = any>(url: string, data?: any, config?: Partial<ApiRequestConfig>): Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
    patch<T = any>(url: string, data?: any, config?: Partial<ApiRequestConfig>): Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
    del<T = any>(url: string, config?: Partial<ApiRequestConfig>): Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
    request<T = any>(config: ApiRequestConfig): Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
    upload<T = any>(url: string, formData: any, config?: Partial<ApiRequestConfig>): Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
}
