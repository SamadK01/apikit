let isDebugEnabled = false;

export function setDebugMode(enabled: boolean) {
  isDebugEnabled = enabled;
}

export function estimateAiTokens(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  // Standard approximation: ~4 characters per token for English/code
  return Math.ceil(text.length / 4);
}

export const apiLogger = {
  enable() {
    isDebugEnabled = true;
  },
  disable() {
    isDebugEnabled = false;
  },
  logRequest(method: string, url: string, headers?: Record<string, string>, data?: any) {
    if (!isDebugEnabled) return;
    const time = new Date().toLocaleTimeString();
    console.log(
      `%c[ApiKit Request] %c${time} %c${method.toUpperCase()} %c${url}`,
      'color: #0ea5e9; font-weight: bold;',
      'color: #64748b;',
      'color: #f59e0b; font-weight: bold;',
      'color: #0284c7;'
    );
    if (data) {
      console.log('  Payload:', data);
    }
  },
  logResponse(method: string, url: string, status: number, durationMs: number, data?: any) {
    if (!isDebugEnabled) return;
    const isSuccess = status >= 200 && status < 300;
    const color = isSuccess ? '#10b981' : '#ef4444';
    const estimatedTokens = typeof data === 'string' 
      ? estimateAiTokens(data) 
      : data ? estimateAiTokens(JSON.stringify(data)) : 0;

    const tokenMsg = estimatedTokens > 0 ? `(~${estimatedTokens} tokens)` : '';

    console.log(
      `%c[ApiKit Response] %c${method.toUpperCase()} %c${url} %c${status} %c(${durationMs}ms) ${tokenMsg}`,
      'color: #0ea5e9; font-weight: bold;',
      'color: #f59e0b;',
      'color: #0284c7;',
      `color: ${color}; font-weight: bold;`,
      'color: #94a3b8;'
    );
  },
  logError(method: string, url: string, message: string, details?: any) {
    if (!isDebugEnabled) return;
    console.warn(
      `%c[ApiKit Error] %c${method.toUpperCase()} %c${url} %c${message}`,
      'color: #ef4444; font-weight: bold;',
      'color: #f59e0b;',
      'color: #0284c7;',
      'color: #f87171;'
    );
    if (details) console.warn('  Details:', details);
  },
};
