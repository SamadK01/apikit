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
        setStorage(storage: import("./types").TokenStorage): void;
        getPending(): Promise<import("./types").OfflineMutation[]>;
        add(mutation: Omit<import("./types").OfflineMutation, "id" | "timestamp" | "retryCount">): Promise<string>;
        remove(id: string): Promise<void>;
        clear(): Promise<void>;
        saveQueue(queue: import("./types").OfflineMutation[]): Promise<void>;
        sync(client: {
            request: (config: any) => Promise<any>;
        }): Promise<import("./types").OfflineSyncResult[]>;
    };
};
