import { fetchResponseWithRetry } from '../utils/retryUtil.js';
import { config } from '../config/index.js';

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

export class RedditMcpClient {
  private static cachedAccessToken: string | null = null;
  private static tokenExpiresAt = 0;

  /**
   * Checks whether valid live Reddit credentials are configured
   */
  static hasValidCredentials(): boolean {
    return Boolean(
      config.reddit.clientId &&
      config.reddit.clientSecret &&
      config.reddit.username &&
      config.reddit.password
    );
  }

  /**
   * Obtains an OAuth2 bearer token from Reddit using Script app password grant.
   * Caches token until 5 minutes before expiration (tokens typically last 3600s).
   */
  static async getAccessToken(): Promise<string> {
    const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';
    if (!this.hasValidCredentials() || isTestMode) {
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

    const res = await fetchResponseWithRetry('https://www.reddit.com/api/v1/access_token', {
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
   * Fetches account profile details to verify age and karma
   */
  static async getAccountInfo(): Promise<RedditAccountInfo> {
    const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';
    if (!this.hasValidCredentials() || isTestMode) {
      return {
        username: config.reddit.username || 'guenther_autonomous',
        linkKarma: 15,
        commentKarma: 35,
        totalKarma: 50,
        createdUtc: Math.floor(Date.now() / 1000) - 86400 * 30, // 30 days old simulated
        accountAgeDays: 30,
        isSimulated: true,
      };
    }

    const token = await this.getAccessToken();

    const res = await fetchResponseWithRetry('https://oauth.reddit.com/api/v1/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': config.reddit.userAgent,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Reddit user profile (HTTP ${res.status})`);
    }

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
   * Submits a post (self-text or link) to a target subreddit.
   * If credentials are missing or in test mode, executes in simulation mode.
   */
  static async submitPost(params: SubmitRedditPostParams): Promise<RedditPostResult> {
    const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';
    const cleanSubreddit = params.subreddit.replace(/^r\//i, '').trim();

    if (!this.hasValidCredentials() || isTestMode) {
      console.log(`[RedditMcp] (${isTestMode ? 'Test Mode' : 'Simulation Mode'}) Submitting to r/${cleanSubreddit}:`);
      console.log(`Title: "${params.title}"`);
      if (params.text) {
        console.log(`Text preview: ${params.text.slice(0, 150)}...`);
      }

      const simulatedId = `t3_sim_${Date.now()}`;
      return {
        redditId: simulatedId,
        url: `https://www.reddit.com/r/${cleanSubreddit}/comments/${simulatedId}`,
        title: params.title,
        subreddit: cleanSubreddit,
        createdAt: new Date().toISOString(),
      };
    }

    const token = await this.getAccessToken();

    const formBody = new URLSearchParams({
      api_type: 'json',
      sr: cleanSubreddit,
      kind: params.url ? 'link' : 'self',
      title: params.title,
      resubmit: 'true',
      sendreplies: 'true',
    });

    if (params.text) {
      formBody.set('text', params.text);
    }
    if (params.url) {
      formBody.set('url', params.url);
    }

    const res = await fetchResponseWithRetry('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': config.reddit.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
      signal: AbortSignal.timeout(15000),
    }, { retryableStatuses: [429] });

    if (res.status === 429) {
      throw new Error('Reddit API rate limit (429)');
    }

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

    console.log(`[RedditMcp] Successfully posted to r/${cleanSubreddit}: ${url}`);

    return {
      redditId,
      url,
      title: params.title,
      subreddit: cleanSubreddit,
      createdAt: new Date().toISOString(),
    };
  }
}
