import { config } from '../config/index.js';

/** The poster (or the browser behind it) is down. Nothing was sent, so retrying or falling back is safe. */
export class BrowserPosterUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrowserPosterUnavailableError';
  }
}

export interface PosterTarget {
  baseUrl: string;
  token: string;
}

export const redditPoster = (): PosterTarget => ({ baseUrl: config.reddit.browserPosterUrl, token: config.reddit.browserPosterToken });
export const hnPoster = (): PosterTarget => ({ baseUrl: config.hn.browserPosterUrl, token: config.hn.browserPosterToken });

/** Connect-level errors that prove the request never reached the poster. */
const NOT_SENT = new Set(['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'ENOTFOUND']);

export function posterHeaders(target: PosterTarget, json = false): Record<string, string> {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(target.token ? { Authorization: `Bearer ${target.token}` } : {}),
  };
}

export async function posterFetch<T>(
  target: PosterTarget,
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs: number },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${target.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: posterHeaders(target, options.body !== undefined),
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch (err) {
    const code = (err as { cause?: { code?: string } }).cause?.code;
    if (code && NOT_SENT.has(code)) throw new BrowserPosterUnavailableError(`Browser poster unreachable (${code})`);
    throw err;
  }
  if (!res.ok) {
    const text = (await res.text().catch(() => '')).slice(0, 300);
    if (res.status === 503) throw new BrowserPosterUnavailableError(`Browser poster unavailable: ${text}`);
    throw new Error(`Browser poster error (HTTP ${res.status}): ${text}`);
  }
  return await res.json() as T;
}
