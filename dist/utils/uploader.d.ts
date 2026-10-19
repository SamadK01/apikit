import { ApiRequestConfig, ApiResponse, UploadProgress } from '../types';
export interface UploadOptions extends Partial<ApiRequestConfig> {
    onProgress?: (progress: UploadProgress) => void;
}
export declare function uploadFile<T = any>(url: string, formData: any, options?: UploadOptions): {
    promise: Promise<ApiResponse<T>>;
    cancel: () => void;
};
