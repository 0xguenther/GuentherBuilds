import Fastify from 'fastify';
import { recordAuditLandingVisit } from '../services/reachService.js';
import { reachRoutes } from './routes/reachRoutes.js';
import { recordPageView } from '../services/pageViewService.js';
import rawBody from 'fastify-raw-body';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { timingSafeEqual } from 'crypto';
import { webhookRoutes } from './routes/webhookRoutes.js';
import { skillRoutes } from './routes/skillRoutes.js';
import { b2bRoutes } from './routes/b2bRoutes.js';
import { metricsRoutes } from './routes/metricsRoutes.js';
import { redditRoutes } from './routes/redditRoutes.js';
import { growthRoutes } from './routes/growthRoutes.js';
import { auditRoutes } from './routes/auditRoutes.js';
import { playbookRoutes } from './routes/playbookRoute.js';
import { blogRoutes } from './routes/blogRoutes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
    },
    trustProxy: true, // Cloudflare Tunnel — X-Forwarded-For vom echten Client
  });

  await app.register(cors, {
    origin: [
      'https://0xguenther.org',
      'https://www.0xguenther.org',
      'https://api.0xguenther.org',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
  });

  await app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });

  // Accept empty JSON bodies (e.g. POST /api/checkout/playbook with no payload)
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      const str = typeof body === 'string' ? body : body.toString();
      done(null, str.length ? JSON.parse(str) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  app.addHook('onResponse', (request, reply, done) => {
    void recordPageView(request, reply).catch(() => request.log.warn('Page-view counting failed'));
    done();
  });

  app.addHook('onRequest', async request => {
    try { await recordAuditLandingVisit(request); }
    catch { request.log.warn('Audit landing visit recording failed'); }
  });

  // Serve static landing page and public assets only
  await app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), 'public'),
    prefix: '/',
  });

  // Static route aliases
  app.get('/audit', async (_req, reply) => reply.sendFile('audit/index.html'));
  app.get('/en/audit', async (_req, reply) => reply.sendFile('en/audit/index.html'));
  app.get('/agent-check', async (_req, reply) => reply.sendFile('agent-check.html'));
  app.get('/en/agent-check', async (_req, reply) => reply.sendFile('en/agent-check.html'));
  app.get('/playbook', async (_req, reply) => reply.sendFile('playbook.html'));
  app.get('/en/playbook', async (_req, reply) => reply.sendFile('en/playbook.html'));
  app.get('/module', async (_req, reply) => reply.sendFile('module.html'));
  app.get('/modules', async (_req, reply) => reply.sendFile('module.html'));
  app.get('/en/module', async (_req, reply) => reply.sendFile('en/module.html'));
  app.get('/en/modules', async (_req, reply) => reply.sendFile('en/module.html'));
  app.get('/verzeichnis', async (_req, reply) => reply.sendFile('verzeichnis.html'));
  app.get('/en/verzeichnis', async (_req, reply) => reply.sendFile('en/verzeichnis.html'));
  app.get('/api', async (_req, reply) => reply.sendFile('api.html'));
  app.get('/en/api', async (_req, reply) => reply.sendFile('en/api.html'));
  app.get('/api-docs', async (_req, reply) => reply.sendFile('api.html'));
  app.get('/en/api-docs', async (_req, reply) => reply.sendFile('en/api.html'));
  app.get('/products', async (_req, reply) => reply.sendFile('module.html'));
  app.get('/en/products', async (_req, reply) => reply.sendFile('en/module.html'));
  app.get('/preview', async (_req, reply) => reply.sendFile('playbook.html'));
  app.get('/en/preview', async (_req, reply) => reply.sendFile('en/playbook.html'));
  app.get('/impressum', async (_req, reply) => reply.sendFile('impressum.html'));
  app.get('/en/impressum', async (_req, reply) => reply.sendFile('en/impressum.html'));
  app.get('/datenschutz', async (_req, reply) => reply.sendFile('datenschutz.html'));
  app.get('/en/datenschutz', async (_req, reply) => reply.sendFile('en/datenschutz.html'));
  app.get('/agb', async (_req, reply) => reply.sendFile('agb.html'));
  app.get('/en/agb', async (_req, reply) => reply.sendFile('en/agb.html'));
  app.get('/en/terms', async (_req, reply) => reply.sendFile('en/agb.html'));

  // Alias for /en
  app.get('/en', async (_req, reply) => reply.sendFile('en/index.html'));

  // Stripe success URL for audit orders: /audit/thanks?order=...
  app.get('/audit/thanks', async (_req, reply) => reply.sendFile('audit/thanks.html'));
  app.get('/en/audit/thanks', async (_req, reply) => reply.sendFile('en/audit/thanks.html'));

  // NOTE: Digital products in products/ are NEVER served statically.
  // Delivery occurs strictly through authenticated /download/:token endpoint.

  // Admin auth hook — protects write endpoints from unauthorized access
  const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN;
  const adminProtectedPrefixes = ['/api/reddit', '/api/growth', '/api/marketing', '/api/metrics/funnel', '/api/reach'];

  app.addHook('onRequest', async (request, reply) => {
    const url = request.url;
    const needsAuth = adminProtectedPrefixes.some(p => url.startsWith(p));
    if (!needsAuth) return;

    if (!ADMIN_TOKEN) {
      request.log.warn('ADMIN_API_TOKEN not set — blocking admin endpoint');
      return reply.code(503).send({ error: 'Admin API not configured' });
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing authorization' });
    }

    const token = authHeader.slice(7);
    const valid = Buffer.byteLength(token) === Buffer.byteLength(ADMIN_TOKEN)
      && timingSafeEqual(Buffer.from(token), Buffer.from(ADMIN_TOKEN));

    if (!valid) {
      return reply.code(403).send({ error: 'Invalid token' });
    }
  });

  await app.register(webhookRoutes);
  await app.register(skillRoutes);
  await app.register(b2bRoutes);
  await app.register(metricsRoutes);
  await app.register(redditRoutes);
  await app.register(growthRoutes);
  await app.register(auditRoutes);
  await app.register(reachRoutes);
  await app.register(playbookRoutes);
  await app.register(blogRoutes);

  return app;
}
