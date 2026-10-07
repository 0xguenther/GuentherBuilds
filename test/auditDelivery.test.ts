import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { prisma } from '../src/db/client.js';
import { buildApp } from '../src/server/app.js';
import { buildReportReadyEmail } from '../src/services/emailService.js';

describe('audit delivery', () => {
  const ids: string[] = [];
  afterEach(async () => {
    await prisma.auditOrder.deleteMany({ where: { id: { in: ids.splice(0) } } });
  });

  async function delivered(overrides: Partial<{ downloadExpiresAt: Date; status: string }> = {}) {
    const id = randomUUID();
    ids.push(id);
    await prisma.auditOrder.create({ data: {
      id, tier: 'quick', status: overrides.status ?? 'delivered', configJson: '{}',
      stripeSessionId: `cs_test_${id}`, downloadToken: `tok_${id}`,
      downloadExpiresAt: overrides.downloadExpiresAt ?? new Date(Date.now() + 3_600_000),
    } });
    return id;
  }

  it('serves the thanks page for the Stripe success URL (DE and EN)', async () => {
    const app = await buildApp();
    try {
      for (const url of ['/audit/thanks?order=x&session_id=cs_x', '/en/audit/thanks?order=x']) {
        const res = await app.inject({ url });
        expect(res.statusCode, url).toBe(200);
        expect(res.body).toContain('id="download"');
      }
    } finally { await app.close(); }
  });

  it('returns the download URL only with the matching checkout session', async () => {
    const id = await delivered();
    const app = await buildApp();
    try {
      const ok = (await app.inject({ url: `/api/audit/orders/${id}?session_id=cs_test_${id}` })).json();
      expect(ok.downloadUrl).toBe(`/api/audit/download/tok_${id}`);
      for (const q of ['', '?session_id=cs_test_wrong']) {
        const res = (await app.inject({ url: `/api/audit/orders/${id}${q}` })).json();
        expect(res.status).toBe('delivered');
        expect(res.downloadUrl, q).toBeUndefined();
      }
    } finally { await app.close(); }
  });

  it('hides the download URL when the link expired or the order is not delivered', async () => {
    const expired = await delivered({ downloadExpiresAt: new Date(Date.now() - 1000) });
    const running = await delivered({ status: 'running' });
    const app = await buildApp();
    try {
      for (const id of [expired, running]) {
        const res = (await app.inject({ url: `/api/audit/orders/${id}?session_id=cs_test_${id}` })).json();
        expect(res.downloadUrl).toBeUndefined();
      }
    } finally { await app.close(); }
  });

  it('links the email straight to the token download', () => {
    const mail = buildReportReadyEmail('order-1', 'Quick-Check', 'abc123');
    expect(mail.html).toContain('https://0xguenther.org/api/audit/download/abc123');
    expect(mail.html).not.toContain('/audit/thanks');
  });
});
