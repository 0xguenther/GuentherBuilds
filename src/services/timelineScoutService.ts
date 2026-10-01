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

  // High-relevance keywords matching Günther's engineering domain across all core topics
  static readonly KEYWORD_TRIGGERS = [
    'agent', 'base', 'usdc', 'x402', 'payment', 'micropayment', 'token', 'burn',
    'eliza', 'ai16z', 'hardware', 'proxmox', 'ollama', 'sqlite', 'wal',
    'unit economics', 'calldata', 'mcp', 'tools', 'skills', 'plugin',
    'cdp', 'mpc', 'security', 'keys', 'b2b', 'retainer', 'saas', 'commerce',
    'inference', 'latency', 'gpu', 'gas', 'viem', 'cobalt'
  ];

  static readonly DOMAIN_FALLBACKS: Record<string, string> = {
    COMMERCE: 'HTTP 402 + native @base settlement is what turns autonomous agents from toys into real businesses. Micro-settlement in USDC eliminates payment friction.',
    ONCHAIN: 'Native Base L2 calldata execution keeps tx fees under $0.002. Immutable on-chain proof without bloated smart contract overhead.',
    FRAMEWORKS: 'Clean MCP tool isolation beats monolithic agent spaghetti. Sandboxed protocol execution is what makes autonomous agents reliable in production.',
    INFRASTRUCTURE: 'Local Ollama 8B JSON classification gives 35ms response times at $0.00 token cost. Dedicated Proxmox LXC beats serverless cold starts.',
    SECURITY: 'Never store raw private keys on a server. CDP AgentKit MPC wallets ensure autonomous agent transactions remain tamper-proof.',
    GENERAL: 'Native @base settlement + HTTP 402 is what makes autonomous agent commerce sustainable in production. Local models keep unit margins positive.'
  };

  /**
   * Classifies the primary engineering domain based on matched keywords
   */
  static classifyDomain(keywords: string[]): string {
    const kws = new Set(keywords);
    if (kws.has('x402') || kws.has('payment') || kws.has('micropayment') || kws.has('usdc') || kws.has('commerce') || kws.has('saas') || kws.has('b2b')) return 'COMMERCE';
    if (kws.has('token') || kws.has('burn') || kws.has('calldata') || kws.has('gas') || kws.has('viem') || kws.has('cobalt')) return 'ONCHAIN';
    if (kws.has('mcp') || kws.has('tools') || kws.has('skills') || kws.has('plugin') || kws.has('eliza') || kws.has('ai16z')) return 'FRAMEWORKS';
    if (kws.has('hardware') || kws.has('proxmox') || kws.has('ollama') || kws.has('inference') || kws.has('latency') || kws.has('gpu')) return 'INFRASTRUCTURE';
    if (kws.has('cdp') || kws.has('mpc') || kws.has('security') || kws.has('keys') || kws.has('sqlite') || kws.has('wal')) return 'SECURITY';
    return 'GENERAL';
  }

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

    const domain = this.classifyDomain(chosen.matchedKeywords);

    let completion: any = null;
    if (allowExternalLlm) {
      completion = await LlmClient.generateCompletion({
        systemPrompt: `You are Günther (@GuentherBuilds), an autonomous self-hosted AI entrepreneur running live on a dedicated Proxmox LXC container (Debian 12, Fastify v5, SQLite WAL, viem on Base L2).
You share authoritative technical observations reacting to industry developments.

Strict Rules:
- Language: ENGLISH only.
- Length: Max 200 characters.
- Tone: Direct, mature, pragmatic Swiss engineer. No exclamation marks, no hype, no emojis.
- Adapt dynamically to the topic domain (${domain}):
  * COMMERCE: Focus on machine-to-machine cashflow, HTTP 402, and micro-settlement in USDC.
  * ONCHAIN: Focus on Base L2 execution, low gas fees (<$0.002), and verifiable calldata proofs.
  * FRAMEWORKS: Focus on tool isolation, MCP protocol servers, and deterministic agent pipelines.
  * INFRASTRUCTURE: Focus on local Ollama inference, low latency, and self-hosted reliability vs cloud cold starts.
  * SECURITY: Focus on CDP MPC wallets vs storing raw server keys, and atomic SQLite CAS state.
- Include '@base' if relevant to execution, settlement, or onchain tokens.`,
        userPrompt: `Topic observed from @${chosen.account} [Domain: ${domain}]: "${chosen.text}"
Keywords: ${chosen.matchedKeywords.join(', ')}
Current metrics: $${metrics.financials.totalRevenueUsd.toFixed(2)} USD revenue, ${metrics.financials.totalBurnedTokens} $GUNTER burned.
Write a punchy, domain-accurate technical observation reacting to this topic.`,
        maxTokens: 70,
        taskId: `scout-insight-${chosen.tweetId}`,
        taskName: 'GENERATE_SCOUT_REACTIVE_INSIGHT',
        timeoutMs: 8000,
      });
    }

    let postText = completion?.text?.trim().replace(/^["']|["']$/g, '');
    if (!postText) {
      postText = this.DOMAIN_FALLBACKS[domain] || this.DOMAIN_FALLBACKS.GENERAL;
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
