import { afterEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/db/client.js';
import { PRODUCTS, productPost, productTurn } from '../src/services/productCatalog.js';
import { REDDIT_DISCLOSURE, RedditService, canPromote, safeHelpfulComment } from '../src/services/redditService.js';
import { RedditMcpClient } from '../src/mcp/redditMcp.js';
import { parseHnItem } from '../src/mcp/hnMcp.js';
import { aggregateReach } from '../src/services/reachService.js';
import { CommunityGrowthService } from '../src/services/communityGrowthService.js';
import { LlmClient } from '../src/core/llmClient.js';
import { TraceService } from '../src/services/traceService.js';
import { XMcpClient } from '../src/mcp/xMcp.js';

afterEach(() => { vi.restoreAllMocks(); });

describe('product announcements', () => {
  it('covers all products with UTM-tagged links', () => {
    expect(PRODUCTS.map(p => p.id)).toEqual(['playbook', 'eliza-token-burner', 'fastify-stripe-mcp', 'cdp-mpc-wallet-guard', 'agent-trace-pack', 'audit', 'enterprise']);
    for (const p of PRODUCTS) {
      const url = new URL(productPost(p.id, 'x').split('\n')[1]);
      expect(Object.fromEntries(url.searchParams)).toEqual({ utm_source: 'x', utm_medium: 'social', utm_campaign: 'products', utm_content: p.id });
    }
    expect(productPost('playbook', 'x', 'reddit')).toContain('utm_source=reddit');
  });
  it('alternates audit and product slots 50/50', () => {
    expect(productTurn([])).toBe(false);
    expect(productTurn([{ metadata: JSON.stringify({ angleId: 'tie' }) }])).toBe(true);
    expect(productTurn([{ metadata: JSON.stringify({ productId: 'audit' }) }])).toBe(false);
    let history: { metadata: string | null }[] = [];
    const kinds: boolean[] = [];
    for (let i = 0; i < 10; i++) {
      const t = productTurn(history);
      kinds.push(t);
      history = [{ metadata: JSON.stringify(t ? { productId: 'x' } : { angleId: 'y' }) }];
    }
    expect(kinds.filter(Boolean)).toHaveLength(5);
  });
  it('posts a product with deterministic fallback when the LLM is offline', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(prisma.trace, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.trace, 'findMany').mockResolvedValue([]);
    vi.spyOn(LlmClient, 'generateCompletion').mockRejectedValue(new Error('offline'));
    vi.spyOn(TraceService, 'recordTrace').mockResolvedValue(undefined);
    const post = vi.spyOn(XMcpClient, 'postTweet').mockResolvedValue({ tweetId: '1', text: '', createdAt: '' });
    vi.mocked(prisma.trace.findMany).mockResolvedValueOnce([]).mockResolvedValueOnce([{ metadata: JSON.stringify({ angleId: 'tie' }) }] as never).mockResolvedValue([]);
    await CommunityGrowthService.publishBuilderInsight(true);
    expect(post.mock.calls[0][0].text).toContain('utm_campaign=products');
  });
  it('breaks down visits and orders per product', () => {
    const r = aggregateReach([{ task: 'PRODUCT_LANDING_VISIT', createdAt: new Date('2026-10-06'), metadata: JSON.stringify({ productId: 'playbook', utm_content: 'playbook', utm_source: 'x' }) }],
      [{ createdAt: new Date('2026-10-06'), productId: 'playbook' }], new Date('2026-10-06'), new Date('2026-10-06T23:00:00Z'));
    expect(r[0].products.playbook).toEqual({ visits: 1, orders: 1 });
  });
});

describe('reddit guards', () => {
  const ok = (promotional: boolean) => ({ task: 'REDDIT_ACTION', status: 'ok', metadata: JSON.stringify({ promotional }) });
  it('rejects links, promotion and missing disclosure in warmup comments', () => {
    const body = 'Make the tool call idempotent by keying each write on a request id and checking it before retrying.';
    expect(safeHelpfulComment(`${body}\n${REDDIT_DISCLOSURE}`)).toBe(true);
    expect(safeHelpfulComment(body)).toBe(false);
    expect(safeHelpfulComment(`${body} see https://example.com\n${REDDIT_DISCLOSURE}`)).toBe(false);
    expect(safeHelpfulComment(`${body} see example.com\n${REDDIT_DISCLOSURE}`)).toBe(false);
    expect(safeHelpfulComment(`${body} check out my product\n${REDDIT_DISCLOSURE}`)).toBe(false);
  });
  it('allows at most one promotion per 10 actions', () => {
    expect(canPromote(Array(9).fill(ok(false)))).toBe(true);
    expect(canPromote([ok(true), ...Array(8).fill(ok(false))])).toBe(false);
    expect(canPromote(Array(8).fill(ok(false)))).toBe(false);
  });
  it('is a no-op without credentials', async () => {
    vi.spyOn(RedditMcpClient, 'hasValidCredentials').mockReturnValue(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const listing = vi.spyOn(RedditMcpClient, 'listing');
    await RedditService.runAutonomousCycle();
    await RedditService.runAutonomousCycle();
    expect(listing).not.toHaveBeenCalled();
    expect(warn.mock.calls.filter(c => String(c[0]).includes('Credentials missing')).length).toBeLessThanOrEqual(1);
  });
});

describe('HN snapshot parsing', () => {
  const now = Date.now() / 1000;
  it('keeps own recent items with score and descendants only', () => {
    expect(parseHnItem({ id: 1, by: '0xguenther', time: now - 100, score: 5, descendants: 2 }, now - 1000)).toEqual({ id: '1', score: 5, num_comments: 2 });
    expect(parseHnItem({ id: 2, by: '0xguenther', time: now - 100 }, now - 1000)).toEqual({ id: '2' });
    expect(parseHnItem({ id: 3, by: 'other', time: now - 100, score: 1 }, now - 1000)).toBeNull();
    expect(parseHnItem({ id: 4, by: '0xguenther', time: now - 5000, score: 1 }, now - 1000)).toBeNull();
    expect(parseHnItem({ id: 5, by: '0xguenther', time: now - 100, dead: true }, now - 1000)).toBeNull();
    expect(parseHnItem(null, 0)).toBeNull();
  });
  it('aggregates hn snapshots in reach', () => {
    const r = aggregateReach([{ task: 'REACH_SNAPSHOT', createdAt: new Date('2026-10-06'), metadata: JSON.stringify({ source: 'hn', items: [{ id: '1', score: 5, num_comments: 2 }] }) }],
      [], new Date('2026-10-06'), new Date('2026-10-06T23:00:00Z'));
    expect(r[0].sources.hn).toEqual({ items: 1, score: 5, comments: 2 });
  });
});
