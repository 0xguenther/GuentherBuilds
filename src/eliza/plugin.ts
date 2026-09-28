import { prisma } from '../db/client.js';
import { BurnService } from '../services/burnService.js';
import { MarketingService } from '../services/marketingService.js';

export interface ElizaMemory {
  id?: string;
  userId?: string;
  agentId?: string;
  content: {
    text: string;
    action?: string;
    params?: Record<string, any>;
  };
}

export interface ElizaState {
  bio?: string;
  lore?: string;
  messageDirections?: string;
  providers?: string;
  [key: string]: any;
}

export interface ElizaAction {
  name: string;
  similes: string[];
  description: string;
  validate: (memory: ElizaMemory, state?: ElizaState) => Promise<boolean>;
  handler: (
    memory: ElizaMemory,
    state?: ElizaState,
    options?: any,
    callback?: (response: { text: string; data?: any }) => void
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
    if (!paymentId) return false;

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
    try {
      const tokens = typeof tokensBurned === 'bigint' ? tokensBurned : BigInt(tokensBurned || 0);
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
 * Official ElizaOS Gunther Plugin
 */
export const guntherEnterprisePlugin = {
  name: 'gunther-enterprise',
  description: 'Enterprise Revenue, Fulfillment and Burn Plugin for Günther AI Agent',
  actions: [executeBurnAction, announceBurnAction],
  providers: [revenueStateProvider],
  evaluators: [],
};
