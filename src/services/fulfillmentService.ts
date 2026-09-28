import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db/client.js';

export interface TokenValidationResult {
  valid: boolean;
  reason?: 'NOT_FOUND' | 'EXPIRED' | 'LIMIT_EXCEEDED' | 'FILE_NOT_FOUND';
  filePath?: string;
  fileName?: string;
  downloadCount?: number;
}

export class FulfillmentService {
  private static readonly MAX_DOWNLOADS = 5;
  private static readonly DEFAULT_EXPIRY_HOURS = 48;

  /**
   * Generates a cryptographically secure, time-limited download token for a payment.
   */
  static async generateDownloadToken(stripePaymentId: string, expiryHours = this.DEFAULT_EXPIRY_HOURS) {
    const downloadToken = crypto.randomBytes(24).toString('hex');
    const downloadExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const updatedPayment = await prisma.payment.update({
      where: { stripePaymentId },
      data: {
        downloadToken,
        downloadExpiresAt,
        downloadCount: 0,
      },
    });

    return {
      downloadToken,
      downloadExpiresAt,
      downloadUrl: `/download/${downloadToken}`,
    };
  }

  /**
   * Verifies the token and increments download count if valid.
   */
  static async verifyAndConsumeToken(token: string): Promise<TokenValidationResult> {
    const payment = await prisma.payment.findUnique({
      where: { downloadToken: token },
    });

    if (!payment) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    // Check expiration
    if (payment.downloadExpiresAt && new Date() > payment.downloadExpiresAt) {
      return { valid: false, reason: 'EXPIRED' };
    }

    // Check max download limit
    if (payment.downloadCount >= this.MAX_DOWNLOADS) {
      return { valid: false, reason: 'LIMIT_EXCEEDED' };
    }

    // Product path (Playbook)
    const productFilePath = path.resolve(process.cwd(), 'products', 'gunther-craft', 'PLAYBOOK.md');
    if (!fs.existsSync(productFilePath)) {
      return { valid: false, reason: 'FILE_NOT_FOUND' };
    }

    // Increment download counter
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        downloadCount: { increment: 1 },
      },
    });

    return {
      valid: true,
      filePath: productFilePath,
      fileName: 'Guenther-Craft-Playbook.md',
      downloadCount: payment.downloadCount + 1,
    };
  }
}
