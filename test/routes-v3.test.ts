import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/server/app.js';

describe('v3 design and audit routing verification', () => {
  it('serves all v3 pages and alias routes with 200 OK', async () => {
    const app = await buildApp();
    try {
      const urls = [
        '/',
        '/en',
        '/en/',
        '/audit/',
        '/en/audit/',
        '/audit',
        '/en/audit',
        '/agent-check',
        '/agent-check.html',
        '/en/agent-check',
        '/en/agent-check.html',
        '/playbook',
        '/en/playbook',
        '/module',
        '/modules',
        '/en/module',
        '/en/modules',
        '/verzeichnis',
        '/en/verzeichnis',
        '/api',
        '/en/api',
        '/api-docs',
        '/en/api-docs',
        '/impressum',
        '/en/impressum',
        '/datenschutz',
        '/en/datenschutz',
        '/agb',
        '/en/agb',
        '/en/terms',
        '/audit/thanks?order=test_id',
        '/en/audit/thanks?order=test_id',
      ];

      for (const url of urls) {
        const res = await app.inject({ method: 'GET', url });
        expect(res.statusCode, `Failed on URL: ${url}`).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
      }
    } finally {
      await app.close();
    }
  });

  it('serves assets and models API correctly', async () => {
    const app = await buildApp();
    try {
      const avail = await app.inject({ method: 'GET', url: '/api/audit/availability' });
      expect(avail.statusCode).toBe(200);
      expect(avail.json()).toHaveProperty('paused');

      const models = await app.inject({ method: 'GET', url: '/api/audit/models' });
      expect(models.statusCode).toBe(200);
      expect(Array.isArray(models.json())).toBe(true);

      const css = await app.inject({ method: 'GET', url: '/css/agent-check.css' });
      expect(css.statusCode).toBe(200);

      const tokens = await app.inject({ method: 'GET', url: '/_shared/tokens.css' });
      expect(tokens.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});
