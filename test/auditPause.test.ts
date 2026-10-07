import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app.js';

describe('audit order pause', () => {
  const prev = process.env.AUDIT_ORDERS_ENABLED;
  afterEach(() => {
    if (prev === undefined) delete process.env.AUDIT_ORDERS_ENABLED;
    else process.env.AUDIT_ORDERS_ENABLED = prev;
  });

  it('rejects orders with 503 while paused (default)', async () => {
    delete process.env.AUDIT_ORDERS_ENABLED;
    const app = await buildApp();
    try {
      expect((await app.inject({ url: '/api/audit/availability' })).json()).toEqual({ paused: true });
      const res = await app.inject({ method: 'POST', url: '/api/audit/orders', payload: { tier: 'quick', tools: [] } });
      expect(res.statusCode).toBe(503);
      expect(res.json()).toMatchObject({ paused: true });
    } finally {
      await app.close();
    }
  });

  it('accepts validation again when AUDIT_ORDERS_ENABLED=1', async () => {
    process.env.AUDIT_ORDERS_ENABLED = '1';
    const app = await buildApp();
    try {
      expect((await app.inject({ url: '/api/audit/availability' })).json()).toEqual({ paused: false });
      const res = await app.inject({ method: 'POST', url: '/api/audit/orders', payload: { tier: 'nope' } });
      expect(res.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});
