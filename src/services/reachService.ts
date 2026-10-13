import { PRODUCTS } from './productCatalog.js';
import { RedditMcpClient } from '../mcp/redditMcp.js';
import { RedditService } from './redditService.js';
import { HnMcpClient } from '../mcp/hnMcp.js';
import { randomUUID } from 'crypto';
import type { FastifyRequest } from 'fastify';
import { prisma } from '../db/client.js';
import { XMcpClient, type TweetMetrics } from '../mcp/xMcp.js';

export const AUDIT_ANGLES = [
  { id: 'deepseek', fact: 'Oct 2026 mock-tool harness: DeepSeek Flash 91/100 correct end states; 0 runs with duplicate writes. USD 0.14 total. Harness behaviour, not a ranking.' },
  { id: 'qwen-free', fact: 'Oct 2026 mock-tool harness: Qwen3.8 27B free: 89/100 correct end states; 1 run with duplicate writes. Harness behaviour, not a ranking.' },
  { id: 'qwen-local', fact: 'Oct 2026 mock-tool harness: Qwen3 14B local: 70/100 correct end states; 0 runs with duplicate writes. Harness behaviour, not a ranking.' },
  { id: 'haiku', fact: 'Oct 2026 mock-tool harness: Claude Haiku 4.5: 60/100 correct end states; 10 runs with duplicate writes. USD 0.35 total. Harness behaviour, not a ranking.' },
  { id: 'ornith', fact: 'Oct 2026 mock-tool harness: Ornith 1.5 35B: 49/100 correct end states; 38 runs with duplicate writes. Harness behaviour, not a ranking.' },
  { id: 'tie', fact: 'Oct 2026 mock-tool harness: DeepSeek Flash 91/100 vs Qwen3.8 27B free 89/100 correct end states is a tie. Harness behaviour, not a model ranking.' },
  { id: 'method', fact: 'Oct 2026 experiment: same harness, prompt and 10 failure cases; 100 runs per model; mock tools with fault injection. Harness behaviour, not a ranking.' },
  { id: 'timeout', fact: 'A tool times out, but the write happened. A blind retry can duplicate an invoice or email, or lead to an unverifiable success claim. Audit Quick Check: USD 90.' },
] as const;

export function approvedBodies(angle: { fact: string }): string[] {
  return [
    'Autonomous agent building audit:',
    'Auditing autonomous agent write-paths:',
    'When an autonomous agent retries blindly:',
    'Write-path safety for autonomous agents:',
    'From an autonomous agent testing tool-calls:',
  ].map(intro => `${intro} ${angle.fact}`);
}
export function auditPost(angleId: string, body: string): string {
  return `${body}\nhttps://0xguenther.org/en/audit/?utm_source=x&utm_medium=social&utm_campaign=writepath&utm_content=${encodeURIComponent(angleId)}`;
}
export function parseMetadata(value: string | null): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch { return {}; }
}

export async function recordAuditLandingVisit(request: FastifyRequest): Promise<void> {
  if (request.method !== 'GET') return;
  const url = new URL(request.url, 'http://localhost');
  const audit = ['/audit/', '/en/audit/', '/audit', '/en/audit'].includes(url.pathname);
  if (!audit && !['/products.html', '/en/products.html', '/products', '/en/products', '/preview', '/en/preview', '/preview.html', '/en/preview.html', '/', '/en/', '/en'].includes(url.pathname)) return;
  if (![...url.searchParams.keys()].some(key => key.startsWith('utm_'))) return;
  // Only known campaign identifiers are stored; arbitrary query values may contain PII.
  const content = url.searchParams.get('utm_content');
  const metadata = {
    path: url.pathname,
    utm_source: ['x', 'reddit', 'hn'].includes(url.searchParams.get('utm_source') ?? '') ? url.searchParams.get('utm_source') : null,
    utm_campaign: ['writepath', 'products'].includes(url.searchParams.get('utm_campaign') ?? '') ? url.searchParams.get('utm_campaign') : null,
    utm_content: AUDIT_ANGLES.some(angle => angle.id === content) || PRODUCTS.some(p => p.id === content) ? content : null,
    ...(!audit || url.searchParams.get('utm_campaign') === 'products' ? { productId: PRODUCTS.find(p => p.id === content)?.id ?? (audit ? 'audit' : /preview/.test(url.pathname) ? 'playbook' : 'unknown') } : {}),
  };
  await prisma.trace.create({ data: {
    taskId: `audit-visit-${randomUUID()}`, task: audit ? 'AUDIT_LANDING_VISIT' : 'PRODUCT_LANDING_VISIT', model: 'http',
    metadata: JSON.stringify(metadata),
  } });
}

type ReachTrace = { task: string; metadata: string | null; createdAt: Date };
export interface ReachDay {
  day: string;
  posts: number;
  impressions: number;
  engagements: number;
  urlLinkClicks: number;
  landingVisits: number;
  landingVisitsByUtmContent: Record<string, number>;
  auditOrders: number;
  products: Record<string, { visits: number; orders: number }>;
  sources: Record<'reddit' | 'hn', { items: number; score: number; comments: number }>;
  landingVisitsBySource: Record<string, number>;
}

/** UTC observation-day deltas, not sums of cumulative hourly counters.
 * The first observation is counted in full; missing metrics never reset a baseline.
 * Orders are paid orders by creation day, without claiming individual attribution.
 */
export function aggregateReach(traces: ReachTrace[], orders: { createdAt: Date; productId?: string }[], since: Date, until: Date): ReachDay[] {
  const days = new Map<string, ReachDay>();
  for (let time = since.getTime(); time <= until.getTime(); time += 86400000) {
    const day = new Date(time).toISOString().slice(0, 10);
    days.set(day, { day, posts: 0, impressions: 0, engagements: 0, urlLinkClicks: 0,
      landingVisits: 0, landingVisitsByUtmContent: {}, auditOrders: 0, products: Object.fromEntries(PRODUCTS.map(p => [p.id, { visits: 0, orders: 0 }])), sources: { reddit: { items: 0, score: 0, comments: 0 }, hn: { items: 0, score: 0, comments: 0 } }, landingVisitsBySource: {} });
  }
  const counters = new Map<string, number>();
  const posts = new Set<string>();
  for (const trace of [...traces].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    if (trace.createdAt > until) continue;
    const day = days.get(trace.createdAt.toISOString().slice(0, 10));
    const meta = parseMetadata(trace.metadata);
    if (trace.task === 'GROWTH_INSIGHT_POSTED' && typeof meta.tweetId === 'string' && !posts.has(meta.tweetId)) {
      posts.add(meta.tweetId);
      if (day) day.posts++;
    }
    if (['AUDIT_LANDING_VISIT', 'PRODUCT_LANDING_VISIT'].includes(trace.task) && day) {
      const content = typeof meta.utm_content === 'string' && (AUDIT_ANGLES.some(a => a.id === meta.utm_content) || PRODUCTS.some(p => p.id === meta.utm_content)) ? meta.utm_content : 'unknown';
      day.landingVisits++;
      const source = typeof meta.utm_source === 'string' ? meta.utm_source : 'unknown';
      day.landingVisitsBySource[source] = (day.landingVisitsBySource[source] ?? 0) + 1;
      const productId = typeof meta.productId === 'string' ? meta.productId : trace.task === 'AUDIT_LANDING_VISIT' ? 'audit' : 'unknown';
      if (!day.products[productId]) day.products[productId] = { visits: 0, orders: 0 };
      day.products[productId].visits++;
      day.landingVisitsByUtmContent[content] = (day.landingVisitsByUtmContent[content] ?? 0) + 1;
    }
    if (trace.task === 'REACH_SNAPSHOT' && (meta.source === 'reddit' || meta.source === 'hn') && Array.isArray(meta.items)) {
      const source = meta.source;
      for (const item of meta.items) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string') continue;
        const itemKey = `${source}:${item.id}`;
        if (!posts.has(itemKey)) { posts.add(itemKey); if (day) day.sources[source].items++; }
        for (const [metric, target] of [['score', 'score'], ['num_comments', 'comments']] as const) {
          const value: unknown = item[metric];
          if (typeof value !== 'number' || !Number.isFinite(value)) continue;
          const key = `${itemKey}:${metric}`;
          const previous = counters.get(key) ?? 0;
          // Scores can fall (Reddit downvotes); report signed changes, not fictitious reach.
          if (day) day.sources[source][target] += value - previous;
          counters.set(key, value);
        }
      }
    }
    if (trace.task !== 'REACH_SNAPSHOT' || !Array.isArray(meta.tweets)) continue;
    for (const item of meta.tweets) {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string') continue;
      for (const [metric, target] of Object.entries({ impression_count: 'impressions', like_count: 'engagements',
        retweet_count: 'engagements', reply_count: 'engagements', quote_count: 'engagements', url_link_clicks: 'urlLinkClicks' } as const)) {
        const value: unknown = item[metric];
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) continue;
        const key = `${item.id}:${metric}`;
        const previous = counters.get(key) ?? 0;
        if (day) day[target] += Math.max(0, value - previous);
        counters.set(key, Math.max(previous, value));
      }
    }
  }
  for (const order of orders) {
    if (order.createdAt > until) continue;
    const day = days.get(order.createdAt.toISOString().slice(0, 10));
    if (day) {
      const productId = order.productId ?? 'audit';
      if (!day.products[productId]) day.products[productId] = { visits: 0, orders: 0 };
      day.products[productId].orders++;
      if (productId === 'audit') day.auditOrders++;
    }
  }
  return [...days.values()];
}

export class ReachService {
  static async collectRedditSnapshot(): Promise<void> {
    if (!RedditMcpClient.hasValidCredentials()) return;
    const items = await RedditMcpClient.getOwnMetrics();
    await this.saveSocialSnapshot('reddit', items);
  }

  static async collectHnSnapshot(): Promise<void> {
    await this.saveSocialSnapshot('hn', await HnMcpClient.getMetrics());
  }

  private static async saveSocialSnapshot(source: 'reddit' | 'hn', items: { id: string }[]): Promise<void> {
    if (!items.length) return;
    await prisma.trace.create({ data: { taskId: `reach-${source}-${randomUUID()}`, task: 'REACH_SNAPSHOT', model: `${source}-api`, metadata: JSON.stringify({ source, items }) } });
  }

  static async collectSnapshot(): Promise<void> {
    const rows = await prisma.trace.findMany({ where: { task: 'GROWTH_INSIGHT_POSTED',
      createdAt: { gte: new Date(Date.now() - 14 * 86400000) } }, select: { metadata: true } });
    const ids = [...new Set(rows.map(row => parseMetadata(row.metadata).tweetId)
      .filter((id): id is string => typeof id === 'string' && /^\d+$/.test(id)))];
    const tweets: TweetMetrics[] = await XMcpClient.getTweetMetrics(ids);
    if (!tweets.length) return;
    await prisma.trace.create({ data: { taskId: `reach-${randomUUID()}`, task: 'REACH_SNAPSHOT', model: 'x-api-v2',
      metadata: JSON.stringify({ tweets }) } });
  }

  static async getDailyReach(days = 14, until = new Date()): Promise<ReachDay[]> {
    const since = new Date(until);
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - days + 1);
    const [traces, orders, playbooks, skills, enterprise] = await Promise.all([
      prisma.trace.findMany({ where: { status: 'ok', createdAt: { lte: until }, task: {
        in: ['GROWTH_INSIGHT_POSTED', 'AUDIT_LANDING_VISIT', 'PRODUCT_LANDING_VISIT', 'REACH_SNAPSHOT'],
      } }, select: { task: true, metadata: true, createdAt: true } }),
      prisma.auditOrder.findMany({ where: { createdAt: { gte: since, lte: until },
        stripePaymentId: { not: null }, refundedAt: null }, select: { createdAt: true } }),
      prisma.payment.findMany({ where: { createdAt: { gte: since, lte: until } }, select: { createdAt: true } }),
      prisma.skillPurchase.findMany({ where: { createdAt: { gte: since, lte: until }, status: { in: ['completed', 'burned'] } }, select: { createdAt: true, skill: { select: { slug: true } } } }),
      prisma.b2bContract.findMany({ where: { createdAt: { gte: since, lte: until }, setupPaid: true }, select: { createdAt: true } }),
    ]);
    return aggregateReach(traces, [...orders,
      ...playbooks.map(o => ({ ...o, productId: 'playbook' })),
      ...skills.map(o => ({ createdAt: o.createdAt, productId: o.skill.slug })),
      ...enterprise.map(o => ({ ...o, productId: 'enterprise' })),
    ], since, until);
  }
}
