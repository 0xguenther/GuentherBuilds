import { FastifyInstance } from 'fastify';
import { HnDraftService } from '../../services/hnDraftService.js';

export async function hnDraftRoutes(app: FastifyInstance) {
  // GET /api/hn/drafts — pending comment drafts for human review
  app.get('/api/hn/drafts', async (_req, reply) => {
    try {
      const drafts = await HnDraftService.listPending();
      return reply.send({ success: true, drafts });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: msg });
    }
  });

  // POST /api/hn/drafts/scan — force a scan (rate-limits still apply unless force)
  app.post('/api/hn/drafts/scan', async (req, reply) => {
    try {
      const force = (req.body as { force?: boolean })?.force === true;
      const result = await HnDraftService.runScan(force);
      return reply.send({ success: true, ...result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: msg });
    }
  });

  // POST /api/hn/drafts/:id/approve — human approved (optionally with edited body)
  app.post<{ Params: { id: string }; Body: { body?: string } }>('/api/hn/drafts/:id/approve', async (req, reply) => {
    try {
      const draft = await HnDraftService.approve(req.params.id, req.body?.body);
      return reply.send({ success: true, draft });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: msg });
    }
  });

  // POST /api/hn/drafts/:id/posted — human pasted the comment on HN
  app.post<{ Params: { id: string }; Body: { url?: string } }>('/api/hn/drafts/:id/posted', async (req, reply) => {
    try {
      const draft = await HnDraftService.markPosted(req.params.id, req.body?.url);
      return reply.send({ success: true, draft });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: msg });
    }
  });

  // POST /api/hn/drafts/:id/post — send the approved comment via browser-poster
  app.post<{ Params: { id: string }; Body: { force?: boolean } }>('/api/hn/drafts/:id/post', async (req, reply) => {
    try {
      const draft = await HnDraftService.postApproved(req.params.id, { force: req.body?.force === true });
      return reply.send({ success: true, draft });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: msg });
    }
  });

  // POST /api/hn/drafts/:id/reject
  app.post<{ Params: { id: string } }>('/api/hn/drafts/:id/reject', async (req, reply) => {
    try {
      const draft = await HnDraftService.reject(req.params.id);
      return reply.send({ success: true, draft });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: msg });
    }
  });
}
