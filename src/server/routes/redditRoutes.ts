import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RedditService, RedditStrategy } from '../../services/redditService.js';

const PublishPostSchema = z.object({
  subreddit: z.string().min(2).max(50),
  title: z.string().min(5).max(300).optional(),
  body: z.string().min(10).optional(),
  strategy: z.enum(['selfhosted', 'localllama', 'sideproject']).optional(),
  url: z.string().url().optional(),
});

export async function redditRoutes(app: FastifyInstance) {
  /**
   * GET /api/reddit/status
   * Returns current account connection, karma, account age, and safety readiness
   */
  app.get('/api/reddit/status', async (_req, reply) => {
    try {
      const health = await RedditService.checkAccountHealth();
      return reply.code(200).send(health);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query Reddit status';
      return reply.code(500).send({ error: msg });
    }
  });

  /**
   * GET /api/reddit/curated
   * Returns high-converting, community-tailored post templates
   */
  app.get('/api/reddit/curated', async (_req, reply) => {
    const strategies: RedditStrategy[] = ['selfhosted', 'localllama', 'sideproject'];
    const templates = strategies.map((s) => RedditService.getCuratedPost(s));
    return reply.code(200).send({ templates });
  });

  /**
   * GET /api/reddit/posts
   * Lists historical posts and their delivery status
   */
  app.get('/api/reddit/posts', async (_req, reply) => {
    const posts = await RedditService.listPosts();
    return reply.code(200).send({ count: posts.length, posts });
  });

  /**
   * POST /api/reddit/publish
   * Publishes a curated or custom post to a subreddit
   */
  app.post('/api/reddit/publish', async (req, reply) => {
    const parsed = PublishPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid Reddit publication payload',
        details: parsed.error.issues,
      });
    }

    const { subreddit, strategy, url } = parsed.data;
    let title = parsed.data.title;
    let body = parsed.data.body;

    // If strategy provided, use curated content unless overridden
    if (strategy && (!title || !body)) {
      const curated = RedditService.getCuratedPost(strategy);
      title = title || curated.title;
      body = body || curated.body;
    }

    if (!title || !body) {
      return reply.code(400).send({
        error: 'Both title and body are required when no strategy template is specified',
      });
    }

    try {
      const result = await RedditService.publishPost({
        subreddit,
        title,
        body,
        url,
      });

      return reply.code(201).send({
        success: true,
        post: result,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reddit submission failed';
      return reply.code(502).send({
        success: false,
        error: msg,
      });
    }
  });
}
