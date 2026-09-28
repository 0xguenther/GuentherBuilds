import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { B2bService } from '../../services/b2bService.js';
import { ZodError } from 'zod';

export async function b2bRoutes(fastify: FastifyInstance) {
  // 1. Submit B2B Intake & Qualification
  fastify.post('/api/b2b/intake', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await B2bService.submitLead(request.body);
      return reply.status(201).send({
        success: true,
        ...result,
      });
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validierungsfehler',
          details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      const msg = err instanceof Error ? err.message : 'Unerwarteter Fehler';
      fastify.log.error(`[B2B Intake] Error: ${msg}`);
      return reply.status(500).send({ error: msg });
    }
  });

  // 2. Get Lead & Generated Proposal
  fastify.get('/api/b2b/leads/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const lead = await B2bService.getLead(id);

    if (!lead) {
      return reply.status(404).send({ error: `Lead mit ID '${id}' nicht gefunden.` });
    }

    return reply.status(200).send(lead);
  });

  // 3. Initiate $2,000 Setup Fee Checkout
  fastify.post('/api/b2b/leads/:id/checkout', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const origin = `${request.protocol}://${request.hostname}`;

    try {
      const session = await B2bService.createCheckoutSession(id, origin);
      return reply.status(200).send(session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout Fehler';
      fastify.log.error(`[B2B Checkout] Error for lead ${id}: ${msg}`);
      return reply.status(500).send({ error: msg });
    }
  });

  // 4. List Leads (Dashboard)
  fastify.get('/api/b2b/leads', async (request: FastifyRequest<{ Querystring: { status?: string } }>, reply: FastifyReply) => {
    const { status } = request.query;
    const leads = await B2bService.listLeads(status);
    return reply.status(200).send({
      leads,
      count: leads.length,
    });
  });
}
