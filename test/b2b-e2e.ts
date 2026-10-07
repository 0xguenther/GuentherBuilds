import './e2eGuard.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/db/client.js';
import { buildApp } from '../src/server/app.js';
import { B2bService } from '../src/services/b2bService.js';
import { config } from '../src/config/index.js';
import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';

describe('Clawcommerce: High-Ticket B2B Funnel Test Suite ($2,000 Setup + $500/Mo)', () => {
  let app: FastifyInstance;

  before(async () => {
    process.env.NODE_ENV = 'test';
    config.server.env = 'test';
    app = await buildApp();
    await app.ready();
  });

  after(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  let createdLeadId: string;
  const testCompany = `Helvetic Logistics ${Date.now()}`;

  it('1. should reject invalid intake inquiries with 400 Bad Request', async () => {
    const invalidRes = await app.inject({
      method: 'POST',
      url: '/api/b2b/intake',
      payload: {
        companyName: 'A', // too short (< 2)
        contactEmail: 'not-an-email',
      },
    });

    assert.equal(invalidRes.statusCode, 400);
    const body = JSON.parse(invalidRes.payload);
    assert.equal(body.error, 'Validierungsfehler');
    assert.ok(body.details.length >= 2);
  });

  it('2. should submit valid B2B lead and automatically generate architecture proposal', async () => {
    const validRes = await app.inject({
      method: 'POST',
      url: '/api/b2b/intake',
      payload: {
        companyName: testCompany,
        contactName: 'Marc Steiner',
        contactEmail: 'marc.steiner@helvetic-logistics.ch',
        useCase: 'Autonomer Dispositions-Agent mit ERP-Anbindung und Telegram-Alerts',
        monthlyVolume: '5,000 - 15,000 Sendungen/Mo',
        integrations: ['SAP ERP', 'Telegram', 'Stripe Invoicing'],
      },
    });

    assert.equal(validRes.statusCode, 201);
    const body = JSON.parse(validRes.payload);
    assert.ok(body.leadId, 'Lead ID must be generated');
    createdLeadId = body.leadId;
    assert.equal(body.status, 'qualified');
    assert.ok(body.proposalMarkdown.includes(testCompany));
    assert.ok(/2[.,]000/.test(body.proposalMarkdown), 'Proposal must contain 2,000 setup fee');
    assert.ok(/500/.test(body.proposalMarkdown), 'Proposal must contain 500 retainer fee');
    assert.ok(body.proposalMarkdown.includes('GÜNTER') || body.proposalMarkdown.includes('Günter'));
  });

  it('3. should generate a valid Stripe Checkout Session for $2,000 setup fee', async () => {
    assert.ok(createdLeadId, 'Lead ID must exist from test 2');

    const checkoutRes = await app.inject({
      method: 'POST',
      url: `/api/b2b/leads/${createdLeadId}/checkout`,
    });

    assert.equal(checkoutRes.statusCode, 200);
    const body = JSON.parse(checkoutRes.payload);
    assert.ok(body.checkoutUrl.startsWith('https://checkout.stripe.com/'));
    assert.ok(body.sessionId.startsWith('cs_'));

    // Check Contract created in SQLite
    const contract = await prisma.b2bContract.findUnique({
      where: { leadId: createdLeadId },
    });
    assert.ok(contract);
    assert.equal(contract?.setupFeeCents, 200000);
    assert.equal(contract?.retainerMonthlyCents, 50000);
    assert.equal(contract?.setupPaid, false);
  });

  it('4. should process B2B Webhook payment, mark contract setup paid, and execute $2,000 burn', async () => {
    assert.ok(createdLeadId, 'Lead ID must exist from test 2');

    const testPaymentId = `pi_b2b_test_${Date.now()}`;
    const payloadObj = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_${Date.now()}`,
          payment_intent: testPaymentId,
          payment_status: 'paid',
          amount_total: 200000, // $2,000.00 USD
          currency: 'usd',
          customer_details: { email: 'marc.steiner@helvetic-logistics.ch' },
          metadata: {
            type: 'b2b_setup',
            leadId: createdLeadId,
          },
        },
      },
    };

    const payloadStr = JSON.stringify(payloadObj);
    const ts = Math.floor(Date.now() / 1000);
    const hmac = crypto.createHmac('sha256', config.stripe.webhookSecret).update(`${ts}.${payloadStr}`).digest('hex');
    const signature = `t=${ts},v1=${hmac}`;

    const webhookRes = await app.inject({
      method: 'POST',
      url: '/webhooks/stripe',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': signature,
      },
      payload: payloadStr,
    });

    assert.equal(webhookRes.statusCode, 200);
    const webhookBody = JSON.parse(webhookRes.body);
    assert.equal(webhookBody.status, 'contracted');
    assert.equal(webhookBody.type, 'b2b_setup');

    // Allow async burn worker to execute
    await new Promise((r) => setTimeout(r, 600));

    // Verify DB State
    const updatedContract = await prisma.b2bContract.findUnique({
      where: { leadId: createdLeadId },
    });
    assert.equal(updatedContract?.setupPaid, true);
    assert.equal(updatedContract?.subscriptionStatus, 'active');
    assert.equal(updatedContract?.totalBurnedCents, 200000);

    const updatedLead = await prisma.b2bLead.findUnique({
      where: { id: createdLeadId },
    });
    assert.equal(updatedLead?.status, 'contracted');
  });

  it('5. should list all B2B leads via GET /api/b2b/leads', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/b2b/leads',
    });

    assert.equal(listRes.statusCode, 200);
    const body = JSON.parse(listRes.payload);
    assert.ok(Array.isArray(body.leads));
    assert.ok(body.count >= 1);
  });
});
