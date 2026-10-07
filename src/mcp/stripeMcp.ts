import Stripe from 'stripe';
import { config } from '../config/index.js';

export interface CreateProductParams {
  name: string;
  description: string;
  priceInCents: number;
  currency?: string;
}

export class StripeMcpClient {
  private static stripeInstance: Stripe | null = null;

  private static getStripe(): Stripe {
    if (!this.stripeInstance) {
      this.stripeInstance = new Stripe(config.stripe.secretKey, {
        apiVersion: '2025-02-24.acacia',
      });
    }
    return this.stripeInstance;
  }

  static async refundAuditOrder(order: { id: string; stripePaymentId: string | null; stripeSessionId: string | null }): Promise<Stripe.Refund> {
    const stripe = this.getStripe();
    let paymentIntent = order.stripePaymentId;
    if (!paymentIntent?.startsWith('pi_')) {
      const sessionId = order.stripeSessionId ?? (paymentIntent?.startsWith('cs_') ? paymentIntent : null);
      if (!sessionId) throw new Error('Audit order has no Stripe payment or checkout session');
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
    }
    if (!paymentIntent) throw new Error('Audit checkout session has no payment intent');
    return stripe.refunds.create({ payment_intent: paymentIntent }, { idempotencyKey: `refund-audit-${order.id}` });
  }

  /**
   * Constructs and verifies a Stripe Webhook Event from raw payload and signature
   */
  static constructWebhookEvent(rawPayload: string | Buffer, signature: string): Stripe.Event {
    const stripe = this.getStripe();
    return stripe.webhooks.constructEvent(
      rawPayload,
      signature,
      config.stripe.webhookSecret
    );
  }

  /**
   * Creates a product and a shareable Stripe Payment Link
   */
  static async createProductAndPaymentLink(params: CreateProductParams): Promise<{
    productId: string;
    priceId: string;
    paymentLinkUrl: string;
  }> {
    const stripe = this.getStripe();

    const product = await stripe.products.create({
      name: params.name,
      description: params.description,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: params.priceInCents,
      currency: params.currency || 'usd',
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
    });

    return {
      productId: product.id,
      priceId: price.id,
      paymentLinkUrl: paymentLink.url,
    };
  }

  /**
   * Creates a customized Checkout Session for digital products and skills
   */
  static async createCheckoutSession(params: {
    title: string;
    description: string;
    priceInCents: number;
    metadata: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
    currency?: string;
  }): Promise<{ sessionId: string; sessionUrl: string }> {
    const stripe = this.getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: params.currency || 'usd',
            product_data: {
              name: params.title,
              description: params.description,
            },
            unit_amount: params.priceInCents,
          },
          quantity: 1,
        },
      ],
      metadata: params.metadata,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return {
      sessionId: session.id,
      sessionUrl: session.url || '',
    };
  }
}
