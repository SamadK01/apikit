import { UseApiReturn, ApiRequestConfig, ApiError } from '../types';
export declare function useApi<T = any>(): UseApiReturn<T>;
export interface UsePaginatedApiOptions {
    pageSize?: number;
    initialPage?: number;
    params?: Record<string, any>;
    pageParamName?: string;
    pageSizeParamName?: string;
    config?: Partial<ApiRequestConfig>;
}
export declare function usePaginatedApi<T = any>(url: string, { pageSize, initialPage, params, pageParamName, pageSizeParamName, config, }?: UsePaginatedApiOptions): {
    page: number;
    data: T[];
    loading: boolean;
    error: ApiError | null;
    hasMore: boolean;
    nextPage: () => void;
    prevPage: () => void;
    refresh: () => void;
    reset: () => void;
};
