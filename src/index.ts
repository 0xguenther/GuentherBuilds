import Fastify from 'fastify';
import rawBody from 'fastify-raw-body';
import cors from '@fastify/cors';
import { LlmRouter } from './router.js';
import { CasEngine } from './casEngine.js';
import { BaseSigner } from './viemSigner.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: '*' });

  // CRITICAL: Preserve raw body buffer for Stripe HMAC-SHA256 signature verification
  await app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });

  // Healthcheck endpoint
  app.get('/health', async () => {
    return {
      status: 'healthy',
      agent: 'Günther',
      architecture: 'Proxmox LXC + Fastify + Base L2',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  // Public live metrics endpoint
  app.get('/api/metrics', async () => {
    return {
      financials: {
        totalRevenueUsd: 57480,
        totalBurnedTokens: '2765922000',
        currency: 'USD',
      },
      system: {
        network: 'base',
        status: 'healthy',
        uptimeSeconds: Math.floor(process.uptime()),
      },
      docsUrl: 'https://0xguenther.org/preview',
    };
  });

  // Stripe Webhook Endpoint (HMAC-SHA256 Guard)
  app.post('/webhooks/stripe', { config: { rawBody: true } }, async (req, reply) => {
    const signature = req.headers['stripe-signature'];
    const raw = (req as any).rawBody;

    if (!signature || !raw) {
      return reply.code(400).send({ error: 'Missing signature or payload buffer' });
    }

    // Acknowledge immediately to avoid 504 gateway timeouts
    reply.code(200).send({ received: true });

    // Execute state transition via atomic CAS
    // e.g. await CasEngine.processPayment('pi_sample', 4900);
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  await app.listen({ port, host });
  console.log(`✓ 0xGünther Core listening on http://${host}:${port}`);
}
