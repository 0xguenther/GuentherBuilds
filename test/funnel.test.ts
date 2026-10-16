import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { prisma } from '../src/db/client.js';
import { MetricsService } from '../src/services/metricsService.js';
import { visitorHash } from '../src/services/pageViewService.js';
import { buildApp } from '../src/server/app.js';

describe('cookieless page views', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it('hashes IP and UA to 16 hex characters and rotates each UTC day', () => {
    vi.stubEnv('TRACKING_SALT', 'test-secret');
    const hash = visitorHash('2026-10-07', '192.0.2.42', 'Mozilla/5.0');
    expect(hash).toMatch(/^[a-f0-9]{16}$/);
    expect(hash).not.toContain('192.0.2.42');
    expect(hash).not.toContain('Mozilla');
    expect(visitorHash('2026-10-07', '192.0.2.42', 'Mozilla/5.0')).toBe(hash);
    expect(visitorHash('2026-10-08', '192.0.2.42', 'Mozilla/5.0')).not.toBe(hash);
  });

  it('tracks HTML only, strips queries/referrer details and honours IP precedence', async () => {
    vi.stubEnv('TRACKING_ENABLED', 'true');
    const create = vi.spyOn(prisma.pageView, 'create').mockResolvedValue({} as Awaited<ReturnType<typeof prisma.pageView.create>>);
    const app = await buildApp();
    app.get('/tracking-test', (_request, reply) => reply.type('text/html').send('<p>test</p>'));
    app.get('/api/tracking-test', (_request, reply) => reply.type('text/html').send('<p>api</p>'));
    app.get('/download/tracking-test', (_request, reply) => reply.type('text/html').send('<p>download</p>'));
    app.get('/tracking-json', () => ({ ok: true }));
    try {
      const headers = { 'user-agent': 'Mozilla/5.0', 'cf-connecting-ip': '192.0.2.1', 'x-forwarded-for': '192.0.2.2, 192.0.2.3', referer: 'https://example.test/private?token=secret' };
      const response = await app.inject({ url: '/tracking-test?email=private', headers });
      expect(response.statusCode).toBe(200);
      const row = create.mock.calls[0][0].data;
      expect(row).toMatchObject({ path: '/tracking-test', referrerHost: 'example.test', visitorHash: visitorHash(row.day, '192.0.2.1', 'Mozilla/5.0') });
      expect(JSON.stringify(row)).not.toMatch(/192\.0\.2|Mozilla|private|secret/);
      await app.inject({ url: '/tracking-test', headers: { 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '192.0.2.2, 192.0.2.3' } });
      expect(create.mock.calls[1][0].data.visitorHash).toBe(visitorHash(row.day, '192.0.2.2', 'Mozilla/5.0'));
      await app.inject({ url: '/tracking-test', headers: { 'user-agent': 'Mozilla/5.0' }, remoteAddress: '192.0.2.4' });
      expect(create.mock.calls[2][0].data.visitorHash).toBe(visitorHash(row.day, '192.0.2.4', 'Mozilla/5.0'));
      create.mockClear();
      for (const ua of ['Googlebot', 'crawler', 'spider', 'slurp', 'preview', 'monitor', 'uptime', 'kuma', 'curl', 'wget', 'python', 'headless']) {
        await app.inject({ url: '/tracking-test', headers: { 'user-agent': ua } });
      }
      for (const url of ['/api/tracking-test', '/download/tracking-test', '/tracking-json', '/assets/favicon.png', '/not-existing']) {
        await app.inject({ url, headers });
      }
      await app.inject({ method: 'HEAD', url: '/tracking-test', headers });
      expect(create).not.toHaveBeenCalled();
      vi.stubEnv('TRACKING_ENABLED', 'false');
      await app.inject({ url: '/tracking-test', headers });
      expect(create).not.toHaveBeenCalled();
      vi.stubEnv('TRACKING_ENABLED', 'true');
      create.mockRejectedValueOnce(new Error('database down'));
      expect((await app.inject({ url: '/tracking-test', headers })).statusCode).toBe(200);
      create.mockImplementationOnce(() => new Promise(() => {}));
      expect((await app.inject({ url: '/tracking-test', headers })).statusCode).toBe(200);
    } finally { await app.close(); }
  });

  it('protects the funnel with Bearer auth and validates days without changing public metrics', async () => {
    vi.stubEnv('ADMIN_API_TOKEN', 'admin-test-token');
    const funnel = vi.spyOn(MetricsService, 'getFunnel').mockResolvedValue({ pageViews: 7 } as Awaited<ReturnType<typeof MetricsService.getFunnel>>);
    vi.spyOn(MetricsService, 'getLiveMetrics').mockResolvedValue({} as Awaited<ReturnType<typeof MetricsService.getLiveMetrics>>);
    const app = await buildApp();
    try {
      expect((await app.inject('/api/metrics/funnel')).statusCode).toBe(401);
      expect((await app.inject({ url: '/api/metrics/funnel', headers: { authorization: 'Bearer wrong' } })).statusCode).toBe(403);
      const headers = { authorization: 'Bearer admin-test-token' };
      expect((await app.inject({ url: '/api/metrics/funnel?days=7', headers })).json()).toEqual({ pageViews: 7 });
      expect(funnel).toHaveBeenCalledWith({ days: 7 });
      for (const days of ['0', '-1', 'abc', '1.5', '3651']) {
        expect((await app.inject({ url: `/api/metrics/funnel?days=${days}`, headers })).statusCode).toBe(400);
      }
      expect((await app.inject('/api/metrics')).statusCode).toBe(200);
    } finally { await app.close(); }
  });
});

describe('seeded funnel and kill criterion', () => {
  let prefix: string;
  beforeEach(() => {
    prefix = `funnel-${randomUUID()}`;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2080-01-16T00:00:00Z'));
    vi.stubEnv('KILL_CRITERION_START', '2080-01-01');
  });
  afterEach(async () => {
    vi.useRealTimers(); vi.unstubAllEnvs();
    await prisma.pageView.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.auditOrder.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.payment.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.b2bLead.deleteMany({ where: { id: { startsWith: prefix } } });
  });

  it('sums daily uniques, counts paid statuses and checkouts, and measures linear progress independently of days', async () => {
    vi.stubEnv('KILL_TARGET_VISITORS', '500'); vi.stubEnv('KILL_TARGET_ORDERS', '10');
    await prisma.pageView.createMany({ data: [
      { id: `${prefix}-1`, day: '2080-01-02', createdAt: new Date('2080-01-02'), path: '/', visitorHash: 'same', referrerHost: 'example.test' },
      { id: `${prefix}-2`, day: '2080-01-02', createdAt: new Date('2080-01-02'), path: '/', visitorHash: 'same', referrerHost: 'example.test' },
      { id: `${prefix}-3`, day: '2080-01-03', createdAt: new Date('2080-01-03'), path: '/audit/', visitorHash: 'same' },
      { id: `${prefix}-4`, day: '2080-01-03', createdAt: new Date('2080-01-03'), path: '/', visitorHash: 'other' },
    ] });
    const createdAt = new Date('2080-01-02');
    await prisma.auditOrder.createMany({ data: ['paid', 'running', 'delivered', 'failed', 'rejected', 'pending_payment'].map((status) => ({
      id: `${prefix}-${status}`, tier: 'quick', configJson: '{}', status, createdAt,
    })) });
    await prisma.payment.createMany({ data: ['received', 'failed'].map((status) => ({
      id: `${prefix}-${status}`, stripePaymentId: `${prefix}-${status}`, stripeSessionId: `${prefix}-${status}`, amountCents: 100, status, createdAt,
    })) });
    await prisma.b2bLead.create({ data: {
      id: prefix, companyName: 'Test', contactName: 'Test', contactEmail: 'test@example.test', useCase: 'test', monthlyVolume: 'test', integrations: '', stripeCheckoutId: prefix, createdAt,
    } });
    const funnel = await MetricsService.getFunnel();
    expect(funnel).toMatchObject({ days: 30, pageViews: 4, uniqueVisitors: 3, qualifiedVisitors: 1, checkoutsStarted: 9, ordersPaid: 6 });
    expect(funnel.conversionRates).toEqual({ visitorToCheckout: 3, checkoutToPaid: 6 / 9 });
    expect(funnel.topPaths[0]).toEqual({ path: '/', pageViews: 3 });
    expect(funnel.topReferrerHosts).toEqual([{ host: 'example.test', pageViews: 2 }]);
    expect(funnel.killCriterion).toMatchObject({ start: '2080-01-01', decisionDay: '2080-01-31', daysLeft: 15, visitors: 1, rawVisitors: 3, paidOrders: 6, onTrack: false });
    await prisma.pageView.createMany({ data: Array.from({ length: 249 }, (_, i) => ({
      id: `${prefix}-pace-${i}`, day: '2080-01-02', createdAt, path: '/', visitorHash: `visitor-${i}`, referrerHost: 'example.test',
    })) });
    const shortRange = await MetricsService.getFunnel({ days: 1 });
    expect(shortRange).toMatchObject({ pageViews: 0, uniqueVisitors: 0, checkoutsStarted: 0, ordersPaid: 0, conversionRates: { visitorToCheckout: 0, checkoutToPaid: 0 } });
    expect(shortRange.killCriterion).toMatchObject({ visitors: 250, paidOrders: 6, onTrack: true });
    vi.setSystemTime(new Date('2080-02-01T00:00:00Z'));
    expect((await MetricsService.getFunnel()).killCriterion).toMatchObject({ daysLeft: 0, onTrack: false });
  });

  it('separates attributable visitors from unattributed direct traffic and reports sources and research visitors', async () => {
    const at = new Date('2080-01-05');
    const row = (id: string, path: string, visitorHash: string, extra: { source?: string; referrerHost?: string } = {}) =>
      ({ id: `${prefix}-${id}`, day: '2080-01-05', createdAt: at, path, visitorHash, ...extra });
    await prisma.pageView.createMany({ data: [
      row('a', '/en/agent-write-path-research.html', 'a', { source: 'x' }),
      row('b', '/en/agent-lost-reply-after-write.html', 'b', { referrerHost: 'www.google.com' }),
      row('c', '/', 'c'),
      row('d', '/', 'd', { referrerHost: '0xguenther.org' }),
      row('e', '/en/agent-check.html', 'e', { source: 'reddit' }),
    ] });
    const funnel = await MetricsService.getFunnel();
    expect(funnel).toMatchObject({ uniqueVisitors: 5, qualifiedVisitors: 3, researchVisitors: 2 });
    expect(funnel.topSources).toEqual(expect.arrayContaining([{ source: 'x', pageViews: 1 }, { source: 'reddit', pageViews: 1 }]));
    expect(funnel.killCriterion).toMatchObject({ visitors: 3, rawVisitors: 5, targets: { visitors: 300, paidOrders: 3 }, windowDays: 30 });
  });

  it('uses the reset window by default and lets the env override start, length and targets', async () => {
    vi.unstubAllEnvs();
    expect((await MetricsService.getFunnel()).killCriterion).toMatchObject({ start: '2026-10-17', targets: { visitors: 300, paidOrders: 3 }, windowDays: 30 });
    vi.stubEnv('KILL_CRITERION_START', '2080-01-10'); vi.stubEnv('KILL_CRITERION_DAYS', '14'); vi.stubEnv('KILL_TARGET_ORDERS', '2');
    expect((await MetricsService.getFunnel()).killCriterion).toMatchObject({ decisionDay: '2080-01-24', windowDays: 14, targets: { paidOrders: 2 } });
  });

  it('rejects invalid ranges and handles a future start without negative pace', async () => {
    await expect(MetricsService.getFunnel({ days: 0 })).rejects.toThrow('days');
    vi.stubEnv('KILL_CRITERION_START', '2080-02-31');
    await expect(MetricsService.getFunnel()).rejects.toThrow('KILL_CRITERION_START');
    vi.stubEnv('KILL_CRITERION_START', '2080-02-01');
    expect((await MetricsService.getFunnel()).killCriterion).toMatchObject({ visitors: 0, paidOrders: 0, daysLeft: 46, onTrack: true });
  });
});
