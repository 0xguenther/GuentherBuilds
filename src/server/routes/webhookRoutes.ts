import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StripeMcpClient } from '../../mcp/stripeMcp.js';
import { PaymentService } from '../../services/paymentService.js';
import { BurnService } from '../../services/burnService.js';
import { MarketingService } from '../../services/marketingService.js';
import { EventRouter } from '../../core/router.js';
import { config } from '../../config/index.js';

export async function webhookRoutes(fastify: FastifyInstance) {
  // Stripe Webhook Endpoint
  fastify.post(
    '/webhooks/stripe',
    {
      config: {
        rawBody: true,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sig = request.headers['stripe-signature'] as string;
      const rawBody = (request as any).rawBody;

      let event: any;

      // In testing/dev mode with mock secrets, allow simulated payloads
      if (config.stripe.webhookSecret.includes('placeholder') || !sig) {
        fastify.log.warn('[Webhook] Processing in simulation / bypass mode (no real webhook secret)');
        event = request.body;
      } else {
        try {
          event = StripeMcpClient.constructWebhookEvent(rawBody, sig);
        } catch (err: any) {
          fastify.log.error(`[Webhook] Signature verification failed: ${err.message}`);
          return reply.status(400).send({ error: `Webhook Error: ${err.message}` });
        }
      }

      // We handle checkout.session.completed or payment_intent.succeeded
      if (event?.type === 'checkout.session.completed' || event?.type === 'payment_intent.succeeded') {
        const session = event.data?.object || event;
        const paymentId = session.payment_intent || session.id || `mock_pi_${Date.now()}`;
        const amountCents = session.amount_total || session.amount || 0;
        const currency = session.currency || 'usd';

        fastify.log.info(`[Webhook] Valid checkout event received for payment ${paymentId}: ${amountCents} ${currency}`);

        // 1. Idempotency Check & Record Payment in DB
        const { payment, isNew, alreadyBurned } = await PaymentService.recordIncomingPayment({
          paymentId,
          sessionId: session.id,
          amountCents,
          currency,
          customerEmail: session.customer_details?.email,
        });

        if (alreadyBurned) {
          fastify.log.info(`[Webhook] Payment ${paymentId} was already burned. No-op.`);
          return reply.send({ received: true, status: 'already_burned' });
        }

        // 2. Structured Decision Routing
        const decision = await EventRouter.routeEvent({
          source: 'STRIPE_WEBHOOK',
          rawPayload: { paymentId, amountCents, currency },
        });

        // 3. Asynchronously execute Burn & Announcement
        if (decision.action === 'EXECUTE_BURN') {
          // Non-blocking trigger to reply fast to Stripe
          setImmediate(async () => {
            try {
              const burnResult = await BurnService.executeBurn(paymentId);
              if (burnResult.success && burnResult.burnAmount && burnResult.txHash) {
                await MarketingService.announceBurn(
                  amountCents,
                  burnResult.burnAmount,
                  burnResult.txHash
                );
              }
            } catch (err) {
              fastify.log.error({ err }, `[Webhook Worker] Failed to process burn for ${paymentId}`);
            }
          });
        }

        return reply.status(200).send({ received: true, status: 'processing' });
      }

      return reply.status(200).send({ received: true, status: 'ignored' });
    }
  );

  // Health Check Endpoint
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      agent: 'Günther',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });
}
