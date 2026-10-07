import { executeWithRetry, fetchResponseWithRetry, HttpError } from '../utils/retryUtil.js';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { prisma } from '../db/client.js';

/** Kein Guthaben bei X (402). Kein Erfolg melden, der nicht stattgefunden hat. */
export class XCreditDepletedError extends Error {
  constructor() {
    super('X API credits depleted (402)');
    this.name = 'XCreditDepletedError';
  }
}

/** Ergebnis unklar (Timeout, Netzwerk, 5xx). Nicht erneut senden, sonst droht ein Doppelpost. */
export class XUnconfirmedError extends Error {
  constructor(key: string) {
    super(`X post result unconfirmed for key ${key}. Manuell prüfen, nicht automatisch erneut senden.`);
    this.name = 'XUnconfirmedError';
  }
}

export interface PostTweetParams {
  text: string;
  inReplyToStatusId?: string;
  idempotencyKey?: string;
}

export interface PostTweetResult {
  tweetId: string;
  text: string;
  createdAt: string;
}

export interface SearchTweetItem {
  id: string;
  text: string;
  authorId?: string;
  username?: string;
}

export interface SearchTweetsParams {
  query: string;
  maxResults?: number;
}

interface XTweetsResponse {
  data?: Array<{ id: string; text: string; author_id?: string; created_at?: string }>;
  includes?: { users?: Array<{ id: string; username: string }> };
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

function buildOAuthHeader(
  method: string,
  url: string,
  oauthParams: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string,
  queryParams: Record<string, string> = {}
): string {
  const allForSig = { ...oauthParams, ...queryParams };
  const sortedKeys = Object.keys(allForSig).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(allForSig[k])}`)
    .join('&');

  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  const authHeaderKeys = [...Object.keys(oauthParams), 'oauth_signature'];
  const allParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };

  return (
    'OAuth ' +
    authHeaderKeys
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(allParams[k])}"`)
      .join(', ')
  );
}

export class XMcpClient {
  /**
   * Posts a tweet or reply to X using OAuth 1.0a User Context.
   * If in test mode or API keys are missing, runs in verified simulated mode.
   */
  static async postTweet(params: PostTweetParams): Promise<PostTweetResult> {
    // Retry the whole 429 attempt so OAuth and the existing claim/finish flow are renewed.
    return executeWithRetry(async () => {
      const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';
      const hasKeys = Boolean(
        config.x.apiKey &&
        config.x.apiSecret &&
        config.x.accessToken &&
        config.x.accessSecret
      );

      if (!hasKeys || isTestMode) {
        console.log(`[XMcp] (${isTestMode ? 'Test Mode' : 'Simulation Mode'}) Posting Tweet:\n"${params.text}"`);
        const simulatedTweetId = `tweet_${Date.now()}`;
        return {
          tweetId: simulatedTweetId,
          text: params.text,
          createdAt: new Date().toISOString(),
        };
      }

      // Live X API v2 Call
      const url = 'https://api.twitter.com/2/tweets';
      const oauthParams: Record<string, string> = {
        oauth_consumer_key: config.x.apiKey,
        oauth_nonce: crypto.randomBytes(16).toString('hex'),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_token: config.x.accessToken,
        oauth_version: '1.0',
      };

      const authHeader = buildOAuthHeader(
        'POST',
        url,
        oauthParams,
        config.x.apiSecret,
        config.x.accessSecret
      );

      const payload: Record<string, unknown> = { text: params.text };
      if (params.inReplyToStatusId) {
        payload.reply = { in_reply_to_tweet_id: params.inReplyToStatusId };
      }

      const claim = await XMcpClient.claimIdempotency(params.idempotencyKey);
      if (claim.replay) return { ...claim.replay, text: params.text };

      let res: Response;
      try {
        res = await fetchResponseWithRetry(url, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        }, { maxRetries: 1 });
      } catch {
        throw new XUnconfirmedError(params.idempotencyKey ?? url);
      }

      if (res.status === 429) {
        await XMcpClient.finishIdempotency(claim.traceId, 'error');
        throw HttpError.fromResponse(res);
      }

      if (res.status === 402) {
        console.warn('[XMcp] X API credits depleted (402 Payment Required). Kein Post erstellt.');
        await XMcpClient.finishIdempotency(claim.traceId, 'error');
        throw new XCreditDepletedError();
      }

      if (!res.ok) {
        if (res.status >= 500) throw new XUnconfirmedError(params.idempotencyKey ?? url);
        const errorText = await res.text();
        await XMcpClient.finishIdempotency(claim.traceId, 'error');
        throw new Error(`X API error ${res.status}: ${errorText}`);
      }

      const data = (await res.json()) as { data?: { id: string; text: string } };
      const tweetId = data.data?.id || `live_${Date.now()}`;
      await XMcpClient.finishIdempotency(claim.traceId, 'ok', tweetId);
      console.log(`[XMcp] Live Tweet posted successfully: ${tweetId}`);
      return {
        tweetId,
        text: data.data?.text || params.text,
        createdAt: new Date().toISOString(),
      };
    }, { maxRetries: 4, initialDelayMs: 1500, retryableStatuses: [429] });
  }

  /** Prüft den Idempotenz-Schlüssel gegen die Trace-Tabelle. */
  static async claimIdempotency(key?: string): Promise<{ replay?: PostTweetResult; traceId?: string }> {
    if (!key) return {};
    const taskId = `x-idem:${key}`;
    const existing = await prisma.trace.findFirst({
      where: { taskId, status: { in: ['ok', 'pending'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing?.status === 'ok') {
      return {
        replay: {
          tweetId: existing.model.replace('tweet:', ''),
          text: '',
          createdAt: existing.createdAt.toISOString(),
        },
      };
    }
    if (existing?.status === 'pending') throw new XUnconfirmedError(key);
    const row = await prisma.trace.create({
      data: { taskId, model: 'x-pending', task: 'x-post', status: 'pending' },
    });
    return { traceId: row.id };
  }

  static async finishIdempotency(traceId: string | undefined, status: 'ok' | 'error', tweetId?: string) {
    if (!traceId) return;
    await prisma.trace.update({
      where: { id: traceId },
      data: { status, model: tweetId ? `tweet:${tweetId}` : 'x-failed' },
    });
  }

  /**
   * Searches recent tweets on X matching a query.
   * If in test mode or API keys are missing, returns simulated high-signal tweets.
   */
  static async searchRecentTweets(params: SearchTweetsParams): Promise<SearchTweetItem[]> {
    const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';
    const hasKeys = Boolean(
      config.x.apiKey &&
      config.x.apiSecret &&
      config.x.accessToken &&
      config.x.accessSecret
    );

    if (!hasKeys || isTestMode) {
      return [
        {
          id: 'sim_tweet_1',
          text: 'Payments plus AI agents on Base L2 is the real wedge for autonomous micro-SaaS.',
          authorId: 'sim_author_1',
          username: 'builder_sim',
        },
      ];
    }

    const url = 'https://api.twitter.com/2/tweets/search/recent';
    const queryParams: Record<string, string> = {
      query: params.query,
      max_results: String(params.maxResults || 10),
    };

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: config.x.apiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: config.x.accessToken,
      oauth_version: '1.0',
    };

    const authHeader = buildOAuthHeader(
      'GET',
      url,
      oauthParams,
      config.x.apiSecret,
      config.x.accessSecret,
      queryParams
    );

    const qs = Object.keys(queryParams)
      .map((k) => `${percentEncode(k)}=${percentEncode(queryParams[k])}`)
      .join('&');

    const res = await fetchResponseWithRetry(`${url}?${qs}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 429) {
      throw new Error('X API rate limit (429)');
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`X API search error ${res.status}: ${errorText}`);
    }

    const data = (await res.json()) as XTweetsResponse;
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((t) => ({
      id: t.id,
      text: t.text,
      authorId: t.author_id,
    }));
  }

  /**
   * Fetches recent incoming mentions to @GuentherBuilds.
   */
  static async getRecentMentions(): Promise<Array<{ id: string; author: string; text: string }>> {
    const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';
    const hasKeys = Boolean(
      config.x.apiKey &&
      config.x.apiSecret &&
      config.x.accessToken &&
      config.x.accessSecret
    );

    if (!hasKeys || isTestMode) {
      return [];
    }

    const userId = '2104592585335443457';
    const url = `https://api.twitter.com/2/users/${userId}/mentions`;
    const queryParams: Record<string, string> = {
      expansions: 'author_id',
      'user.fields': 'username',
      max_results: '10',
    };

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: config.x.apiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: config.x.accessToken,
      oauth_version: '1.0',
    };

    const authHeader = buildOAuthHeader(
      'GET',
      url,
      oauthParams,
      config.x.apiSecret,
      config.x.accessSecret,
      queryParams
    );

    const qs = Object.keys(queryParams)
      .map((k) => `${percentEncode(k)}=${percentEncode(queryParams[k])}`)
      .join('&');

    const res = await fetchResponseWithRetry(`${url}?${qs}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error('X API rate limit (429)');
      return [];
    }

    const data = (await res.json()) as XTweetsResponse;
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    const userMap = new Map<string, string>();
    if (data.includes?.users && Array.isArray(data.includes.users)) {
      for (const u of data.includes.users) {
        userMap.set(u.id, u.username);
      }
    }

    return data.data.map((m) => ({
      id: m.id,
      author: userMap.get(m.author_id ?? '') || 'unknown',
      text: m.text,
    }));
  }

  /**
   * Looks up a user on X by their username.
   */
  static async getUserByUsername(username: string): Promise<{ id: string; name: string; username: string } | null> {
    const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';
    const hasKeys = Boolean(
      config.x.apiKey &&
      config.x.apiSecret &&
      config.x.accessToken &&
      config.x.accessSecret
    );

    if (!hasKeys || isTestMode) {
      return { id: `sim_uid_${username}`, name: username, username };
    }

    const cleanUsername = username.replace(/^@/, '');
    const url = `https://api.twitter.com/2/users/by/username/${cleanUsername}`;

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: config.x.apiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: config.x.accessToken,
      oauth_version: '1.0',
    };

    const authHeader = buildOAuthHeader(
      'GET',
      url,
      oauthParams,
      config.x.apiSecret,
      config.x.accessSecret
    );

    const res = await fetchResponseWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error('X API rate limit (429)');
      return null;
    }

    const data = (await res.json()) as { data?: { id: string; name: string; username: string } };
    if (!data.data) return null;
    return {
      id: data.data.id,
      name: data.data.name,
      username: data.data.username,
    };
  }

  /**
   * Fetches recent tweets for a user, excluding retweets.
   */
  static async getUserTweets(userId: string, maxResults = 5): Promise<Array<{ id: string; text: string; createdAt?: string }>> {
    const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';
    const hasKeys = Boolean(
      config.x.apiKey &&
      config.x.apiSecret &&
      config.x.accessToken &&
      config.x.accessSecret
    );

    if (!hasKeys || isTestMode) {
      return [
        {
          id: `sim_tweet_${userId}`,
          text: 'x402 payments settling in USDC on @base are transforming agent economics. Machine-to-machine micropayments now in production.',
          createdAt: new Date().toISOString(),
        },
      ];
    }

    const url = `https://api.twitter.com/2/users/${userId}/tweets`;
    const queryParams: Record<string, string> = {
      max_results: String(maxResults),
      exclude: 'retweets',
      'tweet.fields': 'created_at',
    };

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: config.x.apiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: config.x.accessToken,
      oauth_version: '1.0',
    };

    const authHeader = buildOAuthHeader(
      'GET',
      url,
      oauthParams,
      config.x.apiSecret,
      config.x.accessSecret,
      queryParams
    );

    const qs = Object.keys(queryParams)
      .map((k) => `${percentEncode(k)}=${percentEncode(queryParams[k])}`)
      .join('&');

    const res = await fetchResponseWithRetry(`${url}?${qs}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error('X API rate limit (429)');
      return [];
    }

    const data = (await res.json()) as XTweetsResponse;
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((t) => ({
      id: t.id,
      text: t.text,
      createdAt: t.created_at,
    }));
  }

  /**
   * Follows a target user on X.
   */
  static async followUser(targetUserId: string): Promise<boolean> {
    const isTestMode = process.env.NODE_ENV === 'test' || config.server.env === 'test';
    const hasKeys = Boolean(
      config.x.apiKey &&
      config.x.apiSecret &&
      config.x.accessToken &&
      config.x.accessSecret
    );

    if (!hasKeys || isTestMode) {
      return true;
    }

    const myUserId = '2104592585335443457';
    const url = `https://api.twitter.com/2/users/${myUserId}/following`;

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: config.x.apiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: config.x.accessToken,
      oauth_version: '1.0',
    };

    const authHeader = buildOAuthHeader(
      'POST',
      url,
      oauthParams,
      config.x.apiSecret,
      config.x.accessSecret
    );

    const res = await fetchResponseWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target_user_id: targetUserId }),
      signal: AbortSignal.timeout(10000),
    }, { retryableStatuses: [429] });

    if (!res.ok) {
      if (res.status === 429) throw new Error('X API rate limit (429)');
      return false;
    }

    const data = (await res.json()) as { data?: { following?: boolean } };
    return Boolean(data?.data?.following);
  }

  /**
   * Posts an authentic multi-tweet thread sequentially on X.
   */
  static async postThread(tweets: string[]): Promise<string[]> {
    if (!tweets || tweets.length === 0) return [];
    const tweetIds: string[] = [];
    let previousId: string | undefined = undefined;

    for (const text of tweets) {
      const res = await this.postTweet({
        text,
        inReplyToStatusId: previousId,
        idempotencyKey: `thread_${Date.now()}_${tweetIds.length}`,
      });
      tweetIds.push(res.tweetId);
      previousId = res.tweetId;
      await new Promise((r) => setTimeout(r, 1200));
    }

    return tweetIds;
  }
}
