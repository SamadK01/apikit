import { ApiRequestConfig, ApiError } from './types';
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
};
