import { UseApiReturn, UsePaginatedApiOptions, UsePaginatedApiReturn } from '../types';
export declare function useApi<T = any>(): UseApiReturn<T>;
/** Infinite pagination for offset/page APIs and cursor APIs. */
export declare function usePaginatedApi<T = any>(url: string, options?: UsePaginatedApiOptions<T>): UsePaginatedApiReturn<T>;
