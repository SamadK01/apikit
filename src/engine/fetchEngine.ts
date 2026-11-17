import { ApiEngine, ApiRequestConfig, ApiResponse } from '../types';

function isFormData(value: unknown): boolean {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function isTimeoutError(error: unknown): boolean {
  return Boolean((error as any)?.name === 'ApiKitTimeoutError');
}

export const fetchEngine: ApiEngine = {
  async request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const { url, method = 'GET', data, headers = {}, signal, timeout } = config;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const abortFromCaller = () => controller?.abort();

    if (signal) {
      if (signal.aborted) controller?.abort();
      else signal.addEventListener('abort', abortFromCaller, { once: true });
    }
    if (controller && timeout && timeout > 0) {
      timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
    }

    const requestHeaders = { ...headers };
    const body = data === undefined || method === 'GET' ? undefined : isFormData(data) || typeof data === 'string' ? data : JSON.stringify(data);
    if (isFormData(data)) {
      Object.keys(requestHeaders).forEach(key => {
        if (key.toLowerCase() === 'content-type') delete requestHeaders[key];
      });
    }

    try {
      const response = await fetch(url, { method, headers: requestHeaders, body, signal: controller?.signal || signal });
      const contentType = response.headers.get('content-type') || '';
      let parsed: any;
      if (response.status === 204 || response.status === 205) parsed = null;
      else if (contentType.includes('json') || contentType.includes('+json')) parsed = await response.json();
      else parsed = await response.text();
      const parsedHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => { parsedHeaders[key.toLowerCase()] = value; });
      return { data: parsed, status: response.status, headers: parsedHeaders, raw: response };
    } catch (error: any) {
      if (timedOut) {
        const timeoutError: any = new Error('Request timeout');
        timeoutError.name = 'ApiKitTimeoutError';
        timeoutError.isTimeout = true;
        throw timeoutError;
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abortFromCaller);
    }
  },
};

export { isTimeoutError };
