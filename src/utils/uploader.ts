import { ApiRequestConfig, ApiResponse, UploadProgress } from '../types';

export interface UploadOptions extends Partial<ApiRequestConfig> {
  onProgress?: (progress: UploadProgress) => void;
}

export function uploadFile<T = any>(
  url: string,
  formData: any,
  options: UploadOptions = {}
): { promise: Promise<ApiResponse<T>>; cancel: () => void } {
  let xhr: XMLHttpRequest | null = new XMLHttpRequest();
  let cancelled = false;

  const cancel = () => {
    if (xhr && !cancelled) {
      cancelled = true;
      xhr.abort();
    }
  };

  const promise = new Promise<ApiResponse<T>>((resolve, reject) => {
    if (!xhr) {
      return reject({ message: 'XMLHttpRequest is not available' });
    }

    xhr.open(options.method || 'POST', url);

    // Timeout
    if (options.timeout) {
      xhr.timeout = options.timeout;
    }

    // Set custom headers (omit Content-Type for FormData so boundary is generated automatically)
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, val]) => {
        if (key.toLowerCase() !== 'content-type' && val !== undefined) {
          xhr?.setRequestHeader(key, String(val));
        }
      });
    }

    // Listen to signal
    if (options.signal) {
      if (options.signal.aborted) {
        cancel();
        return reject({ message: 'Upload cancelled', isNetworkError: false });
      }
      options.signal.addEventListener('abort', () => {
        cancel();
        reject({ message: 'Upload cancelled', isNetworkError: false });
      });
    }

    // Progress listener
    if (xhr.upload && options.onProgress) {
      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          options.onProgress?.({
            loaded: event.loaded,
            total: event.total,
            percent,
          });
        }
      };
    }

    xhr.onload = () => {
      if (!xhr) return;
      const status = xhr.status;
      let data: any = xhr.response;

      // Parse JSON if possible
      try {
        if (typeof xhr.responseText === 'string') {
          data = JSON.parse(xhr.responseText);
        }
      } catch {
        data = xhr.responseText || xhr.response;
      }

      // Parse headers
      const rawHeaders = xhr.getAllResponseHeaders() || '';
      const headers: Record<string, string> = {};
      rawHeaders.trim().split(/[\r\n]+/).forEach(line => {
        const parts = line.split(': ');
        const header = parts.shift();
        const value = parts.join(': ');
        if (header) headers[header.toLowerCase()] = value;
      });

      if (status >= 200 && status < 300) {
        resolve({
          data,
          status,
          headers,
          raw: xhr,
        });
      } else {
        reject({
          message: `Upload failed with status ${status}`,
          status,
          details: data,
          isUnauthorized: status === 401,
          isRateLimited: status === 429,
        });
      }
    };

    xhr.onerror = () => {
      reject({
        message: 'Network request failed during upload',
        isNetworkError: true,
      });
    };

    xhr.ontimeout = () => {
      reject({
        message: 'Upload timed out',
        isTimeout: true,
      });
    };

    xhr.onabort = () => {
      reject({
        message: 'Upload cancelled',
      });
    };

    xhr.send(formData);
  });

  return { promise, cancel };
}
