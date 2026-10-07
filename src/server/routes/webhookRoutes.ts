import Stripe from 'stripe';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import { StripeMcpClient } from '../../mcp/stripeMcp.js';
import { PaymentService } from '../../services/paymentService.js';
import { BurnService } from '../../services/burnService.js';
import { MarketingService } from '../../services/marketingService.js';
import { FulfillmentService } from '../../services/fulfillmentService.js';
import { SkillFulfillmentService } from '../../services/skillFulfillmentService.js';
import { AuditOrderService } from '../../services/auditOrderService.js';
import { B2bService } from '../../services/b2bService.js';
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
      const sig = request.headers['stripe-signature'];
      const rawBody = (request as FastifyRequest & { rawBody?: string | Buffer }).rawBody;

      let event: Stripe.Event;

      const isTestEnv = config.server.env === 'test' || process.env.NODE_ENV === 'test';
      const hasMockSecret = config.stripe.webhookSecret.includes('placeholder');

      // Only allow simulation if explicitly configured with mock secret in test/dev
      if (hasMockSecret && (isTestEnv || config.server.env === 'development')) {
        fastify.log.warn('[Webhook] Dev/Test simulation mode active (mock secret configured).');
        event = request.body as Stripe.Event;
      } else {
        if (!sig || typeof sig !== 'string') {
          fastify.log.warn('[Webhook] Missing stripe-signature header. Request rejected.');
          return reply.status(400).send({ error: 'Missing stripe-signature header' });
        }

        if (!rawBody) {
          fastify.log.error('[Webhook] Missing raw request body for signature verification.');
          return reply.status(400).send({ error: 'Missing raw request body' });
        }

        try {
          event = StripeMcpClient.constructWebhookEvent(rawBody, sig);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown signature error';
          fastify.log.error(`[Webhook] Signature verification failed: ${message}`);
          return reply.status(400).send({ error: `Webhook Error: ${message}` });
        }
      }

      // Only handle checkout.session.completed with payment_status === 'paid'
      // payment_intent.succeeded is ignored to prevent double-processing
      if (event?.type === 'checkout.session.completed') {
        const session = event.data.object;

        // Verify payment actually succeeded
        if (session.payment_status !== 'paid') {
          fastify.log.info(`[Webhook] Checkout session ${session.id} not paid (status: ${session.payment_status}). Ignoring.`);
          return reply.status(200).send({ received: true, status: 'not_paid' });
        }

        const paymentId = (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id) || session.id;
        const amountCents = session.amount_total || 0;
        const currency = (session.currency || 'usd').toLowerCase();

        fastify.log.info(`[Webhook] Valid checkout completed for payment ${paymentId}: ${amountCents} ${currency}`);

        const metadata = session.metadata || {};

        // Branch: Write-Path-Check Bestellung (Standbein 2)
        if (metadata.type === 'write_path_check' && metadata.auditOrderId) {
          const paid = await AuditOrderService.markPaid(metadata.auditOrderId, paymentId);
          fastify.log.info(`[Audit] Bestellung ${metadata.auditOrderId} bezahlt=${paid}`);
          return reply.status(200).send({ received: true, auditOrderId: metadata.auditOrderId, newlyPaid: paid });
        }

        // Branch: Claw Mart Skill Purchase
        if (metadata.type === 'skill_purchase' && metadata.skillId) {
          fastify.log.info(`[Claw Mart] Processing skill purchase for skill ${metadata.skillId}`);
          const skillResult = await SkillFulfillmentService.processSkillPurchase({
            skillId: metadata.skillId,
            stripePaymentId: paymentId,
            amountCents,
            buyerEmail: session.customer_details?.email ?? undefined,
          });

          return reply.status(200).send({
            received: true,
            status: 'completed',
            type: 'skill_purchase',
            downloadUrl: skillResult.downloadUrl,
          });
        }

        // Branch: Clawcommerce B2B Setup Fee Payment ($2,000)
        if (metadata.type === 'b2b_setup' && metadata.leadId) {
          fastify.log.info(`[Clawcommerce] Processing B2B Setup payment for lead ${metadata.leadId}`);
          await B2bService.handleB2bPayment({
            leadId: metadata.leadId,
            stripePaymentId: paymentId,
            amountCents,
            customerEmail: session.customer_details?.email ?? undefined,
          });

          return reply.status(200).send({
            received: true,
            status: 'contracted',
            type: 'b2b_setup',
            leadId: metadata.leadId,
          });
        }

        // Branch: Günther Craft Core Playbook Purchase
        // 1. Idempotency Check & Record Payment in DB
        const { payment, isNew, alreadyBurned } = await PaymentService.recordIncomingPayment({
          paymentId,
          sessionId: session.id,
          amountCents,
          currency,
          customerEmail: session.customer_details?.email ?? undefined,
        });

        if (alreadyBurned) {
          fastify.log.info(`[Webhook] Payment ${paymentId} was already burned. No-op.`);
          return reply.send({ received: true, status: 'already_burned' });
        }

        // 2. Generate Digital Product Download Token
        const fulfillment = await FulfillmentService.generateDownloadToken(paymentId);
        fastify.log.info(`[Fulfillment] Download token created for ${paymentId}: ${fulfillment.downloadUrl}`);

        // 3. Structured Decision Routing
        const decision = await EventRouter.routeEvent({
          source: 'STRIPE_WEBHOOK',
          rawPayload: { paymentId, amountCents, currency },
        });

        // 4. Asynchronously execute Burn & Announcement
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

        return reply.status(200).send({
          received: true,
          status: 'processing',
          downloadUrl: fulfillment.downloadUrl,
        });
      }

      return reply.status(200).send({ received: true, status: 'ignored' });
    }
  );

  // Digital Asset Fulfillment / Download Endpoint
  fastify.get('/download/:token', async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
    const { token } = request.params;
    const result = await FulfillmentService.verifyAndConsumeToken(token);

    if (!result.valid || !result.filePath) {
      if (result.reason === 'EXPIRED') {
        return reply.status(403).send({ error: 'Download-Link ist abgelaufen (Gültigkeit: 48 Stunden).' });
      }
      if (result.reason === 'LIMIT_EXCEEDED') {
        return reply.status(403).send({ error: 'Download-Limit (max. 5 Downloads) für diesen Kauf erreicht.' });
      }
      return reply.status(404).send({ error: 'Ungültiger oder nicht gefundener Download-Token.' });
    }

    const stream = fs.createReadStream(result.filePath);
    return reply
      .header('Content-Type', 'text/markdown; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${result.fileName}"`)
      .send(stream);
  });

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
