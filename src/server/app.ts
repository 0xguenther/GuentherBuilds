import Fastify from 'fastify';
import rawBody from 'fastify-raw-body';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { webhookRoutes } from './routes/webhookRoutes.js';

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

  // Serve static landing page and assets from public/
  await app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), 'public'),
    prefix: '/',
  });

  // Serve digital products directly under /products/
  await app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), 'products'),
    prefix: '/products/',
    decorateReply: false,
  });

  await app.register(webhookRoutes);

  return app;
}
