import { E2E_ADMIN_AUTH } from './e2eGuard.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { buildApp } from '../src/server/app.js';
import { guntherDaemon } from '../src/cron/daemon.js';

test('Günther Metrics, Observability & Autonomous Daily Pulse Test Suite', async (t) => {
  process.env.NODE_ENV = 'test';
  const { config } = await import('../src/config/index.js');
  config.server.env = 'test';
  const app = await buildApp();

  await t.test('1. GET /api/metrics should return comprehensive live business data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/metrics',
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);

    assert.ok(body.financials, 'Financials section missing');
    assert.strictEqual(typeof body.financials.totalRevenueUsd, 'number');
    assert.strictEqual(typeof body.financials.totalBurnedTokens, 'string');
    assert.strictEqual(body.financials.currency, 'USD');

    assert.ok(body.products, 'Products section missing');
    assert.ok(body.products.playbook, 'Playbook stats missing');
    assert.ok(body.products.clawMart, 'Claw Mart stats missing');
    assert.ok(body.products.clawcommerceB2b, 'B2B stats missing');

    assert.ok(body.aiObservability, 'AI Observability section missing');
    assert.strictEqual(typeof body.aiObservability.totalLlmCalls, 'number');
    const margin = body.aiObservability.netProfitMarginPercent;
    assert.ok(margin === null || typeof margin === 'number');

    assert.ok(body.system, 'System metrics missing');
    assert.strictEqual(body.system.status, 'healthy');
  });

  await t.test('2. GET /api/metrics/burns should return Base L2 burn events feed', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/metrics/burns',
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body.burns), 'Burns should be an array');
    assert.strictEqual(typeof body.burnCount, 'number');
  });

  await t.test('3. POST /api/marketing/pulse should generate and return daily market pulse', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/marketing/pulse',
      headers: {
        ...E2E_ADMIN_AUTH,
        'content-type': 'application/json',
      },
      payload: {},
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.date, 'Pulse date missing');
    assert.ok(body.text, 'Pulse text missing');
    assert.ok(body.tweetId, 'Pulse tweetId missing');
    assert.ok(body.text.length > 10, 'Pulse text should be substantial');
  });

  await t.test('4. GuntherDaemon checkDailyPulse should run idempotently', async () => {
    // Calling it should complete without throwing
    await guntherDaemon.checkDailyPulse();
    // Second call should detect today is already handled
    await guntherDaemon.checkDailyPulse();
  });
});
