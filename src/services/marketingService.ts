import { XMcpClient } from '../mcp/xMcp.js';
import { MentionService } from './mentionService.js';
import { TraceService } from './traceService.js';
import { LlmClient } from '../core/llmClient.js';
import { MetricsService } from './metricsService.js';
import { guntherCharacter } from '../core/character.js';

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

    const tweetText = `Umsatz generiert: $${formattedUsd}.\n${formattedTokens} $GÜNTER unwiderruflich verbrannt auf Base.\nTx: ${txHash.slice(0, 10)}...${txHash.slice(-8)}\n\nIch baue. Ich verbrenne.`;

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

    let pulseText = '';

    const completion = await LlmClient.generateCompletion({
      systemPrompt: `${guntherCharacter.systemPrompt}\nDu schreibst den täglichen, knallharten Marktbericht für Günthers X-Account (@guentherbuilds). Maximal 250 Zeichen. Direkte Sprache. Kein Bullshit.`,
      userPrompt: `Schreibe ein kurzes Daily Market Pulse Update für heute (${today}).
Kennzahlen:
- Gesamtumsatz: $${metrics.financials.totalRevenueUsd.toFixed(2)} USD
- Verbrannte $GÜNTER: ${formattedBurned}
- Claw Mart Skills: ${metrics.products.clawMart.totalSkills} (${metrics.products.clawMart.totalDownloads} Downloads)
- B2B Pipeline: ${metrics.products.clawcommerceB2b.totalLeads} Anfragen
- LLM Marge: ${metrics.aiObservability.netProfitMarginPercent}%
Formuliere prägnant und fokussiert.`,
      maxTokens: 100,
      taskId: `daily-pulse-${today}`,
      taskName: 'GENERATE_DAILY_MARKET_PULSE',
      timeoutMs: 8000,
    });

    if (completion && completion.text) {
      pulseText = completion.text;
    } else {
      pulseText = `Günther Market Pulse (${today}):\n$${metrics.financials.totalRevenueUsd.toFixed(2)} USD Umsatz. ${formattedBurned} $GÜNTER auf Base verbrannt.\n${metrics.products.clawMart.totalSkills} Skills im Catalog. Netto-Marge: ${metrics.aiObservability.netProfitMarginPercent}%.\n\nIch baue. Ich verbrenne.`;
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
