import { prisma } from '../db/client.js';
import { config } from '../config/index.js';
import { TOKENS_PER_CENT } from './burnService.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface BurnEventSummary {
  id: string;
  source: 'PLAYBOOK' | 'CLAW_MART' | 'CLAWCOMMERCE_B2B';
  amountUsd: number;
  tokensBurned: string;
  txHash: string;
  explorerUrl: string;
  timestamp: string;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  network: string;
  address: string;
  explorerUrl: string;
  burnAddress: string;
  /** Basescan view of the GUNTER balance held by the burn address (on-chain proof of all burns). */
  burnedBalanceUrl: string;
  tokensPerUsd: number;
}

export interface SystemMetrics {
  token: TokenInfo | null;
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
    /** null until there is revenue: a margin on $0 is undefined, not 100%. */
    netProfitMarginPercent: number | null;
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

const DAY_MS = 86400000;
const PAID_AUDIT_STATUSES = ['paid', 'running', 'delivered', 'failed', 'rejected'];

async function funnelCounts(start: Date, end: Date) {
  const createdAt = { gte: start, lt: end };
  // Only persisted checkouts can be counted; playbook sessions are stored on payment receipt.
  const [visitors, audits, paymentCheckouts, b2bCheckouts, paidAudits, paidPayments] = await Promise.all([
    prisma.pageView.groupBy({ by: ['day', 'visitorHash'], where: { createdAt } }),
    prisma.auditOrder.count({ where: { createdAt } }),
    prisma.payment.count({ where: { createdAt, stripeSessionId: { not: null } } }),
    prisma.b2bLead.count({ where: { createdAt, stripeCheckoutId: { not: null } } }),
    prisma.auditOrder.count({ where: { createdAt, status: { in: PAID_AUDIT_STATUSES } } }),
    // Payment rows are only created on receipt; 'failed' is the sole status without money kept.
    prisma.payment.count({ where: { createdAt, status: { in: ['received', 'calculating', 'burning', 'burned', 'needs_review'] } } }),
  ]);
  return { uniqueVisitors: visitors.length, checkoutsStarted: audits + paymentCheckouts + b2bCheckouts, ordersPaid: paidAudits + paidPayments };
}

export class MetricsService {
  /** UTC calendar days including today; conversion rates are ratios, not percentages. */
  static async getFunnel({ days = 30 }: { days?: number } = {}) {
    if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('days must be an integer between 1 and 3650');
    const now = new Date();
    const end = new Date(now.getTime() + 1);
    const today = new Date(now.toISOString().slice(0, 10));
    const start = new Date(today.getTime() - (days - 1) * DAY_MS);
    const createdAt = { gte: start, lt: end };
    const startDay = process.env.KILL_CRITERION_START || '2026-10-07';
    const killStart = new Date(`${startDay}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDay) || !Number.isFinite(killStart.getTime()) || killStart.toISOString().slice(0, 10) !== startDay) {
      throw new Error('KILL_CRITERION_START must be a valid YYYY-MM-DD date');
    }
    const decisionDay = new Date(killStart.getTime() + 30 * DAY_MS);
    const [counts, pageViews, paths, referrers, killCounts] = await Promise.all([
      funnelCounts(start, end),
      prisma.pageView.count({ where: { createdAt } }),
      prisma.pageView.groupBy({ by: ['path'], where: { createdAt }, _count: { _all: true }, orderBy: { _count: { path: 'desc' } }, take: 10 }),
      prisma.pageView.groupBy({ by: ['referrerHost'], where: { createdAt, referrerHost: { not: null } }, _count: { _all: true }, orderBy: { _count: { referrerHost: 'desc' } }, take: 10 }),
      funnelCounts(killStart, new Date(Math.min(end.getTime(), decisionDay.getTime()))),
    ]);
    const elapsedDays = Math.min(30, Math.max(0, (now.getTime() - killStart.getTime()) / DAY_MS));
    return {
      days, pageViews, ...counts,
      conversionRates: {
        visitorToCheckout: counts.uniqueVisitors ? counts.checkoutsStarted / counts.uniqueVisitors : 0,
        checkoutToPaid: counts.checkoutsStarted ? counts.ordersPaid / counts.checkoutsStarted : 0,
      },
      topPaths: paths.map((row) => ({ path: row.path, pageViews: row._count._all })),
      topReferrerHosts: referrers.map((row) => ({ host: row.referrerHost, pageViews: row._count._all })),
      killCriterion: {
        start: startDay, decisionDay: decisionDay.toISOString().slice(0, 10),
        targets: { visitors: 500, paidOrders: 10 },
        visitors: killCounts.uniqueVisitors, paidOrders: killCounts.ordersPaid,
        daysLeft: Math.max(0, Math.ceil((decisionDay.getTime() - now.getTime()) / DAY_MS)),
        onTrack: killCounts.uniqueVisitors >= 500 * elapsedDays / 30 && killCounts.ordersPaid >= 10 * elapsedDays / 30,
      },
    };
  }

  /**
   * Calculates comprehensive live business and operational metrics for Günther.
   */
  static async getLiveMetrics(): Promise<SystemMetrics> {
    const isMainnet = config.web3.networkId === 'base' || config.web3.networkId.includes('mainnet');
    const explorerOrigin = isMainnet ? 'https://basescan.org' : 'https://sepolia.basescan.org';
    const explorerBase = `${explorerOrigin}/tx/`;

    const tokenAddress = config.web3.gunterTokenAddress;
    const burnAddress = config.web3.burnDestinationAddress;
    const token: TokenInfo | null =
      tokenAddress && tokenAddress.toLowerCase() !== ZERO_ADDRESS
        ? {
            name: 'Günther',
            symbol: 'GUNTER',
            decimals: 18,
            network: isMainnet ? 'Base Mainnet' : 'Base Sepolia',
            address: tokenAddress,
            explorerUrl: `${explorerOrigin}/token/${tokenAddress}`,
            burnAddress,
            burnedBalanceUrl: `${explorerOrigin}/token/${tokenAddress}?a=${burnAddress}`,
            tokensPerUsd: Number(TOKENS_PER_CENT * 100n),
          }
        : null;

    // 1. Fetch data in parallel
    const [payments, skills, skillPurchases, b2bLeads, b2bContracts, traceTotals, llmCallCount] = await Promise.all([
      prisma.payment.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.skill.findMany({ include: { creator: true } }),
      prisma.skillPurchase.findMany({ orderBy: { createdAt: 'desc' }, include: { skill: true } }),
      prisma.b2bLead.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.b2bContract.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.trace.aggregate({ _sum: { tokens: true, costUsd: true } }),
      // Only traces that actually consumed model tokens are LLM calls (daemon/MCP traces are not).
      prisma.trace.count({ where: { tokens: { gt: 0 } } }),
    ]);

    // 2. Financials - Playbooks
    // The Payment table is the burn ledger for every revenue source: B2B setups (`b2b_…`) and
    // Claw Mart take-rates (`skill_…`) get their own rows there. Their revenue is counted from
    // B2bContract / SkillPurchase, so only unprefixed rows are playbook sales.
    const validPayments = payments.filter((p) => p.status !== 'failed');
    const burnSource = (id: string): BurnEventSummary['source'] =>
      id.startsWith('b2b_') ? 'CLAWCOMMERCE_B2B' : id.startsWith('skill_') ? 'CLAW_MART' : 'PLAYBOOK';
    const playbookPayments = validPayments.filter((p) => burnSource(p.stripePaymentId) === 'PLAYBOOK');
    const playbookCents = playbookPayments.reduce((sum, p) => sum + p.amountCents, 0);
    const playbookUnits = playbookPayments.length;

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

    // Only real on-chain transaction hashes count as verified burns; simulated
    // hashes (e.g. `0xbase…` from simulation mode) are never published as burns.
    const isOnChainTxHash = (h: string | null | undefined): h is string => !!h && /^0x[0-9a-fA-F]{64}$/.test(h);

    // Every burn (playbook, B2B setup, Claw Mart take-rate) is a Payment row carrying the
    // amount actually sent on chain, so this ledger is the single source of truth.
    for (const p of validPayments) {
      if (isOnChainTxHash(p.txHash) && p.burnAmount) {
        const tokens = BigInt(p.burnAmount);
        totalBurnedBigInt += tokens;
        burnEvents.push({
          id: p.id,
          source: burnSource(p.stripePaymentId),
          amountUsd: p.amountCents / 100,
          tokensBurned: tokens.toString(),
          txHash: p.txHash,
          explorerUrl: `${explorerBase}${p.txHash}`,
          timestamp: p.createdAt.toISOString(),
        });
      }
    }

    // Sort burns descending by timestamp
    burnEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 5. AI Observability
    const totalTokens = traceTotals._sum.tokens ?? 0;
    const totalInferenceCostUsd = traceTotals._sum.costUsd ?? 0;
    const netProfitMarginPercent =
      totalRevenueUsd > 0
        ? parseFloat((((totalRevenueUsd - totalInferenceCostUsd) / totalRevenueUsd) * 100).toFixed(2))
        : null;

    const memUsage = process.memoryUsage();
    const memoryRssMb = parseFloat((memUsage.rss / 1024 / 1024).toFixed(1));

    return {
      token,
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
        totalLlmCalls: llmCallCount,
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
