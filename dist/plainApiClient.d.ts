import { ApiRequestConfig, ApiError, ApiKitConfig, ApiEngine } from './types';
export declare function executeRequest<T = any>(methodOrConfig: ApiRequestConfig | string, urlOrConfig?: string | any, data?: any, config?: Partial<ApiRequestConfig>, customConfig?: ApiKitConfig, customEngine?: ApiEngine): Promise<{
    data: T | null;
    error: ApiError | null;
    status?: number;
    raw?: any;
}>;
export declare const apiClient: {
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
        data: T;
        error: null;
        status: number;
        raw: any;
    } | {
        data: null;
        error: {
            message: any;
            status: any;
            details: any;
            isNetworkError: any;
        };
        status?: undefined;
        raw?: undefined;
    }>;
    offlineQueue: {
        setStorage(nextStorage: import("./types").KeyValueStorage | null): void;
        setMaxRetries(value: number | undefined): void;
        getPending(): Promise<import("./types").OfflineMutation[]>;
        add(mutation: Omit<import("./types").OfflineMutation, "id" | "timestamp" | "retryCount">): Promise<string>;
        remove(id: string): Promise<void>;
        clear(): Promise<void>;
        sync(client: {
            request: (config: {
                url: string;
                method: string;
                data?: unknown;
                headers?: Record<string, string>;
            }) => Promise<{
                data: unknown;
                error: ApiError | null;
            }>;
        }): Promise<import("./types").OfflineSyncResult[]>;
        startAutoSync(client: {
            request: (config: {
                url: string;
                method: string;
                data?: unknown;
                headers?: Record<string, string>;
            }) => Promise<{
                data: unknown;
                error: ApiError | null;
            }>;
        }, subscribe: (onOnline: () => void) => () => void): () => void;
        stopAutoSync(): void;
    };
};
