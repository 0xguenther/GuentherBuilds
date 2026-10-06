import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentService } from '../src/services/paymentService.js';
import { prisma } from '../src/db/client.js';

describe('PaymentService', () => {
  const testPaymentId = `test_pi_${Date.now()}`;
  const testSessionId = `test_cs_${Date.now()}`;

  beforeEach(async () => {
    // Clean up test payments
    await prisma.payment.deleteMany({
      where: { stripePaymentId: testPaymentId },
    });
  });

  describe('recordIncomingPayment', () => {
    it('should create a new payment record on first call', async () => {
      const result = await PaymentService.recordIncomingPayment({
        paymentId: testPaymentId,
        sessionId: testSessionId,
        amountCents: 4900,
        currency: 'usd',
      });

      expect(result.isNew).toBe(true);
      expect(result.alreadyBurned).toBe(false);
      expect(result.payment.stripePaymentId).toBe(testPaymentId);
      expect(result.payment.amountCents).toBe(4900);
      expect(result.payment.status).toBe('received');
    });

    it('should return existing payment on second call (idempotency)', async () => {
      // First call
      const result1 = await PaymentService.recordIncomingPayment({
        paymentId: testPaymentId,
        sessionId: testSessionId,
        amountCents: 4900,
        currency: 'usd',
      });
      expect(result1.isNew).toBe(true);

      // Second call - should be idempotent
      const result2 = await PaymentService.recordIncomingPayment({
        paymentId: testPaymentId,
        sessionId: testSessionId,
        amountCents: 4900,
        currency: 'usd',
      });

      expect(result2.isNew).toBe(false);
      expect(result2.payment.id).toBe(result1.payment.id);
    });

    it('should not double-burn already burned payments', async () => {
      // Create payment
      await PaymentService.recordIncomingPayment({
        paymentId: testPaymentId,
        sessionId: testSessionId,
        amountCents: 4900,
        currency: 'usd',
      });

      // Mark as burned
      await PaymentService.markBurned(testPaymentId, BigInt(100), '0xTxHash');

      // Check if already burned
      const result = await PaymentService.recordIncomingPayment({
        paymentId: testPaymentId,
        sessionId: testSessionId,
        amountCents: 4900,
        currency: 'usd',
      });

      expect(result.alreadyBurned).toBe(true);
    });
  });

  describe('claimForBurning (CAS)', () => {
    it('should only transition from received to burning', async () => {
      // Create payment
      await PaymentService.recordIncomingPayment({
        paymentId: testPaymentId,
        sessionId: testSessionId,
        amountCents: 4900,
        currency: 'usd',
      });

      // Claim for burning
      const claimed = await PaymentService.claimForBurning(testPaymentId);
      expect(claimed).toBe(true);

      // Verify status changed
      const payment = await PaymentService.getPaymentByStripeId(testPaymentId);
      expect(payment?.status).toBe('burning');

      // Second claim should fail (CAS)
      const secondClaim = await PaymentService.claimForBurning(testPaymentId);
      expect(secondClaim).toBe(false);
    });
  });

  describe('status transitions', () => {
    it('should handle full lifecycle: received → burning → burned', async () => {
      // Create
      await PaymentService.recordIncomingPayment({
        paymentId: testPaymentId,
        sessionId: testSessionId,
        amountCents: 4900,
        currency: 'usd',
      });

      let payment = await PaymentService.getPaymentByStripeId(testPaymentId);
      expect(payment?.status).toBe('received');

      // Claim for burning
      await PaymentService.claimForBurning(testPaymentId);
      payment = await PaymentService.getPaymentByStripeId(testPaymentId);
      expect(payment?.status).toBe('burning');

      // Mark burned
      await PaymentService.markBurned(testPaymentId, BigInt(49000), '0xTxHash123');
      payment = await PaymentService.getPaymentByStripeId(testPaymentId);
      expect(payment?.status).toBe('burned');
      expect(payment?.txHash).toBe('0xTxHash123');
    });

    it('should track error reasons on failure', async () => {
      // Create
      await PaymentService.recordIncomingPayment({
        paymentId: testPaymentId,
        sessionId: testSessionId,
        amountCents: 4900,
        currency: 'usd',
      });

      // Mark failed
      await PaymentService.markFailed(testPaymentId, 'RPC endpoint timeout');

      const payment = await PaymentService.getPaymentByStripeId(testPaymentId);
      expect(payment?.status).toBe('failed');
      expect(payment?.errorReason).toBe('RPC endpoint timeout');
    });
  });
});
