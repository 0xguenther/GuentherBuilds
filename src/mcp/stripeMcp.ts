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
        apiVersion: '2025-02-24.acacia' as any,
      });
    }
    return this.stripeInstance;
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
}
