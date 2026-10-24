import { prisma } from '../db/client.js';
import { TraceService } from './traceService.js';
import { LlmClient } from '../core/llmClient.js';
import { HnMcpClient } from '../mcp/hnMcp.js';
import { classifyNeed } from './marketDemandService.js';

export interface HnThread {
  id: string;
  title: string;
  author: string | null;
  url: string;
  text: string;
  score: number;
  descendants: number;
}

export interface HnDraftDto {
  id: string;
  threadId: string;
  threadTitle: string;
  threadUrl: string;
  draftBody: string;
  status: string;
  score: number;
  postedUrl: string | null;
  createdAt: Date;
}

const NEEDY = /agent|llm|tool.?call|mcp|idempoten|retry|timeout|duplicate|write.?path|function.?call|observab|langfuse|stripe|invoice/i;

/** Public HN Firebase API — no auth, no posting. */
async function hnJson(path: string): Promise<unknown> {
  const res = await fetch(`https://hacker-news.firebaseio.com/v0/${path}.json`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HN API ${res.status}`);
  return res.json();
}

export class HnDraftService {
  private static busy = false;
  private static nextScanAt = 0;
  private static nextPostAt = 0;
  private static readonly SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000;
  /** Human posting rhythm: at most one comment per ~6–10 h, never two in a row. */
  private static readonly POST_COOLDOWN_MS = 6 * 60 * 60 * 1000;
  private static readonly MAX_NEW_DRAFTS = 3;

  /** Front-page / new stories that match our engineering domain. */
  static async scanThreads(limit = 30): Promise<HnThread[]> {
    const threads: HnThread[] = [];
    const lists = await Promise.all([
      hnJson('topstories') as Promise<number[]>,
      hnJson('newstories') as Promise<number[]>,
    ]);
    const ids = [...new Set(lists.flat())].slice(0, limit);
    for (let i = 0; i < ids.length; i += 10) {
      const items = await Promise.all(ids.slice(i, i + 10).map((id) => hnJson(`item/${id}`)));
      for (const raw of items) {
        if (!raw || typeof raw !== 'object') continue;
        const item = raw as Record<string, unknown>;
        if (item.deleted || item.dead) continue;
        const title = String(item.title ?? '');
        const text = String(item.text ?? '');
        const haystack = `${title} ${text}`;
        if (!NEEDY.test(haystack) && classifyNeed(haystack).category === 'other') continue;
        threads.push({
          id: String(item.id),
          title,
          author: typeof item.by === 'string' ? item.by : null,
          url: `https://news.ycombinator.com/item?id=${item.id}`,
          text: text.slice(0, 3000),
          score: typeof item.score === 'number' ? item.score : 0,
          descendants: typeof item.descendants === 'number' ? item.descendants : 0,
        });
      }
    }
    return threads.sort((a, b) => b.descendants - a.descendants || b.score - a.score);
  }

  /**
   * Drafts a useful technical comment. Human reviews and posts — we never auto-submit
   * (HN forbids generated comments; a human must own the submit).
   */
  static async draftComment(thread: HnThread): Promise<string | null> {
    const completion = await LlmClient.generateCompletion({
      systemPrompt:
        'You draft a Hacker News comment for a human to review and post. Substance first: one concrete technical point about agent tool calls, retries, idempotency, MCP, or reliability. Max 120 words. No links, no product pitch, no "as an AI", no flattery of the thread. If the thread is off-topic for agent write reliability, return exactly: SKIP',
      userPrompt: JSON.stringify({ title: thread.title, text: thread.text.slice(0, 2500) }),
      maxTokens: 220,
      taskId: `hn-draft-${thread.id}`,
      taskName: 'HN_COMMENT_DRAFT',
      timeoutMs: 15000,
    });
    const body = completion?.text?.trim();
    if (!body || body === 'SKIP' || body.length < 40) return null;
    return body;
  }

  /** Creates up to MAX_NEW_DRAFTS new drafts. Rate-limited to one scan every 6 h. */
  static async runScan(force = false): Promise<{ scanned: number; created: number; drafts: HnDraftDto[] }> {
    if (!force && (this.busy || Date.now() < this.nextScanAt)) {
      return { scanned: 0, created: 0, drafts: await this.listPending() };
    }
    this.busy = true;
    this.nextScanAt = Date.now() + this.SCAN_INTERVAL_MS;
    try {
      const threads = await this.scanThreads();
      let created = 0;
      for (const thread of threads) {
        if (created >= this.MAX_NEW_DRAFTS) break;
        const existing = await prisma.hnDraft.findFirst({ where: { threadId: thread.id } });
        if (existing) continue;

        // Prefer the hottest needs (write reliability / evaluation over generic infra).
        const need = classifyNeed(`${thread.title} ${thread.text}`);
        const score = Math.min(100, 40 + (need.intensity * 15) + Math.min(20, thread.descendants) + (need.category === 'write_reliability' ? 25 : 0));
        if (score < 45) continue;

        const body = await this.draftComment(thread);
        if (!body) continue;

        await prisma.hnDraft.create({
          data: {
            threadId: thread.id,
            threadTitle: thread.title.slice(0, 300),
            threadUrl: thread.url,
            author: thread.author,
            draftBody: body,
            score,
            status: 'pending',
          },
        });
        created++;
      }

      await TraceService.recordTrace({
        taskId: `hn-draft-scan-${Date.now()}`,
        model: 'hn-draft',
        task: 'HN_DRAFT_SCAN',
        status: 'ok',
        metadata: { scanned: threads.length, created },
      });

      console.log(`[HnDraft] scan: ${threads.length} threads, ${created} new drafts`);
      return { scanned: threads.length, created, drafts: await this.listPending() };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.warn('[HnDraft] scan failed:', msg);
      await TraceService.recordTrace({
        taskId: `hn-draft-scan-err-${Date.now()}`,
        model: 'hn-draft',
        task: 'HN_DRAFT_SCAN',
        status: 'error',
        metadata: { error: msg },
      }).catch(() => undefined);
      return { scanned: 0, created: 0, drafts: [] };
    } finally {
      this.busy = false;
    }
  }

  static async listPending(): Promise<HnDraftDto[]> {
    const rows = await prisma.hnDraft.findMany({
      where: { status: { in: ['pending', 'approved'] } },
      orderBy: { score: 'desc' },
      take: 20,
    });
    return rows.map((r) => ({
      id: r.id,
      threadId: r.threadId,
      threadTitle: r.threadTitle,
      threadUrl: r.threadUrl,
      draftBody: r.draftBody,
      status: r.status,
      score: r.score,
      postedUrl: r.postedUrl,
      createdAt: r.createdAt,
    }));
  }

  /** Human reviewed the draft — keep it ready for manual post. */
  static async approve(id: string, editedBody?: string) {
    const row = await prisma.hnDraft.findUnique({ where: { id } });
    if (!row) throw new Error('draft not found');
    if (editedBody && editedBody.trim().length >= 40) {
      return prisma.hnDraft.update({
        where: { id },
        data: { status: 'approved', draftBody: editedBody.trim() },
      });
    }
    return prisma.hnDraft.update({ where: { id }, data: { status: 'approved' } });
  }

  /** Human posted the comment themselves (paste). Record for karma tracking. */
  static async markPosted(id: string, postedUrl?: string) {
    return prisma.hnDraft.update({
      where: { id },
      data: { status: 'posted', postedUrl: postedUrl ?? null },
    });
  }

  static async reject(id: string) {
    return prisma.hnDraft.update({ where: { id }, data: { status: 'rejected' } });
  }

  /** Posts an approved draft as a real HN comment (browser-poster). Records the URL. */
  static async postApproved(id: string, opts?: { force?: boolean }) {
    const row = await prisma.hnDraft.findUnique({ where: { id } });
    if (!row) throw new Error('draft not found');
    if (row.status === 'posted') return row;
    if (row.status === 'rejected') throw new Error('draft was rejected');
    if (row.status !== 'approved' && row.status !== 'pending') {
      throw new Error(`draft status ${row.status} cannot be posted`);
    }
    if (!opts?.force && Date.now() < this.nextPostAt) {
      const waitH = Math.round((this.nextPostAt - Date.now()) / 360000) / 10;
      throw new Error(`HN posting cooldown: next post in ~${waitH}h (human rhythm). Pass force to override.`);
    }

    const result = await HnMcpClient.submitComment({
      parentId: row.threadId,
      text: row.draftBody,
    });

    // Jittered cooldown so two comments never land back-to-back.
    this.nextPostAt = Date.now() + this.POST_COOLDOWN_MS + Math.floor(Math.random() * 4 * 3600000);

    await TraceService.recordTrace({
      taskId: `hn-comment-${row.threadId}`,
      model: 'hn-draft',
      task: 'HN_COMMENT_POSTED',
      status: 'ok',
      metadata: { draftId: id, threadId: row.threadId, hnId: result.hnId, url: result.url },
    });

    return prisma.hnDraft.update({
      where: { id },
      data: { status: 'posted', postedUrl: result.url },
    });
  }
}
