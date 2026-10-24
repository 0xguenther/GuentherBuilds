import { FastifyInstance } from 'fastify';
import { SalesOutreachService } from '../../services/salesOutreachService.js';

export async function salesRoutes(app: FastifyInstance) {
  // GET /api/sales/pipeline — current commercial-signal pipeline
  app.get('/api/sales/pipeline', async (_req, reply) => {
    try {
      const status = await SalesOutreachService.getPipelineStatus();
      return reply.send({ success: true, ...status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: msg });
    }
  });

  // POST /api/sales/outreach — force an outreach cycle (rate-limits still apply)
  app.post('/api/sales/outreach', async (_req, reply) => {
    try {
      const result = await SalesOutreachService.runOutreachCycle();
      return reply.send({ success: true, details: result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: msg });
    }
  });
}
