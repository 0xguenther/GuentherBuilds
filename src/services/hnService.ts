import { HnMcpClient, type HnPostResult } from '../mcp/hnMcp.js';
import { BrowserPosterUnavailableError } from '../mcp/browserPoster.js';
import { PostingWatchdogService } from './postingWatchdogService.js';
import { prisma } from '../db/client.js';

const MIN_POST_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 HN post per day max
const MAX_POSTS_PER_WEEK = 3;
const RETRY_BACKOFF_MS = 10 * 60 * 1000;
/** A pending claim counts like a post: an unclear outcome must never be repeated automatically. */
const COUNTED = ['success', 'pending'];

export class HnService {
  private static busy = false;
  private static nextAttemptAt = 0;

  static credentialsAvailable(): boolean {
    return HnMcpClient.hasBrowserPoster();
  }

  static async runAutonomousCycle(): Promise<void> {
    if (!this.credentialsAvailable() || this.busy || Date.now() < this.nextAttemptAt) return;
    // The watchdog already reports the outage once; do not hammer a dead browser every minute.
    if (PostingWatchdogService.isBrowserDown()) return;
    this.busy = true;
    try {
      await this.publishShowHn();
    } catch (err) {
      this.nextAttemptAt = Date.now() + RETRY_BACKOFF_MS;
      console.warn(`[HnService] Autonomous cycle error (retry in ${RETRY_BACKOFF_MS / 60000} min):`, err instanceof Error ? err.message : err);
    } finally {
      this.busy = false;
    }
  }

  private static async publishShowHn(): Promise<HnPostResult | null> {
    // Check last HN post via traces
    const recent = await prisma.trace.findMany({
      where: { model: 'hn', status: { in: COUNTED } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (recent.length > 0) {
      const lastPost = recent[0];
      const ageMs = Date.now() - lastPost.createdAt.getTime();
      if (ageMs < MIN_POST_INTERVAL_MS) {
        console.log(`[HnService] Rate limit: last HN post ${Math.round(ageMs / 3600000)}h ago, waiting.`);
        return null;
      }
    }

    // Check weekly cap
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyCount = await prisma.trace.count({
      where: { model: 'hn', status: { in: COUNTED }, createdAt: { gte: weekAgo } },
    });
    if (weeklyCount >= MAX_POSTS_PER_WEEK) {
      console.log(`[HnService] Weekly cap reached (${weeklyCount}/${MAX_POSTS_PER_WEEK}).`);
      return null;
    }

    // Generate post content from product catalog / audit angles
    const post = this.getCuratedPost();
    if (!post) return null;

    // Claim before sending so a lost reply cannot lead to a second submission.
    const claim = await prisma.trace.create({
      data: {
        taskId: `hn_post_${Date.now()}`,
        task: 'HN_POST',
        model: 'hn',
        status: 'pending',
        metadata: JSON.stringify({ title: post.title, url: post.url, text: post.text }),
      },
    });

    let result: HnPostResult;
    try {
      result = await HnMcpClient.submitPost({ title: post.title, url: post.url, text: post.text });
    } catch (err) {
      if (err instanceof BrowserPosterUnavailableError) {
        // Provably not sent: release the claim so the next healthy cycle may post.
        await prisma.trace.update({ where: { id: claim.id }, data: { status: 'error' } });
      } else {
        console.error(`[HnService] HN submit outcome unclear, claim ${claim.id} stays pending (no automatic repeat). Check https://news.ycombinator.com/submitted?id=0xguenther`);
      }
      throw err;
    }

    await prisma.trace.update({
      where: { id: claim.id },
      data: {
        status: 'success',
        metadata: JSON.stringify({ title: post.title, url: post.url, text: post.text, hnUrl: result.url, hnId: result.hnId }),
      },
    });

    console.log(`[HnService] Published to HN: ${result.url}`);
    return result;
  }

  private static getCuratedPost(): { title: string; url?: string; text?: string } | null {
    // Rotate between product angles
    const posts = [
      {
        title: 'Show HN: Audit for AI agents that retry writes after a lost reply',
        url: 'https://0xguenther.org/en/audit/',
      },
      {
        title: 'Show HN: We tested how 5 LLMs handle failed write actions (duplicate prevention)',
        url: 'https://github.com/0xguenther/agent-write-path-runs',
      },
      {
        title: 'Ask HN: How do you prevent duplicate writes when agent tool calls time out?',
        text: 'When LLM tool calls time out or return network errors, the write might have succeeded upstream. A blind retry creates duplicate invoices, tickets, or emails. How do you handle idempotency, CAS keys, and post-timeout verification in your agent pipelines?',
      },
    ];

    // Simple rotation based on week number
    const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    return posts[weekNum % posts.length];
  }
}
