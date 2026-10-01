import { XMcpClient } from '../mcp/xMcp.js';
import { LlmClient } from '../core/llmClient.js';
import { TraceService } from './traceService.js';
import { MetricsService } from './metricsService.js';
import { config } from '../config/index.js';
import { prisma } from '../db/client.js';

export interface ScoutOpportunity {
  account: string;
  tweetId: string;
  text: string;
  matchedKeywords: string[];
}

export interface ScoutResult {
  inspected: number;
  matched: number;
  acted: boolean;
  tweetId?: string;
  text?: string;
  reason?: string;
}

export class TimelineScoutService {
  private static lastScoutPostTimestamp = 0;
  private static readonly MIN_SCOUT_INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours between reactive insights

  // Curated ecosystem accounts to scout
  static readonly WATCHLIST = [
    'base',
    'jessepollak',
    'CoinbaseDev',
    'elizaos',
    'shawmakesmagic',
    'ollama',
    'virtuals_io',
    'autonolas',
  ];

  // High-relevance keywords matching Günther's engineering domain
  static readonly KEYWORD_TRIGGERS = [
    'agent',
    'base',
    'usdc',
    'x402',
    'payment',
    'micropayment',
    'token',
    'burn',
    'eliza',
    'ai16z',
    'hardware',
    'proxmox',
    'ollama',
    'sqlite',
    'wal',
    'unit economics',
    'calldata',
  ];

  private static cachedUserIds: Map<string, string> = new Map();

  /**
   * Resolves account username to Twitter User ID (with in-memory cache)
   */
  static async resolveUserId(username: string): Promise<string | null> {
    const cached = this.cachedUserIds.get(username);
    if (cached) return cached;

    const user = await XMcpClient.getUserByUsername(username);
    if (user?.id) {
      this.cachedUserIds.set(username, user.id);
      return user.id;
    }
    return null;
  }

  /**
   * Scouts the recent tweets of followed ecosystem accounts and identifies
   * active discussions where Günther can provide high-signal technical input.
   */
  static async scoutEcosystem(limitPerAccount = 3): Promise<ScoutOpportunity[]> {
    const opportunities: ScoutOpportunity[] = [];

    for (const account of this.WATCHLIST) {
      try {
        const userId = await this.resolveUserId(account);
        if (!userId) continue;

        const tweets = await XMcpClient.getUserTweets(userId, limitPerAccount);
        for (const t of tweets) {
          const lower = t.text.toLowerCase();
          const matched = this.KEYWORD_TRIGGERS.filter((kw) => lower.includes(kw));

          if (matched.length > 0) {
            opportunities.push({
              account,
              tweetId: t.id,
              text: t.text,
              matchedKeywords: matched,
            });
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.warn(`[TimelineScout] Failed to scout @${account}: ${msg}`);
      }
    }

    return opportunities;
  }

  /**
   * Analyzes scouted discussions and publishes a targeted, persona-aligned
   * technical insight addressing the live conversation stream.
   */
  static async scoutAndReact(force = false): Promise<ScoutResult> {
    const now = Date.now();

    // 1. Rate-limit guard: Minimum interval
    if (!force && now - this.lastScoutPostTimestamp < this.MIN_SCOUT_INTERVAL_MS) {
      const waitHours = Math.round((this.MIN_SCOUT_INTERVAL_MS - (now - this.lastScoutPostTimestamp)) / (1000 * 60 * 60) * 10) / 10;
      return {
        inspected: 0,
        matched: 0,
        acted: false,
        reason: `Scout cooldown active: ${waitHours}h remaining until next allowed reactive post.`,
      };
    }

    // 2. Daily post cap guard
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const postsToday = await prisma.trace.count({
      where: {
        task: 'SCOUT_REACTIVE_INSIGHT_POSTED',
        createdAt: { gte: todayStart },
      },
    });

    if (!force && postsToday >= 2) {
      return {
        inspected: 0,
        matched: 0,
        acted: false,
        reason: `Daily scout-reactive post cap reached (${postsToday}/2 today).`,
      };
    }

    // 3. Scout ecosystem timeline
    const opportunities = await this.scoutEcosystem(3);
    if (opportunities.length === 0) {
      return {
        inspected: this.WATCHLIST.length,
        matched: 0,
        acted: false,
        reason: 'No matching technical conversations found in current scouting cycle.',
      };
    }

    // 4. Filter out opportunities we have already addressed
    const recentTraces = await prisma.trace.findMany({
      where: {
        task: 'SCOUT_REACTIVE_INSIGHT_POSTED',
        createdAt: { gte: new Date(now - 72 * 60 * 60 * 1000) },
      },
    });
    const handledTweetIds = new Set(recentTraces.map((t) => t.taskId.replace('scout-insight-', '')));

    const freshOpportunities = opportunities.filter((op) => !handledTweetIds.has(op.tweetId));
    if (freshOpportunities.length === 0) {
      return {
        inspected: this.WATCHLIST.length,
        matched: opportunities.length,
        acted: false,
        reason: 'All current matching discussions have already been addressed.',
      };
    }

    // Pick highest signal opportunity (most matched keywords)
    freshOpportunities.sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length);
    const chosen = freshOpportunities[0];

    // 5. Generate persona-aligned reactive insight
    const metrics = await MetricsService.getLiveMetrics();

    // Check LLM cost limits
    const todayTraces = await prisma.trace.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { costUsd: true },
    });
    const totalCostToday = todayTraces.reduce((acc, t) => acc + (t.costUsd || 0), 0);
    const allowExternalLlm = totalCostToday < config.growth.maxDailyLlmCostUsd;

    let completion: any = null;
    if (allowExternalLlm) {
      completion = await LlmClient.generateCompletion({
        systemPrompt: `You are Günther (@GuentherBuilds), an autonomous self-hosted AI entrepreneur running live on a dedicated Proxmox LXC container (Debian 12, Fastify v5, SQLite WAL, viem on Base L2).
You share authoritative technical observations reacting to industry developments.

Strict Rules:
- Language: ENGLISH only.
- Length: Max 200 characters.
- Tone: Direct, mature, pragmatic Swiss engineer. No exclamation marks, no hype, no emojis.
- Reference the theme naturally: unit economics, local LLM routing vs API costs, SQLite CAS state safety, or Base L2 settlement.
- Always include '@base' naturally in the context of settlement or L2 execution.`,
        userPrompt: `Topic observed from @${chosen.account}: "${chosen.text}"
Keywords: ${chosen.matchedKeywords.join(', ')}
Current metrics: $${metrics.financials.totalRevenueUsd.toFixed(2)} USD revenue, ${metrics.financials.totalBurnedTokens} $GUNTER burned.
Write a punchy, high-signal technical observation reacting to this topic.`,
        maxTokens: 70,
        taskId: `scout-insight-${chosen.tweetId}`,
        taskName: 'GENERATE_SCOUT_REACTIVE_INSIGHT',
        timeoutMs: 8000,
      });
    }

    let postText = completion?.text?.trim().replace(/^["']|["']$/g, '');
    if (!postText) {
      postText = `Native @base settlement + HTTP 402 is what makes autonomous agent commerce sustainable in production. Local models keep unit margins positive.`;
    }

    // 6. Post to X
    try {
      const res = await XMcpClient.postTweet({
        text: postText,
        idempotencyKey: `scout_${chosen.tweetId}_${now}`,
      });

      this.lastScoutPostTimestamp = now;

      await TraceService.recordTrace({
        taskId: `scout-insight-${chosen.tweetId}`,
        task: 'SCOUT_REACTIVE_INSIGHT_POSTED',
        model: completion?.model || 'deterministic_fallback',
        costUsd: completion?.costUsd || 0,
        tokens: (completion?.inputTokens || 0) + (completion?.outputTokens || 0),
        status: 'ok',
      });

      console.log(`[TimelineScout] Published reactive insight on @${chosen.account} discussion: ${res.tweetId}`);

      return {
        inspected: this.WATCHLIST.length,
        matched: opportunities.length,
        acted: true,
        tweetId: res.tweetId,
        text: postText,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[TimelineScout] Failed to publish reactive insight:', msg);
      return {
        inspected: this.WATCHLIST.length,
        matched: opportunities.length,
        acted: false,
        reason: msg,
      };
    }
  }
}
