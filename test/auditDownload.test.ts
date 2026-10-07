import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from '../src/db/client.js';
import { auditRoutes } from '../src/server/routes/auditRoutes.js';

describe('audit downloads', () => {
  let id: string;
  let dir: string;
  let app: ReturnType<typeof Fastify>;
  const url = () => `/api/audit/download/${id}`;
  const count = async () => (await prisma.auditOrder.findUniqueOrThrow({ where: { id } })).downloadCount;
  beforeEach(async () => {
    id = randomUUID();
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-download-'));
    const reportPath = path.join(dir, 'report.html');
    await fs.writeFile(reportPath, '<html><body>Audit report</body></html>');
    await prisma.auditOrder.create({ data: { id, tier: 'quick', status: 'delivered', configJson: '{"lang":"en"}',
      downloadToken: id, reportPath, downloadExpiresAt: new Date(Date.now() + 3600000) } });
    app = Fastify();
  });
  afterEach(async () => {
    await app.close();
    await prisma.auditOrder.deleteMany({ where: { id } });
    await fs.rm(dir, { recursive: true, force: true });
  });
  it('counts successful GET requests but never HEAD requests', async () => {
    await app.register(auditRoutes);
    const head = await app.inject({ method: 'HEAD', url: url() });
    expect(head.statusCode).toBe(200);
    expect(head.body).toBe('');
    expect(await count()).toBe(0);
    const get = await app.inject({ url: url() });
    expect(get.statusCode).toBe(200);
    expect(get.body).toContain('Audit report');
    expect(await count()).toBe(1);
  });
  it('does not count a missing report file', async () => {
    await fs.unlink(path.join(dir, 'report.html'));
    await app.register(auditRoutes);
    expect((await app.inject({ url: url() })).statusCode).toBe(500);
    expect(await count()).toBe(0);
  });
  it('does not count non-200 responses selected by a response hook', async () => {
    app.addHook('onSend', async (_request, reply, payload) => { reply.code(503); return payload; });
    await app.register(auditRoutes);
    expect((await app.inject({ url: url() })).statusCode).toBe(503);
    expect(await count()).toBe(0);
  });
  it.each(['de', 'en'] as const)('renders invalid, expired and exhausted links as %s HTML', async lang => {
    await app.register(auditRoutes);
    for (const reason of ['invalid', 'expired', 'limit']) {
      await prisma.auditOrder.update({ where: { id }, data: {
        configJson: JSON.stringify({ lang }), status: reason === 'invalid' ? 'failed' : 'delivered',
        downloadExpiresAt: new Date(Date.now() + (reason === 'expired' ? -1000 : 3600000)),
        downloadCount: reason === 'limit' ? 5 : 0,
      } });
      const before = await count();
      const res = await app.inject({ url: url() });
      expect(res.statusCode).toBe(403);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.body).toContain(`<html lang="${lang}">`);
      expect(res.body).toContain(lang === 'en' ? 'Back to the audit' : 'Zurück zur Prüfung');
      expect(res.body).toContain('mailto:labs@0xguenther.org');
      expect(res.body).toContain('<style>');
      expect((await app.inject({ method: 'HEAD', url: url() })).statusCode).toBe(403);
      expect(await count()).toBe(before);
    }
  });
  it('uses bilingual HTML for unknown tokens without reflecting input', async () => {
    await app.register(auditRoutes);
    const res = await app.inject({ url: '/api/audit/download/unknown%3Cscript%3E' });
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('Ungültiger Download-Link');
    expect(res.body).toContain('Invalid download link');
    expect(res.body).not.toContain('<script>');
  });
  it('admits only one concurrent GET for the last download', async () => {
    await prisma.auditOrder.update({ where: { id }, data: { downloadCount: 4 } });
    await app.register(auditRoutes);
    const responses = await Promise.all(Array.from({ length: 3 }, () => app.inject({ url: url() })));
    expect(responses.map(res => res.statusCode).sort()).toEqual([200, 403, 403]);
    expect(await count()).toBe(5);
  });
});
