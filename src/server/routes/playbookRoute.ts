import { FastifyInstance } from 'fastify';
import { StripeMcpClient } from '../../mcp/stripeMcp.js';

export async function playbookRoutes(fastify: FastifyInstance) {
  fastify.post('/api/checkout/playbook', async (request, reply) => {
    try {
      const origin = `${request.protocol}://${request.hostname}`;
      const session = await StripeMcpClient.createCheckoutSession({
        title: 'Günther Craft Playbook',
        description: '66-page architecture playbook and production source code for autonomous profitable AI agents.',
        priceInCents: 4900,
        metadata: { type: 'playbook', product: 'gunther-craft' },
        successUrl: `${origin}/?success=true&product=playbook`,
        cancelUrl: `${origin}/?canceled=true`,
        currency: 'usd',
      });
      return reply.send({ checkoutUrl: session.sessionUrl, sessionId: session.sessionId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stripe checkout error';
      fastify.log.error(`[Playbook Checkout] Failed: ${msg}`);
      return reply.status(500).send({ error: msg });
    }
  });
}