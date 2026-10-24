import { prisma } from '../db/client.js';
import { TraceService } from './traceService.js';
import { LlmClient } from '../core/llmClient.js';
import { MarketDemandService, type DemandBrief } from './marketDemandService.js';
import { PRODUCTS } from './productCatalog.js';

export interface ProductDraftInput {
  slug: string;
  title: string;
  fact: string;
  priceUsd: number;
  rationale: string;
}

export const DRAFT_PRICE_MIN_USD = 9;
export const DRAFT_PRICE_MAX_USD = 990;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+){1,5}$/;
const LINK_RE = /https?:\/\/|www\./i;

/**
 * Validates an LLM reply. Drafts never carry links, prices outside the allowed band, or a slug that
 * already exists in the catalog. Anything else returns null and is dropped.
 */
export function parseDraftReply(text: string): ProductDraftInput | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }

  const slug = typeof raw.slug === 'string' ? raw.slug.trim().toLowerCase() : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const fact = typeof raw.fact === 'string' ? raw.fact.trim() : '';
  const rationale = typeof raw.rationale === 'string' ? raw.rationale.trim() : '';
  const priceUsd = typeof raw.priceUsd === 'number' ? Math.round(raw.priceUsd) : NaN;

  if (!SLUG_RE.test(slug) || PRODUCTS.some((p) => p.id === slug)) return null;
  if (!title || title.length > 80) return null;
  if (!fact || fact.length > 200) return null;
  if (!rationale || rationale.length > 300) return null;
  if (!Number.isFinite(priceUsd) || priceUsd < DRAFT_PRICE_MIN_USD || priceUsd > DRAFT_PRICE_MAX_USD) return null;
  if ([title, fact, rationale].some((s) => LINK_RE.test(s))) return null;

  return { slug, title, fact, priceUsd, rationale };
}

export class ProductDraftService {
  private static busy = false;
  private static nextRunAt = 0;
  /** Markets shift over weeks, not days: one draft cycle per week at most. */
  private static readonly RUN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
  /** Same need category is not redrafted within this window, even if it stays a gap. */
  private static readonly COOLDOWN_DAYS = 90;

  /**
   * Once per day: turns the hottest uncovered need from the demand brief into one pending draft.
   * Nothing is published; a draft only leaves `pending` through `decide()`.
   */
  static async runDraftCycle(brief?: DemandBrief | null): Promise<{ drafted: boolean; reason: string }> {
    if (this.busy || Date.now() < this.nextRunAt) return { drafted: false, reason: 'rate-limited' };
    this.busy = true;
    this.nextRunAt = Date.now() + this.RUN_INTERVAL_MS;
    try {
      const current = brief ?? (await MarketDemandService.loadLatestBrief());
      const gap = current?.gaps[0];
      if (!gap) return { drafted: false, reason: 'no uncovered need' };

      const since = new Date(Date.now() - this.COOLDOWN_DAYS * 86400000);
      const recent = await prisma.productDraft.findFirst({
        where: { needCategory: gap.category, createdAt: { gte: since } },
        select: { id: true },
      });
      if (recent) return { drafted: false, reason: `category ${gap.category} drafted recently` };

      const completion = await LlmClient.generateCompletion({
        systemPrompt:
          'You propose one new paid product for an autonomous seller of AI agent reliability tooling. ' +
          'Reply with a single JSON object only: {"slug":"lowercase-hyphen-slug","title":"...","fact":"one catalog line with price","priceUsd":number,"rationale":"why this need, in under 300 characters"}. ' +
          'No links, no hype, no claims you cannot back with the evidence. Price between 9 and 990 USD.',
        userPrompt: JSON.stringify({
          need: gap.category,
          evidence: gap.evidence,
          existingCatalog: PRODUCTS.map((p) => ({ id: p.id, fact: p.fact })),
        }),
        maxTokens: 400,
        taskId: `product-draft-${Date.now()}`,
        taskName: 'PRODUCT_DRAFT',
        timeoutMs: 20000,
      });
      if (!completion) return { drafted: false, reason: 'no LLM available' };

      const parsed = parseDraftReply(completion.text);
      if (!parsed) {
        await TraceService.recordTrace({
          taskId: `product-draft-${Date.now()}`,
          model: completion.model,
          task: 'PRODUCT_DRAFT',
          status: 'error',
          metadata: { reason: 'invalid reply', need: gap.category },
        });
        return { drafted: false, reason: 'invalid reply' };
      }

      await prisma.productDraft.create({
        data: {
          needCategory: gap.category,
          slug: parsed.slug,
          title: parsed.title,
          fact: parsed.fact,
          priceUsd: parsed.priceUsd,
          rationale: parsed.rationale,
          evidence: JSON.stringify(gap.evidence),
        },
      });
      await TraceService.recordTrace({
        taskId: `product-draft-${Date.now()}`,
        model: completion.model,
        task: 'PRODUCT_DRAFT',
        status: 'ok',
        metadata: { slug: parsed.slug, need: gap.category, priceUsd: parsed.priceUsd },
      });
      return { drafted: true, reason: `draft ${parsed.slug}` };
    } finally {
      this.busy = false;
    }
  }

  static async listPending() {
    return prisma.productDraft.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'desc' } });
  }

  /** Compare-and-swap: only a pending draft can be approved or rejected, and only once. */
  static async decide(id: string, decision: 'approved' | 'rejected'): Promise<'ok' | 'not_found' | 'already_decided'> {
    const result = await prisma.productDraft.updateMany({
      where: { id, status: 'pending' },
      data: { status: decision, decidedAt: new Date() },
    });
    if (result.count === 1) return 'ok';
    const exists = await prisma.productDraft.findUnique({ where: { id }, select: { id: true } });
    return exists ? 'already_decided' : 'not_found';
  }
}
