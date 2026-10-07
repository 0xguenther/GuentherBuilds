import { z } from 'zod';

// Routing Decision Schema for Local LLM
export const RoutingDecisionSchema = z.object({
  action: z.enum([
    'EXECUTE_BURN',
    'HANDLE_MENTION',
    'CREATE_PRODUCT',
    'LOG_OBSERVATION',
    'IGNORE'
  ]),
  reason: z.string(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  payload: z.record(z.unknown()),
});

export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;

// Stripe Payment Ingestion Event
export interface StripeCheckoutPayload {
  paymentId: string;
  sessionId?: string;
  amountCents: number;
  currency: string;
  customerEmail?: string;
  productDescription?: string;
}

// Token Burn Request
export interface BurnRequest {
  paymentId: string;
  amountCents: number;
  currency: string;
}

// Burn Result
export interface BurnResult {
  success: boolean;
  paymentId: string;
  tokensBurned: bigint;
  txHash?: string;
  error?: string;
}

// X Post Request
export interface XPostRequest {
  text: string;
  inReplyToStatusId?: string;
  idempotencyKey: string;
}
