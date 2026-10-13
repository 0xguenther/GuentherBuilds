import type { FastifyInstance } from 'fastify';
import { ReachService } from '../../services/reachService.js';

export async function reachRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { days?: string } }>('/api/reach', async (request, reply) => {
    const days = Number(request.query.days ?? 14);
    if (!Number.isInteger(days) || days < 1 || days > 366) {
      return reply.code(400).send({ error: 'days must be an integer from 1 to 366' });
    }
    return {
      timezone: 'UTC',
      metricsBasis: 'Observed cumulative-counter increases; first observation counted in full. Unavailable counters contribute no observations. Reddit/HN scores are signed observation deltas; items are first-observed items.',
      ordersBasis: 'Recorded paid purchases and paid enterprise setups by record creation day; audit refunds excluded. Other product records have no refund field. No individual campaign attribution.',
      days: await ReachService.getDailyReach(days),
    };
  });
}
