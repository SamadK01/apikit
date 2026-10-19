/**
 * Rate limit & backoff utility for AI endpoints and standard REST APIs.
 */

export function parseRetryAfter(headers?: Record<string, string>): number | null {
  if (!headers) return null;

  // Normalize header keys to lowercase
  const normalized: Record<string, string> = {};
  for (const [key, val] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = String(val);
  }

  // 1. Standard 'retry-after' header
  const retryAfter = normalized['retry-after'];
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!isNaN(seconds) && seconds > 0) {
      return seconds * 1000;
    }
    // Try parsing as HTTP Date
    const targetDate = Date.parse(retryAfter);
    if (!isNaN(targetDate)) {
      const diff = targetDate - Date.now();
      return Math.max(diff, 500);
    }
  }

  // 2. OpenAI / Anthropic rate-limit reset headers (e.g. "6s", "250ms", "1m")
  const resetTokens = normalized['x-ratelimit-reset-tokens'] || normalized['x-ratelimit-reset-requests'];
  if (resetTokens) {
    if (resetTokens.endsWith('ms')) {
      const ms = parseFloat(resetTokens.replace('ms', ''));
      if (!isNaN(ms)) return ms;
    } else if (resetTokens.endsWith('s')) {
      const s = parseFloat(resetTokens.replace('s', ''));
      if (!isNaN(s)) return s * 1000;
    } else if (resetTokens.endsWith('m')) {
      const m = parseFloat(resetTokens.replace('m', ''));
      if (!isNaN(m)) return m * 60 * 1000;
    }
  }

  return null;
}

/**
 * Calculates exponential backoff with full jitter to avoid thundering herds.
 */
export function calculateBackoffWithJitter(
  attempt: number,
  baseDelayMs: number = 300,
  maxDelayMs: number = 10000
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
  // Full jitter: random value between baseDelayMs/2 and exponential
  const min = Math.max(100, Math.floor(baseDelayMs / 2));
  return Math.floor(min + Math.random() * (exponential - min));
}
