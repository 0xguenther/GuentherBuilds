import { XMcpClient } from '../mcp/xMcp.js';
import { MentionService } from './mentionService.js';
import { MarketingService } from './marketingService.js';
import { LlmClient } from '../core/llmClient.js';
import { TraceService } from './traceService.js';
import { MetricsService } from './metricsService.js';
import { config } from '../config/index.js';
import { prisma } from '../db/client.js';

export class CommunityGrowthService {
  private static lastPostTimestamp = 0;
  private static readonly MIN_POST_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours between builder insight posts

  private static readonly HASHTAG_SETS = [
    '#buildinpublic #Base #AIagents',
    '#SelfHosted #Proxmox #Fastify #Base',
    '#AIagents #Ollama #TypeScript #buildinpublic',
    '#Base #Onchain #Web3 #AIagents',
  ];

  /**
   * 1. Polls for incoming mentions to @GuentherBuilds and automatically replies
   * with high-signal, persona-aligned answers via Claude.
   */
  static async processIncomingMentions(): Promise<number> {
    try {
      const mentions = await XMcpClient.getRecentMentions();
      if (mentions.length === 0) return 0;

      let processed = 0;
      for (const m of mentions) {
        // Atomic CAS via MentionService ensures each mention is replied to exactly once
        const claimed = await MentionService.claimForReplying(m.id);
        if (claimed) {
          console.log(`[CommunityGrowth] Processing incoming mention from @${m.author}: "${m.text}"`);
          await MarketingService.handleIncomingMention(m.id, m.author, m.text);
          processed++;
        }
      }
      return processed;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`[CommunityGrowth] Failed to process mentions: ${msg}`);
      return 0;
    }
  }

  /**
   * 2. Publishes high-signal, hashtag-optimized technical insight posts
   * that index into active developer search streams (#buildinpublic, #Base, #AIagents).
   */
  static async publishBuilderInsight(force = false): Promise<{
    published: boolean;
    tweetId?: string;
    text?: string;
    reason?: string;
  }> {
    const now = Date.now();
    const intervalMs = config.growth.minHoursBetweenInsights * 60 * 60 * 1000;
    if (!force && now - this.lastPostTimestamp < intervalMs) {
      const waitHours = Math.round((intervalMs - (now - this.lastPostTimestamp)) / (1000 * 60 * 60) * 10) / 10;
      return {
        published: false,
        reason: `Rate limit guard: ${waitHours}h remaining until next allowed builder insight post.`,
      };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const postsToday = await prisma.trace.count({
      where: {
        task: 'GROWTH_INSIGHT_POSTED',
        createdAt: { gte: todayStart },
      },
    });

    if (!force && postsToday >= config.growth.maxDailyBuilderInsights) {
      return {
        published: false,
        reason: `Daily builder insight cap reached (${postsToday}/${config.growth.maxDailyBuilderInsights} today).`,
      };
    }

    const metrics = await MetricsService.getLiveMetrics();
    const tagIndex = Math.floor(now / (1000 * 60 * 60 * 6)) % this.HASHTAG_SETS.length;
    const hashtags = this.HASHTAG_SETS[tagIndex];

    const angles = [
      'Why 80% of agent startups burn cash calling external LLMs for basic routing, and how local Ollama 8B JSON classification delivers 99.8% gross margin.',
      'How SQLite WAL mode + Compare-and-Swap state engines prevent webhook race conditions and double-spending under load.',
      'Why we execute token burns on Base L2 using zero-value calldata transactions instead of smart contract transfers: <$0.002 gas with immutable on-chain proof.',
      'Running autonomous AI agents on dedicated self-hosted hardware (Debian 12 LXC on Proxmox) vs serverless cold starts.',
    ];
    const selectedAngle = angles[Math.floor(Math.random() * angles.length)];

    let postText = '';
    
    // Check if daily LLM cost exceeds safety cap
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
You share punchy, high-signal technical architecture lessons for developers and founders on X.

Strict Rules:
- Language: ENGLISH only.
- Length: Max 210 characters (excluding hashtags).
- Tone: Direct, mature, pragmatic Swiss engineer. No exclamation marks, no fluffy buzzwords.
- Content: Focus on real engineering choices (Ollama 8B routing, SQLite CAS, Fastify rawBody, Base L2 calldata).
- Never use sales slogans. Mention 0xguenther.org as the live proof.`,
        userPrompt: `Write a short, high-impact builder post about: ${selectedAngle}\nMetrics: $${metrics.financials.totalRevenueUsd.toFixed(2)} USD revenue, ${metrics.financials.totalBurnedTokens} $GUNTER burned. End with 0xguenther.org`,
        maxTokens: 75,
        taskId: `growth-insight-${now}`,
        taskName: 'GENERATE_ORGANIC_BUILDER_INSIGHT',
        timeoutMs: 8000,
      });
    }

    const body = completion?.text?.trim().replace(/^["']|["']$/g, '');
    if (body) {
      postText = `${body}\n\n${hashtags}`;
    } else {
      postText = `Local Ollama 8B JSON routing + atomic SQLite CAS + Base L2 calldata audits is what keeps autonomous agent unit economics positive in production.\n\nLive stack: 0xguenther.org\n${hashtags}`;
    }

    try {
      const res = await XMcpClient.postTweet({
        text: postText,
        idempotencyKey: `growth_insight_${now}`,
      });

      this.lastPostTimestamp = now;

      await TraceService.recordTrace({
        taskId: `growth-insight-${now}`,
        task: 'GROWTH_INSIGHT_POSTED',
        model: completion?.model || 'deterministic_fallback',
        costUsd: completion?.costUsd || 0,
        tokens: (completion?.inputTokens || 0) + (completion?.outputTokens || 0),
        status: 'ok',
      });

      console.log(`[CommunityGrowth] Successfully published builder insight: ${res.tweetId}`);
      return {
        published: true,
        tweetId: res.tweetId,
        text: postText,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[CommunityGrowth] Failed to post builder insight:', msg);
      return { published: false, reason: msg };
    }
  }

  /**
   * 3. Publishes an authoritative, viral architecture breakdown thread on X.
   * Self-threading is 100% permitted by Twitter API v2.
   */
  static async publishArchitectureThread(): Promise<{
    published: boolean;
    tweetIds: string[];
    reason?: string;
  }> {
    const threadTweets = [
      `Meet 0xGünther (@GuentherBuilds) — an autonomous AI entrepreneur running 24/7 on a dedicated Proxmox LXC container (Debian 12, Fastify v5, SQLite WAL, viem on Base L2).\n\nHe sells digital tools, routes LLMs locally, and burns tokens on-chain.\n\nHere is the exact production architecture 🧵👇\n#buildinpublic #Base #AIagents`,
      `1/ The Unit Economics Trap:\nIf your agent calls external Claude or GPT APIs for every routing decision or JSON parse, your gross margin is negative.\n\nGünther uses local Ollama 8B for 35ms event classification ($0.00 cost). Only high-stakes copywriting hits external models. Net margin: 99.8%.`,
      `2/ Concurrency & Zero Double-Spending:\nIn digital commerce, webhooks WILL deliver duplicate events under load.\n\nGünther runs SQLite WAL mode with Compare-and-Swap (CAS) state engines. If Stripe delivers 3 duplicate events simultaneously, exactly one commits. Zero double-burns.`,
      `3/ Verifiable On-Chain Proof:\nEvery sale triggers a native viem signer on @base with custom tx calldata ($0.001 gas fee).\n\nThis gives immutable proof of execution on BaseScan without exposing server private keys to browser clients.`,
      `4/ The entire open-core stack is public & self-hosted:\n\nGitHub: github.com/0xguenther/GuentherBuilds\nLive API & Dashboard: 0xguenther.org\n\nQuestions about Proxmox LXC, Fastify, or Base L2? Ask below 👇\n#buildinpublic #SelfHosted`,
    ];

    try {
      console.log(`[CommunityGrowth] Publishing 5-part architecture breakdown thread to X...`);
      const tweetIds = await XMcpClient.postThread(threadTweets);
      console.log(`[CommunityGrowth] Thread published successfully! Root Tweet ID: ${tweetIds[0]}`);

      await TraceService.recordTrace({
        taskId: `growth-thread-${Date.now()}`,
        task: 'GROWTH_THREAD_PUBLISHED',
        model: 'architecture_compendium',
        costUsd: 0,
        tokens: 0,
        status: 'ok',
      });

      return {
        published: true,
        tweetIds,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[CommunityGrowth] Failed to post architecture thread:', msg);
      return { published: false, tweetIds: [], reason: msg };
    }
  }

  /**
   * Main cycle executed periodically by the background daemon.
   */
  static async runGrowthCycle(): Promise<{ mentionsProcessed: number; insightPublished: boolean }> {
    const mentionsProcessed = await this.processIncomingMentions();
    const insightResult = await this.publishBuilderInsight(false);
    return {
      mentionsProcessed,
      insightPublished: insightResult.published,
    };
  }
}
