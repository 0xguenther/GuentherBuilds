import { RoutingDecisionSchema, RoutingDecision } from '../types/index.js';
import { TraceService } from '../services/traceService.js';
import { LlmClient } from './llmClient.js';

export interface InboundEvent {
  source: 'STRIPE_WEBHOOK' | 'X_MENTION' | 'CRON_TRIGGER' | 'USER_PROMPT';
  rawPayload: Record<string, any>;
}

export class EventRouter {
  /**
   * Routes an inbound event strictly to a structured JSON decision.
   * If local Ollama/vLLM is available, queries it with structured JSON schema.
   * Otherwise uses deterministic rule-based structured routing.
   */
  static async routeEvent(event: InboundEvent): Promise<RoutingDecision> {
    const taskId = `route-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Fast deterministic routing for verified Stripe webhooks
    if (event.source === 'STRIPE_WEBHOOK') {
      const decision: RoutingDecision = {
        action: 'EXECUTE_BURN',
        reason: 'Valid Stripe checkout completed webhook received',
        priority: 'HIGH',
        payload: {
          paymentId: event.rawPayload.paymentId,
          amountCents: event.rawPayload.amountCents,
          currency: event.rawPayload.currency,
        },
      };

      await TraceService.recordTrace({
        taskId,
        model: 'rule-deterministic',
        task: 'ROUTE_STRIPE_EVENT',
        tokens: 0,
        costUsd: 0,
        status: 'ok',
      });

      return RoutingDecisionSchema.parse(decision);
    }

    if (event.source === 'X_MENTION') {
      // 1. Attempt structured routing with local LLM
      const localDecision = await LlmClient.routeWithLocalLlm(
        `X Mention von @${event.rawPayload.author}: "${event.rawPayload.text}"`,
        taskId
      );

      // Security Guard: Never allow an untrusted X_MENTION to trigger financial burns or product creation!
      if (
        localDecision &&
        localDecision.action !== 'EXECUTE_BURN' &&
        localDecision.action !== 'CREATE_PRODUCT'
      ) {
        return localDecision;
      }

      // 2. Deterministic Fallback
      const fallbackDecision: RoutingDecision = {
        action: 'HANDLE_MENTION',
        reason: 'New X mention received (deterministic fallback)',
        priority: 'MEDIUM',
        payload: {
          tweetId: event.rawPayload.tweetId,
          author: event.rawPayload.author,
          text: event.rawPayload.text,
        },
      };

      await TraceService.recordTrace({
        taskId,
        model: 'rule-deterministic',
        task: 'ROUTE_X_EVENT',
        tokens: 0,
        costUsd: 0,
        status: 'ok',
      });

      return RoutingDecisionSchema.parse(fallbackDecision);
    }

    // Default fallback
    return RoutingDecisionSchema.parse({
      action: 'LOG_OBSERVATION',
      reason: 'Unrecognized event source or no action needed',
      priority: 'LOW',
      payload: event.rawPayload,
    });
  }
}
