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
   * Generates or retrieves a valid time-limited download token for a payment.
   * If a valid, non-expired token already exists, reuses it to prevent resetting download counts.
   */
  static async generateDownloadToken(stripePaymentId: string, expiryHours = this.DEFAULT_EXPIRY_HOURS) {
    const existing = await prisma.payment.findUnique({
      where: { stripePaymentId },
    });

    if (existing?.downloadToken && existing.downloadExpiresAt && existing.downloadExpiresAt > new Date()) {
      return {
        downloadToken: existing.downloadToken,
        downloadExpiresAt: existing.downloadExpiresAt,
        downloadUrl: `/download/${existing.downloadToken}`,
      };
    }

    const downloadToken = crypto.randomBytes(24).toString('hex');
    const downloadExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    await prisma.payment.update({
      where: { stripePaymentId },
      data: {
        downloadToken,
        downloadExpiresAt,
      },
    });

    return {
      downloadToken,
      downloadExpiresAt,
      downloadUrl: `/download/${downloadToken}`,
    };
  }

  /**
   * Verifies the token and atomically increments download count if within limits.
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

    // Product path (Playbook)
    const productFilePath = path.resolve(process.cwd(), 'products', 'gunther-craft', 'PLAYBOOK.md');
    if (!fs.existsSync(productFilePath)) {
      return { valid: false, reason: 'FILE_NOT_FOUND' };
    }

    // Atomic conditional increment: ensures downloadCount < MAX_DOWNLOADS
    const updateResult = await prisma.payment.updateMany({
      where: {
        id: payment.id,
        downloadCount: { lt: this.MAX_DOWNLOADS },
      },
      data: {
        downloadCount: { increment: 1 },
      },
    });

    if (updateResult.count === 0) {
      return { valid: false, reason: 'LIMIT_EXCEEDED' };
    }

    return {
      valid: true,
      filePath: productFilePath,
      fileName: 'Guenther-Craft-Playbook.md',
      downloadCount: payment.downloadCount + 1,
    };
  }
}
