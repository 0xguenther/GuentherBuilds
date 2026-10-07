/** Shared HTTP backoff. maxRetries retains its historical meaning: total attempts. */
export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
  jitter?: boolean;
  logger?: (msg: string) => void;
}

export class HttpError extends Error {
  constructor(public status: number, public retryAfterMs?: number, public response?: Response) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }

  static fromResponse(response: Response): HttpError {
    const header = response.headers.get('retry-after');
    let retryAfterMs: number | undefined;
    if (response.status === 429 && header?.trim()) {
      const seconds = Number(header);
      const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
      if (Number.isFinite(delay)) retryAfterMs = Math.max(0, delay);
    }
    return new HttpError(response.status, retryAfterMs, response);
  }
}

export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 32000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504],
  jitter: true,
  logger: console.warn,
};

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
  signal?: AbortSignal
): Promise<T> {
  const settings = { ...DEFAULT_RETRY_CONFIG, ...config };
  let delay = Math.min(settings.initialDelayMs, settings.maxDelayMs);
  for (let attempt = 1; attempt <= settings.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      // Preserve support for SDK errors exposing status/statusCode.
      const status = err instanceof HttpError ? err.status
        : typeof err === 'object' && err !== null
          ? ('status' in err ? err.status : 'statusCode' in err ? err.statusCode : undefined)
          : undefined;
      if (attempt === settings.maxRetries || typeof status !== 'number' || !settings.retryableStatuses.includes(status)) {
        throw err;
      }
      const retryAfter = err instanceof HttpError && status === 429 ? err.retryAfterMs : undefined;
      // Retry-After is a server minimum; jitter applies only to exponential backoff.
      const waitMs = retryAfter !== undefined
        ? Math.min(retryAfter, settings.maxDelayMs)
        : settings.jitter ? Math.random() * delay : delay;
      settings.logger?.(`[RetryUtil] HTTP ${status}. Attempt ${attempt}/${settings.maxRetries}, waiting ${Math.round(waitMs)}ms`);
      await new Promise<void>((resolve, reject) => {
        signal?.throwIfAborted();
        const abort = () => {
          clearTimeout(timer);
          reject(signal?.reason);
        };
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', abort);
          resolve();
        }, waitMs);
        signal?.addEventListener('abort', abort, { once: true });
      });
      delay = Math.min(delay * settings.backoffMultiplier, settings.maxDelayMs);
    }
  }
  throw new Error('Max retry attempts exceeded');
}

export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryConfig?: RetryConfig
): Promise<Response> {
  return executeWithRetry(async () => {
    options?.signal?.throwIfAborted();
    const response = await fetch(url, options);
    if (!response.ok) throw HttpError.fromResponse(response);
    return response;
  }, retryConfig, options?.signal ?? undefined);
}

/** Keep final HTTP responses available to clients with domain-specific error handling. */
export async function fetchResponseWithRetry(
  url: string,
  options?: RequestInit,
  retryConfig?: RetryConfig
): Promise<Response> {
  try {
    return await fetchWithRetry(url, options, retryConfig);
  } catch (err: unknown) {
    if (err instanceof HttpError && err.response) return err.response;
    throw err;
  }
}
