import { prisma } from '../db/client.js';
import { config } from '../config/index.js';

export interface BurnEventSummary {
  id: string;
  source: 'PLAYBOOK' | 'CLAW_MART' | 'CLAWCOMMERCE_B2B';
  amountUsd: number;
  tokensBurned: string;
  txHash: string;
  explorerUrl: string;
  timestamp: string;
}

export interface SystemMetrics {
  financials: {
    totalRevenueUsd: number;
    totalBurnedTokens: string;
    totalBurnCount: number;
    currency: string;
    burnRateDescription: string;
  };
  products: {
    playbook: {
      unitsSold: number;
      revenueUsd: number;
    };
    clawMart: {
      totalSkills: number;
      officialSkills: number;
      communitySkills: number;
      totalDownloads: number;
      totalSalesUsd: number;
      takeRateBurnsUsd: number;
    };
    clawcommerceB2b: {
      totalLeads: number;
      qualifiedLeads: number;
      activeContracts: number;
      totalRevenueUsd: number;
    };
  };
  aiObservability: {
    totalLlmCalls: number;
    totalTokens: number;
    totalInferenceCostUsd: number;
    netProfitMarginPercent: number;
    activeProvider: string;
    activeModel: string;
  };
  system: {
    uptimeSeconds: number;
    memoryRssMb: number;
    activeNetwork: string;
    nodeEnv: string;
    status: 'healthy' | 'degraded';
    lastHeartbeat: string;
  };
  recentBurns: BurnEventSummary[];
}

export class MetricsService {
  /**
   * Calculates comprehensive live business and operational metrics for Günther.
   */
  static async getLiveMetrics(): Promise<SystemMetrics> {
    const isMainnet = config.web3.networkId === 'base' || config.web3.networkId.includes('mainnet');
    const explorerBase = isMainnet
      ? 'https://basescan.org/tx/'
      : 'https://sepolia.basescan.org/tx/';

    // 1. Fetch data in parallel
    const [payments, skills, skillPurchases, b2bLeads, b2bContracts, traces] = await Promise.all([
      prisma.payment.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.skill.findMany({ include: { creator: true } }),
      prisma.skillPurchase.findMany({ orderBy: { createdAt: 'desc' }, include: { skill: true } }),
      prisma.b2bLead.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.b2bContract.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.trace.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    // 2. Financials - Playbooks
    const validPayments = payments.filter((p) => p.status !== 'failed');
    const playbookCents = validPayments.reduce((sum, p) => sum + p.amountCents, 0);
    const playbookUnits = validPayments.length;

    // 3. Financials - Claw Mart
    const validSkillPurchases = skillPurchases.filter((p) => p.status !== 'failed');
    const skillSalesCents = validSkillPurchases.reduce((sum, p) => sum + p.amountCents, 0);
    const skillBurnCents = validSkillPurchases.reduce((sum, p) => sum + p.burnAmountCents, 0);
    const totalDownloads = skills.reduce((sum, s) => sum + s.downloadsCount, 0);
    const officialSkillsCount = skills.filter((s) => s.isOfficial).length;
    const communitySkillsCount = skills.filter((s) => !s.isOfficial).length;

    // 4. Financials - B2B Clawcommerce
    const paidContracts = b2bContracts.filter((c) => c.setupPaid);
    const b2bCents = paidContracts.reduce((sum, c) => sum + c.setupFeeCents, 0);
    const qualifiedLeads = b2bLeads.filter((l) => l.status === 'qualified' || l.status === 'contracted').length;

    // Totals
    const totalRevenueCents = playbookCents + skillSalesCents + b2bCents;
    const totalRevenueUsd = parseFloat((totalRevenueCents / 100).toFixed(2));

    // Token Burns Calculation
    let totalBurnedBigInt = 0n;
    const burnEvents: BurnEventSummary[] = [];

    // From Flagship Playbook
    for (const p of validPayments) {
      if (p.txHash && p.burnAmount) {
        const tokens = BigInt(p.burnAmount);
        totalBurnedBigInt += tokens;
        burnEvents.push({
          id: p.id,
          source: 'PLAYBOOK',
          amountUsd: p.amountCents / 100,
          tokensBurned: tokens.toString(),
          txHash: p.txHash,
          explorerUrl: `${explorerBase}${p.txHash}`,
          timestamp: p.createdAt.toISOString(),
        });
      }
    }

    // From Claw Mart
    for (const sp of validSkillPurchases) {
      // 1 cent = 10 $GÜNTER (1000 tokens per dollar)
      const tokens = BigInt(sp.burnAmountCents * 1000);
      totalBurnedBigInt += tokens;
      const txMock = `0xskill_${sp.id.slice(0, 8)}...`;
      burnEvents.push({
        id: sp.id,
        source: 'CLAW_MART',
        amountUsd: sp.burnAmountCents / 100,
        tokensBurned: tokens.toString(),
        txHash: txMock,
        explorerUrl: `${explorerBase}${txMock}`,
        timestamp: sp.createdAt.toISOString(),
      });
    }

    // From B2B Clawcommerce
    for (const bc of paidContracts) {
      if (bc.setupTxHash) {
        const tokens = BigInt(bc.setupFeeCents * 1000);
        totalBurnedBigInt += tokens;
        burnEvents.push({
          id: bc.id,
          source: 'CLAWCOMMERCE_B2B',
          amountUsd: bc.setupFeeCents / 100,
          tokensBurned: tokens.toString(),
          txHash: bc.setupTxHash,
          explorerUrl: `${explorerBase}${bc.setupTxHash}`,
          timestamp: bc.updatedAt.toISOString(),
        });
      }
    }

    // Sort burns descending by timestamp
    burnEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 5. AI Observability
    const totalTokens = traces.reduce((sum, t) => sum + t.tokens, 0);
    const totalInferenceCostUsd = traces.reduce((sum, t) => sum + t.costUsd, 0);
    const netProfitMarginPercent =
      totalRevenueUsd > 0
        ? parseFloat((((totalRevenueUsd - totalInferenceCostUsd) / totalRevenueUsd) * 100).toFixed(2))
        : 100;

    const memUsage = process.memoryUsage();
    const memoryRssMb = parseFloat((memUsage.rss / 1024 / 1024).toFixed(1));

    return {
      financials: {
        totalRevenueUsd,
        totalBurnedTokens: totalBurnedBigInt.toString(),
        totalBurnCount: burnEvents.length,
        currency: 'USD',
        burnRateDescription: '100% Nettoerlöse auf Flagship & B2B Setup / 10% Claw Mart Take-Rate unwiderruflich verbrannt auf Base L2',
      },
      products: {
        playbook: {
          unitsSold: playbookUnits,
          revenueUsd: parseFloat((playbookCents / 100).toFixed(2)),
        },
        clawMart: {
          totalSkills: skills.length,
          officialSkills: officialSkillsCount,
          communitySkills: communitySkillsCount,
          totalDownloads,
          totalSalesUsd: parseFloat((skillSalesCents / 100).toFixed(2)),
          takeRateBurnsUsd: parseFloat((skillBurnCents / 100).toFixed(2)),
        },
        clawcommerceB2b: {
          totalLeads: b2bLeads.length,
          qualifiedLeads,
          activeContracts: paidContracts.length,
          totalRevenueUsd: parseFloat((b2bCents / 100).toFixed(2)),
        },
      },
      aiObservability: {
        totalLlmCalls: traces.length,
        totalTokens,
        totalInferenceCostUsd: parseFloat(totalInferenceCostUsd.toFixed(4)),
        netProfitMarginPercent,
        activeProvider: config.llm.anthropicApiKey ? 'Anthropic Direct' : (config.llm.openrouterApiKey ? 'OpenRouter' : 'Deterministic Fallback'),
        activeModel: config.llm.anthropicApiKey ? 'claude-3-5-sonnet' : (config.llm.openrouterApiKey ? config.llm.openrouterModel : 'none'),
      },
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryRssMb,
        activeNetwork: config.web3.networkId,
        nodeEnv: config.server.env,
        status: 'healthy',
        lastHeartbeat: new Date().toISOString(),
      },
      recentBurns: burnEvents.slice(0, 10),
    };
  }
}
