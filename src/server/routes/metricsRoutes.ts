import { FastifyInstance } from 'fastify';
import { MetricsService } from '../../services/metricsService.js';
import { MarketingService } from '../../services/marketingService.js';

export async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { days?: number } }>('/api/metrics/funnel', {
    schema: { querystring: { type: 'object', properties: { days: { type: 'integer', minimum: 1, maximum: 3650 } }, additionalProperties: false } },
  }, async (request) => MetricsService.getFunnel({ days: request.query.days }));

  // Live Comprehensive System Metrics
  fastify.get('/api/metrics', async (_request, reply) => {
    try {
      const metrics = await MetricsService.getLiveMetrics();
      return reply.send(metrics);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown metrics error';
      fastify.log.error(`[Metrics] Error calculating metrics: ${message}`);
      return reply.status(500).send({ error: 'Failed to compute live metrics', details: message });
    }
  });

  // Recent Base L2 Burn Feed
  fastify.get('/api/metrics/burns', async (_request, reply) => {
    try {
      const metrics = await MetricsService.getLiveMetrics();
      return reply.send({
        totalBurnedTokens: metrics.financials.totalBurnedTokens,
        burnCount: metrics.financials.totalBurnCount,
        burns: metrics.recentBurns,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  // Trigger or Query Autonomous Daily Market Pulse
  fastify.post('/api/marketing/pulse', async (_request, reply) => {
    try {
      const pulse = await MarketingService.generateDailyMarketPulse();
      return reply.send(pulse);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Pulse generation failed';
      fastify.log.error(`[Marketing] Market pulse failed: ${message}`);
      return reply.status(500).send({ error: message });
    }
  });
}
