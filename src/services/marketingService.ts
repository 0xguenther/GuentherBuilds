import { XMcpClient } from '../mcp/xMcp.js';
import { MentionService } from './mentionService.js';
import { TraceService } from './traceService.js';
import { LlmClient } from '../core/llmClient.js';
import { MetricsService } from './metricsService.js';
import { guntherCharacter } from '../core/character.js';
import { prisma } from '../db/client.js';
import { config } from '../config/index.js';

/** Public raw data of the October 2026 write-path experiment. */
export const PULSE_DATA_URL = 'https://github.com/0xguenther/agent-write-path-runs';

const SITE_EN = 'https://0xguenther.org/en/';
const tracked = (slug: string) => `${SITE_EN}${slug}?utm_source=x&utm_medium=social&utm_campaign=research&utm_content=${slug.replace('.html', '')}`;

/**
 * One finding per day, each with its case-study page. Every number comes from the published
 * runs (agent-write-path-runs); the page builder asserts the same figures against runs.jsonl.
 */
export const PULSE_TOPICS = [
  {
    url: tracked('agent-lost-reply-after-write.html'),
    fact: 'The reply to a write is lost to a timeout, 30 runs per model: Ornith 1.5 35B created a duplicate in 28. Claude Haiku 4.5 and Qwen3 14B created none but reported failure in all 30 although the record existed. DeepSeek Flash and Qwen3.8 27B read the state back and were right 30 of 30.',
    fallback: 'A write times out and the reply is lost. In 30 runs per model, one model duplicated it 28 times, two reported failure for a record that existed, two checked first and got 30 of 30. Check the state before you retry.',
  },
  {
    url: tracked('agent-false-success-tool-says-ok.html'),
    fact: 'The tool answered ok with an order ID but no order existed. Only 1 of 50 runs ended with the order in place. Three models reported success in all 10 runs; two said unverified in 16 of 20.',
    fallback: 'The tool said ok with an order ID. No order existed. Only 1 of 50 runs ended with the order in place; 32 reported a success the system did not support. Read it back before you report done.',
  },
  {
    url: tracked('agent-rate-limit-retry-behavior.html'),
    fact: 'After a single 429 or 503 that created nothing, Claude Haiku 4.5 and Qwen3 14B stopped after one call in 30 of 30 runs. DeepSeek Flash and Qwen3.8 27B completed 30 of 30. Retrying is safe there because nothing was written.',
    fallback: 'After one 429 or 503 that created nothing, two of five models stopped after a single call in 30 of 30 runs. Retrying is safe there. Put the retry policy in the harness, not in the prompt.',
  },
  {
    url: tracked('agent-chained-tool-calls-duplicate-invoice.html'),
    fact: 'Create an invoice, then email it: the first step times out and the email needs the invoice number. Claude Haiku 4.5 and Ornith 1.5 35B created a second invoice in 10 of 10 runs.',
    fallback: 'Invoice times out, the email needs its number. Two of five models created a second invoice in 10 of 10 runs. Look the invoice up by its idempotency key before you write again.',
  },
  {
    url: tracked('agent-malformed-reply-wrong-id.html'),
    fact: 'A malformed JSON reply after a successful ticket and a reply that names a different order ID: all five models handled all 20 of their runs each (100 of 100 in total). The failures sit elsewhere: lost replies, a false ok and chained steps.',
    fallback: 'A malformed JSON reply and a wrong ID in the reply: all five models handled all 20 of their runs each. The failures sit elsewhere: lost replies, a false ok and chained steps.',
  },
];

export const PULSE_FALLBACKS = PULSE_TOPICS.map(t => `${t.fallback}\n${t.url}`);
const PULSE_LINKS = [PULSE_DATA_URL, ...PULSE_TOPICS.map(t => t.url)];

/** A generated post must be pure insight: ends with an allowed research link, fits X, no price or sales language. */
export function isValidPulse(text: string): boolean {
  const url = PULSE_LINKS.find(u => text.endsWith(u));
  if (!url) return false;
  const body = text.slice(0, text.length - url.length);
  // X counts every link as 23 characters; one more for the line break.
  return body.length >= 40 && body.length + 1 + 23 <= 280 &&
    !/\$\s?\d|\bprice|\bpricing|audit|0xguenther\.org|\bbuy\b|!/i.test(body);
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
    const topic = PULSE_TOPICS[dayOfYear % PULSE_TOPICS.length];

    // Participation first: a data-backed lesson for agent builders, no price and no sales pitch.
    // The raw data link is the only link; the audit stays one click away on the profile.
    let pulseText = '';

    const completion = await LlmClient.generateCompletion({
      systemPrompt: `You are Günther (@GuentherBuilds), an autonomous AI agent, posting one technical observation on X for developers who build LLM agents with tool calling.
Background: October 2026 experiment, same harness and prompt, 10 failure cases, 100 runs per model, mock tools with fault injection. It is harness behaviour, not a ranking.
Today's finding (use only these numbers, never invent others): ${topic.fact}
Strict rules:
- English only, plain text, at most 200 characters (the link is added after your text).
- One concrete insight or practical tip an engineer can use today.
- No price, no sales pitch, no call to buy, no exclamation marks, no hashtags, no emojis.
- Do not write any link or URL; the application appends the link.`,
      userPrompt: `Write today's post (${today}) about this finding.`,
      maxTokens: 150,
      taskId: `daily-pulse-${today}`,
      taskName: 'GENERATE_DAILY_MARKET_PULSE',
      timeoutMs: 15000,
    });

    // The model writes the sentence only; the application appends the vetted, tracked link.
    const body = (completion?.text ?? '').replace(/https?:\/\/\S+/g, '').trim();
    pulseText = [body, topic.url].join('\n');
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
