import { FastifyInstance } from 'fastify';
import { CommunityGrowthService } from '../../services/communityGrowthService.js';
import { prisma } from '../../db/client.js';

export async function growthRoutes(app: FastifyInstance) {
  // GET /api/growth/status — returns recent autonomous engagement history
  app.get('/api/growth/status', async (_req, reply) => {
    try {
      const recentEngagements = await prisma.mention.findMany({
        where: { status: 'replied' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });

      return reply.send({
        success: true,
        totalEngagements: await prisma.mention.count({ where: { status: 'replied' } }),
        recent: recentEngagements,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: msg });
    }
  });

  // POST /api/growth/engage — triggers an autonomous growth cycle (mentions + insight)
  app.post('/api/growth/engage', async (req, reply) => {
    try {
      const result = await CommunityGrowthService.runGrowthCycle();
      return reply.send({
        success: true,
        details: result,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: msg });
    }
  });

  // POST /api/growth/insight — forces publishing a builder insight with developer hashtags
  app.post('/api/growth/insight', async (req, reply) => {
    try {
      const body = (typeof req.body === 'object' && req.body !== null ? req.body : {});
      const force = !('force' in body) || body.force !== false;
      const result = await CommunityGrowthService.publishBuilderInsight(force);
      return reply.send({
        success: result.published,
        details: result,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: msg });
    }
  });

  // POST /api/growth/thread — publishes the 5-part architecture breakdown thread
  app.post('/api/growth/thread', async (_req, reply) => {
    try {
      const result = await CommunityGrowthService.publishArchitectureThread();
      return reply.send({
        success: result.published,
        details: result,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: msg });
    }
  });

  // POST /api/growth/scout — triggers timeline scouting across ecosystem accounts
  app.post('/api/growth/scout', async (req, reply) => {
    try {
      const body = (typeof req.body === 'object' && req.body !== null ? req.body : {});
      const force = !('force' in body) || body.force !== false;
      const { TimelineScoutService } = await import('../../services/timelineScoutService.js');
      const result = await TimelineScoutService.scoutAndReact(force);
      return reply.send({
        success: result.acted,
        details: result,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: msg });
    }
  });
}
