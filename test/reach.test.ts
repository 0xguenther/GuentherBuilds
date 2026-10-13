import { afterEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/db/client.js';
import { config } from '../src/config/index.js';
import { CommunityGrowthService } from '../src/services/communityGrowthService.js';
import { LlmClient } from '../src/core/llmClient.js';
import { TraceService } from '../src/services/traceService.js';
import { XMcpClient } from '../src/mcp/xMcp.js';
import { AUDIT_ANGLES, approvedBodies, auditPost, aggregateReach, ReachService } from '../src/services/reachService.js';
import { buildApp } from '../src/server/app.js';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('audit launch publishing', () => {
  function setup() {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(prisma.trace, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.trace, 'findMany').mockResolvedValue([]);
    vi.spyOn(LlmClient, 'generateCompletion').mockRejectedValue(new Error('offline'));
    vi.spyOn(TraceService, 'recordTrace').mockResolvedValue(undefined);
    return vi.spyOn(XMcpClient, 'postTweet').mockResolvedValue({ tweetId: '123', text: '', createdAt: new Date().toISOString() });
  }
  it('keeps every vetted body under 230 chars, disclosed and linked to its angle', () => {
    const texts = new Set<string>();
    for (const angle of AUDIT_ANGLES) for (const body of approvedBodies(angle)) {
      expect(body.length).toBeLessThanOrEqual(230);
      expect(body).toMatch(/autonomous agent/i);
      const text = auditPost(angle.id, body);
      const link = new URL(text.split('\n')[1]);
      expect(link.origin + link.pathname).toBe('https://0xguenther.org/en/audit/');
      expect(Object.fromEntries(link.searchParams)).toEqual({ utm_source: 'x', utm_medium: 'social', utm_campaign: 'writepath', utm_content: angle.id });
      texts.add(text);
    }
    expect(texts.size).toBeGreaterThan(30);
  });
  it('skips the last posted text, survives an LLM exception, and persists text plus id', async () => {
    const post = setup();
    const previous = auditPost(AUDIT_ANGLES[0].id, approvedBodies(AUDIT_ANGLES[0])[0]);
    vi.mocked(prisma.trace.findMany).mockResolvedValueOnce([]).mockResolvedValueOnce([{ metadata: JSON.stringify({ text: previous, productId: 'playbook' }) }] as never).mockResolvedValueOnce([]);
    const result = await CommunityGrowthService.publishBuilderInsight(true);
    expect(result.published).toBe(true);
    expect(post.mock.calls[0][0].text).not.toBe(previous);
    expect(prisma.trace.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { task: 'GROWTH_INSIGHT_POSTED' }, take: 30 }));
    expect(TraceService.recordTrace).toHaveBeenCalledWith(expect.objectContaining({ task: 'GROWTH_INSIGHT_POSTED', metadata: { text: result.text, tweetId: '123', angleId: 'deepseek' } }));
  });
  it('moves to another angle on duplicate 403 and records the rejection', async () => {
    const post = setup();
    post.mockRejectedValueOnce(new Error('X API error 403: duplicate content'));
    const result = await CommunityGrowthService.publishBuilderInsight(true);
    expect(result.published).toBe(true);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0][0].text).not.toBe(post.mock.calls[1][0].text);
    expect(TraceService.recordTrace).toHaveBeenCalledWith(expect.objectContaining({ task: 'GROWTH_INSIGHT_DUPLICATE' }));
  });
  it('does not attempt another post after an ambiguous failure', async () => {
    const post = setup().mockRejectedValue(new Error('unconfirmed timeout'));
    expect((await CommunityGrowthService.publishBuilderInsight(true)).published).toBe(false);
    expect(post).toHaveBeenCalledTimes(1);
  });
  it('rejects invented model copy and skips all used approved bodies', async () => {
    const post = setup();
    vi.mocked(LlmClient.generateCompletion).mockResolvedValue({ text: '99% success guaranteed', model: 'test' } as never);
    const result = await CommunityGrowthService.publishBuilderInsight(true);
    expect(result.text).not.toContain('99%');
    const used = AUDIT_ANGLES.flatMap(angle => approvedBodies(angle).map(body => ({ metadata: JSON.stringify({ text: auditPost(angle.id, body) }) })));
    vi.mocked(prisma.trace.findMany).mockResolvedValueOnce(used as never).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    post.mockClear();
    expect((await CommunityGrowthService.publishBuilderInsight(true)).published).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });
});

describe('landing tracking and internal reach route', () => {
  it('records only safe UTM fields, preserves static HTML and survives storage failure', async () => {
    const create = vi.spyOn(prisma.trace, 'create').mockResolvedValue({} as never);
    const app = await buildApp();
    try {
      for (const path of ['/audit/', '/en/audit/']) {
        const response = await app.inject(`${path}?utm_source=x&utm_campaign=writepath&utm_content=timeout&email=private@example.com`);
        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/html');
        expect(JSON.parse(String(create.mock.calls.at(-1)![0].data.metadata))).toEqual({ path, utm_source: 'x', utm_campaign: 'writepath', utm_content: 'timeout' });
      }
      await app.inject('/en/audit/?utm_source=private@example.com&utm_content=private@example.com');
      expect(JSON.stringify(create.mock.calls)).not.toContain('private@example.com');
      create.mockClear();
      await app.inject('/en/audit/');
      await app.inject('/audit/thanks?utm_source=x');
      await app.inject({ method: 'HEAD', url: '/en/audit/?utm_source=x' });
      expect(create).not.toHaveBeenCalled();
      create.mockRejectedValueOnce(new Error('offline'));
      expect((await app.inject('/en/audit/?utm_source=x')).statusCode).toBe(200);
    } finally { await app.close(); }
  });
  it('uses existing Bearer auth and validates the requested period', async () => {
    vi.stubEnv('ADMIN_API_TOKEN', 'reach-secret');
    const get = vi.spyOn(ReachService, 'getDailyReach').mockResolvedValue([]);
    const app = await buildApp();
    try {
      expect((await app.inject('/api/reach')).statusCode).toBe(401);
      expect((await app.inject({ url: '/api/reach', headers: { authorization: 'Bearer wrong' } })).statusCode).toBe(403);
      const headers = { authorization: 'Bearer reach-secret' };
      expect((await app.inject({ url: '/api/reach?days=3', headers })).json().days).toEqual([]);
      expect(get).toHaveBeenCalledWith(3);
      expect((await app.inject({ url: '/api/reach?days=0', headers })).statusCode).toBe(400);
    } finally { await app.close(); }
  });
});

describe('reach observation aggregation', () => {
  const row = (task: string, date: string, metadata: object) => ({ task, createdAt: new Date(date), metadata: JSON.stringify(metadata) });
  it('uses prior baselines, counts hourly deltas once, and retains missing private counters', () => {
    const rows = [
      row('REACH_SNAPSHOT', '2026-10-05', { tweets: [{ id: '1', impression_count: 100, like_count: 2, url_link_clicks: 3 }] }),
      row('GROWTH_INSIGHT_POSTED', '2026-10-06', { tweetId: '2' }),
      row('GROWTH_INSIGHT_POSTED', '2026-10-06', { tweetId: '2' }),
      row('REACH_SNAPSHOT', '2026-10-06T01:00:00Z', { tweets: [{ id: '1', impression_count: 130, like_count: 3 }] }),
      row('REACH_SNAPSHOT', '2026-10-06T02:00:00Z', { tweets: [{ id: '1', impression_count: 140, like_count: 4, url_link_clicks: 4 }] }),
      row('AUDIT_LANDING_VISIT', '2026-10-06', { utm_content: 'timeout' }),
      row('AUDIT_LANDING_VISIT', '2026-10-06', { utm_content: 'tie' }),
      row('REACH_SNAPSHOT', '2026-10-07', { tweets: [{ id: '1', impression_count: 160, like_count: 5, reply_count: 2, retweet_count: 1, quote_count: 1 }] }),
      row('REACH_SNAPSHOT', '2026-10-07T01:00:00Z', { tweets: [{ id: '1', impression_count: 150, like_count: 4 }] }),
      row('REACH_SNAPSHOT', '2026-10-07T02:00:00Z', { tweets: [{ id: '1', impression_count: 160, like_count: 5 }] }),
      { task: 'REACH_SNAPSHOT', createdAt: new Date('2026-10-07'), metadata: 'bad JSON' },
    ];
    const result = aggregateReach(rows.reverse(), [{ createdAt: new Date('2026-10-07') }], new Date('2026-10-06'), new Date('2026-10-07T23:59:59Z'));
    expect(result[0]).toMatchObject({ posts: 1, impressions: 40, engagements: 2, urlLinkClicks: 1, landingVisits: 2, landingVisitsByUtmContent: { timeout: 1, tie: 1 }, auditOrders: 0 });
    expect(result[1]).toMatchObject({ posts: 0, impressions: 20, engagements: 5, auditOrders: 1 });
  });
  it('collects real posted ids from the last 14 days and persists snapshots', async () => {
    const find = vi.spyOn(prisma.trace, 'findMany').mockResolvedValue([{ metadata: JSON.stringify({ tweetId: '123' }) }, { metadata: JSON.stringify({ tweetId: 'tweet_simulated' }) }] as never);
    const metrics = vi.spyOn(XMcpClient, 'getTweetMetrics').mockResolvedValue([{ id: '123', impression_count: 42 }]);
    const create = vi.spyOn(prisma.trace, 'create').mockResolvedValue({} as never);
    await ReachService.collectSnapshot();
    expect(find.mock.calls[0][0]).toMatchObject({ where: { task: 'GROWTH_INSIGHT_POSTED', createdAt: { gte: expect.any(Date) } } });
    expect(metrics).toHaveBeenCalledWith(['123']);
    expect(create.mock.calls[0][0].data).toMatchObject({ task: 'REACH_SNAPSHOT', metadata: JSON.stringify({ tweets: [{ id: '123', impression_count: 42 }] }) });
  });
});

describe('X metrics API', () => {
  function keys() {
    vi.spyOn(config, 'x', 'get').mockReturnValue({ ...config.x, apiKey: 'key', apiSecret: 'secret', accessToken: 'token', accessSecret: 'secret' });
  }
  it('batches up to 100 ids and falls back on private metric rejection', async () => {
    keys();
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 403 }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: '1', public_metrics: { impression_count: 100, like_count: 2 } }] }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: '101', public_metrics: { impression_count: 2 }, non_public_metrics: { url_link_clicks: 1 } }] }));
    vi.stubGlobal('fetch', fetcher);
    const result = await XMcpClient.getTweetMetrics(Array.from({ length: 101 }, (_, i) => String(i + 1)));
    expect(result).toEqual([{ id: '1', impression_count: 100, like_count: 2 }, { id: '101', impression_count: 2, url_link_clicks: 1 }]);
    expect(new URL(fetcher.mock.calls[0][0]).searchParams.get('ids')!.split(',')).toHaveLength(100);
    expect(new URL(fetcher.mock.calls[1][0]).searchParams.get('tweet.fields')).toBe('public_metrics');
    expect(new URL(fetcher.mock.calls[2][0]).searchParams.get('ids')).toBe('101');
    expect(fetcher.mock.calls[0][1].headers.Authorization).toMatch(/^OAuth /);
  });
  it('backs off exponentially on 429 without inventing unavailable metrics', async () => {
    keys();
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: '1', public_metrics: { like_count: 1 } }] }));
    vi.stubGlobal('fetch', fetcher);
    const pending = XMcpClient.getTweetMetrics(['1']);
    await vi.advanceTimersByTimeAsync(1499);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(3000);
    expect(await pending).toEqual([{ id: '1', like_count: 1 }]);
  });
});
