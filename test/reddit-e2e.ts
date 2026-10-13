import { E2E_ADMIN_AUTH } from './e2eGuard.js';
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
    const aiAgents = RedditService.getCuratedPost('ai_agents');
    assert.strictEqual(aiAgents.targetSubreddit, 'AI_Agents');
    assert.ok(aiAgents.title.includes('write permissions'));
    assert.ok(aiAgents.body.includes('Write-Path Check'));

    const localllama = RedditService.getCuratedPost('localllama');
    assert.strictEqual(localllama.targetSubreddit, 'LocalLLaMA');
    assert.ok(localllama.body.includes('Ollama'));

    const mcp = RedditService.getCuratedPost('mcp');
    assert.strictEqual(mcp.targetSubreddit, 'mcp');
    assert.ok(mcp.title.includes('MCP'));
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
    const uniqueTitle = `Agent Write-Path Check Test ${Date.now()}`;
    const result = await RedditService.publishPost({
      subreddit: 'SideProject',
      title: uniqueTitle,
      body: 'Testing Agent Write-Path Check publication flow.',
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
      headers: E2E_ADMIN_AUTH,
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
      headers: E2E_ADMIN_AUTH,
    });

    assert.strictEqual(res.statusCode, 200);
    const json = res.json();
    assert.ok(Array.isArray(json.templates));
    assert.strictEqual(json.templates.length, 6);
  });

  await t.test('7. Fastify API: POST /api/reddit/publish should reject invalid payload with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/reddit/publish',
      headers: E2E_ADMIN_AUTH,
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
      headers: E2E_ADMIN_AUTH,
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
      headers: E2E_ADMIN_AUTH,
    });

    assert.strictEqual(res.statusCode, 200);
    const json = res.json();
    assert.ok(json.count > 0);
    assert.ok(Array.isArray(json.posts));
  });

  await app.close();
});
