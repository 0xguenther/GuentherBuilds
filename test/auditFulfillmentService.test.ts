import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { prisma } from '../src/db/client.js';
import { AuditFulfillmentService } from '../src/services/auditFulfillmentService.js';
import { sendEmail } from '../src/services/emailService.js';

const mocks = vi.hoisted(() => ({ refund: vi.fn(), retrieve: vi.fn(), spawn: vi.fn() }));
vi.mock('stripe', () => ({ default: class {
  refunds = { create: mocks.refund };
  checkout = { sessions: { retrieve: mocks.retrieve } };
} }));
vi.mock('child_process', () => ({ spawn: mocks.spawn }));
vi.mock('../src/services/emailService.js', () => ({ sendEmail: vi.fn().mockResolvedValue(true), buildReportReadyEmail: vi.fn() }));

describe('automatic audit refunds', () => {
  let orderId: string;
  beforeEach(async () => {
    vi.clearAllMocks();
    orderId = randomUUID();
    mocks.refund.mockResolvedValue({ id: `re_${orderId}`, amount: 9000, currency: 'chf', status: 'succeeded' });
    await prisma.auditOrder.create({ data: {
      id: orderId, tier: 'quick', status: 'paid', configJson: JSON.stringify({ tools: [{ name: 'unsupported' }] }),
      stripePaymentId: 'pi_audit_test', stripeSessionId: 'cs_audit_test', buyerEmail: 'audit@example.test',
    } });
  });
  afterEach(async () => {
    await prisma.auditOrder.deleteMany({ where: { id: orderId } });
    await prisma.trace.deleteMany({ where: { taskId: `audit-${orderId}` } });
  });

  it('refunds rejection once with a stable idempotency key and informs the buyer', async () => {
    await AuditFulfillmentService.fulfil(orderId);
    await AuditFulfillmentService.fulfil(orderId);
    expect(mocks.refund).toHaveBeenCalledTimes(1);
    expect(mocks.refund).toHaveBeenCalledWith({ payment_intent: 'pi_audit_test' }, { idempotencyKey: `refund-audit-${orderId}` });
    const order = await prisma.auditOrder.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).toMatchObject({ status: 'rejected', refundId: `re_${orderId}`, refundError: null });
    expect(order.refundedAt).toBeInstanceOf(Date);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('CHF 90.00 was issued') }));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('5-10 business days') }));
    const trace = await prisma.trace.findFirstOrThrow({ where: { taskId: `audit-${orderId}`, task: 'AUDIT_REFUND' } });
    expect(trace.status).toBe('ok');
    expect(JSON.parse(trace.metadata!)).toMatchObject({ refundId: `re_${orderId}` });
  });

  it('retrieves the checkout payment intent when only a session is stored', async () => {
    await prisma.auditOrder.update({ where: { id: orderId }, data: { stripePaymentId: null } });
    mocks.retrieve.mockResolvedValue({ payment_intent: { id: 'pi_from_session' } });
    await AuditFulfillmentService.fulfil(orderId);
    expect(mocks.retrieve).toHaveBeenCalledWith('cs_audit_test');
    expect(mocks.refund).toHaveBeenCalledWith({ payment_intent: 'pi_from_session' }, { idempotencyKey: `refund-audit-${orderId}` });
  });

  it('stores a Stripe error without throwing and retains the fallback email wording', async () => {
    mocks.refund.mockRejectedValueOnce(new Error('Stripe unavailable'));
    await expect(AuditFulfillmentService.fulfil(orderId)).resolves.toBeUndefined();
    expect(await prisma.auditOrder.findUnique({ where: { id: orderId } })).toMatchObject({ refundError: 'Stripe unavailable', refundId: null });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('within 5 business days') }));
    expect(await prisma.trace.findFirst({ where: { taskId: `audit-${orderId}`, task: 'AUDIT_REFUND' } })).toMatchObject({ status: 'error' });
    await AuditFulfillmentService.fulfil(orderId);
    expect(await prisma.auditOrder.findUnique({ where: { id: orderId } })).toMatchObject({ refundError: null, refundId: `re_${orderId}` });
  });

  it.each(['harness', 'report', 'spawn'])('refunds a %s failure', async (failure) => {
    await prisma.auditOrder.update({ where: { id: orderId }, data: { configJson: JSON.stringify({ tools: [{ name: 'send_email' }] }) } });
    let calls = 0;
    mocks.spawn.mockImplementation(() => {
      const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() });
      const code = failure === 'report' && calls++ === 0 ? 0 : 1;
      queueMicrotask(() => failure === 'spawn' ? child.emit('error', new Error('ENOENT')) : child.emit('exit', code));
      return child;
    });
    await AuditFulfillmentService.fulfil(orderId);
    expect(await prisma.auditOrder.findUnique({ where: { id: orderId } })).toMatchObject({ status: 'failed', refundId: `re_${orderId}` });
    expect(mocks.refund).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('CHF 90.00 was issued') }));
  });

  it('records malformed stored configuration as a failed, refunded order', async () => {
    await prisma.auditOrder.update({ where: { id: orderId }, data: { configJson: 'invalid' } });
    await AuditFulfillmentService.fulfil(orderId);
    expect(await prisma.auditOrder.findUnique({ where: { id: orderId } })).toMatchObject({ status: 'failed', refundId: `re_${orderId}` });
  });
});
