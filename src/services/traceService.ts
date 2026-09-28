import { prisma } from '../db/client.js';
import { config } from '../config/index.js';

export interface TraceRecordInput {
  taskId: string;
  model: string;
  task: string;
  costUsd?: number;
  tokens?: number;
  status?: 'ok' | 'error';
  metadata?: Record<string, any>;
}

export class TraceService {
  /**
   * Records LLM call and token consumption into SQLite and Langfuse
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
        },
      });

      // If Langfuse credentials are present, log event
      if (config.langfuse.publicKey && config.langfuse.secretKey) {
        // Can be extended with official langfuse SDK call
      }

      return trace;
    } catch (err) {
      console.error('Failed to record trace:', err);
    }
  }
}
