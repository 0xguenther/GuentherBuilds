import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/db/client.js';
import { skillService } from '../src/services/skillService.js';
import { SkillFulfillmentService } from '../src/services/skillFulfillmentService.js';
import { buildApp } from '../src/server/app.js';
import type { FastifyInstance } from 'fastify';

describe('Claw Mart: AI Skills & MCP Marketplace Test Suite', () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildApp();
    await app.ready();
    await skillService.seedDefaultSkills();
  });

  after(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('1. should seed and list default official skills', async () => {
    const skills = await skillService.listSkills();
    assert.ok(skills.length >= 3, 'Should have at least 3 seeded skills');

    const burner = skills.find(s => s.slug === 'eliza-token-burner');
    assert.ok(burner, 'Eliza Token Burner must exist');
    assert.equal(burner?.priceCents, 2900);
    assert.equal(burner?.isOfficial, true);
    assert.equal(burner?.takeRatePercent, 100);
  });

  it('2. should retrieve skill details by slug', async () => {
    const skill = await skillService.getSkillBySlug('fastify-stripe-mcp');
    assert.ok(skill, 'Fastify Stripe MCP must be found');
    assert.equal(skill?.category, 'mcp');
    assert.equal(skill?.priceCents, 3900);
  });

  it('3. should register a community creator skill with 10% platform take-rate', async () => {
    const testSlug = `community-agent-${Date.now()}`;
    const newSkill = await skillService.registerSkill({
      title: 'Community Web Search Agent',
      slug: testSlug,
      description: 'Community contributed web search agent.',
      category: 'workflow',
      priceCents: 1000, // $10.00
      takeRatePercent: 10, // 10% take-rate = $1.00 burn, $9.00 creator
      isOfficial: false,
      assetPath: 'skills/eliza-token-burner.zip', // reuse existing test archive
      version: '1.0.0',
    });

    assert.ok(newSkill.id);
    assert.equal(newSkill.takeRatePercent, 10);
    assert.equal(newSkill.isOfficial, false);
  });

  it('4. should process a skill purchase and calculate take-rate burns accurately', async () => {
    const burner = await skillService.getSkillBySlug('eliza-token-burner');
    assert.ok(burner);

    const testPaymentId = `pi_skill_test_${Date.now()}`;
    const result = await SkillFulfillmentService.processSkillPurchase({
      skillId: burner.id,
      stripePaymentId: testPaymentId,
      amountCents: burner.priceCents,
      buyerEmail: 'buyer@example.com',
    });

    assert.ok(result.downloadUrl.startsWith('/download/skill/'));
    assert.equal(result.purchase.amountCents, 2900);
    assert.equal(result.purchase.burnAmountCents, 2900); // 100% official
    assert.equal(result.purchase.creatorPayoutCents, 0);

    // Idempotency check: duplicate call must return existing purchase
    const dupResult = await SkillFulfillmentService.processSkillPurchase({
      skillId: burner.id,
      stripePaymentId: testPaymentId,
      amountCents: burner.priceCents,
    });
    assert.equal(dupResult.isExisting, true);
    assert.equal(dupResult.purchase.id, result.purchase.id);
  });

  it('5. should enforce cryptographic token validity, streaming, and max 5 downloads limit', async () => {
    const skill = await skillService.getSkillBySlug('eliza-token-burner');
    assert.ok(skill);

    const paymentId = `pi_limit_test_${Date.now()}`;
    const { purchase } = await SkillFulfillmentService.processSkillPurchase({
      skillId: skill.id,
      stripePaymentId: paymentId,
      amountCents: skill.priceCents,
    });

    const token = purchase.downloadToken;

    // Verify 5 successful downloads
    for (let i = 1; i <= 5; i++) {
      const check = await SkillFulfillmentService.verifyAndConsumeSkillToken(token);
      assert.equal(check.valid, true, `Download ${i} must succeed`);
      assert.equal(check.downloadCount, i);
      assert.ok(check.filePath);
    }

    // 6th attempt must be rejected with LIMIT_EXCEEDED
    const blockedCheck = await SkillFulfillmentService.verifyAndConsumeSkillToken(token);
    assert.equal(blockedCheck.valid, false);
    assert.equal(blockedCheck.reason, 'LIMIT_EXCEEDED');
  });

  it('6. Fastify API: GET /api/skills should return active catalog', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/skills',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(Array.isArray(body.skills));
    assert.ok(body.count >= 3);
  });

  it('7. Fastify API: GET /api/skills/stats should return marketplace economics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/skills/stats',
    });

    assert.equal(res.statusCode, 200);
    const stats = JSON.parse(res.payload);
    assert.ok(stats.totalSkills >= 3);
    assert.ok(stats.totalPurchases >= 2);
    assert.ok(typeof stats.totalVolumeUsd === 'number');
    assert.ok(typeof stats.totalBurnedUsd === 'number');
  });

  it('8. Fastify API: GET /download/skill/:token should stream file with correct headers', async () => {
    const skill = await skillService.getSkillBySlug('fastify-stripe-mcp');
    assert.ok(skill);

    const testPaymentId = `pi_stream_test_${Date.now()}`;
    const { purchase } = await SkillFulfillmentService.processSkillPurchase({
      skillId: skill.id,
      stripePaymentId: testPaymentId,
      amountCents: skill.priceCents,
    });

    const res = await app.inject({
      method: 'GET',
      url: `/download/skill/${purchase.downloadToken}`,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'application/zip');
    assert.ok(res.headers['content-disposition']?.includes('fastify-stripe-mcp.zip'));
    assert.ok(res.rawPayload.length > 0);
  });
});
