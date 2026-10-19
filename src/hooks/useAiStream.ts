import { useState, useCallback, useRef, useEffect } from 'react';
import { AiStreamConfig, ApiError, UseAiStreamReturn } from '../types';
import { getApiKitConfig } from '../config';
import { estimateAiTokens } from '../utils/logger';

/**
 * Extracts content from an SSE line. Supports OpenAI delta format, custom JSON, or plain text.
 */
function parseSseLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(':')) return null; // Ping or empty line

  if (trimmed.startsWith('data:')) {
    const payload = trimmed.slice(5).trim();
    if (payload === '[DONE]') return null;

    try {
      const parsed = JSON.parse(payload);
      // OpenAI / Groq / OpenRouter delta format
      if (parsed.choices?.[0]?.delta?.content !== undefined) {
        return parsed.choices[0].delta.content || '';
      }
      // Anthropic format
      if (parsed.delta?.text !== undefined) {
        return parsed.delta.text || '';
      }
      // Gemini format
      if (parsed.candidates?.[0]?.content?.parts?.[0]?.text !== undefined) {
        return parsed.candidates[0].content.parts[0].text || '';
      }
      // Generic payload with 'text' or 'content'
      if (typeof parsed.text === 'string') return parsed.text;
      if (typeof parsed.content === 'string') return parsed.content;
      return typeof parsed === 'string' ? parsed : '';
    } catch {
      // Plain text after 'data:'
      return payload;
    }
  }

  return null;
}

export function useAiStream<T = string>(): UseAiStreamReturn<T> {
  const [text, setText] = useState<string>('');
  const [data, setData] = useState<T | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [tokensCount, setTokensCount] = useState<number>(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeXhrRef = useRef<XMLHttpRequest | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
      activeXhrRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setText('');
    setData(null);
    setError(null);
    setTokensCount(0);
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const stream = useCallback(async (url: string, config?: AiStreamConfig): Promise<string> => {
    stop();
    setIsStreaming(true);
    setError(null);
    setText('');
    setData(null);
    setTokensCount(0);

    const apiConfig = getApiKitConfig();
    const fullUrl = url.startsWith('http') ? url : `${apiConfig.baseUrl}${url}`;

    // Prepare auth headers
    let token: string | null = null;
    if (apiConfig.tokenStorage) {
      try {
        token = await apiConfig.tokenStorage.getToken();
      } catch {
        // Ignore
      }
    }

    const headers: Record<string, string> = {
      'Accept': 'text/event-stream, text/plain',
      'Content-Type': 'application/json',
      ...apiConfig.headers,
      ...config?.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const mode = config?.mode || 'openai';

    return new Promise<string>((resolve, reject) => {
      let accumulated = '';
      let lastSeenLength = 0;

      // Handle abort signal from config
      if (config?.signal) {
        config.signal.addEventListener('abort', () => {
          stop();
          const err: ApiError = { message: 'Streaming cancelled' };
          setError(err);
          reject(err);
        });
      }

      // We use XMLHttpRequest with onprogress, which is universally reliable across React Native iOS/Android/Hermes and Web
      const xhr = new XMLHttpRequest();
      activeXhrRef.current = xhr;

      xhr.open(config?.method || 'POST', fullUrl, true);

      Object.entries(headers).forEach(([k, v]) => {
        if (v !== undefined) xhr.setRequestHeader(k, String(v));
      });

      const handleIncomingChunk = (newChunk: string) => {
        if (!newChunk) return;

        if (mode === 'text') {
          accumulated += newChunk;
          setText(accumulated);
          setTokensCount(estimateAiTokens(accumulated));
          config?.onToken?.(newChunk, accumulated);
        } else {
          // SSE mode or OpenAI mode
          const lines = newChunk.split('\n');
          for (const line of lines) {
            const tokenText = parseSseLine(line);
            if (tokenText) {
              accumulated += tokenText;
              setText(accumulated);
              setTokensCount(estimateAiTokens(accumulated));
              config?.onToken?.(tokenText, accumulated);
            }
          }
        }
      };

      xhr.onprogress = () => {
        try {
          const currentText = xhr.responseText || '';
          const newChunk = currentText.substring(lastSeenLength);
          lastSeenLength = currentText.length;
          handleIncomingChunk(newChunk);
        } catch {
          // Ignore partial read errors on older runtimes
        }
      };

      xhr.onload = () => {
        setIsStreaming(false);
        activeXhrRef.current = null;

        // Process any remainder
        try {
          const currentText = xhr.responseText || '';
          if (currentText.length > lastSeenLength) {
            const remaining = currentText.substring(lastSeenLength);
            handleIncomingChunk(remaining);
          }
        } catch {
          // Ignore
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          config?.onComplete?.(accumulated);
          resolve(accumulated);
        } else {
          let errorMsg = `Streaming failed with status ${xhr.status}`;
          let details: any;
          try {
            details = JSON.parse(xhr.responseText);
            if (details.error?.message) errorMsg = details.error.message;
          } catch {
            details = xhr.responseText;
          }
          const apiError: ApiError = {
            message: errorMsg,
            status: xhr.status,
            details,
            isUnauthorized: xhr.status === 401,
            isRateLimited: xhr.status === 429,
          };
          setError(apiError);
          config?.onError?.(apiError);
          reject(apiError);
        }
      };

      xhr.onerror = () => {
        setIsStreaming(false);
        activeXhrRef.current = null;
        const apiError: ApiError = {
          message: 'Network error during streaming',
          isNetworkError: true,
        };
        setError(apiError);
        config?.onError?.(apiError);
        reject(apiError);
      };

      xhr.onabort = () => {
        setIsStreaming(false);
        activeXhrRef.current = null;
        const apiError: ApiError = {
          message: 'Streaming cancelled',
        };
        setError(apiError);
        resolve(accumulated);
      };

      const bodyData = config?.body ? JSON.stringify(config.body) : null;
      xhr.send(bodyData);
    });
  }, [stop]);

  return {
    text,
    data,
    isStreaming,
    error,
    tokensCount,
    stream,
    stop,
    reset,
  };
}
