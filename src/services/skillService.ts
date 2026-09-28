import { prisma } from '../db/client.js';

export interface CreateSkillInput {
  title: string;
  slug: string;
  description: string;
  category: 'mcp' | 'eliza_plugin' | 'workflow';
  priceCents: number;
  takeRatePercent?: number;
  isOfficial?: boolean;
  creatorId?: string;
  assetPath: string;
  version?: string;
}

export class SkillService {
  /**
   * Seeds Günther's official flagship skills into the database if not present.
   */
  public async seedDefaultSkills(): Promise<void> {
    const defaultSkills: CreateSkillInput[] = [
      {
        title: 'ElizaOS Base L2 Token Burner',
        slug: 'eliza-token-burner',
        description: 'Autonomer ElizaOS Action Plugin für mathematisch begrenzte $GÜNTER Burns auf Base L2 via CDP AgentKit MPC.',
        category: 'eliza_plugin',
        priceCents: 2900, // $29
        takeRatePercent: 100, // 100% official Günther product
        isOfficial: true,
        assetPath: 'skills/eliza-token-burner.zip',
        version: '1.0.0',
      },
      {
        title: 'Fastify Stripe Webhook MCP Gateway',
        slug: 'fastify-stripe-mcp',
        description: 'Hardened Fastify Webhook Gateway mit Raw-Body HMAC-SHA256 Signaturprüfung und MCP-Tool-Anbindung.',
        category: 'mcp',
        priceCents: 3900, // $39
        takeRatePercent: 100,
        isOfficial: true,
        assetPath: 'skills/fastify-stripe-mcp.zip',
        version: '1.0.0',
      },
      {
        title: 'CDP MPC Wallet Guard for Agents',
        slug: 'cdp-mpc-wallet-guard',
        description: 'Zero-Plaintext-Key MPC Wallet Manager für autonome Agenten mit Gas-Spike-Schutzschalter.',
        category: 'workflow',
        priceCents: 4900, // $49
        takeRatePercent: 100,
        isOfficial: true,
        assetPath: 'skills/cdp-mpc-wallet-guard.zip',
        version: '1.0.0',
      },
    ];

    for (const skill of defaultSkills) {
      await prisma.skill.upsert({
        where: { slug: skill.slug },
        update: {
          title: skill.title,
          description: skill.description,
          priceCents: skill.priceCents,
          assetPath: skill.assetPath,
        },
        create: {
          title: skill.title,
          slug: skill.slug,
          description: skill.description,
          category: skill.category,
          priceCents: skill.priceCents,
          takeRatePercent: skill.takeRatePercent ?? 10,
          isOfficial: skill.isOfficial ?? false,
          assetPath: skill.assetPath,
          version: skill.version ?? '1.0.0',
        },
      });
    }
  }

  /**
   * Retrieves all published skills with optional category filter.
   */
  public async listSkills(category?: string) {
    const where = category ? { category } : {};
    return prisma.skill.findMany({
      where,
      include: {
        creator: {
          select: { name: true, xHandle: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves a single skill by slug.
   */
  public async getSkillBySlug(slug: string) {
    return prisma.skill.findUnique({
      where: { slug },
      include: {
        creator: {
          select: { name: true, xHandle: true },
        },
      },
    });
  }

  /**
   * Registers a community skill listing with default 10% platform take-rate.
   */
  public async registerSkill(input: CreateSkillInput) {
    return prisma.skill.create({
      data: {
        title: input.title,
        slug: input.slug,
        description: input.description,
        category: input.category,
        priceCents: input.priceCents,
        takeRatePercent: input.takeRatePercent ?? 10,
        isOfficial: input.isOfficial ?? false,
        creatorId: input.creatorId,
        assetPath: input.assetPath,
        version: input.version ?? '1.0.0',
      },
    });
  }

  /**
   * Aggregates Claw Mart marketplace economics & stats.
   */
  public async getMarketplaceStats() {
    const totalSkills = await prisma.skill.count();
    const purchases = await prisma.skillPurchase.findMany({
      select: { amountCents: true, burnAmountCents: true, creatorPayoutCents: true },
    });

    const totalVolumeCents = purchases.reduce((acc, p) => acc + p.amountCents, 0);
    const totalBurnedCents = purchases.reduce((acc, p) => acc + p.burnAmountCents, 0);
    const totalCreatorPayoutsCents = purchases.reduce((acc, p) => acc + p.creatorPayoutCents, 0);

    return {
      totalSkills,
      totalPurchases: purchases.length,
      totalVolumeUsd: totalVolumeCents / 100,
      totalBurnedUsd: totalBurnedCents / 100,
      totalCreatorPayoutsUsd: totalCreatorPayoutsCents / 100,
    };
  }
}

export const skillService = new SkillService();
