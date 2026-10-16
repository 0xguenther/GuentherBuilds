import { fetchWithRetry } from '../utils/retryUtil.js';
import { config } from '../config/index.js';
import { hnPoster, posterFetch } from './browserPoster.js';

export interface HnMetric { id: string; score?: number; num_comments?: number }

export interface SubmitHnPostParams {
  title: string;
  url?: string;
  text?: string;
  idempotencyKey?: string;
}

export interface HnPostResult {
  hnId: string;
  url: string;
  title: string;
  createdAt: string;
}

export interface HnAccountInfo {
  username: string;
  loggedIn: boolean;
  method: string;
}

async function postViaBrowser(params: SubmitHnPostParams): Promise<HnPostResult | null> {
  if (!config.hn.browserPosterUrl) return null;

  const json = await posterFetch<{ success: boolean; post?: HnPostResult; error?: string }>(hnPoster(), '/api/hn/submit', {
    method: 'POST',
    body: { title: params.title, url: params.url, text: params.text },
    timeoutMs: 120_000,
  });
  if (!json.success || !json.post) throw new Error(json.error || 'Browser poster returned no result');
  return json.post;
}

async function getAccountViaBrowser(): Promise<HnAccountInfo> {
  return posterFetch<HnAccountInfo>(hnPoster(), '/api/hn/account', { timeoutMs: 30_000 });
}
export function parseHnItem(value: unknown, since: number, until = Date.now() / 1000): HnMetric | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (item.deleted || item.dead || item.by !== '0xguenther' || typeof item.id !== 'number' ||
      typeof item.time !== 'number' || item.time < since || item.time > until) return null;
  const result: HnMetric = { id: String(item.id) };
  for (const [key, target] of [['score', 'score'], ['descendants', 'num_comments']] as const) {
    const n = item[key];
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0) result[target] = n;
  }
  return result;
}

export class HnMcpClient {
  static async getMetrics(): Promise<HnMetric[]> {
    const get = async (path: string): Promise<unknown> => (await fetchWithRetry(
      `https://hacker-news.firebaseio.com/v0/${path}.json`, { signal: AbortSignal.timeout(10000) }
    )).json();
    const user = await get('user/0xguenther') as { submitted?: unknown } | null;
    if (!Array.isArray(user?.submitted)) return [];
    const since = Date.now() / 1000 - 14 * 86400;
    const metrics: HnMetric[] = [];
    // IDs are not a timestamp contract; inspect every submission, in bounded batches.
    const ids = user.submitted.filter((id): id is number => typeof id === 'number' && Number.isInteger(id));
    for (let i = 0; i < ids.length; i += 10) {
      const items = await Promise.all(ids.slice(i, i + 10).map(id => get(`item/${id}`)));
      for (const item of items) { const metric = parseHnItem(item, since); if (metric) metrics.push(metric); }
    }
    return metrics;
  }

  static hasBrowserPoster(): boolean {
    return Boolean(config.hn.browserPosterUrl);
  }

  static async getAccountInfo(): Promise<HnAccountInfo> {
    const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';
    if (isTestMode) {
      return { username: config.hn.username || '0xguenther', loggedIn: true, method: 'simulation' };
    }

    if (this.hasBrowserPoster()) {
      try {
        return await getAccountViaBrowser();
      } catch { /* fall through */ }
    }

    return { username: config.hn.username || '0xguenther', loggedIn: false, method: 'none' };
  }

  static async submitPost(params: SubmitHnPostParams): Promise<HnPostResult> {
    const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';

    if (isTestMode) {
      console.log(`[HnMcp] (Test Mode) Submitting: "${params.title}"`);
      return {
        hnId: `sim_${Date.now()}`,
        url: `https://news.ycombinator.com/item?id=sim_${Date.now()}`,
        title: params.title,
        createdAt: new Date().toISOString(),
      };
    }

    if (!this.hasBrowserPoster()) {
      throw new Error('HN browser poster not configured');
    }

    const result = await postViaBrowser(params);
    if (!result) throw new Error('HN browser poster returned no result');
    console.log(`[HnMcp] Browser-poster submitted: ${result.url}`);
    return result;
  }
}
