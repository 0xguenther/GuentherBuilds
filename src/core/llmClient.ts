import { config } from '../config/index.js';
import { TraceService } from '../services/traceService.js';
import { RoutingDecisionSchema, RoutingDecision } from '../types/index.js';
import { guntherCharacter } from './character.js';

interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
}

interface ClaudeMessageResponse {
  content?: Array<{ type: string; text?: string }>;
  usage?: ClaudeUsage;
}

export class LlmClient {
  /**
   * Local LLM Routing via Ollama with strict JSON schema enforcement
   */
  static async routeWithLocalLlm(
    eventDescription: string,
    taskId: string
  ): Promise<RoutingDecision | null> {
    const startTime = Date.now();
    try {
      const prompt = `Du bist die Routing-Engine für den autonomen KI-Unternehmer Günther.
Analysiere das eingehende Ereignis und entscheide über die nächste Aktion.
Gib das Ergebnis AUSSCHLIESSLICH als gültiges JSON-Objekt zurück, das diesem Schema entspricht:
{
  "action": "EXECUTE_BURN" | "HANDLE_MENTION" | "CREATE_PRODUCT" | "LOG_OBSERVATION" | "IGNORE",
  "reason": "Kurze Begründung",
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "payload": {}
}

Ereignis:
${eventDescription}`;

      const res = await fetch(`${config.llm.localUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.llm.localModel,
          prompt,
          format: 'json',
          stream: false,
          options: {
            temperature: 0.1,
          },
        }),
        signal: AbortSignal.timeout(3000), // Strict 3s timeout
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json() as { response?: string; prompt_eval_count?: number; eval_count?: number };
      if (!data.response) return null;

      const parsed = JSON.parse(data.response);
      const validated = RoutingDecisionSchema.parse(parsed);

      const totalTokens = (data.prompt_eval_count || 0) + (data.eval_count || 0);

      await TraceService.recordTrace({
        taskId,
        model: config.llm.localModel,
        task: 'LOCAL_LLM_ROUTING',
        tokens: totalTokens,
        costUsd: 0,
        status: 'ok',
        metadata: { latencyMs: Date.now() - startTime },
      });

      return validated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown local LLM error';
      // Record failed trace for observability in Langfuse
      await TraceService.recordTrace({
        taskId,
        model: config.llm.localModel,
        task: 'LOCAL_LLM_ROUTING',
        tokens: 0,
        costUsd: 0,
        status: 'error',
        metadata: { error: message, latencyMs: Date.now() - startTime },
      });
      return null;
    }
  }

  /**
   * High-Value Copywriting via Claude 3.5 Sonnet API with Exponential Backoff
   */
  static async generateClaudeReply(
    author: string,
    mentionText: string,
    taskId: string
  ): Promise<string> {
    const startTime = Date.now();

    // Fallback if no Anthropic API key is provided
    if (!config.llm.anthropicApiKey) {
      return `@${author} Zeit ist Geld. Entweder du kaufst das Playbook, baust Agenten oder schaust zu, wie $GÜNTER brennt.`;
    }

    const maxRetries = 3;
    let delay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.llm.anthropicApiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 150,
            system: guntherCharacter.systemPrompt,
            messages: [
              {
                role: 'user',
                content: `Verfasse eine direkte, sachliche Antwort im Brand-Voice auf diesen Tweet von @${author}:\n"${mentionText}"\nMaximal 240 Zeichen. Keine Floskeln.`,
              },
            ],
          }),
          signal: AbortSignal.timeout(6000),
        });

        if (response.status === 429 && attempt < maxRetries) {
          console.warn(`[LlmClient] Claude API rate-limited (429). Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          continue;
        }

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as ClaudeMessageResponse;
        const replyText = data.content?.[0]?.text?.trim();

        const inputTokens = data.usage?.input_tokens || 0;
        const outputTokens = data.usage?.output_tokens || 0;
        const costUsd = (inputTokens * 0.000003) + (outputTokens * 0.000015);

        await TraceService.recordTrace({
          taskId,
          model: 'claude-3-5-sonnet',
          task: 'GENERATE_SALES_REPLY',
          tokens: inputTokens + outputTokens,
          costUsd,
          status: 'ok',
          metadata: { latencyMs: Date.now() - startTime },
        });

        return replyText || `@${author} Zeit ist Geld. Hol dir Günther Craft im Store oder buche ein Clawcommerce-Setup.`;
      } catch (err: unknown) {
        if (attempt === maxRetries) {
          const message = err instanceof Error ? err.message : 'Unknown Claude API error';
          await TraceService.recordTrace({
            taskId,
            model: 'claude-3-5-sonnet',
            task: 'GENERATE_SALES_REPLY',
            tokens: 0,
            costUsd: 0,
            status: 'error',
            metadata: { error: message, latencyMs: Date.now() - startTime },
          });
          return `@${author} Zeit ist Geld. Entweder du kaufst das Playbook, baust Agenten oder schaust zu, wie $GÜNTER brennt.`;
        }
      }
    }

    return `@${author} Zeit ist Geld. Entweder du kaufst das Playbook, baust Agenten oder schaust zu, wie $GÜNTER brennt.`;
  }
}
