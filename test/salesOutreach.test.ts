import { it, expect, beforeAll } from 'vitest';
import { prisma } from '../src/db/client.js';
import {
  scoreSignal,
  BUY_SIGNAL_PATTERNS,
  B2B_SIGNAL_PATTERNS,
  SalesOutreachService,
  type SalesSignalInput,
} from '../src/services/salesOutreachService.js';

beforeAll(async () => {
  process.env.DATABASE_URL = 'file:./test.db';
  process.env.NODE_ENV = 'test';
  await prisma.$executeRawUnsafe('DELETE FROM SalesSignal');
});

it('scores commercial pain higher than smalltalk', () => {
  const pain: SalesSignalInput = {
    source: 'reddit',
    sourceId: 't3_pain',
    text: 'Our production agent duplicated invoices after a tool call timeout. We need an audit before we ship. Budget is approved.',
  };
  const noise: SalesSignalInput = {
    source: 'reddit',
    sourceId: 't3_noise',
    text: 'What model do you use for simple chatbots?',
  };

  const scoredPain = scoreSignal(pain);
  const scoredNoise = scoreSignal(noise);

  expect(scoredPain.score).toBeGreaterThanOrEqual(60);
  expect(scoredPain.reason).toContain('buy-pain');
  expect(scoredNoise.score).toBeLessThan(40);
});

it('gives abandoned checkouts a hot score', () => {
  const scored = scoreSignal({
    source: 'abandoned_checkout',
    sourceId: 'checkout-1',
    author: 'buyer@example.com',
    text: 'Audit checkout abandoned: tier=quick',
  });
  expect(scored.score).toBeGreaterThanOrEqual(80);
  expect(scored.reason).toContain('checkout-abandoned');
});

it('matches buy and B2B patterns on realistic copy', () => {
  expect(BUY_SIGNAL_PATTERNS.test('retry caused a duplicate charge on Stripe')).toBe(true);
  expect(B2B_SIGNAL_PATTERNS.test('enterprise on-prem setup with SLA and retainer')).toBe(true);
  expect(BUY_SIGNAL_PATTERNS.test('nice weather today')).toBe(false);
});

it('stores signals once and reports pipeline status', async () => {
  // Reset rate-limit state from a possible earlier call in this file.
  (SalesOutreachService as unknown as { nextCycleAt: number }).nextCycleAt = 0;
  (SalesOutreachService as unknown as { busy: boolean }).busy = false;

  const signals: SalesSignalInput[] = [
    {
      source: 'reddit',
      sourceId: `t3_test_${Date.now()}`,
      author: 'dev',
      text: 'Our production agent duplicated invoices after a tool timeout. We need an audit.',
      metadata: { subreddit: 'AI_Agents' },
    },
  ];

  const fresh = await SalesOutreachService.storeSignals(signals);
  expect(fresh.length).toBe(1);
  expect(fresh[0].score).toBeGreaterThanOrEqual(60);

  // Second store is a no-op (dedupe by sourceId).
  const again = await SalesOutreachService.storeSignals(signals);
  expect(again.length).toBe(0);

  const status = await SalesOutreachService.getPipelineStatus();
  expect(status.bySource.reddit).toBeGreaterThanOrEqual(1);
  expect(Array.isArray(status.recent)).toBe(true);
});

it('runs an outreach cycle without throwing', async () => {
  (SalesOutreachService as unknown as { nextCycleAt: number }).nextCycleAt = 0;
  (SalesOutreachService as unknown as { busy: boolean }).busy = false;

  const result = await SalesOutreachService.runOutreachCycle();
  expect(result).toHaveProperty('collected');
  expect(result).toHaveProperty('acted');
  expect(Array.isArray(result.details)).toBe(true);
});
