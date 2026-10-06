/**
 * Exponential Backoff Utility für API-Calls mit Retry-Logik
 * Handles 429 (Rate Limit) und 5xx (Server Error) mit exponentialem Backoff
 * CLAUDE.md Anforderung: Strikte Exponential Backoff bei HTTP 429
 */

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[]; // Welche HTTP-Statuscodes sollen retried werden?
  logger?: (msg: string) => void;
}

export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 32000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504], // 429 (Rate Limit), 5xx (Server Error)
  logger: console.warn,
};

/**
 * Führt eine Funktion mit Exponential Backoff aus
 * Bei 429 oder 5xx: Retry mit exponentialem Backoff
 * Bei anderen Fehlern: Sofort werfen
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let delay = finalConfig.initialDelayMs;

  for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      const isRetryable = finalConfig.retryableStatuses.includes(status);

      if (attempt === finalConfig.maxRetries || !isRetryable) {
        throw err;
      }

      const statusName = status === 429 ? 'Rate Limited' : 'Server Error';
      finalConfig.logger?.(
        `[RetryUtil] ${statusName} (${status}). Retry attempt ${attempt}/${finalConfig.maxRetries} after ${delay}ms...`
      );

      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);
    }
  }

  throw new Error('Max retry attempts exceeded');
}

/**
 * Hilfsfunktion für HTTP Fetch mit Retry
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryConfig?: RetryConfig
): Promise<Response> {
  return executeWithRetry(
    async () => {
      const response = await fetch(url, options);

      // HTTP-Fehler manuell werfen (Fetch wirft nicht bei 4xx/5xx)
      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }

      return response;
    },
    retryConfig
  );
}
