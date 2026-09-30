import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CasEngine {
  /**
   * Atomic Compare-and-Swap state transition:
   * Guarantees zero duplicate execution even under concurrent webhook deliveries.
   */
  static async lockAndProcessPayment(stripePaymentId: string, amountCents: number) {
    // 1. Ensure record exists in 'received' status
    await prisma.payment.upsert({
      where: { stripePaymentId },
      update: {},
      create: {
        stripePaymentId,
        amountCents,
        status: 'received',
      },
    });

    // 2. Atomic CAS Claim: only 1 concurrent process can flip 'received' -> 'burning'
    const claimed = await prisma.payment.updateMany({
      where: {
        stripePaymentId,
        status: 'received',
      },
      data: {
        status: 'burning',
      },
    });

    if (claimed.count === 0) {
      console.log(`[CAS] Payment ${stripePaymentId} already claimed or processed. Skipping.`);
      return { success: false, reason: 'CONCURRENT_SKIP' };
    }

    return { success: true };
  }
}
