import { describe, it, expect, beforeEach } from 'vitest';
import { FulfillmentService } from '../src/services/fulfillmentService.js';
import { prisma } from '../src/db/client.js';

describe('FulfillmentService', () => {
  const testStripePaymentId = `test_pi_download_${Date.now()}`;
  const MAX_DOWNLOADS = 5;

  beforeEach(async () => {
    // Clean up test payments
    await prisma.payment.deleteMany({
      where: { stripePaymentId: testStripePaymentId },
    });

    // Create a fresh test payment
    await prisma.payment.create({
      data: {
        stripePaymentId: testStripePaymentId,
        amountCents: 4900,
        currency: 'USD',
        status: 'received',
      },
    });
  });

  describe('generateDownloadToken', () => {
    it('should generate a valid download token for a payment', async () => {
      const result = await FulfillmentService.generateDownloadToken(testStripePaymentId);

      expect(result.downloadToken).toBeDefined();
      expect(result.downloadUrl).toBe(`/download/${result.downloadToken}`);
      expect(result.downloadExpiresAt).toBeDefined();
    });

    it('should reuse existing valid token (idempotency)', async () => {
      // First call
      const result1 = await FulfillmentService.generateDownloadToken(testStripePaymentId);

      // Second call - should return same token
      const result2 = await FulfillmentService.generateDownloadToken(testStripePaymentId);

      expect(result1.downloadToken).toBe(result2.downloadToken);
      expect(result1.downloadUrl).toBe(result2.downloadUrl);
    });

    it('should generate new token if previous expired', async () => {
      // Create initial token
      const result1 = await FulfillmentService.generateDownloadToken(testStripePaymentId, 1 / 60); // 1 minute

      // Wait for token to expire (simulated)
      const now = new Date();
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentId: testStripePaymentId },
      });

      // Manually set expiry to past
      if (payment) {
        await prisma.payment.update({
          where: { stripePaymentId: testStripePaymentId },
          data: { downloadExpiresAt: new Date(now.getTime() - 1000) },
        });
      }

      // Second call should generate new token
      const result2 = await FulfillmentService.generateDownloadToken(testStripePaymentId, 48);
      expect(result2.downloadToken).not.toBe(result1.downloadToken);
    });
  });

  describe('verifyAndConsumeToken', () => {
    it('should return not_found for invalid token', async () => {
      const result = await FulfillmentService.verifyAndConsumeToken('invalid_token_xyz');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('NOT_FOUND');
    });

    it('should return expired for old token', async () => {
      // Generate token
      const tokenResult = await FulfillmentService.generateDownloadToken(testStripePaymentId);

      // Manually expire the token
      await prisma.payment.update({
        where: { stripePaymentId: testStripePaymentId },
        data: { downloadExpiresAt: new Date(Date.now() - 1000) }, // 1 second ago
      });

      // Try to consume
      const result = await FulfillmentService.verifyAndConsumeToken(tokenResult.downloadToken);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('EXPIRED');
    });

    it('should consume valid token and increment download count', async () => {
      // Generate token
      const tokenResult = await FulfillmentService.generateDownloadToken(testStripePaymentId);

      // Consume token
      const result = await FulfillmentService.verifyAndConsumeToken(tokenResult.downloadToken);

      expect(result.valid).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(result.fileName).toBe('Guenther-Craft-Playbook.md');
      expect(result.downloadCount).toBe(1);

      // Verify download count incremented in DB
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentId: testStripePaymentId },
      });
      expect(payment?.downloadCount).toBe(1);
    });

    it('should prevent downloading after max limit exceeded', async () => {
      const token = (await FulfillmentService.generateDownloadToken(testStripePaymentId)).downloadToken;

      // Download max times
      for (let i = 0; i < MAX_DOWNLOADS; i++) {
        const result = await FulfillmentService.verifyAndConsumeToken(token);
        expect(result.valid).toBe(true);
      }

      // Next download should fail
      const result = await FulfillmentService.verifyAndConsumeToken(token);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('LIMIT_EXCEEDED');
    });
  });

  describe('idempotency & concurrency', () => {
    it('should atomically prevent double-download via CAS', async () => {
      const token = (await FulfillmentService.generateDownloadToken(testStripePaymentId)).downloadToken;

      // Simulate concurrent downloads (both should not exceed limit)
      const promises = Array(MAX_DOWNLOADS + 2)
        .fill(null)
        .map(() => FulfillmentService.verifyAndConsumeToken(token));

      const results = await Promise.all(promises);

      // Only MAX_DOWNLOADS should succeed
      const successCount = results.filter((r) => r.valid).length;
      expect(successCount).toBe(MAX_DOWNLOADS);

      // Rest should fail
      const failedCount = results.filter((r) => !r.valid).length;
      expect(failedCount).toBe(2);
    });
  });
});
