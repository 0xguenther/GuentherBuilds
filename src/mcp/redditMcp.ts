import { executeWithRetry, HttpError } from '../utils/retryUtil.js';
import { config } from '../config/index.js';
import { BrowserPosterUnavailableError, posterFetch, redditPoster } from './browserPoster.js';

export interface SubmitRedditPostParams {
  subreddit: string;
  title: string;
  text?: string;
  url?: string;
  idempotencyKey?: string;
}

export interface RedditPostResult {
  redditId: string;
  url: string;
  title: string;
  subreddit: string;
  createdAt: string;
}

export interface RedditAccountInfo {
  username: string;
  linkKarma: number;
  commentKarma: number;
  totalKarma: number;
  createdUtc: number;
  accountAgeDays: number;
  isSimulated: boolean;
}

/**
 * Posts via the browser-automation service running on the desktop VM.
 * Returns null if the browser poster is not configured or unreachable.
 */
async function postViaBrowser(params: SubmitRedditPostParams): Promise<RedditPostResult | null> {
  if (!config.reddit.browserPosterUrl) return null;

  const cleanSubreddit = params.subreddit.replace(/^r\//i, '').trim();
  const json = await posterFetch<{ success: boolean; post?: RedditPostResult; error?: string }>(redditPoster(), '/api/reddit/submit', {
    method: 'POST',
    body: { subreddit: cleanSubreddit, title: params.title, body: params.text, url: params.url },
    timeoutMs: 120_000, // browser automation can be slow
  });
  if (!json.success || !json.post) throw new Error(json.error || 'Browser poster returned no result');
  return json.post;
}

async function getAccountViaBrowser(): Promise<RedditAccountInfo> {
  return posterFetch<RedditAccountInfo>(redditPoster(), '/api/reddit/account', { timeoutMs: 30_000 });
}

type RedditListingPayload = { data?: { children?: { data: RedditItem }[]; after?: string } };

function parseListing(result: RedditListingPayload): { items: RedditItem[]; after: string | null } {
  return { items: (result.data?.children ?? []).map(c => c.data), after: result.data?.after ?? null };
}

export class RedditMcpClient {
  private static cachedAccessToken: string | null = null;
  private static tokenExpiresAt = 0;

  private static nextRequestAt = 0;

  private static async request(url: string, options: RequestInit, retryableStatuses: number[] = [429, 500, 502, 503, 504]): Promise<Response> {
    try {
    return await executeWithRetry(async () => {
      const wait = this.nextRequestAt - Date.now();
      // Defer the daemon cycle instead of holding it for a long server reset.
      if (wait > 30000) throw new Error('Reddit rate budget exhausted; deferred until reset');
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = Number(response.headers.get('x-ratelimit-reset'));
      if (remaining !== null && Number.isFinite(reset) && reset > 0) {
        const budget = Number(remaining);
        this.nextRequestAt = Date.now() + Math.ceil(reset * 1000 / Math.max(1, budget));
      }
      if (!response.ok) {
        const failure = HttpError.fromResponse(response);
        if (response.status === 429) this.nextRequestAt = Math.max(this.nextRequestAt, Date.now() + (failure.retryAfterMs ?? 0));
        throw failure;
      }
      return response;
    }, { retryableStatuses, initialDelayMs: 1000 });
    } catch (err) {
      // Final HTTP failures stay inspectable by callers with domain-specific errors.
      if (err instanceof HttpError && err.response) return err.response;
      throw err;
    }
  }

  static async api(path: string, form?: Record<string, string>): Promise<unknown> {
    if (!this.hasValidCredentials()) throw new Error('Reddit credentials missing');
    const token = await this.getAccessToken();
    const response = await this.request(`https://oauth.reddit.com${path}`, {
      method: form ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': config.reddit.userAgent,
        ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      ...(form ? { body: new URLSearchParams(form).toString() } : {}),
    }, form ? [429] : undefined);
    if (!response.ok) throw new Error(`Reddit HTTP ${response.status}`);
    const result = await response.json() as { json?: { errors?: unknown[] } };
    if (result.json?.errors?.length) throw new Error('Reddit API rejected action');
    return result;
  }

  /** Reads need no OAuth when the browser session is available; reads are safe to fall back. */
  static async listing(path: string): Promise<{ items: RedditItem[]; after: string | null }> {
    if (this.hasBrowserPoster()) {
      try {
        return parseListing(await posterFetch<RedditListingPayload>(redditPoster(), `/api/reddit/listing?path=${encodeURIComponent(path)}`, { timeoutMs: 45_000 }));
      } catch (err) {
        if (!this.hasValidCredentials()) throw err;
        console.warn(`[RedditMcp] Browser-poster listing failed, falling back to API: ${err instanceof Error ? err.message : err}`);
      }
    }
    return parseListing(await this.api(path) as RedditListingPayload);
  }

  static async submitComment(threadId: string, body: string): Promise<string> {
    if (this.hasBrowserPoster()) {
      try {
        const res = await posterFetch<{ success: boolean; comment?: { redditId: string }; error?: string }>(redditPoster(), '/api/reddit/comment', {
          method: 'POST', body: { thingId: threadId, text: body }, timeoutMs: 60_000,
        });
        if (!res.success || !res.comment?.redditId) throw new Error(res.error || 'Reddit comment outcome unknown');
        return res.comment.redditId;
      } catch (err) {
        // A write may only fall back when it provably was not sent; otherwise the caller keeps its pending claim.
        if (!(err instanceof BrowserPosterUnavailableError) || !this.hasValidCredentials()) throw err;
        console.warn(`[RedditMcp] Browser-poster unavailable, commenting via API: ${err.message}`);
      }
    }
    const result = await this.api('/api/comment', { api_type: 'json', thing_id: threadId, text: body }) as
      { json?: { data?: { things?: { data?: { name?: string } }[] } } };
    const id = result.json?.data?.things?.[0]?.data?.name;
    if (!id) throw new Error('Reddit comment outcome unknown');
    return id;
  }

  static async getOwnMetrics(): Promise<{ id: string; score: number; num_comments?: number }[]> {
    const since = Date.now() / 1000 - 14 * 86400;
    const metrics: { id: string; score: number; num_comments?: number }[] = [];
    let after: string | null = null;
    do {
      const page = await this.listing(`/user/${encodeURIComponent(config.reddit.username)}/overview?sort=new&limit=100${after ? `&after=${encodeURIComponent(after)}` : ''}`);
      for (const item of page.items) {
        if (item.created_utc >= since && item.author?.toLowerCase() === config.reddit.username.toLowerCase())
          metrics.push({ id: item.name, score: item.score, ...(typeof item.num_comments === 'number' ? { num_comments: item.num_comments } : {}) });
      }
      if (page.items.some(item => item.created_utc < since) || !page.items.length || page.after === after) break;
      after = page.after;
    } while (after);
    return metrics;
  }

  /**
   * Checks whether valid live Reddit credentials are configured
   */
  static hasValidCredentials(): boolean {
    return Boolean(
      config.reddit.clientId &&
      config.reddit.clientSecret &&
      config.reddit.username &&
      config.reddit.password && config.reddit.userAgent
    );
  }

  /**
   * Obtains an OAuth2 bearer token from Reddit using Script app password grant.
   * Caches token until 5 minutes before expiration (tokens typically last 3600s).
   */
  static async getAccessToken(): Promise<string> {
    const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';
    if (!this.hasValidCredentials()) throw new Error('Reddit credentials missing');
    if (isTestMode) {
      return 'simulated_reddit_access_token';
    }

    const now = Date.now();
    if (this.cachedAccessToken && this.tokenExpiresAt > now + 300000) {
      return this.cachedAccessToken;
    }

    const authHeader = 'Basic ' + Buffer.from(
      `${config.reddit.clientId}:${config.reddit.clientSecret}`
    ).toString('base64');

    const bodyParams = new URLSearchParams({
      grant_type: 'password',
      username: config.reddit.username,
      password: config.reddit.password,
    });

    const res = await this.request('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'User-Agent': config.reddit.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Reddit token exchange failed (HTTP ${res.status}): ${errorText}`);
    }

    const data = (await res.json()) as { error?: string; error_description?: string; access_token: string; expires_in?: number };
    if (data.error) {
      throw new Error(`Reddit OAuth error: ${data.error} - ${data.error_description || ''}`);
    }

    this.cachedAccessToken = data.access_token;
    this.tokenExpiresAt = now + (data.expires_in || 3600) * 1000;

    return this.cachedAccessToken!;
  }

  /**
   * Fetches account profile details to verify age and karma.
   * Priority: Browser Poster → Reddit API → Simulation (test).
   */
  static async getAccountInfo(): Promise<RedditAccountInfo> {
    const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';

    if (isTestMode) {
      return {
        username: config.reddit.username || 'guenther_autonomous',
        linkKarma: 15,
        commentKarma: 35,
        totalKarma: 50,
        createdUtc: Math.floor(Date.now() / 1000) - 86400 * 30,
        accountAgeDays: 30,
        isSimulated: true,
      };
    }

    // Try browser-poster first
    if (this.hasBrowserPoster()) {
      try {
        return await getAccountViaBrowser();
      } catch (err) {
        // Surface the real poster failure instead of a misleading "credentials missing".
        if (!this.hasValidCredentials()) throw err;
      }
    }

    // Fallback: Reddit API
    if (!this.hasValidCredentials()) throw new Error('Reddit credentials missing');
    const token = await this.getAccessToken();

    const res = await this.request('https://oauth.reddit.com/api/v1/me', {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': config.reddit.userAgent },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Failed to fetch Reddit user profile (HTTP ${res.status})`);

    const data = (await res.json()) as { name: string; link_karma?: number; comment_karma?: number; created_utc?: number };
    const createdUtc = data.created_utc || Math.floor(Date.now() / 1000);
    const ageDays = Math.max(0, Math.floor((Date.now() / 1000 - createdUtc) / 86400));

    return {
      username: data.name,
      linkKarma: data.link_karma || 0,
      commentKarma: data.comment_karma || 0,
      totalKarma: (data.link_karma || 0) + (data.comment_karma || 0),
      createdUtc,
      accountAgeDays: ageDays,
      isSimulated: false,
    };
  }

  /**
   * Checks if the browser-poster service is configured
   */
  static hasBrowserPoster(): boolean {
    return Boolean(config.reddit.browserPosterUrl);
  }

  /**
   * Submits a post (self-text or link) to a target subreddit.
   * Priority: Browser Poster (desktop VM) → Reddit API → Simulation (test).
   */
  static async submitPost(params: SubmitRedditPostParams): Promise<RedditPostResult> {
    const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';
    const cleanSubreddit = params.subreddit.replace(/^r\//i, '').trim();

    // Test/simulation mode
    if (isTestMode) {
      console.log(`[RedditMcp] (Test Mode) Submitting to r/${cleanSubreddit}:`);
      console.log(`Title: "${params.title}"`);
      if (params.text) console.log(`Text preview: ${params.text.slice(0, 150)}...`);
      const simulatedId = `t3_sim_${Date.now()}`;
      return {
        redditId: simulatedId,
        url: `https://www.reddit.com/r/${cleanSubreddit}/comments/${simulatedId}`,
        title: params.title,
        subreddit: cleanSubreddit,
        createdAt: new Date().toISOString(),
      };
    }

    // Try browser-poster first (desktop VM with Brave)
    if (this.hasBrowserPoster()) {
      try {
        const result = await postViaBrowser(params);
        if (result) {
          console.log(`[RedditMcp] Browser-poster submitted to r/${cleanSubreddit}: ${result.url}`);
          return result;
        }
      } catch (err) {
        // Only fall back when the post provably was not sent; an unclear outcome must never be repeated.
        if (!(err instanceof BrowserPosterUnavailableError) || !this.hasValidCredentials()) throw err;
        console.warn(`[RedditMcp] Browser-poster unavailable, falling back to API: ${err.message}`);
      }
    }

    // Fallback: Reddit OAuth API
    if (!this.hasValidCredentials()) throw new Error('Reddit credentials missing (and no browser poster configured)');

    const token = await this.getAccessToken();

    const formBody = new URLSearchParams({
      api_type: 'json',
      sr: cleanSubreddit,
      kind: params.url ? 'link' : 'self',
      title: params.title,
      resubmit: 'true',
      sendreplies: 'true',
    });

    if (params.text) formBody.set('text', params.text);
    if (params.url) formBody.set('url', params.url);

    const res = await this.request('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': config.reddit.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
      signal: AbortSignal.timeout(15000),
    }, [429]);

    if (res.status === 429) throw new Error('Reddit API rate limit (429)');

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Reddit submit error (HTTP ${res.status}): ${errText}`);
    }

    const json = (await res.json()) as { json?: { errors?: unknown[]; data?: { id?: string; name?: string; url?: string } } };
    const errors = json.json?.errors;
    if (errors && errors.length > 0) {
      throw new Error(`Reddit API rejected post: ${JSON.stringify(errors)}`);
    }

    const postData = json.json?.data;
    const redditId = postData?.id || postData?.name || `t3_${Date.now()}`;
    const url = postData?.url || `https://www.reddit.com/r/${cleanSubreddit}/comments/${redditId}`;

    console.log(`[RedditMcp] API posted to r/${cleanSubreddit}: ${url}`);

    return {
      redditId,
      url,
      title: params.title,
      subreddit: cleanSubreddit,
      createdAt: new Date().toISOString(),
    };
  }
}

export interface RedditItem {
  name: string; title?: string; selftext?: string; body?: string; author?: string;
  subreddit: string; created_utc: number; stickied?: boolean; locked?: boolean; archived?: boolean;
  score: number; num_comments?: number;
}
