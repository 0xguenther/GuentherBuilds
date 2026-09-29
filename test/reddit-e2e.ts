import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/server/app.js';
import { RedditMcpClient } from '../src/mcp/redditMcp.js';
import { RedditService } from '../src/services/redditService.js';
import { prisma } from '../src/db/client.js';

test('Reddit Autonomous Distribution & MCP Suite', async (t) => {
  const app = await buildApp();

  await t.test('1. should simulate Reddit post submission deterministically in test mode', async () => {
    const res = await RedditMcpClient.submitPost({
      subreddit: 'selfhosted',
      title: 'Test Autonomous Agent Showcase',
      text: 'Detailed technical explanation here.',
    });

    assert.ok(res.redditId.startsWith('t3_sim_'));
    assert.strictEqual(res.subreddit, 'selfhosted');
    assert.ok(res.url.includes('/r/selfhosted/comments/'));
    assert.strictEqual(res.title, 'Test Autonomous Agent Showcase');
  });

  await t.test('2. should verify curated post templates for each strategic audience', async () => {
    const selfhosted = RedditService.getCuratedPost('selfhosted');
    assert.strictEqual(selfhosted.targetSubreddit, 'selfhosted');
    assert.ok(selfhosted.title.includes('Proxmox'));
    assert.ok(selfhosted.body.includes('0xguenther.org'));

    const localllama = RedditService.getCuratedPost('localllama');
    assert.strictEqual(localllama.targetSubreddit, 'LocalLLaMA');
    assert.ok(localllama.title.includes('Zero-hallucination'));
    assert.ok(localllama.body.includes('Ollama'));

    const sideproject = RedditService.getCuratedPost('sideproject');
    assert.strictEqual(sideproject.targetSubreddit, 'SideProject');
    assert.ok(sideproject.title.includes('autonomous AI agent'));
  });

  await t.test('3. should assess account health, karma, and anti-ban safeguards', async () => {
    const health = await RedditService.checkAccountHealth();
    assert.ok(health.account);
    assert.strictEqual(typeof health.isReadyForPosting, 'boolean');
    assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(health.riskLevel));
    assert.ok(Array.isArray(health.warnings));
    assert.ok(Array.isArray(health.recommendations));
  });

  await t.test('4. should publish post via RedditService and persist to SQLite', async () => {
    const uniqueTitle = `Unique Showcase Architecture ${Date.now()}`;
    const result = await RedditService.publishPost({
      subreddit: 'SideProject',
      title: uniqueTitle,
      body: 'Autonomous ecommerce architecture running on Fastify.',
    });

    assert.ok(result.redditId);
    assert.ok(result.url);

    // Verify database record
    const dbPost = await prisma.redditPost.findFirst({
      where: { title: uniqueTitle },
    });
    assert.ok(dbPost);
    assert.strictEqual(dbPost.status, 'submitted');
    assert.strictEqual(dbPost.subreddit, 'SideProject');

    // Verify duplicate prevention within 24h returns existing
    const dupResult = await RedditService.publishPost({
      subreddit: 'SideProject',
      title: uniqueTitle,
      body: 'Different body that should be skipped.',
    });
    assert.strictEqual(dupResult.redditId, result.redditId);
  });

  await t.test('5. Fastify API: GET /api/reddit/status should return health assessment', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/reddit/status',
    });

    assert.strictEqual(res.statusCode, 200);
    const json = res.json();
    assert.ok(json.account);
    assert.ok('isReadyForPosting' in json);
  });

  await t.test('6. Fastify API: GET /api/reddit/curated should return template catalog', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/reddit/curated',
    });

    assert.strictEqual(res.statusCode, 200);
    const json = res.json();
    assert.ok(Array.isArray(json.templates));
    assert.strictEqual(json.templates.length, 3);
  });

  await t.test('7. Fastify API: POST /api/reddit/publish should reject invalid payload with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/reddit/publish',
      payload: {
        subreddit: 's', // too short (<2)
      },
    });

    assert.strictEqual(res.statusCode, 400);
  });

  await t.test('8. Fastify API: POST /api/reddit/publish should publish curated strategy template', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/reddit/publish',
      payload: {
        subreddit: 'selfhosted',
        strategy: 'selfhosted',
      },
    });

    assert.strictEqual(res.statusCode, 201);
    const json = res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.post?.url);
    assert.strictEqual(json.post?.subreddit, 'selfhosted');
  });

  await t.test('9. Fastify API: GET /api/reddit/posts should list stored posts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/reddit/posts',
    });

    assert.strictEqual(res.statusCode, 200);
    const json = res.json();
    assert.ok(json.count > 0);
    assert.ok(Array.isArray(json.posts));
  });

  await app.close();
});
