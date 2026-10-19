import { ApiEngine, ApiRequestConfig, ApiResponse } from '../types';

export const fetchEngine: ApiEngine = {
  async request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const { url, method = 'GET', data, headers, signal, timeout } = config;

    // Setup internal timeout signal if timeout is set and no external signal provided
    let timeoutId: any = null;
    let effectiveSignal: AbortSignal | undefined = signal;

    if (timeout && !signal && typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      effectiveSignal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), timeout);
    }

    try {
      const fetchConfig: RequestInit = {
        method,
        headers,
        body: data !== undefined && method !== 'GET'
          ? (typeof data === 'string' ? data : JSON.stringify(data))
          : undefined,
        signal: effectiveSignal,
      };

      const response = await fetch(url, fetchConfig);

      if (timeoutId) clearTimeout(timeoutId);

      // Smart response parsing
      const contentType = response.headers.get('content-type') || '';
      let parsed: any;
      if (contentType.includes('application/json')) {
        parsed = await response.json();
      } else if (contentType.includes('text/')) {
        parsed = await response.text();
      } else {
        try {
          parsed = await response.json();
        } catch {
          parsed = await response.text();
        }
      }

      // Parse headers into dictionary
      const parsedHeaders: Record<string, string> = {};
      if (response.headers && typeof response.headers.forEach === 'function') {
        response.headers.forEach((val, key) => {
          parsedHeaders[key.toLowerCase()] = val;
        });
      }

      return {
        data: parsed,
        status: response.status,
        headers: parsedHeaders,
        raw: response,
      };
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  },
};


