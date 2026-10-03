import { prisma } from '../db/client.js';
import { StripeCheckoutPayload } from '../types/index.js';

export class PaymentService {
  /**
   * Idempotent payment recording.
   * If payment already exists with status 'burned', it ensures we do not double-burn.
   */
  static async recordIncomingPayment(payload: StripeCheckoutPayload) {
    const existing = await prisma.payment.findUnique({
      where: { stripePaymentId: payload.paymentId },
    });

    if (existing) {
      return {
        payment: existing,
        isNew: false,
        alreadyBurned: existing.status === 'burned',
      };
    }

    const created = await prisma.payment.create({
      data: {
        stripePaymentId: payload.paymentId,
        stripeSessionId: payload.sessionId,
        amountCents: payload.amountCents,
        currency: payload.currency.toUpperCase(),
        status: 'received',
      },
    });

    return {
      payment: created,
      isNew: true,
      alreadyBurned: false,
    };
  }

  /**
   * Atomically claims a payment for burning using Compare-And-Swap (CAS).
   * Only transitions from 'received' or 'failed' to 'burning'.
   * Prevents double-burn race conditions.
   */
  static async claimForBurning(stripePaymentId: string): Promise<boolean> {
    const res = await prisma.payment.updateMany({
      where: {
        stripePaymentId,
        status: { in: ['received', 'failed'] },
      },
      data: { status: 'burning' },
    });
    return res.count > 0;
  }

  static async markBurning(stripePaymentId: string) {
    return prisma.payment.update({
      where: { stripePaymentId },
      data: { status: 'burning' },
    });
  }

  /** Broadcast ist erfolgt: Hash sichern, Status bleibt 'burning'. */
  static async markPending(stripePaymentId: string, txHash: string) {
    return prisma.payment.update({
      where: { stripePaymentId },
      data: { status: 'burning', txHash },
    });
  }

  static async markBurned(stripePaymentId: string, burnAmount: bigint, txHash: string) {
    return prisma.payment.update({
      where: { stripePaymentId },
      data: {
        status: 'burned',
        burnAmount,
        txHash,
      },
    });
  }

  static async markFailed(stripePaymentId: string, errorReason: string) {
    return prisma.payment.update({
      where: { stripePaymentId },
      data: {
        status: 'failed',
      },
    });
  }

  static async getPaymentByStripeId(stripePaymentId: string) {
    return prisma.payment.findUnique({
      where: { stripePaymentId },
    });
  }

  static async getPendingPayments() {
    return prisma.payment.findMany({
      where: {
        status: { in: ['received', 'failed', 'burning'] },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
