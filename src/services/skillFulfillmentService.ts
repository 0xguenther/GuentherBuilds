import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db/client.js';
import { PaymentService } from './paymentService.js';
import { BurnService } from './burnService.js';
import { MarketingService } from './marketingService.js';

export interface SkillDownloadResult {
  valid: boolean;
  reason?: 'NOT_FOUND' | 'EXPIRED' | 'LIMIT_EXCEEDED' | 'FILE_NOT_FOUND';
  filePath?: string;
  fileName?: string;
  downloadCount?: number;
}

export class SkillFulfillmentService {
  private static readonly MAX_DOWNLOADS = 5;
  private static readonly DEFAULT_EXPIRY_HOURS = 48;

  /**
   * Processes a successful skill checkout session.
   * Calculates platform fee vs creator payout, records purchase, triggers token burn, and generates secure download token.
   */
  public static async processSkillPurchase(params: {
    skillId: string;
    stripePaymentId: string;
    amountCents: number;
    buyerEmail?: string;
  }) {
    const skill = await prisma.skill.findUnique({
      where: { id: params.skillId },
    });

    if (!skill) {
      throw new Error(`Skill with id ${params.skillId} not found.`);
    }

    // Check if purchase was already recorded (idempotency)
    const existing = await prisma.skillPurchase.findUnique({
      where: { stripePaymentId: params.stripePaymentId },
    });

    if (existing) {
      return {
        purchase: existing,
        downloadUrl: `/download/skill/${existing.downloadToken}`,
        isExisting: true,
      };
    }

    // Platform take-rate calculation (10% standard, 100% official)
    const burnAmountCents = Math.floor(params.amountCents * (skill.takeRatePercent / 100));
    const creatorPayoutCents = params.amountCents - burnAmountCents;

    const downloadToken = crypto.randomBytes(24).toString('hex');
    const downloadExpiresAt = new Date(Date.now() + this.DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);

    const purchase = await prisma.skillPurchase.create({
      data: {
        skillId: skill.id,
        buyerEmail: params.buyerEmail,
        stripePaymentId: params.stripePaymentId,
        amountCents: params.amountCents,
        burnAmountCents,
        creatorPayoutCents,
        downloadToken,
        downloadExpiresAt,
        status: 'completed',
      },
    });

    // Inkrement skill download counter
    await prisma.skill.update({
      where: { id: skill.id },
      data: { downloadsCount: { increment: 1 } },
    });

    // Trigger Token Burn for platform fee asynchronously
    if (burnAmountCents > 0) {
      const burnPaymentId = `skill_${params.stripePaymentId}`;
      setImmediate(async () => {
        try {
          await PaymentService.recordIncomingPayment({
            paymentId: burnPaymentId,
            sessionId: params.stripePaymentId,
            amountCents: burnAmountCents,
            currency: 'USD',
            customerEmail: params.buyerEmail,
          });

          const burnRes = await BurnService.executeBurn(burnPaymentId);
          if (burnRes.success && burnRes.txHash && burnRes.burnAmount) {
            await prisma.skillPurchase.update({
              where: { id: purchase.id },
              data: { status: 'burned' },
            });

            await MarketingService.announceBurn(
              burnAmountCents,
              burnRes.burnAmount,
              burnRes.txHash
            );
          }
        } catch (err) {
          console.error(`[SkillFulfillmentService] Error burning platform fee for ${params.stripePaymentId}:`, err);
        }
      });
    }

    return {
      purchase,
      downloadUrl: `/download/skill/${downloadToken}`,
      isExisting: false,
    };
  }

  /**
   * Verifies the cryptographic token and streams the purchased skill asset.
   */
  public static async verifyAndConsumeSkillToken(token: string): Promise<SkillDownloadResult> {
    const purchase = await prisma.skillPurchase.findUnique({
      where: { downloadToken: token },
      include: { skill: true },
    });

    if (!purchase) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    if (purchase.downloadExpiresAt && new Date() > purchase.downloadExpiresAt) {
      return { valid: false, reason: 'EXPIRED' };
    }

    const baseProductsDir = path.resolve(process.cwd(), 'products');
    const assetFilePath = path.resolve(baseProductsDir, purchase.skill.assetPath);

    // Path traversal security check
    if (!assetFilePath.startsWith(baseProductsDir)) {
      return { valid: false, reason: 'FILE_NOT_FOUND' };
    }

    if (!fs.existsSync(assetFilePath)) {
      return { valid: false, reason: 'FILE_NOT_FOUND' };
    }

    // Atomic conditional increment: ensures downloadCount < MAX_DOWNLOADS
    const updateResult = await prisma.skillPurchase.updateMany({
      where: {
        id: purchase.id,
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
      filePath: assetFilePath,
      fileName: path.basename(assetFilePath),
      downloadCount: purchase.downloadCount + 1,
    };
  }
}
