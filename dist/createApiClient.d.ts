import { ApiKitConfig, ApiRequestConfig, UseApiReturn, ApiError } from './types';
export declare function createApiClient(customConfig: ApiKitConfig): {
    config: ApiKitConfig;
    get<T = any>(url: string, reqConfig?: Partial<ApiRequestConfig>): Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
    post<T = any>(url: string, data?: any, reqConfig?: Partial<ApiRequestConfig>): Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
    put<T = any>(url: string, data?: any, reqConfig?: Partial<ApiRequestConfig>): Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
    patch<T = any>(url: string, data?: any, reqConfig?: Partial<ApiRequestConfig>): Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
    del<T = any>(url: string, reqConfig?: Partial<ApiRequestConfig>): Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
    request<T = any>(reqConfig: ApiRequestConfig): Promise<{
        data: T | null;
        error: ApiError | null;
        status?: number;
        raw?: any;
    }>;
    upload<T = any>(url: string, formData: any, reqConfig?: Partial<ApiRequestConfig>): Promise<{
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
    useApi<T = any>(): UseApiReturn<T>;
};
