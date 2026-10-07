import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { prisma } from '../src/db/client.js';
import { CommunityGrowthService } from '../src/services/communityGrowthService.js';
import { TimelineScoutService } from '../src/services/timelineScoutService.js';
import { LlmClient } from '../src/core/llmClient.js';
import { XMcpClient } from '../src/mcp/xMcp.js';

// Regression: post intervals lived only in memory, so every restart re-posted immediately.
describe('growth post guards survive restarts', () => {
  const prefix = `guard-${randomUUID()}`;

  afterEach(async () => {
    vi.restoreAllMocks();
    await prisma.trace.deleteMany({ where: { taskId: { startsWith: prefix } } });
  });

  it('builder insight respects the last persisted post', async () => {
    await prisma.trace.create({ data: { taskId: `${prefix}-insight`, task: 'GROWTH_INSIGHT_POSTED', model: 'test', status: 'ok' } });
    const llm = vi.spyOn(LlmClient, 'generateCompletion');
    const post = vi.spyOn(XMcpClient, 'postTweet');
    const result = await CommunityGrowthService.publishBuilderInsight(false);
    expect(result.published).toBe(false);
    expect(result.reason).toMatch(/^Rate limit guard/);
    expect(llm).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('timeline scout respects the last persisted post', async () => {
    await prisma.trace.create({ data: { taskId: `${prefix}-scout`, task: 'SCOUT_REACTIVE_INSIGHT_POSTED', model: 'test', status: 'ok' } });
    const post = vi.spyOn(XMcpClient, 'postTweet');
    const result = await TimelineScoutService.scoutAndReact(false);
    expect(result.acted).toBe(false);
    expect(result.reason).toMatch(/^Scout cooldown active/);
    expect(post).not.toHaveBeenCalled();
  });
});
