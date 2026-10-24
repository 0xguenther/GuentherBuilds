import { it, expect } from 'vitest';
import {
  classifyNeed,
  MarketDemandService,
} from '../src/services/marketDemandService.js';
import { orderedProducts, PRODUCTS } from '../src/services/productCatalog.js';
import { fetchHnLines, sanitizeQueries } from '../src/services/marketResearchService.js';

it('classifies write-path pain as write_reliability', () => {
  const r = classifyNeed('Our agent duplicated invoices after a tool call timeout in production. We must fix this.');
  expect(r.category).toBe('write_reliability');
  expect(r.intensity).toBeGreaterThanOrEqual(2);
});

it('classifies enterprise and cost chatter', () => {
  expect(classifyNeed('Enterprise on-prem deployment with SLA and retainer for our team').category).toBe('enterprise_ops');
  expect(classifyNeed('Token cost is killing our unit economics on every LLM call').category).toBe('agent_cost');
  expect(classifyNeed('hello world').category).toBe('other');
});

it('buckets signals and flags uncovered needs as gaps', () => {
  const buckets = MarketDemandService.buildBuckets([
    'duplicate write after timeout in production',
    'duplicate invoice retry again',
    'langfuse tracing for agent tool calls debug latency',
    'observability audit trail for tool failures',
  ]);

  const reliability = buckets.find((b) => b.category === 'write_reliability');
  const observability = buckets.find((b) => b.category === 'observability');

  expect(reliability?.count).toBe(2);
  expect(observability?.count).toBe(2);
  // Observability is now covered by agent-trace-pack.
  expect(observability?.gap).toBe(false);
  expect(observability?.productFit).toContain('agent-trace-pack');
  expect(reliability?.gap).toBe(false);
  expect(reliability?.productFit).toContain('audit');
});

it('ranks products by market demand preference', () => {
  const ranked = orderedProducts(['enterprise', 'audit']);
  expect(ranked[0].id).toBe('enterprise');
  expect(ranked[1].id).toBe('audit');
  expect(ranked).toHaveLength(PRODUCTS.length);

  const fallback = orderedProducts([]);
  expect(fallback.map((p) => p.id)).toEqual(PRODUCTS.map((p) => p.id));
});

it('runs a demand analysis without throwing', async () => {
  (MarketDemandService as unknown as { nextRunAt: number }).nextRunAt = 0;
  (MarketDemandService as unknown as { busy: boolean }).busy = false;

  const brief = await MarketDemandService.runDemandAnalysis(true);
  expect(brief).toHaveProperty('recommendedPush');
  expect(brief).toHaveProperty('buckets');
  expect(Array.isArray(brief.recommendedPush)).toBe(true);
  expect(brief.recommendedPush.length).toBeGreaterThan(0);
});

it('strips HTML from HN research lines and keeps only non-empty text', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ hits: [
      { title: 'Duplicate <em>invoice</em> after tool timeout', story_title: null, comment_text: null, story_text: null },
      { title: null, story_title: 'Parent story', comment_text: '<p>retry &amp; <i>idempotency</i> keys</p>' },
      { title: null, story_title: null, comment_text: '' },
    ] }), { status: 200 })) as typeof fetch;
  try {
    const lines = await fetchHnLines(['tool call duplicate'], 0);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => !/<[^>]+>/.test(l))).toBe(true);
    expect(lines).toContain('Duplicate invoice after tool timeout');
  } finally {
    globalThis.fetch = realFetch;
  }
});

it('keeps only short plain research queries and drops URLs or duplicates', () => {
  const out = sanitizeQueries([
    'agent idempotency',
    'Agent Idempotency',
    'see https://evil.example now',
    'x',
    42,
    'MCP tool server',
  ]);
  expect(out).toEqual(['agent idempotency', 'MCP tool server']);
});
