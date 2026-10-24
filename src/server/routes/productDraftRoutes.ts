import { FastifyInstance } from 'fastify';
import { ProductDraftService } from '../../services/productDraftService.js';

export async function productDraftRoutes(app: FastifyInstance) {
  // GET /api/products/drafts — drafts waiting for a decision (admin token)
  app.get('/api/products/drafts', async (_req, reply) => {
    try {
      const drafts = await ProductDraftService.listPending();
      return reply.send({ success: true, drafts });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: msg });
    }
  });

  // POST /api/products/drafts/:id/approve|reject — approving does not publish; the catalog stays manual
  app.post<{ Params: { id: string; decision: string } }>('/api/products/drafts/:id/:decision', async (req, reply) => {
    const { id, decision } = req.params;
    if (decision !== 'approve' && decision !== 'reject') {
      return reply.status(404).send({ error: 'Unknown decision' });
    }
    try {
      const result = await ProductDraftService.decide(id, decision === 'approve' ? 'approved' : 'rejected');
      if (result === 'not_found') return reply.status(404).send({ error: 'Draft not found' });
      if (result === 'already_decided') return reply.status(409).send({ error: 'Draft already decided' });
      return reply.send({ success: true, id, status: decision === 'approve' ? 'approved' : 'rejected' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: msg });
    }
  });
}
