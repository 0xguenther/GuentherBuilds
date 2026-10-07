import { prisma } from '../db/client.js';
import { StripeMcpClient } from '../mcp/stripeMcp.js';
import { AuditConfig, AuditConfigSchema, AuditValidationError, validateAuditConfig } from './auditRunnerService.js';
const PUBLIC_URL = process.env.PUBLIC_URL || 'https://0xguenther.org';

// Preise in Rappen (CHF). Quelle: docs/konzept/KONZEPT.md, Abschnitt 4.
export const AUDIT_TIERS = {
  quick: { label: 'Quick Check', priceCents: 9000, deliveryHours: 24 },
  standard: { label: 'Standard Check', priceCents: 29000, deliveryHours: 72 },
  fix: { label: 'Fix-Paket', priceCents: 69000, deliveryHours: 120 },
} as const;

export type AuditTier = keyof typeof AUDIT_TIERS;

export interface AuditOrderInput extends Omit<AuditConfig, 'version'> {
  tier: AuditTier;
  buyerEmail?: string;
}

export class AuditOrderService {
  /**
   * Legt eine Bestellung an und erzeugt den Stripe-Checkout. Die Bestellung
   * bleibt bis zum bestätigten Webhook im Status 'pending_payment'.
   */
  static async create(input: AuditOrderInput) {
    const parsed = AuditConfigSchema.safeParse({ ...input, version: 2 });
    if (!parsed.success) throw new AuditValidationError(parsed.error.issues);
    const config = parsed.data;
    await validateAuditConfig(config);
    const tier = AUDIT_TIERS[input.tier];
    const order = await prisma.auditOrder.create({
      data: {
        tier: input.tier,
        status: 'pending_payment',
        configJson: JSON.stringify(config),
        buyerEmail: input.buyerEmail ?? null,
      },
    });

    const auditUrl = `${PUBLIC_URL}${config.lang === 'en' ? '/en' : ''}/audit`;
    const session = await StripeMcpClient.createCheckoutSession({
      title: `${tier.label} — Agent Write-Path Check`,
      description: 'Automated write-path check of your agent tool definitions',
      priceInCents: tier.priceCents,
      metadata: { type: 'write_path_check', auditOrderId: order.id, tier: input.tier },
      // Stripe ersetzt {CHECKOUT_SESSION_ID}. Nur wer die Session kennt, sieht den Download-Link.
      successUrl: `${auditUrl}/thanks?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: auditUrl,
      currency: 'chf',
    });

    await prisma.auditOrder.update({
      where: { id: order.id },
      data: { stripeSessionId: session.sessionId },
    });

    return { orderId: order.id, checkoutUrl: session.sessionUrl };
  }

  /**
   * Wird vom Webhook aufgerufen. Nur der Übergang pending_payment -> paid ist
   * erlaubt, damit ein doppelter Webhook nichts doppelt auslöst.
   */
  static async markPaid(orderId: string, stripePaymentId: string): Promise<boolean> {
    const res = await prisma.auditOrder.updateMany({
      where: { id: orderId, status: 'pending_payment' },
      data: { status: 'paid', stripePaymentId },
    });
    return res.count > 0;
  }

  static async get(orderId: string) {
    return prisma.auditOrder.findUnique({ where: { id: orderId } });
  }
}
