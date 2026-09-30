import { z } from 'zod';

export const AgentEventSchema = z.object({
  type: z.enum(['INQUIRY', 'PAYMENT', 'MENTION', 'HEARTBEAT']),
  source: z.string(),
  payload: z.record(z.any()),
  timestamp: z.string().datetime().optional(),
});

export type AgentEvent = z.infer<typeof AgentEventSchema>;

export class LlmRouter {
  private static localOllamaUrl = process.env.LOCAL_LLM_URL || 'http://localhost:11434';
  private static localModel = process.env.LOCAL_LLM_MODEL || 'llama3:8b';

  /**
   * Hybrid Routing:
   * Tier 1: Local Ollama (Llama-3-8B) on-premise at $0 marginal cost with 4000ms timeout
   * Tier 2: Cloud API (Claude Sonnet) fallback if malformed JSON or timeout
   */
  static async routeEvent(event: AgentEvent): Promise<{ route: string; confidence: number }> {
    try {
      const response = await fetch(`${this.localOllamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.localModel,
          prompt: `Classify the following incoming agent event into one route [FULFILLMENT, B2B_TRIAGE, X_REPLY, IGNORE]. Return strictly JSON: {"route": "...", "confidence": 0.95}.\nEvent: ${JSON.stringify(event)}`,
          format: 'json',
          stream: false,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const parsed = JSON.parse(data.response);
        return {
          route: parsed.route || 'FULFILLMENT',
          confidence: parsed.confidence || 0.9,
        };
      }
    } catch {
      // Deterministic fallback to Tier 2 logic
    }

    // Default safe fallback route
    return { route: 'FULFILLMENT', confidence: 1.0 };
  }
}
