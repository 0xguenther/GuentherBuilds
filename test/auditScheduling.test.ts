import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { prisma } from '../src/db/client.js';
import { AuditFulfillmentService } from '../src/services/auditFulfillmentService.js';

const mocks = vi.hoisted(() => ({ refund: vi.fn(), email: vi.fn() }));
vi.mock('../src/mcp/stripeMcp.js', () => ({ StripeMcpClient: { refundAuditOrder: mocks.refund } }));
vi.mock('../src/services/emailService.js', () => ({ sendEmail: mocks.email }));

describe('audit scheduling', () => {
  const ids: string[] = [];
  beforeEach(() => {
    mocks.refund.mockReset().mockResolvedValue({ id: 're_orphan', amount: 9000, currency: 'chf', status: 'succeeded' });
    mocks.email.mockReset().mockResolvedValue(true);
    // Scope scheduler queries to this test's rows in the shared test database.
    const count = prisma.auditOrder.count.bind(prisma.auditOrder);
    const findMany = prisma.auditOrder.findMany.bind(prisma.auditOrder);
    vi.spyOn(prisma.auditOrder, 'count').mockImplementation(args => count({ ...args, where: { ...args?.where, id: { in: ids } } }));
    vi.spyOn(prisma.auditOrder, 'findMany').mockImplementation(args => findMany({ ...args, where: { ...args?.where, id: { in: ids } } }));
    vi.spyOn(prisma.auditOrder, 'findFirst').mockResolvedValue(null);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await prisma.trace.deleteMany({ where: { taskId: { in: ids.map(id => `audit-${id}`) } } });
    await prisma.auditOrder.deleteMany({ where: { id: { in: ids.splice(0) } } });
  });
  async function order(status: string, startedAt: Date | null, updatedAt = new Date()) {
    const id = randomUUID();
    ids.push(id);
    return prisma.auditOrder.create({ data: { id, tier: 'quick', status, startedAt, updatedAt,
      configJson: '{"lang":"en"}', buyerEmail: 'buyer@example.test', stripePaymentId: 'pi_orphan' } });
  }

  it('does not count downloads or refunds of yesterday’s runs against today', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    for (let i = 0; i < 5; i++) await order(i % 2 ? 'failed' : 'delivered', yesterday);
    const paid = await order('paid', null);
    vi.mocked(prisma.auditOrder.findFirst).mockResolvedValue(paid);
    const fulfil = vi.spyOn(AuditFulfillmentService, 'fulfil').mockResolvedValue();
    expect(await AuditFulfillmentService.processPaidOrders()).toBe(1);
    expect(fulfil).toHaveBeenCalledWith(paid.id);
  });

  it('counts all runs started today even if their updatedAt is older', async () => {
    for (let i = 0; i < 5; i++) await order('delivered', new Date(), new Date(0));
    expect(await AuditFulfillmentService.processPaidOrders()).toBe(0);
    expect(prisma.auditOrder.findFirst).not.toHaveBeenCalled();
  });

  it.each([false, true])('recovers stale running orders once, including legacy=%s, even at quota', async legacy => {
    const stale = new Date(Date.now() - (130 * 60 * 1000) - 1000);
    const orphan = await order('running', legacy ? null : stale, legacy ? stale : new Date());
    vi.mocked(prisma.auditOrder.count).mockResolvedValue(5);
    await Promise.all([AuditFulfillmentService.processPaidOrders(), AuditFulfillmentService.processPaidOrders()]);
    expect(await prisma.auditOrder.findUnique({ where: { id: orphan.id } })).toMatchObject({ status: 'failed', refundId: 're_orphan' });
    expect(mocks.refund).toHaveBeenCalledOnce();
    expect(mocks.email).toHaveBeenCalledOnce();
    expect(mocks.email).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('We have refunded CHF 90.00') }));
  });

  it('leaves recent runs, the grace period, and recent legacy rows alone', async () => {
    await order('running', new Date(), new Date(0));
    await order('running', new Date(Date.now() - 125 * 60 * 1000));
    await order('running', null);
    await AuditFulfillmentService.processPaidOrders();
    expect(mocks.refund).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
    expect(await prisma.auditOrder.count({ where: { status: 'running' } })).toBe(3);
  });
});
