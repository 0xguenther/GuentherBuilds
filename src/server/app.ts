import Fastify from 'fastify';
import rawBody from 'fastify-raw-body';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { webhookRoutes } from './routes/webhookRoutes.js';
import { skillRoutes } from './routes/skillRoutes.js';
import { b2bRoutes } from './routes/b2bRoutes.js';
import { metricsRoutes } from './routes/metricsRoutes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
    },
  });

  await app.register(cors, {
    origin: '*',
  });

  await app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
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

  // Alias for /en and /en/products
  app.get('/en', async (_req, reply) => {
    return reply.sendFile('en/index.html');
  });
  app.get('/en/products', async (_req, reply) => {
    return reply.sendFile('en/products.html');
  });

  // NOTE: Digital products in products/ are NEVER served statically.
  // Delivery occurs strictly through authenticated /download/:token endpoint.

  await app.register(webhookRoutes);
  await app.register(skillRoutes);
  await app.register(b2bRoutes);
  await app.register(metricsRoutes);

  return app;
}
