import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from '../src/db/client.js';
import { auditRoutes } from '../src/server/routes/auditRoutes.js';
import { AuditFulfillmentService } from '../src/services/auditFulfillmentService.js';
import { AuditConfig, auditModels } from '../src/services/auditRunnerService.js';

const mocks = vi.hoisted(() => ({ checkout: vi.fn(), refund: vi.fn(), email: vi.fn() }));
vi.mock('../src/mcp/stripeMcp.js', () => ({ StripeMcpClient: {
  createCheckoutSession: mocks.checkout, refundAuditOrder: mocks.refund,
} }));
vi.mock('../src/services/emailService.js', () => ({
  sendEmail: mocks.email,
}));

const config: AuditConfig = {
  version: 2, lang: 'de', model: 'fixture-model', systemPrompt: 'Use idempotent writes.',
  tools: [{ name: 'save_record', description: 'Saves a record', kind: 'write',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } }],
};
const payload = () => ({ tier: 'quick', lang: config.lang, model: config.model,
  systemPrompt: config.systemPrompt, tools: config.tools, buyerEmail: 'buyer@example.test' });

describe('audit v2 customer runner', () => {
  const ids: string[] = [];
  const temporaryDirs: string[] = [];
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('AUDIT_ORDERS_ENABLED', '1');
    vi.stubEnv('CANARY_RUNNER_DIR', path.resolve('test/fixtures/canary'));
    mocks.checkout.mockResolvedValue({ sessionId: 'cs_fixture', sessionUrl: 'https://checkout.example.test' });
    mocks.refund.mockResolvedValue({ id: 're_fixture', amount: 9000, currency: 'chf', status: 'succeeded' });
    mocks.email.mockResolvedValue(true);
  });
  afterEach(async () => {
    for (const id of ids) {
      await fs.promises.rm(path.resolve('data/audit-reports', `${id}.html`), { force: true });
    }
    await prisma.trace.deleteMany({ where: { taskId: { in: ids.map(id => `audit-${id}`) } } });
    await prisma.auditOrder.deleteMany({ where: { id: { in: ids.splice(0) } } });
    for (const dir of temporaryDirs.splice(0)) await fs.promises.rm(dir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  async function request(body: unknown) {
    const app = Fastify();
    await app.register(auditRoutes);
    try { return await app.inject({ method: 'POST', url: '/api/audit/orders', payload: body as object }); }
    finally { await app.close(); }
  }
  async function paid(stored: unknown = config, tier = 'quick') {
    const id = randomUUID();
    ids.push(id);
    await prisma.auditOrder.create({ data: { id, tier, status: 'paid', configJson: JSON.stringify(stored),
      stripePaymentId: 'pi_fixture', buyerEmail: 'buyer@example.test' } });
    return id;
  }

  it.each([
    { buyerEmail: undefined }, { buyerEmail: '' },
    { lang: 'fr' }, { model: '' }, { systemPrompt: '' }, { systemPrompt: 'x'.repeat(8001) },
    { tools: [] }, { tools: Array(13).fill(config.tools[0]) },
    { tools: [config.tools[0], config.tools[0]] },
    { tools: [{ ...config.tools[0], name: 'invalid-name' }] },
    { tools: [{ ...config.tools[0], kind: 'read' }] },
    { tools: [{ ...config.tools[0], description: 'x'.repeat(501) }] },
    { tools: [{ ...config.tools[0], parameters: { type: 'object' } }] },
  ])('returns 400 without checkout for schema errors (%j)', async invalid => {
    const res = await request({ ...payload(), ...invalid });
    expect(res.statusCode).toBe(400);
    expect(res.json().errors.length).toBeGreaterThan(0);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it('returns validator errors without checkout or a stored order', async () => {
    const res = await request({ ...payload(), model: 'unknown-model' });
    expect(res.statusCode).toBe(400);
    expect(res.json().errors).toEqual(['Unsupported model']);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it('times out validation after five seconds without checkout', async () => {
    const res = await request({ ...payload(), systemPrompt: 'validator-timeout' });
    expect(res.statusCode).toBe(400);
    expect(res.json().errors).toEqual(['Configuration validation timed out']);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it.each(['de', 'en'] as const)('creates localized %s checkout and persists only the validated v2 configuration', async lang => {
    const res = await request({ ...payload(), lang });
    if (res.statusCode === 201) ids.push(res.json().orderId);
    expect(res.statusCode).toBe(201);
    expect(res.json().checkoutUrl).toBe('https://checkout.example.test');
    expect(mocks.checkout).toHaveBeenCalledOnce();
    const prefix = lang === 'en' ? '/en/audit' : '/audit';
    expect(mocks.checkout).toHaveBeenCalledWith(expect.objectContaining({
      successUrl: expect.stringContaining(`${prefix}/thanks?order=${res.json().orderId}&session_id={CHECKOUT_SESSION_ID}`),
      cancelUrl: expect.stringMatching(new RegExp(`${prefix}$`)),
    }));
    const order = await prisma.auditOrder.findUniqueOrThrow({ where: { id: res.json().orderId } });
    expect(JSON.parse(order.configJson)).toEqual({ ...config, lang });
    expect(order).toMatchObject({ status: 'pending_payment', stripeSessionId: 'cs_fixture' });
  });

  it('serves only public model fields and caches the catalogue', async () => {
    const app = Fastify();
    await app.register(auditRoutes);
    try {
      expect((await app.inject({ url: '/api/audit/models' })).json()).toEqual([{ id: 'fixture-model', label: 'Fixture Model' }]);
      const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'audit-models-'));
      temporaryDirs.push(dir);
      vi.stubEnv('CANARY_RUNNER_DIR', dir);
      await fs.promises.mkdir(path.join(dir, 'src/customer'), { recursive: true });
      const file = path.join(dir, 'src/customer/models.json');
      await fs.promises.writeFile(file, '[{"id":"cached","label":"Cached","openrouter":"private"}]');
      expect((await app.inject({ url: '/api/audit/models' })).json()).toEqual([{ id: 'cached', label: 'Cached' }]);
      await fs.promises.unlink(file);
      expect((await app.inject({ url: '/api/audit/models' })).json()).toEqual([{ id: 'cached', label: 'Cached' }]);
    } finally { await app.close(); }
  });

  it('warns once and returns an empty list when models.json is missing', async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'audit-models-missing-'));
    temporaryDirs.push(dir);
    vi.stubEnv('CANARY_RUNNER_DIR', dir);
    const warn = vi.fn();
    expect(await auditModels(warn)).toEqual([]);
    expect(await auditModels(warn)).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it.each([['quick', 12, 0.5], ['standard', 20, 1], ['fix', 40, 2]] as const)
    ('delivers %s with tier repetitions, cap and summary metadata', async (tier, runs, costUsd) => {
      const id = await paid(config, tier);
      await AuditFulfillmentService.fulfil(id);
      const order = await prisma.auditOrder.findUniqueOrThrow({ where: { id } });
      expect(order.status).toBe('delivered');
      expect(await fs.promises.readFile(order.reportPath!, 'utf8')).toContain('fixture-model: save_record');
      const trace = await prisma.trace.findFirstOrThrow({ where: { taskId: `audit-${id}`, task: 'AUDIT_FULFILMENT' } });
      expect(trace).toMatchObject({ model: 'fixture-model', costUsd, status: 'ok' });
      expect(JSON.parse(trace.metadata!)).toMatchObject({ passRate: 0.75, costUsd, cases: 4, runs });
      expect(mocks.refund).not.toHaveBeenCalled();
    });

  it('honours a tier cost cap override and claims a paid order only once', async () => {
    vi.stubEnv('AUDIT_COST_CAP_USD_QUICK', '7');
    const id = await paid();
    await Promise.all([AuditFulfillmentService.fulfil(id), AuditFulfillmentService.fulfil(id)]);
    await AuditFulfillmentService.fulfil(id);
    const traces = await prisma.trace.findMany({ where: { taskId: `audit-${id}`, task: 'AUDIT_FULFILMENT' } });
    expect(traces).toHaveLength(1);
    expect(traces[0].costUsd).toBe(0.7);
    expect(mocks.email).toHaveBeenCalledOnce();
  });

  it.each(['exit3', 'missing-report'])('refunds and emails the buyer when the runner returns %s', async systemPrompt => {
    const id = await paid({ ...config, systemPrompt });
    await AuditFulfillmentService.fulfil(id);
    expect(await prisma.auditOrder.findUnique({ where: { id } })).toMatchObject({ status: 'failed', refundId: 're_fixture', reportPath: null });
    expect(mocks.refund).toHaveBeenCalledOnce();
    expect(mocks.email).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('CHF 90.00 zurückerstattet') }));
  });

  it('fails and refunds legacy configuration without invoking the runner', async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'audit-marker-'));
    temporaryDirs.push(dir);
    const marker = path.join(dir, 'invocations');
    vi.stubEnv('AUDIT_FIXTURE_MARKER', marker);
    const legacy = await paid({ tools: config.tools });
    await AuditFulfillmentService.fulfil(legacy);
    expect(fs.existsSync(marker)).toBe(false);
    expect(await prisma.auditOrder.findUnique({ where: { id: legacy } })).toMatchObject({ status: 'failed', refundId: 're_fixture' });
    const valid = await paid();
    await AuditFulfillmentService.fulfil(valid);
    expect(await fs.promises.readFile(marker, 'utf8')).toBe('run\n');
  });
});
