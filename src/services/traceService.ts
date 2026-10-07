import { fetchWithRetry } from '../utils/retryUtil.js';
import { prisma } from '../db/client.js';
import { config } from '../config/index.js';

export interface TraceRecordInput {
  taskId: string;
  model: string;
  task: string;
  user?: string;
  costUsd?: number;
  tokens?: number;
  status?: 'ok' | 'error';
  metadata?: Record<string, unknown>;
}

export class TraceService {
  /**
   * Records LLM call and token consumption into SQLite and Langfuse
   * Tags: taskId, model, task, status + metadata for full observability
   */
  static async recordTrace(input: TraceRecordInput) {
    try {
      const trace = await prisma.trace.create({
        data: {
          taskId: input.taskId,
          model: input.model,
          task: input.task,
          costUsd: input.costUsd ?? 0,
          tokens: input.tokens ?? 0,
          status: input.status ?? 'ok',
          metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
        },
      });

      // Send to Langfuse if credentials present
      if (config.langfuse.publicKey && config.langfuse.secretKey) {
        await this.recordLangfuseTrace(input, trace.id);
      }

      return trace;
    } catch (err) {
      console.error('[TraceService] Failed to record trace:', err);
    }
  }

  /**
   * Sends trace event to Langfuse for centralized observability
   * Tags: taskId, model, task, status
   */
  private static async recordLangfuseTrace(input: TraceRecordInput, traceId: string) {
    try {
      const langfuseUrl = 'https://cloud.langfuse.com/api/public/trace';

      const payload = {
        id: traceId,
        userId: input.user ?? 'günther-core',
        sessionId: input.taskId,
        tags: [
          `task:${input.taskId}`,
          `user:${input.user ?? 'günther-core'}`,
          `model:${input.model}`,
          `task:${input.task}`,
          `status:${input.status || 'ok'}`,
          'autonomous-agent',
        ],
        metadata: {
          taskId: input.taskId,
          model: input.model,
          task: input.task,
          tokens: input.tokens || 0,
          costUsd: input.costUsd || 0,
          ...input.metadata,
        },
        timestamp: new Date().toISOString(),
      };

      const auth = Buffer.from(
        `${config.langfuse.publicKey}:${config.langfuse.secretKey}`
      ).toString('base64');

      await fetchWithRetry(langfuseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      }, { maxRetries: 3 });
    } catch (err) {
      // Fail silently – Langfuse outage sollte nicht den Agent stoppen
      if (process.env.DEBUG_LANGFUSE) {
        console.warn('[TraceService] Langfuse logging failed:', err);
      }
    }
  }
}
