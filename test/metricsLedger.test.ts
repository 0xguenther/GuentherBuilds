import { describe, expect, it, vi } from 'vitest';

// Regression: B2B setups and Claw Mart take-rates also get a Payment row (`b2b_…` / `skill_…`) as
// burn ledger. Metrics counted those rows as playbook revenue *and* again from their own tables,
// and booked B2B burns a second time at 1,000 tokens per cent (100x the real burn).
const hash = (c: string) => `0x${c.repeat(64)}`;
const at = new Date('2026-10-07T08:00:00Z');

const db = vi.hoisted(() => ({
  payments: [] as unknown[],
  contracts: [] as unknown[],
  purchases: [] as unknown[],
  inferenceCostUsd: 0,
}));

vi.mock('../src/db/client.js', () => ({
  prisma: {
    payment: { findMany: async () => db.payments },
    skill: { findMany: async () => [] },
    skillPurchase: { findMany: async () => db.purchases },
    b2bLead: { findMany: async () => [] },
    b2bContract: { findMany: async () => db.contracts },
    trace: { aggregate: async () => ({ _sum: { tokens: 0, costUsd: db.inferenceCostUsd } }), count: async () => 0 },
  },
}));

vi.mock('../src/config/index.js', () => ({
  config: {
    server: { env: 'test' },
    llm: { anthropicApiKey: '', openrouterApiKey: '', openrouterModel: '' },
    web3: {
      networkId: 'base',
      gunterTokenAddress: '0xb0e8a9d8B5542Fc907736d19A018bbE131C8cd24',
      burnDestinationAddress: '0x000000000000000000000000000000000000dEaD',
    },
  },
}));

const { MetricsService } = await import('../src/services/metricsService.js');

describe('MetricsService.getLiveMetrics', () => {
  it('counts every revenue source and burn exactly once', async () => {
    db.payments = [
      { id: 'p1', stripePaymentId: 'pi_playbook', amountCents: 4900, status: 'burned', burnAmount: 49_000n, txHash: hash('a'), createdAt: at },
      { id: 'p2', stripePaymentId: 'b2b_pi_setup', amountCents: 200_000, status: 'burned', burnAmount: 2_000_000n, txHash: hash('b'), createdAt: at },
      { id: 'p3', stripePaymentId: 'skill_pi_mart', amountCents: 290, status: 'burned', burnAmount: 2_900n, txHash: hash('c'), createdAt: at },
    ];
    db.contracts = [{ id: 'c1', setupPaid: true, setupFeeCents: 200_000, setupTxHash: hash('b'), updatedAt: at }];
    db.purchases = [{ id: 's1', amountCents: 2900, burnAmountCents: 290, status: 'burned' }];

    const m = await MetricsService.getLiveMetrics();

    expect(m.financials.totalRevenueUsd).toBe(49 + 2000 + 29);
    expect(m.products.playbook).toEqual({ unitsSold: 1, revenueUsd: 49 });
    expect(m.financials.totalBurnCount).toBe(3);
    expect(m.financials.totalBurnedTokens).toBe('2051900');
    expect(m.recentBurns.map((b) => b.source).sort()).toEqual(['CLAWCOMMERCE_B2B', 'CLAW_MART', 'PLAYBOOK']);
  });

  // Regression: with $0 revenue the margin was reported as 100% and posted daily on X.
  it('reports no margin without revenue, and the real margin once there is revenue', async () => {
    db.inferenceCostUsd = 0.3536;
    db.payments = [];
    db.contracts = [];
    db.purchases = [];
    expect((await MetricsService.getLiveMetrics()).aiObservability.netProfitMarginPercent).toBeNull();

    db.payments = [{ id: 'p1', stripePaymentId: 'pi_playbook', amountCents: 4900, status: 'paid', createdAt: at }];
    expect((await MetricsService.getLiveMetrics()).aiObservability.netProfitMarginPercent).toBe(99.28);
    db.inferenceCostUsd = 0;
  });

  it('publishes the token contract with explorer links', async () => {
    const { token } = await MetricsService.getLiveMetrics();

    expect(token).toMatchObject({
      symbol: 'GUNTER',
      decimals: 18,
      network: 'Base Mainnet',
      tokensPerUsd: 1000,
      explorerUrl: 'https://basescan.org/token/0xb0e8a9d8B5542Fc907736d19A018bbE131C8cd24',
      burnedBalanceUrl:
        'https://basescan.org/token/0xb0e8a9d8B5542Fc907736d19A018bbE131C8cd24?a=0x000000000000000000000000000000000000dEaD',
    });
  });
});
