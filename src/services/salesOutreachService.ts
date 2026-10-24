import { prisma } from '../db/client.js';
import { TraceService } from './traceService.js';
import { LlmClient } from '../core/llmClient.js';
import { RedditMcpClient, type RedditItem } from '../mcp/redditMcp.js';
import { parseMetadata } from './reachService.js';
import { MarketingService } from './marketingService.js';

export type SignalSource = 'reddit' | 'x_mention' | 'landing' | 'abandoned_checkout';

export interface SalesSignalInput {
  source: SignalSource;
  sourceId: string;
  author?: string | null;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface ScoredSignal extends SalesSignalInput {
  score: number;
  reason: string;
}

export interface OutreachCycleResult {
  collected: number;
  qualified: number;
  acted: number;
  converted: number;
  details: string[];
}

/** Commercial-intent patterns: pain + budget/company context around write-path failures. */
export const BUY_SIGNAL_PATTERNS =
  /duplicat(?:e|ed|ion) (?:invoice|charge|write|payment|email|order)|charged twice|double (?:charge|write|invoice|billing)|idempoten|write.?path|tool.?call.*(?:timeout|fail|retry)|ghost write|retry.*(?:duplicate|twice)|stripe.*duplicate|production.*(?:agent|tool)|we (?:need|are looking|want) (?:an? )?(?:audit|check|test)|budget|quote|enterprise|on.?prem|retainer/i;

export const B2B_SIGNAL_PATTERNS =
  /enterprise|on.?prem|retainer|sla|team of|our (?:company|stack|agents|platform)|invoice(?:s)?\.(?:com|net)|salesforce|hubspot|sap|netsuite|monthly volume|compliance|soc2|iso ?27001/i;

const REDDIT_SCAN_SUBS = ['AI_Agents', 'LocalLLaMA', 'mcp', 'LangChain', 'devops', 'sre', 'webdev'];

/** Pure scoring: 0–100. >=60 qualifies for outreach, >=80 is hot (B2B / checkout recovery). */
export function scoreSignal(signal: SalesSignalInput): ScoredSignal {
  const text = signal.text || '';
  const lower = text.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (signal.source === 'abandoned_checkout') {
    score += 80;
    reasons.push('checkout-abandoned');
  }
  if (BUY_SIGNAL_PATTERNS.test(text)) {
    score += 40;
    reasons.push('buy-pain');
  }
  if (B2B_SIGNAL_PATTERNS.test(text)) {
    score += 25;
    reasons.push('b2b-context');
  }
  if (/\b(?:i|we|our)\b/i.test(text) && /\b(?:agent|llm|mcp|tool)\b/i.test(lower)) {
    score += 10;
    reasons.push('first-person-agent');
  }
  if (/\$|\b(?:usd|chf|eur|budget|paying|paid|price|cost)\b/i.test(text)) {
    score += 10;
    reasons.push('money');
  }
  if (/\b(?:audit|check|test)\b/i.test(lower) && /\b(?:need|want|looking|book|order|buy)\b/i.test(lower)) {
    score += 15;
    reasons.push('buy-intent');
  }
  if (signal.source === 'x_mention') {
    score += 10;
    reasons.push('direct-mention');
  }
  if (signal.source === 'landing') {
    score += 5;
    reasons.push('audit-landing');
  }
  if ((signal.text || '').length > 200) {
    score += 5;
    reasons.push('detailed');
  }

  score = Math.min(100, score);
  return {
    ...signal,
    score,
    reason: reasons.join('+') || 'weak',
  };
}

export class SalesOutreachService {
  private static busy = false;
  private static nextCycleAt = 0;
  /** One outreach action per cycle keeps the pipeline calm and avoids spam. */
  private static readonly MAX_ACTIONS_PER_CYCLE = 2;
  private static readonly CYCLE_INTERVAL_MS = 2 * 60 * 60 * 1000;
  private static readonly ABANDONED_CHECKOUT_AGE_MS = 2 * 60 * 60 * 1000;

  /** Collects commercial signals from Reddit, abandoned checkouts and recent audit landings. */
  static async collectSignals(): Promise<SalesSignalInput[]> {
    const signals: SalesSignalInput[] = [];

    // 1. Abandoned audit checkouts with a known buyer email = hottest lead.
    try {
      const cutoff = new Date(Date.now() - this.ABANDONED_CHECKOUT_AGE_MS);
      const abandoned = await prisma.auditOrder.findMany({
        where: {
          status: 'pending_payment',
          buyerEmail: { not: null },
          createdAt: { lt: cutoff },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      for (const order of abandoned) {
        signals.push({
          source: 'abandoned_checkout',
          sourceId: `checkout-${order.id}`,
          author: order.buyerEmail,
          text: `Audit checkout abandoned: tier=${order.tier}, email=${order.buyerEmail}, tools=${order.configJson.slice(0, 300)}`,
          metadata: { orderId: order.id, tier: order.tier },
        });
      }
    } catch (err) {
      console.warn('[SalesOutreach] checkout scan failed:', err instanceof Error ? err.message : err);
    }

    // 2. Reddit threads with commercial pain (browser-poster listing).
    if (RedditMcpClient.hasBrowserPoster() || RedditMcpClient.hasValidCredentials()) {
      for (const sub of REDDIT_SCAN_SUBS) {
        try {
          const { items } = await RedditMcpClient.listing(`/r/${sub}/new?limit=15`);
          for (const thread of items as RedditItem[]) {
            if (thread.locked || thread.archived) continue;
            if (thread.created_utc < Date.now() / 1000 - 2 * 86400) continue;
            const body = `${thread.title ?? ''} ${thread.selftext ?? ''}`;
            if (!BUY_SIGNAL_PATTERNS.test(body) && !B2B_SIGNAL_PATTERNS.test(body)) continue;
            signals.push({
              source: 'reddit',
              sourceId: thread.name,
              author: thread.author,
              text: body.slice(0, 4000),
              metadata: { subreddit: thread.subreddit, score: thread.score },
            });
          }
        } catch (err) {
          console.warn(`[SalesOutreach] reddit scan r/${sub} failed:`, err instanceof Error ? err.message : err);
        }
      }
    }

    // 3. Recent X mentions that mention commercial intent (not yet acted on).
    try {
      const mentions = await prisma.mention.findMany({
        where: { status: { in: ['seen', 'failed', 'skipped'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      for (const m of mentions) {
        signals.push({
          source: 'x_mention',
          sourceId: m.tweetId,
          author: m.author,
          text: m.text,
          metadata: { mentionStatus: m.status },
        });
      }
    } catch (err) {
      console.warn('[SalesOutreach] mention scan failed:', err instanceof Error ? err.message : err);
    }

    return signals;
  }

  /** Persists new signals (deduped by sourceId) and returns only the freshly stored ones. */
  static async storeSignals(signals: SalesSignalInput[]): Promise<ScoredSignal[]> {
    const fresh: ScoredSignal[] = [];
    for (const raw of signals) {
      const scored = scoreSignal(raw);
      try {
        const existing = await prisma.salesSignal.findUnique({ where: { sourceId: raw.sourceId } });
        if (existing) continue;
        await prisma.salesSignal.create({
          data: {
            source: raw.source,
            sourceId: raw.sourceId,
            author: raw.author ?? null,
            text: raw.text.slice(0, 4000),
            score: scored.score,
            status: scored.score >= 60 ? 'qualified' : 'new',
            metadata: JSON.stringify({ reason: scored.reason, ...(raw.metadata ?? {}) }),
          },
        });
        fresh.push(scored);
      } catch {
        // Unique race: another tick stored it first.
      }
    }
    return fresh;
  }

  /**
   * Acts on at most MAX_ACTIONS_PER_CYCLE high-score signals:
   * - abandoned checkout → follow-up draft stored on the signal
   * - B2B-shaped lead → B2bService lead + proposal
   * - Reddit pain thread → recorded for the Reddit cycle as a prioritized target
   */
  static async actOnQualified(): Promise<{ acted: number; converted: number; details: string[] }> {
    const details: string[] = [];
    let acted = 0;
    let converted = 0;

    const candidates = await prisma.salesSignal.findMany({
      where: { status: 'qualified', score: { gte: 60 } },
      orderBy: { score: 'desc' },
      take: 10,
    });

    for (const signal of candidates) {
      if (acted >= this.MAX_ACTIONS_PER_CYCLE) break;
      const meta = parseMetadata(signal.metadata);

      if (signal.source === 'abandoned_checkout') {
        const followUp = await this.draftCheckoutFollowUp(signal.text, signal.author ?? '');
        await prisma.salesSignal.update({
          where: { id: signal.id },
          data: {
            status: 'outreach_sent',
            action: 'checkout_followup',
            actionRef: followUp ? 'drafted' : 'skipped',
            metadata: JSON.stringify({ ...meta, followUp: followUp?.slice(0, 500) }),
          },
        });
        await TraceService.recordTrace({
          taskId: `sales-checkout-${signal.sourceId}`,
          model: 'sales-outreach',
          task: 'SALES_OUTREACH',
          status: 'ok',
          metadata: { action: 'checkout_followup', score: signal.score, hasDraft: Boolean(followUp) },
        });
        acted++;
        details.push(`checkout-followup ${signal.sourceId}`);
        continue;
      }

      // Hot B2B-shaped pain: draft a proposal shell and park it on the signal
      // (a real lead is only created when a human/contact email arrives via /api/b2b/intake).
      if (signal.score >= 80 && B2B_SIGNAL_PATTERNS.test(signal.text)) {
        const proposal = await this.draftB2bShell(signal.text);
        await prisma.salesSignal.update({
          where: { id: signal.id },
          data: {
            status: 'outreach_sent',
            action: 'b2b_proposal',
            actionRef: signal.sourceId,
            metadata: JSON.stringify({ ...meta, proposal: proposal?.slice(0, 800) ?? null }),
          },
        });
        await TraceService.recordTrace({
          taskId: `sales-b2b-${signal.sourceId}`,
          model: 'sales-outreach',
          task: 'SALES_B2B_SIGNAL',
          status: 'ok',
          metadata: { score: signal.score, hasProposal: Boolean(proposal), author: signal.author },
        });
        acted++;
        converted++;
        details.push(`b2b-signal ${signal.sourceId}`);
        continue;
      }

      // Reddit commercial pain: queue the thread so the warm-up comment cycle hits it first.
      if (signal.source === 'reddit') {
        await prisma.salesSignal.update({
          where: { id: signal.id },
          data: {
            status: 'outreach_sent',
            action: 'reddit_comment',
            actionRef: signal.sourceId,
            metadata: JSON.stringify({ ...meta, queuedForReddit: true }),
          },
        });
        await TraceService.recordTrace({
          taskId: `sales-reddit-${signal.sourceId}`,
          model: 'sales-outreach',
          task: 'SALES_OUTREACH',
          status: 'ok',
          metadata: { action: 'reddit_comment', threadId: signal.sourceId, score: signal.score },
        });
        acted++;
        details.push(`reddit-queue ${signal.sourceId}`);
        continue;
      }

      // X mention: run the real sales-reply pipeline (CAS + daily caps + LLM reply).
      if (signal.source === 'x_mention') {
        try {
          await MarketingService.handleIncomingMention(signal.sourceId, signal.author ?? 'unknown', signal.text);
          await prisma.salesSignal.update({
            where: { id: signal.id },
            data: { status: 'outreach_sent', action: 'sales_reply', actionRef: signal.sourceId },
          });
          acted++;
          details.push(`mention-reply ${signal.sourceId}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'mention failed';
          await prisma.salesSignal.update({
            where: { id: signal.id },
            data: { status: 'rejected', action: 'none', metadata: JSON.stringify({ ...meta, error: msg }) },
          });
        }
        continue;
      }

      await prisma.salesSignal.update({
        where: { id: signal.id },
        data: { status: 'outreach_sent', action: 'none', actionRef: signal.sourceId },
      });
      acted++;
      details.push(`signal ${signal.sourceId}`);
    }

    return { acted, converted, details };
  }

  private static async draftCheckoutFollowUp(text: string, email: string): Promise<string | null> {
    const completion = await LlmClient.generateCompletion({
      systemPrompt:
        'You write short, factual checkout follow-up notes for an autonomous agent selling an Agent Write-Path Check. No pressure, no hype, max 120 words. State the abandoned tier and offer one concrete next step.',
      userPrompt: `Buyer: ${email}\n${text}`,
      maxTokens: 200,
      taskId: `checkout-followup-${Date.now()}`,
      taskName: 'SALES_CHECKOUT_FOLLOWUP',
      timeoutMs: 12000,
    });
    return completion?.text ?? null;
  }

  private static async draftB2bShell(text: string): Promise<string | null> {
    const completion = await LlmClient.generateCompletion({
      systemPrompt:
        'You draft a short B2B discovery note (max 150 words) for an autonomous agent selling an Agent Write-Path Check and enterprise agent setup. Factual, no hype. List 2 concrete questions to qualify budget and timeline. Do not invent a company name.',
      userPrompt: text.slice(0, 2000),
      maxTokens: 250,
      taskId: `b2b-shell-${Date.now()}`,
      taskName: 'SALES_B2B_SHELL',
      timeoutMs: 12000,
    });
    return completion?.text ?? null;
  }

  /** One full outreach cycle: collect → store → act. Rate-limited, never throws. */
  static async runOutreachCycle(): Promise<OutreachCycleResult> {
    if (this.busy || Date.now() < this.nextCycleAt) {
      return { collected: 0, qualified: 0, acted: 0, converted: 0, details: ['rate-limited'] };
    }
    this.busy = true;
    this.nextCycleAt = Date.now() + this.CYCLE_INTERVAL_MS;
    try {
      const raw = await this.collectSignals();
      const fresh = await this.storeSignals(raw);
      const qualified = fresh.filter((s) => s.score >= 60);
      const { acted, converted, details } = await this.actOnQualified();

      const result: OutreachCycleResult = {
        collected: fresh.length,
        qualified: qualified.length,
        acted,
        converted,
        details,
      };

      if (fresh.length || acted) {
        console.log(
          `[SalesOutreach] cycle: collected=${result.collected} qualified=${result.qualified} acted=${result.acted} converted=${result.converted}`
        );
      }
      await TraceService.recordTrace({
        taskId: `sales-cycle-${Date.now()}`,
        model: 'sales-outreach',
        task: 'SALES_OUTREACH_CYCLE',
        status: 'ok',
        metadata: result as unknown as Record<string, unknown>,
      });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.warn('[SalesOutreach] cycle failed:', msg);
      await TraceService.recordTrace({
        taskId: `sales-cycle-err-${Date.now()}`,
        model: 'sales-outreach',
        task: 'SALES_OUTREACH_CYCLE',
        status: 'error',
        metadata: { error: msg },
      }).catch(() => undefined);
      return { collected: 0, qualified: 0, acted: 0, converted: 0, details: [msg] };
    } finally {
      this.busy = false;
    }
  }

  /** Pipeline snapshot for the admin/status route. */
  static async getPipelineStatus() {
    const [byStatus, bySource, recent] = await Promise.all([
      prisma.salesSignal.groupBy({ by: ['status'], _count: true }),
      prisma.salesSignal.groupBy({ by: ['source'], _count: true }),
      prisma.salesSignal.findMany({ orderBy: { updatedAt: 'desc' }, take: 15 }),
    ]);
    return {
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
      bySource: Object.fromEntries(bySource.map((r) => [r.source, r._count])),
      recent: recent.map((r) => ({
        id: r.id,
        source: r.source,
        score: r.score,
        status: r.status,
        action: r.action,
        author: r.author,
        createdAt: r.createdAt,
        text: r.text.slice(0, 160),
      })),
    };
  }
}
