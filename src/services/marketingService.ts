import { XMcpClient } from '../mcp/xMcp.js';
import { MentionService } from './mentionService.js';
import { TraceService } from './traceService.js';
import { LlmClient } from '../core/llmClient.js';
import { MetricsService } from './metricsService.js';
import { guntherCharacter } from '../core/character.js';
import { prisma } from '../db/client.js';
import { config } from '../config/index.js';

/** Public raw data of the October 2026 write-path experiment: the only link the daily post carries. */
export const PULSE_DATA_URL = 'https://github.com/0xguenther/agent-write-path-runs';

const PULSE_ANGLES = [
  'a timeout after a successful write is the dangerous case, not the failed call',
  'read the system of record before every retry',
  'enforce the retry budget in the harness, not in the prompt',
  'give every write an idempotency key the model cannot regenerate',
  'a success claim needs evidence from the system of record',
];

// Facts only come from the published experiment (duplicate writes per 100 runs: 38 / 10 / 1 / 0 / 0).
export const PULSE_FALLBACKS = [
  `A tool call times out after the write already went through. A blind retry then creates the second invoice. In our test one model duplicated writes in 38 of 100 runs, another in 0. Read the state before you retry.\n${PULSE_DATA_URL}`,
  `A timeout is not a failure: the write may have landed. Give every write an idempotency key the model cannot regenerate and check the system of record before a retry. Raw data, 5 models x 100 runs:\n${PULSE_DATA_URL}`,
  `Retry budgets belong in the harness, not in the prompt. On identical fault-injection cases, models ranged from 0 to 38 duplicate writes in 100 runs. Raw data:\n${PULSE_DATA_URL}`,
];

/** A generated post must be pure insight: ends with the data link, fits X, no price or sales language. */
export function isValidPulse(text: string): boolean {
  return text.length >= 60 && text.length <= 275 && text.endsWith(PULSE_DATA_URL) &&
    text.slice(0, text.length - PULSE_DATA_URL.length).length <= 235 &&
    !/\$\s?\d|\bprice|\bpricing|audit|0xguenther\.org|\bbuy\b|!/i.test(text);
}

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

    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const angle = PULSE_ANGLES[dayOfYear % PULSE_ANGLES.length];

    // Participation first: a data-backed lesson for agent builders, no price and no sales pitch.
    // The raw data link is the only link; the audit stays one click away on the profile.
    let pulseText = '';

    const completion = await LlmClient.generateCompletion({
      systemPrompt: `You are Günther (@GuentherBuilds), an autonomous AI agent, posting one technical observation on X for developers who build LLM agents with tool calling.
Facts you may use (never invent numbers): October 2026 experiment, same harness and prompt, 10 failure cases, 100 runs per model, mock tools with fault injection. Runs with a duplicate write after a timeout followed by a retry: Ornith 1.5 35B 38/100, Claude Haiku 4.5 10/100, Qwen3.8 27B 1/100, Qwen3 14B 0/100, DeepSeek Flash 0/100. This is harness behaviour, not a ranking.
Strict rules:
- English only, plain text, at most 230 characters before the link.
- One concrete insight or practical tip an engineer can use today.
- No price, no sales pitch, no call to buy, no exclamation marks, no hashtags, no emojis.
- End with the raw data link: ${PULSE_DATA_URL}`,
      userPrompt: `Write today's post (${today}). Angle: ${angle}.`,
      maxTokens: 120,
      taskId: `daily-pulse-${today}`,
      taskName: 'GENERATE_DAILY_MARKET_PULSE',
      timeoutMs: 15000,
    });

    pulseText = completion?.text?.trim() ?? '';
    if (!isValidPulse(pulseText)) pulseText = PULSE_FALLBACKS[dayOfYear % PULSE_FALLBACKS.length];

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
