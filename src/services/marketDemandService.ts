import { prisma } from '../db/client.js';
import { TraceService } from './traceService.js';
import { PRODUCTS } from './productCatalog.js';
import { LlmClient } from '../core/llmClient.js';
import { RedditMcpClient, type RedditItem } from '../mcp/redditMcp.js';
import { collectResearchLines } from './marketResearchService.js';

export type NeedCategory =
  | 'write_reliability'
  | 'agent_cost'
  | 'mcp_infra'
  | 'enterprise_ops'
  | 'evaluation'
  | 'observability'
  | 'security'
  | 'other';

export interface DemandBucket {
  category: NeedCategory;
  count: number;
  score: number;
  samples: string[];
  productFit: string[];
  gap: boolean;
}

export interface DemandBrief {
  windowDays: number;
  totalSignals: number;
  buckets: DemandBucket[];
  topNeed: NeedCategory | null;
  /** Product ids ordered by demand weight (hottest first). */
  recommendedPush: string[];
  /** Needs with no covering product — candidates for a new offer. */
  gaps: { category: NeedCategory; evidence: string[] }[];
  /** Short adaptation note (LLM, optional). */
  adaptationNote: string | null;
  generatedAt: string;
}

/** Which existing products plausibly cover a need category. */
const NEED_TO_PRODUCTS: Record<NeedCategory, string[]> = {
  write_reliability: ['audit', 'fastify-stripe-mcp', 'playbook'],
  agent_cost: ['playbook', 'audit'],
  mcp_infra: ['fastify-stripe-mcp', 'eliza-token-burner'],
  enterprise_ops: ['enterprise', 'audit'],
  evaluation: ['audit'],
  observability: ['agent-trace-pack', 'audit'],
  security: ['cdp-mpc-wallet-guard', 'playbook'],
  other: [],
};

const NEED_PATTERNS: { category: NeedCategory; re: RegExp }[] = [
  {
    category: 'write_reliability',
    re: /duplicat|idempoten|write.?path|tool.?call.*(?:timeout|fail|retry)|ghost write|charged twice|double (?:write|charge|invoice)|retry.*twice|lost repl/i,
  },
  {
    category: 'agent_cost',
    re: /token cost|inference cost|unit econom|too expensive|burn(?:ing)? (?:token|cash)|margin|cost per (?:run|call)|cheap(?:er)? (?:model|llm)|budget.*(?:llm|model|agent)/i,
  },
  {
    category: 'mcp_infra',
    re: /\bmcp\b|model context protocol|tool (?:server|schema|definition)|function.?call(?:ing)?|plugin|tool routing/i,
  },
  {
    category: 'enterprise_ops',
    re: /enterprise|on.?prem|retainer|\bsla\b|compliance|soc2|iso ?27001|our (?:company|team|stack)|monthly volume|procurement|vendor/i,
  },
  {
    category: 'evaluation',
    re: /benchmark|eval(?:uation)?s?\b|test harness|failure (?:mode|injection|case)|how (?:do you|should (?:i|we)) (?:test|measure|audit)|red.?team|qa for (?:agent|llm)/i,
  },
  {
    category: 'observability',
    re: /langfuse|tracing|observability|debug(?:ging)? (?:agent|tool)|latency|what happened (?:when|after)|audit trail|logs for (?:agent|tool)/i,
  },
  {
    category: 'security',
    re: /private key|secret|permission|sandbox|escape|prompt inject|wallet|credential|auth(?:z|entication)?|least privilege/i,
  },
];

const INTENSITY = /\b(?:need|must|critical|production|urgent|breaking|outage|losing money|customers? (?:are|were) (?:affected|angry)|paid|budget)\b/i;
const MONEY = /\$|\b(?:usd|chf|eur|budget|paying|paid|price|cost)\b/i;

export function classifyNeed(text: string): { category: NeedCategory; intensity: number } {
  for (const { category, re } of NEED_PATTERNS) {
    if (re.test(text)) {
      let intensity = 1;
      if (INTENSITY.test(text)) intensity += 1;
      if (MONEY.test(text)) intensity += 1;
      return { category, intensity };
    }
  }
  return { category: 'other', intensity: 0 };
}

export class MarketDemandService {
  private static busy = false;
  private static nextRunAt = 0;
  /** Market research runs weekly; the 30-day window does not change faster than that. */
  private static readonly RUN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
  /** Demand is judged over a month, so one noisy week does not steer product decisions. */
  private static readonly WINDOW_DAYS = 30;

  /** Fresh market chatter on top of stored SalesSignals: same subs as the sales scanner. */
  static async collectMarketChatter(): Promise<string[]> {
    const lines: string[] = [];
    if (RedditMcpClient.hasBrowserPoster() || RedditMcpClient.hasValidCredentials()) {
      for (const sub of ['AI_Agents', 'LocalLLaMA', 'mcp', 'LangChain', 'devops', 'sre', 'webdev']) {
        try {
          const { items } = await RedditMcpClient.listing(`/r/${sub}/new?limit=20`);
          for (const t of items as RedditItem[]) {
            if (t.locked || t.archived) continue;
            if (t.created_utc < Date.now() / 1000 - this.WINDOW_DAYS * 86400) continue;
            lines.push(`${t.title ?? ''} ${t.selftext ?? ''}`.slice(0, 2000));
          }
        } catch {
          // Scanner stays quiet; demand brief still has stored signals.
        }
      }
    }
    lines.push(...(await collectResearchLines(this.WINDOW_DAYS)));
    return lines;
  }

  /** Groups signals into need buckets and scores them. */
  static buildBuckets(texts: string[], windowDays = this.WINDOW_DAYS): DemandBucket[] {
    const buckets = new Map<NeedCategory, { count: number; score: number; samples: string[] }>();
    for (const text of texts) {
      const { category, intensity } = classifyNeed(text);
      const entry = buckets.get(category) ?? { count: 0, score: 0, samples: [] };
      entry.count += 1;
      entry.score += intensity * 10;
      if (entry.samples.length < 3 && text.trim()) entry.samples.push(text.trim().slice(0, 160));
      buckets.set(category, entry);
    }

    return [...buckets.entries()]
      .map(([category, v]) => {
        const productFit = NEED_TO_PRODUCTS[category];
        return {
          category,
          count: v.count,
          score: Math.min(100, v.score),
          samples: v.samples,
          productFit,
          gap: productFit.length === 0 && v.count >= 2,
        };
      })
      .sort((a, b) => b.score - a.score || b.count - a.count);
  }

  /**
   * Products ordered by how well they cover the hottest needs.
   * `productTurn` / push loops can consume this instead of a fixed rotation.
   */
  static rankProducts(buckets: DemandBucket[]): string[] {
    const weights = new Map<string, number>();
    for (const b of buckets) {
      for (const pid of b.productFit) {
        weights.set(pid, (weights.get(pid) ?? 0) + b.score);
      }
    }
    const known = PRODUCTS.map((p) => p.id);
    return [...known].sort((a, b) => (weights.get(b) ?? 0) - (weights.get(a) ?? 0));
  }

  static async runDemandAnalysis(force = false): Promise<DemandBrief> {
    if (!force && (this.busy || Date.now() < this.nextRunAt)) {
      const cached = await this.loadLatestBrief();
      if (cached) return cached;
    }
    this.busy = true;
    this.nextRunAt = Date.now() + this.RUN_INTERVAL_MS;
    try {
      const since = new Date(Date.now() - this.WINDOW_DAYS * 86400000);
      const [signalRows, chatter] = await Promise.all([
        prisma.salesSignal.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 200 }),
        this.collectMarketChatter(),
      ]);

      const texts = [...signalRows.map((r) => r.text), ...chatter];
      const buckets = this.buildBuckets(texts);
      const top = buckets.find((b) => b.category !== 'other' && b.count > 0) ?? null;
      const gaps = buckets
        .filter((b) => b.gap)
        .map((b) => ({ category: b.category, evidence: b.samples }));
      const recommendedPush = this.rankProducts(buckets);

      const adaptationNote = await this.draftAdaptation(buckets, gaps);

      const brief: DemandBrief = {
        windowDays: this.WINDOW_DAYS,
        totalSignals: texts.length,
        buckets,
        topNeed: top?.category ?? null,
        recommendedPush,
        gaps,
        adaptationNote,
        generatedAt: new Date().toISOString(),
      };

      await TraceService.recordTrace({
        taskId: `market-demand-${Date.now()}`,
        model: 'market-demand',
        task: 'MARKET_DEMAND_BRIEF',
        status: 'ok',
        metadata: {
          totalSignals: brief.totalSignals,
          topNeed: brief.topNeed,
          recommendedPush: brief.recommendedPush.slice(0, 3),
          gaps: gaps.map((g) => g.category),
          scores: buckets.map((b) => `${b.category}:${b.score}`),
        },
      });

      console.log(
        `[MarketDemand] window=${this.WINDOW_DAYS}d signals=${brief.totalSignals} top=${brief.topNeed ?? 'none'} push=${recommendedPush.slice(0, 3).join(',')}`
      );
      return brief;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.warn('[MarketDemand] analysis failed:', msg);
      await TraceService.recordTrace({
        taskId: `market-demand-err-${Date.now()}`,
        model: 'market-demand',
        task: 'MARKET_DEMAND_BRIEF',
        status: 'error',
        metadata: { error: msg },
      }).catch(() => undefined);
      return {
        windowDays: this.WINDOW_DAYS,
        totalSignals: 0,
        buckets: [],
        topNeed: null,
        recommendedPush: PRODUCTS.map((p) => p.id),
        gaps: [],
        adaptationNote: null,
        generatedAt: new Date().toISOString(),
      };
    } finally {
      this.busy = false;
    }
  }

  private static async draftAdaptation(buckets: DemandBucket[], gaps: { category: NeedCategory; evidence: string[] }[]): Promise<string | null> {
    const top = buckets.filter((b) => b.category !== 'other').slice(0, 3);
    if (!top.length) return null;
    const completion = await LlmClient.generateCompletion({
      systemPrompt:
        'You advise an autonomous seller of agent reliability tooling. In under 80 words: which offer to push this week and one concrete copy angle. Factual, no hype. Mention gaps as product hypotheses only if listed.',
      userPrompt: JSON.stringify({
        needs: top.map((b) => ({ category: b.category, count: b.count, score: b.score, samples: b.samples })),
        gaps: gaps.map((g) => g.category),
        catalog: PRODUCTS.map((p) => ({ id: p.id, fact: p.fact })),
      }),
      maxTokens: 180,
      taskId: `market-adapt-${Date.now()}`,
      taskName: 'MARKET_ADAPTATION',
      timeoutMs: 12000,
    });
    return completion?.text?.trim() ?? null;
  }

  static async loadLatestBrief(): Promise<DemandBrief | null> {
    const row = await prisma.trace.findFirst({
      where: { task: 'MARKET_DEMAND_BRIEF', status: 'ok' },
      orderBy: { createdAt: 'desc' },
    });
    if (!row?.metadata) return null;
    try {
      const meta = JSON.parse(row.metadata) as Record<string, unknown>;
      // Lightweight cache view for the API; full samples stay out of the trace.
      return {
        windowDays: this.WINDOW_DAYS,
        totalSignals: Number(meta.totalSignals ?? 0),
        buckets: [],
        topNeed: (meta.topNeed as NeedCategory | null) ?? null,
        recommendedPush: (meta.recommendedPush as string[]) ?? PRODUCTS.map((p) => p.id),
        gaps: ((meta.gaps as string[]) ?? []).map((category) => ({ category: category as NeedCategory, evidence: [] })),
        adaptationNote: null,
        generatedAt: row.createdAt.toISOString(),
      };
    } catch {
      return null;
    }
  }

  /** Alias used by the product/push loops. */
  static async preferredProductOrder(): Promise<string[]> {
    const brief = await this.runDemandAnalysis(false);
    return brief.recommendedPush.length ? brief.recommendedPush : PRODUCTS.map((p) => p.id);
  }
}
