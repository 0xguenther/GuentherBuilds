import { prisma } from '../db/client.js';
import { BurnService } from '../services/burnService.js';
import { MarketingService } from '../services/marketingService.js';
import { MetricsService } from '../services/metricsService.js';

export interface ElizaMemory {
  id?: string;
  userId?: string;
  agentId?: string;
  content: {
    text: string;
    action?: string;
    params?: Record<string, unknown>;
  };
}

export interface ElizaState {
  bio?: string;
  lore?: string;
  messageDirections?: string;
  providers?: string;
  [key: string]: unknown;
}

export interface ElizaAction {
  name: string;
  similes: string[];
  description: string;
  validate: (memory: ElizaMemory, state?: ElizaState) => Promise<boolean>;
  handler: (
    memory: ElizaMemory,
    state?: ElizaState,
    options?: unknown,
    callback?: (response: { text: string; data?: unknown }) => void
  ) => Promise<boolean>;
  examples: Array<Array<{ user: string; content: { text: string; action?: string } }>>;
}

export interface ElizaProvider {
  get: (memory?: ElizaMemory, state?: ElizaState) => Promise<string>;
}

/**
 * Provider 1: Revenue & State Provider
 * Injects real-time Stripe revenue and burn statistics directly into the ElizaOS prompt context.
 */
export const revenueStateProvider: ElizaProvider = {
  get: async () => {
    try {
      const payments = await prisma.payment.findMany();
      // Filter out failed payments for accurate net revenue representation
      const validPayments = payments.filter((p) => p.status !== 'failed');
      const totalCents = validPayments.reduce((acc, p) => acc + p.amountCents, 0);
      const totalTokensBurned = validPayments.reduce(
        (acc, p) => acc + (p.burnAmount ? BigInt(p.burnAmount) : 0n),
        0n
      );
      const pendingCount = payments.filter((p) => p.status === 'received').length;

      const formattedUsd = (totalCents / 100).toFixed(2);
      const formattedTokens = new Intl.NumberFormat('en-US').format(totalTokensBurned);

      return `[GÜNTHER STATE]
Gesamtumsatz: $${formattedUsd} USD
Verbrannte $GÜNTER: ${formattedTokens}
Offene Ausführungen: ${pendingCount} Transaktionen`;
    } catch {
      return '[GÜNTHER STATE] SQLite Status offline oder synchronisierend.';
    }
  },
};

/**
 * Provider 2: Deep Observability & Metrics Provider
 */
export const metricsProvider: ElizaProvider = {
  get: async () => {
    try {
      const m = await MetricsService.getLiveMetrics();
      return `[GÜNTHER METRICS]
Umsatz: $${m.financials.totalRevenueUsd} USD | Verbrannt: ${m.financials.totalBurnedTokens} $GÜNTER
Claw Mart: ${m.products.clawMart.totalSkills} Skills (${m.products.clawMart.totalDownloads} Downloads)
B2B Leads: ${m.products.clawcommerceB2b.totalLeads} | AI Profit Margin: ${m.aiObservability.netProfitMarginPercent === null ? `n/a (noch kein Umsatz, Inferenzkosten $${m.aiObservability.totalInferenceCostUsd.toFixed(2)})` : `${m.aiObservability.netProfitMarginPercent}%`}`;
    } catch {
      return '[GÜNTHER METRICS] Live-Metriken werden aggregiert.';
    }
  },
};

/**
 * Action 1: Execute Revenue Burn Action
 */
export const executeBurnAction: ElizaAction = {
  name: 'EXECUTE_BURN',
  similes: ['BURN_TOKENS', 'BUYBACK_AND_BURN', 'REVENUE_BURN'],
  description: 'Triggert einen verifizierten On-Chain Token Burn auf Base L2 basierend auf einem Stripe-Umsatz.',
  validate: async (memory) => {
    return Boolean(memory.content.params?.paymentId);
  },
  handler: async (memory, _state, _options, callback) => {
    const paymentId = memory.content.params?.paymentId;
    if (typeof paymentId !== 'string' || !paymentId) return false;

    try {
      const result = await BurnService.executeBurn(paymentId);
      if (callback) {
        callback({
          text: `Burn erfolgreich ausgeführt. TxHash: ${result.txHash}`,
          data: result,
        });
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown burn error';
      if (callback) {
        callback({ text: `Burn fehlgeschlagen: ${message}` });
      }
      return false;
    }
  },
  examples: [
    [
      { user: 'system', content: { text: 'Stripe Webhook payment confirmed: pi_123' } },
      { user: 'Günther', content: { text: 'Führe Burn für pi_123 aus.', action: 'EXECUTE_BURN' } },
    ],
  ],
};

/**
 * Action 2: Announce Burn Action
 */
export const announceBurnAction: ElizaAction = {
  name: 'ANNOUNCE_BURN',
  similes: ['TWEET_BURN', 'POST_PROOF_OF_BURN'],
  description: 'Veröffentlicht den On-Chain Proof-of-Burn auf X.',
  validate: async (memory) => {
    return Boolean(
      memory.content.params?.txHash &&
      memory.content.params?.amountCents &&
      memory.content.params?.tokensBurned !== undefined
    );
  },
  handler: async (memory, _state, _options, callback) => {
    const { amountCents, tokensBurned, txHash } = memory.content.params || {};
    if (typeof amountCents !== 'number' || typeof txHash !== 'string' ||
        (typeof tokensBurned !== 'string' && typeof tokensBurned !== 'number' && typeof tokensBurned !== 'bigint')) return false;
    try {
      const tokens = BigInt(tokensBurned);
      const result = await MarketingService.announceBurn(amountCents, tokens, txHash);
      if (callback) {
        callback({ text: `Proof of Burn getwittert: ${result.tweetId}` });
      }
      return true;
    } catch {
      return false;
    }
  },
  examples: [
    [
      { user: 'system', content: { text: 'Burn abgeschlossen für $49.00' } },
      { user: 'Günther', content: { text: 'Poste Proof-of-Burn.', action: 'ANNOUNCE_BURN' } },
    ],
  ],
};

/**
 * Action 3: Autonomous Daily Market Pulse Action
 */
export const dailyMarketPulseAction: ElizaAction = {
  name: 'DAILY_MARKET_PULSE',
  similes: ['POST_MARKET_UPDATE', 'DAILY_PULSE', 'SHARE_METRICS'],
  description: 'Erstellt und postet autonom das tägliche Günther Market Pulse Update auf X.',
  validate: async () => true,
  handler: async (_memory, _state, _options, callback) => {
    try {
      const result = await MarketingService.generateDailyMarketPulse();
      if (callback) {
        callback({
          text: `Daily Market Pulse erfolgreich getwittert (${result.tweetId}): "${result.text}"`,
          data: result,
        });
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown pulse error';
      if (callback) callback({ text: `Market Pulse fehlgeschlagen: ${msg}` });
      return false;
    }
  },
  examples: [
    [
      { user: 'system', content: { text: '24h Timer abgelaufen: Zeit für Market Pulse' } },
      { user: 'Günther', content: { text: 'Erstelle und poste Daily Market Pulse.', action: 'DAILY_MARKET_PULSE' } },
    ],
  ],
};

/**
 * Official ElizaOS Gunther Plugin
 */
export const guntherEnterprisePlugin = {
  name: 'gunther-enterprise',
  description: 'Enterprise Revenue, Fulfillment and Burn Plugin for Günther AI Agent',
  actions: [executeBurnAction, announceBurnAction, dailyMarketPulseAction],
  providers: [revenueStateProvider, metricsProvider],
  evaluators: [],
};
