/**
 * Rate limit & backoff utility for AI endpoints and standard REST APIs.
 */
export declare function parseRetryAfter(headers?: Record<string, string>): number | null;
/**
 * Calculates exponential backoff with full jitter to avoid thundering herds.
 */
export declare function calculateBackoffWithJitter(attempt: number, baseDelayMs?: number, maxDelayMs?: number): number;
