import { XMcpClient } from '../mcp/xMcp.js';
import { MentionService } from './mentionService.js';
import { TraceService } from './traceService.js';

export class MarketingService {
  /**
   * Broadcasts a Proof-of-Burn announcement on X
   */
  static async announceBurn(amountUsd: number, tokensBurned: bigint, txHash: string) {
    const formattedTokens = Number(tokensBurned).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });
    const formattedUsd = (amountUsd / 100).toFixed(2);

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
   * Replies to an X mention adhering to Günther's Brand Voice:
   * Direct, factual, slightly sarcastic, dry humor, zero fluff.
   */
  static async handleIncomingMention(tweetId: string, author: string, mentionText: string) {
    const { shouldProcess } = await MentionService.recordMention(tweetId, author, mentionText);
    if (!shouldProcess) {
      console.log(`[MarketingService] Mention ${tweetId} already processed. Skipping.`);
      return;
    }

    await MentionService.markReplying(tweetId);

    try {
      // Formulate Günther's response
      const replyText = `@${author} Keine Zeit für Smalltalk. Entweder du kaufst das Playbook, baust Agenten oder schaust zu, wie $GÜNTER brennt.`;

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
}
