import Fastify from 'fastify';
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

  // Serve static landing page and public assets only
  await app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), 'public'),
    prefix: '/',
  });

  // Alias for /products -> products.html
  app.get('/products', async (_req, reply) => {
    return reply.sendFile('products.html');
  });

  // Alias for /preview -> preview.html
  app.get('/preview', async (_req, reply) => {
    return reply.sendFile('preview.html');
  });

  // Alias for /api-docs -> api-docs.html
  app.get('/api-docs', async (_req, reply) => {
    return reply.sendFile('api-docs.html');
  });

  // Alias for /en and /en/products, /en/preview, /en/api-docs
  app.get('/en', async (_req, reply) => {
    return reply.sendFile('en/index.html');
  });
  app.get('/en/products', async (_req, reply) => {
    return reply.sendFile('en/products.html');
  });
  app.get('/en/preview', async (_req, reply) => {
    return reply.sendFile('en/preview.html');
  });
  app.get('/en/api-docs', async (_req, reply) => {
    return reply.sendFile('en/api-docs.html');
  });

  // NOTE: Digital products in products/ are NEVER served statically.
  // Delivery occurs strictly through authenticated /download/:token endpoint.

  // Admin auth hook — protects write endpoints from unauthorized access
  const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN;
  const adminProtectedPrefixes = ['/api/reddit', '/api/growth', '/api/marketing'];

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
  await app.register(playbookRoutes);
  await app.register(blogRoutes);

  return app;
}
