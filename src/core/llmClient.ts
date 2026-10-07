import { fetchWithRetry } from '../utils/retryUtil.js';
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
    taskId: string,
    user?: string
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

      const res = await fetchWithRetry(`${config.llm.localUrl}/api/generate`, {
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
      }, { maxRetries: 2 });

      const data = await res.json() as { response?: string; prompt_eval_count?: number; eval_count?: number };
      if (!data.response) throw new Error('Local LLM returned no response');

      const parsed = JSON.parse(data.response);
      const validated = RoutingDecisionSchema.parse(parsed);

      const totalTokens = (data.prompt_eval_count || 0) + (data.eval_count || 0);

      await TraceService.recordTrace({
        taskId,
        user,
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
        user,
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
   * Universal Completion via Anthropic Messages API or OpenRouter Chat Completions
   * with Exponential Backoff (429 handling) and Langfuse Tracing
   */
  static async generateCompletion(params: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
    taskId: string;
    taskName: string;
    user?: string;
    timeoutMs?: number;
  }): Promise<{ text: string; model: string; inputTokens: number; outputTokens: number; costUsd: number } | null> {
    const startTime = Date.now();
    const hasAnthropic = Boolean(config.llm.anthropicApiKey);
    const hasOpenRouter = Boolean(config.llm.openrouterApiKey);

    if (!hasAnthropic && !hasOpenRouter) {
      return null;
    }

    const timeoutMs = params.timeoutMs || 8000;
    const maxTokens = params.maxTokens || 300;
    const usedModel = hasAnthropic ? 'claude-3-5-sonnet-20241022' : config.llm.openrouterModel;

    try {
      let replyText = '';
      let inputTokens = 0;
      let outputTokens = 0;

      if (hasAnthropic) {
        const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.llm.anthropicApiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: usedModel,
            max_tokens: maxTokens,
            system: params.systemPrompt,
            messages: [{ role: 'user', content: params.userPrompt }],
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as ClaudeMessageResponse;
        replyText = data.content?.[0]?.text?.trim() || '';
        inputTokens = data.usage?.input_tokens || 0;
        outputTokens = data.usage?.output_tokens || 0;
      } else {
        // OpenRouter API call
        const response = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.llm.openrouterApiKey}`,
            'HTTP-Referer': 'https://0xguenther.org',
            'X-Title': 'Guenther Autonomous AI Entrepreneur',
          },
          body: JSON.stringify({
            model: usedModel,
            max_tokens: maxTokens,
            messages: [
              { role: 'system', content: params.systemPrompt },
              { role: 'user', content: params.userPrompt },
            ],
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
        replyText = data.choices?.[0]?.message?.content?.trim() || '';
        inputTokens = data.usage?.prompt_tokens || 0;
        outputTokens = data.usage?.completion_tokens || 0;
      }

      const costUsd = (inputTokens * 0.000003) + (outputTokens * 0.000015);

      await TraceService.recordTrace({
        taskId: params.taskId,
        user: params.user,
        model: usedModel,
        task: params.taskName,
        tokens: inputTokens + outputTokens,
        costUsd,
        status: 'ok',
        metadata: { latencyMs: Date.now() - startTime },
      });

      return {
        text: replyText,
        model: usedModel,
        inputTokens,
        outputTokens,
        costUsd,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown LLM API error';
      await TraceService.recordTrace({
        taskId: params.taskId,
        user: params.user,
        model: usedModel,
        task: params.taskName,
        tokens: 0,
        costUsd: 0,
        status: 'error',
        metadata: { error: message, latencyMs: Date.now() - startTime },
      });
      return null;
    }
  }

  /**
   * High-Value Copywriting via Claude / OpenRouter API with Fallback
   */
  static async generateClaudeReply(
    author: string,
    mentionText: string,
    taskId: string
  ): Promise<string> {
    const completion = await this.generateCompletion({
      systemPrompt: guntherCharacter.systemPrompt,
      userPrompt: `Verfasse eine direkte, sachliche Antwort im Brand-Voice auf diesen Tweet von @${author}:\n"${mentionText}"\nMaximal 240 Zeichen. Keine Floskeln.`,
      maxTokens: 150,
      taskId,
      taskName: 'GENERATE_SALES_REPLY',
      user: author,
      timeoutMs: 8000,
    });

    if (completion && completion.text) {
      return completion.text;
    }

    return `@${author} Zeit ist Geld. Entweder du kaufst das Playbook, baust Agenten oder schaust zu, wie $GÜNTER brennt.`;
  }
}
