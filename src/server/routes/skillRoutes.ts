import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import { skillService } from '../../services/skillService.js';
import { SkillFulfillmentService } from '../../services/skillFulfillmentService.js';
import { StripeMcpClient } from '../../mcp/stripeMcp.js';

export async function skillRoutes(fastify: FastifyInstance) {
  // 1. List available skills
  fastify.get('/api/skills', async (request: FastifyRequest<{ Querystring: { category?: string } }>, reply: FastifyReply) => {
    const { category } = request.query;
    const skills = await skillService.listSkills(category);
    return reply.status(200).send({
      skills,
      count: skills.length,
    });
  });

  // 2. Marketplace Statistics
  fastify.get('/api/skills/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    const stats = await skillService.getMarketplaceStats();
    return reply.status(200).send(stats);
  });

  // 3. Get single skill by slug
  fastify.get('/api/skills/:slug', async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    const { slug } = request.params;
    const skill = await skillService.getSkillBySlug(slug);

    if (!skill) {
      return reply.status(404).send({ error: `Skill '${slug}' nicht gefunden.` });
    }

    return reply.status(200).send(skill);
  });

  // 4. Create Stripe Checkout Session for a skill
  fastify.post('/api/skills/:slug/checkout', async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    const { slug } = request.params;
    const skill = await skillService.getSkillBySlug(slug);

    if (!skill) {
      return reply.status(404).send({ error: `Skill '${slug}' nicht gefunden.` });
    }

    try {
      const origin = `${request.protocol}://${request.hostname}`;

      const session = await StripeMcpClient.createCheckoutSession({
        title: `[Claw Mart] ${skill.title}`,
        description: skill.description,
        priceInCents: skill.priceCents,
        metadata: {
          type: 'skill_purchase',
          skillId: skill.id,
          slug: skill.slug,
        },
        successUrl: `${origin}/?success=true&skill=${skill.slug}`,
        cancelUrl: `${origin}/?canceled=true`,
      });

      return reply.status(200).send({
        checkoutUrl: session.sessionUrl,
        sessionId: session.sessionId,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stripe checkout error';
      fastify.log.error(`[Claw Mart Checkout] Failed to create checkout session: ${msg}`);
      return reply.status(500).send({ error: msg });
    }
  });

  // 5. Secure Download for purchased skills
  fastify.get('/download/skill/:token', async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
    const { token } = request.params;
    const result = await SkillFulfillmentService.verifyAndConsumeSkillToken(token);

    if (!result.valid || !result.filePath) {
      if (result.reason === 'EXPIRED') {
        return reply.status(403).send({ error: 'Download-Link ist abgelaufen (Gültigkeit: 48 Stunden).' });
      }
      if (result.reason === 'LIMIT_EXCEEDED') {
        return reply.status(403).send({ error: 'Download-Limit (max. 5 Downloads) für diesen Kauf erreicht.' });
      }
      return reply.status(404).send({ error: 'Ungültiger oder nicht gefundener Download-Token.' });
    }

    const stream = fs.createReadStream(result.filePath);
    return reply
      .header('Content-Type', 'application/zip')
      .header('Content-Disposition', `attachment; filename="${result.fileName}"`)
      .send(stream);
  });
}
