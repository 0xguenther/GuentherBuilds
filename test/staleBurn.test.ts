import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { prisma } from '../src/db/client.js';
import { GuntherDaemon } from '../src/cron/daemon.js';
import { BurnService } from '../src/services/burnService.js';

// Regression: a payment claimed as 'burning' whose process died before broadcast had no txHash
// and was retried (and skipped) every daemon tick forever.
describe('stale burns without txHash', () => {
  const prefix = `stale-${randomUUID()}`;
  const old = new Date(Date.now() - 2 * GuntherDaemon.STALE_BURN_MS);

  async function seed(suffix: string, data: { updatedAt?: Date; txHash?: string }) {
    const stripePaymentId = `${prefix}-${suffix}`;
    await prisma.payment.create({ data: { stripePaymentId, amountCents: 3900, status: 'burning', txHash: data.txHash } });
    if (data.updatedAt) {
      await prisma.$executeRaw`UPDATE Payment SET updatedAt = ${data.updatedAt} WHERE stripePaymentId = ${stripePaymentId}`;
    }
    return stripePaymentId;
  }

  afterEach(async () => {
    vi.restoreAllMocks();
    await prisma.payment.deleteMany({ where: { stripePaymentId: { startsWith: prefix } } });
    await prisma.trace.deleteMany({ where: { taskId: { startsWith: `burn-${prefix}` } } });
  });

  it('flags only stale hashless burns for review and never re-burns them', async () => {
    const stale = await seed('stale', { updatedAt: old });
    const fresh = await seed('fresh', {});
    const broadcast = await seed('hash', { updatedAt: old, txHash: `0x${randomUUID().replace(/-/g, '')}` });
    const burn = vi.spyOn(BurnService, 'executeBurn').mockResolvedValue({ pending: true });

    await new GuntherDaemon().reconcilePendingPayments();

    const byId = async (id: string) => (await prisma.payment.findUnique({ where: { stripePaymentId: id } }))?.status;
    expect(await byId(stale)).toBe('needs_review');
    expect(await byId(fresh)).toBe('burning');
    expect(await byId(broadcast)).toBe('burning');
    expect(burn.mock.calls.map(([id]) => id)).not.toContain(stale);
    expect(await prisma.trace.count({ where: { taskId: `burn-${stale}`, task: 'BURN_NEEDS_REVIEW' } })).toBe(1);
  });
});
