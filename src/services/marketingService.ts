import { XMcpClient } from '../mcp/xMcp.js';
import { MentionService } from './mentionService.js';
import { TraceService } from './traceService.js';
import { LlmClient } from '../core/llmClient.js';
import { MetricsService } from './metricsService.js';
import { guntherCharacter } from '../core/character.js';
import { prisma } from '../db/client.js';
import { config } from '../config/index.js';

export class MarketingService {
  /**
   * Broadcasts a Proof-of-Burn announcement on X
   * @param amountCents Total net revenue in cents (e.g. 4900 = $49.00)
   * @param tokensBurned BigInt token units burned
   * @param txHash Base L2 transaction hash
   */
  static async announceBurn(amountCents: number, tokensBurned: bigint, txHash: string) {
    const formattedTokens = new Intl.NumberFormat('en-US').format(tokensBurned);
    const formattedUsd = (amountCents / 100).toFixed(2);

    const tweetText = `Revenue verified: $${formattedUsd} via Stripe.\n${formattedTokens} $GUNTER permanently burned on @base.\nTx: basescan.org/tx/${txHash}\n\nAutonomous commerce in production.`;

    const result = await XMcpClient.postTweet({
      text: tweetText,
      idempotencyKey: `burn_announce_${txHash}`,
    });

    await TraceService.recordTrace({
      taskId: `tweet-burn-${txHash}`,
      model: 'x-mcp-publisher',
      task: 'ANNOUNCE_BURN',
      status: 'ok',
      metadata: { tweetId: result.tweetId },
    });

    return result;
  }

  /**
   * Replies to an X mention adhering to Günther's Brand Voice.
   * Atomically claims the mention via CAS to prevent double-reply race conditions.
   */
  static async handleIncomingMention(tweetId: string, author: string, mentionText: string) {
    await MentionService.recordMention(tweetId, author, mentionText);

    // Atomic CAS claim: only one process can transition from 'seen' to 'replying'
    const claimed = await MentionService.claimForReplying(tweetId);
    if (!claimed) {
      console.log(`[MarketingService] Mention ${tweetId} is already being replied to or replied. Skipping.`);
      return;
    }

    // Safety Hard Caps: enforce daily budget and prevent bot-loops
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const totalRepliesToday = await prisma.mention.count({
      where: {
        status: 'replied',
        updatedAt: { gte: todayStart },
      },
    });

    if (totalRepliesToday >= config.growth.maxDailyReplies) {
      console.log(`[MarketingService] Daily reply cap reached (${totalRepliesToday}/${config.growth.maxDailyReplies}). Skipping mention ${tweetId}.`);
      await MentionService.markSkipped(tweetId);
      return;
    }

    const userRepliesToday = await prisma.mention.count({
      where: {
        author,
        status: 'replied',
        updatedAt: { gte: todayStart },
      },
    });

    if (userRepliesToday >= config.growth.maxRepliesPerUserDaily) {
      console.log(`[MarketingService] User @${author} reached daily interaction cap (${userRepliesToday}/${config.growth.maxRepliesPerUserDaily}). Skipping mention ${tweetId}.`);
      await MentionService.markSkipped(tweetId);
      return;
    }

    try {
      // Formulate Günther's response via LLM Client (Claude or Brand Persona fallback)
      const replyText = await LlmClient.generateClaudeReply(author, mentionText, `mention-${tweetId}`);

      const result = await XMcpClient.postTweet({
        text: replyText,
        inReplyToStatusId: tweetId,
        idempotencyKey: `reply_${tweetId}`,
      });

      await MentionService.markReplied(tweetId, result.tweetId);

      await TraceService.recordTrace({
        taskId: `mention-${tweetId}`,
        model: 'x-mcp-responder',
        task: 'HANDLE_MENTION',
        status: 'ok',
        metadata: { replyTweetId: result.tweetId },
      });

      return result;
    } catch (err) {
      console.error(`[MarketingService] Failed to reply to mention ${tweetId}:`, err);
      await MentionService.markFailed(tweetId);
      throw err;
    }
  }

  /**
   * Generates and broadcasts an autonomous daily business & token burn pulse update
   */
  static async generateDailyMarketPulse() {
    const today = new Date().toISOString().slice(0, 10);
    const metrics = await MetricsService.getLiveMetrics();

    const formattedBurned = new Intl.NumberFormat('en-US').format(
      BigInt(metrics.financials.totalBurnedTokens)
    );
    const { netProfitMarginPercent, totalInferenceCostUsd } = metrics.aiObservability;
    const marginText =
      netProfitMarginPercent === null
        ? `Inference cost: $${totalInferenceCostUsd.toFixed(2)}`
        : `Margin: ${netProfitMarginPercent}%`;

    // Adaptive Angle Rotation: If sales are quiet, rotate strategic angles to educate and convert
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const angles = [
      {
        angle: 'DEV_PAIN_POINT',
        guidance: 'Focus on production resilience: Why 95% of AI agents fail (webhook race conditions, double-spend, memory leaks) and how strict Atomic CAS and Zod schemas solve this.',
      },
      {
        angle: 'ECONOMICS_MARGIN',
        guidance: 'Focus on agent profitability: How to achieve near-100% LLM margins using local routing for classification while keeping API costs under $0.05/month.',
      },
      {
        angle: 'ONCHAIN_ALPHA',
        guidance: 'Focus on Web3 execution: How a native viem signer on Base L2 signs automated burns with custom tx calldata without exposing private keys.',
      },
      {
        angle: 'CONTRARIAN_BUILDER',
        guidance: 'Focus on real-world utility: Stop building prompt-wrapper chatbots. Build autonomous software that sells digital assets and executes verifiable on-chain actions.',
      },
      {
        angle: 'METRICS_PROOF',
        guidance: 'Focus on hard metrics: Live revenue, burned $GUNTER on Base, live skills in the catalog, and transparent execution.',
      },
    ];

    const currentStrategy = angles[dayOfYear % angles.length];

    let pulseText = '';

    const completion = await LlmClient.generateCompletion({
      systemPrompt: `You are Günther (@GuentherBuilds), an autonomous AI entrepreneur built on ElizaOS, Fastify, and Base L2.
You write concise, high-signal, punchy daily updates for the crypto, builder, and developer community on X.
Today's strategic angle: ${currentStrategy.angle}.
Guidance: ${currentStrategy.guidance}

Strict rules:
- Language: ENGLISH only.
- Tone: Technical, direct, mature builder-focused. No cheesy marketing fluff, no exclamation marks.
- Character count: Strictly under 220 characters.
- Format: A crisp insight or metric, followed by the solution/playbook link.`,
      userPrompt: `Write a 200-character daily builder post for ${today}.
Current State:
- Revenue: $${metrics.financials.totalRevenueUsd.toFixed(2)} USD | Burned: ${formattedBurned} $GUNTER on Base
- Skills: ${metrics.products.clawMart.totalSkills} live | ${marginText}
Incorporate today's angle (${currentStrategy.angle}). End with 0xguenther.org.`,
      maxTokens: 80,
      taskId: `daily-pulse-${today}`,
      taskName: 'GENERATE_DAILY_MARKET_PULSE',
      timeoutMs: 8000,
    });

    if (completion && completion.text) {
      pulseText = completion.text.trim();
    } else {
      pulseText = `DAILY AGENT PULSE | ${today}\n\nRevenue: $${metrics.financials.totalRevenueUsd.toFixed(2)} USD\nBurned: ${formattedBurned} $GUNTER on @base\nSkills: ${metrics.products.clawMart.totalSkills} live | ${marginText}\n\nAutonomous execution in production.\n0xguenther.org`;
    }

    // Safety guard against Twitter 280-char truncation
    if (pulseText.length > 270) {
      pulseText = pulseText.slice(0, 267) + '...';
    }

    const tweetResult = await XMcpClient.postTweet({
      text: pulseText,
      idempotencyKey: `daily_pulse_${today}`,
    });

    return {
      date: today,
      text: pulseText,
      tweetId: tweetResult.tweetId,
      metrics,
    };
  }
}
