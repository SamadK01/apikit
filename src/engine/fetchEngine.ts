import { ApiEngine, ApiRequestConfig, ApiResponse } from '../types';

export const fetchEngine: ApiEngine = {
  async request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    // TODO: Support timeout, cancel, params serialization, and smart response parsing
    const { url, method = 'GET', data, headers, signal } = config;
    const fetchConfig: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal,
    };
    const response = await fetch(url, fetchConfig);
    // TODO: Smart response parsing (JSON, text, FormData, binary)
    const contentType = response.headers.get('content-type') || '';
    let parsed: any;
    if (contentType.includes('application/json')) {
      parsed = await response.json();
    } else if (contentType.includes('text/')) {
      parsed = await response.text();
    } else {
      parsed = await response.blob();
    }
    return {
      data: parsed,
      status: response.status,
      headers: {}, // TODO: parse headers
      raw: response,
    };
  },
  // TODO: cancel support (AbortController)
};
