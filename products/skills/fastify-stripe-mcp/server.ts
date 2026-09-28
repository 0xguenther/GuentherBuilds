import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

export interface WebhookConfig {
  webhookSecret: string;
  onPaymentCompleted: (sessionId: string, amountCents: number, metadata: Record<string, string>) => Promise<void>;
}

export function buildStripeGateway(config: WebhookConfig): FastifyInstance {
  const app = fastify({ logger: false });

  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    (req as any).rawBody = body;
    try {
      const json = JSON.parse(body.toString('utf-8'));
      done(null, json);
    } catch (err: any) {
      done(err, undefined);
    }
  });

  app.post('/webhooks/stripe', async (req: FastifyRequest, reply: FastifyReply) => {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = (req as any).rawBody as Buffer;

    if (!signature || !rawBody) {
      return reply.status(400).send({ error: 'Missing signature or body' });
    }

    // Verify HMAC-SHA256 signature
    const sigElements = signature.split(',');
    const timestamp = sigElements.find(e => e.startsWith('t='))?.split('=')[1];
    const expectedSig = sigElements.find(e => e.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !expectedSig) {
      return reply.status(400).send({ error: 'Malformed stripe-signature header' });
    }

    const signedPayload = `${timestamp}.${rawBody.toString('utf-8')}`;
    const computedSig = crypto.createHmac('sha256', config.webhookSecret).update(signedPayload).digest('hex');

    if (computedSig !== expectedSig) {
      return reply.status(400).send({ error: 'Invalid HMAC signature' });
    }

    const event = req.body as any;
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await config.onPaymentCompleted(session.id, session.amount_total || 0, session.metadata || {});
    }

    return reply.status(200).send({ received: true });
  });

  return app;
}
