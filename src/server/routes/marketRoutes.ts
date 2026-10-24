import { FastifyInstance } from 'fastify';
import { MarketDemandService } from '../../services/marketDemandService.js';

export async function marketRoutes(app: FastifyInstance) {
  // GET /api/market/demand — current demand brief (cached if analysis is rate-limited)
  app.get('/api/market/demand', async (req, reply) => {
    try {
      const force = (req.query as { force?: string }).force === '1';
      const brief = await MarketDemandService.runDemandAnalysis(force);
      return reply.send({ success: true, ...brief });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: msg });
    }
  });

  // GET /api/market/products — demand-weighted product push order
  app.get('/api/market/products', async (_req, reply) => {
    try {
      const order = await MarketDemandService.preferredProductOrder();
      return reply.send({ success: true, order });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: msg });
    }
  });
}
