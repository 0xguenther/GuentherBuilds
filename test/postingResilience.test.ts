import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../src/config/index.js';
import { prisma } from '../src/db/client.js';
import { BrowserPosterUnavailableError, posterFetch, type PosterTarget } from '../src/mcp/browserPoster.js';
import { RedditMcpClient } from '../src/mcp/redditMcp.js';
import { HnMcpClient } from '../src/mcp/hnMcp.js';
import { HnService } from '../src/services/hnService.js';
import { REDDIT_DISCLOSURE, RedditService } from '../src/services/redditService.js';
import { LlmClient } from '../src/core/llmClient.js';
import { TraceService } from '../src/services/traceService.js';
import { PostingWatchdogService, evaluatePosting, type PostingCheckInput } from '../src/services/postingWatchdogService.js';

const target: PosterTarget = { baseUrl: 'http://poster.test:9333', token: 'secret' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const connectError = (code: string) => Object.assign(new TypeError('fetch failed'), { cause: { code } });

afterEach(() => { vi.restoreAllMocks(); });

describe('posterFetch', () => {
  it('returns parsed JSON and sends the bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ok: 1 }));
    await expect(posterFetch(target, '/x', { timeoutMs: 1000 })).resolves.toEqual({ ok: 1 });
    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer secret');
  });
  it('treats refused connections and HTTP 503 as "nothing sent"', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(connectError('ECONNREFUSED'));
    await expect(posterFetch(target, '/x', { timeoutMs: 1000 })).rejects.toBeInstanceOf(BrowserPosterUnavailableError);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ error: 'Browser unavailable' }, 503));
    await expect(posterFetch(target, '/x', { timeoutMs: 1000 })).rejects.toBeInstanceOf(BrowserPosterUnavailableError);
  });
  it('keeps unclear outcomes (timeout, HTTP 500) as plain errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError'));
    await expect(posterFetch(target, '/x', { timeoutMs: 1000 })).rejects.not.toBeInstanceOf(BrowserPosterUnavailableError);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ error: 'boom' }, 500));
    const err = await posterFetch(target, '/x', { timeoutMs: 1000 }).catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(BrowserPosterUnavailableError);
  });
});

describe('reddit via browser poster', () => {
  beforeEach(() => {
    vi.spyOn(RedditMcpClient, 'hasBrowserPoster').mockReturnValue(true);
    vi.spyOn(RedditMcpClient, 'hasValidCredentials').mockReturnValue(false);
  });
  it('lists threads through the poster without OAuth credentials', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: { children: [{ data: { name: 't3_a', subreddit: 'mcp', created_utc: 1, score: 1 } }], after: 'x' } }));
    const api = vi.spyOn(RedditMcpClient, 'api');
    const res = await RedditMcpClient.listing('/r/mcp/new?limit=25');
    expect(res.items.map(i => i.name)).toEqual(['t3_a']);
    expect(res.after).toBe('x');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/reddit/listing?path=%2Fr%2Fmcp%2Fnew%3Flimit%3D25');
    expect(api).not.toHaveBeenCalled();
  });
  it('comments through the poster', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ success: true, comment: { redditId: 't1_zzz' } }));
    await expect(RedditMcpClient.submitComment('t3_a', 'hello')).resolves.toBe('t1_zzz');
  });
  it('never repeats an unclear comment via the API fallback', async () => {
    vi.mocked(RedditMcpClient.hasValidCredentials).mockReturnValue(true);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ error: 'outcome unknown' }, 500));
    const api = vi.spyOn(RedditMcpClient, 'api').mockResolvedValue({});
    await expect(RedditMcpClient.submitComment('t3_a', 'hello')).rejects.toThrow('HTTP 500');
    expect(api).not.toHaveBeenCalled();
  });
  it('falls back to the API only when the poster provably did not send', async () => {
    vi.mocked(RedditMcpClient.hasValidCredentials).mockReturnValue(true);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(connectError('ECONNREFUSED'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const api = vi.spyOn(RedditMcpClient, 'api').mockResolvedValue({ json: { data: { things: [{ data: { name: 't1_api' } }] } } });
    await expect(RedditMcpClient.submitComment('t3_a', 'hello')).resolves.toBe('t1_api');
    expect(api).toHaveBeenCalledOnce();
  });
  it('reports the poster failure, not "credentials missing", for account lookups', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ error: 'session logged out' }, 502));
    const previousEnv = config.server.env;
    vi.stubEnv('NODE_ENV', 'production');
    config.server.env = 'production';
    try {
      await expect(RedditMcpClient.getAccountInfo()).rejects.toThrow('HTTP 502');
    } finally { vi.unstubAllEnvs(); config.server.env = previousEnv; }
  });
});

describe('posting watchdog decision', () => {
  const healthy: PostingCheckInput = {
    posterConfigured: true,
    poster: { status: 'ok', browserConnected: true, redditSession: true, hnSession: true },
    posterError: null, xConfigured: true, lastXPostAt: new Date(1_000_000_000_000 - 3_600_000),
    now: 1_000_000_000_000, xMaxSilenceMs: 30 * 3_600_000,
  };
  it('is quiet when everything works', () => { expect(evaluatePosting(healthy)).toEqual([]); });
  it('flags an unreachable poster and a dead browser', () => {
    expect(evaluatePosting({ ...healthy, poster: null, posterError: 'ECONNREFUSED' })[0]).toContain('ECONNREFUSED');
    expect(evaluatePosting({ ...healthy, poster: { status: 'down', browserConnected: false, redditSession: false, hnSession: false, error: 'Browser unavailable' } }))
      .toEqual([expect.stringContaining('Brave/CDP down')]);
  });
  it('flags expired logins separately', () => {
    const poster = { status: 'degraded' as const, browserConnected: true, redditSession: false, hnSession: true };
    expect(evaluatePosting({ ...healthy, poster })).toEqual(['Reddit-Login in Brave abgelaufen']);
  });
  it('flags X silence beyond the limit and never-posted', () => {
    expect(evaluatePosting({ ...healthy, lastXPostAt: new Date(healthy.now - 31 * 3_600_000) })[0]).toContain('31 h');
    expect(evaluatePosting({ ...healthy, lastXPostAt: null })[0]).toContain('Noch nie');
    expect(evaluatePosting({ ...healthy, xConfigured: false, lastXPostAt: null })).toEqual([]);
  });
  it('ignores unconfigured channels', () => {
    expect(evaluatePosting({ ...healthy, posterConfigured: false, poster: null, xConfigured: false })).toEqual([]);
  });
});

describe('OpenRouter requests', () => {
  it('disable hidden reasoning so short completions are not swallowed', async () => {
    const previous = { key: config.llm.openrouterApiKey, anthropic: config.llm.anthropicApiKey };
    config.llm.openrouterApiKey = 'sk-test'; config.llm.anthropicApiKey = '';
    vi.spyOn(TraceService, 'recordTrace').mockResolvedValue(undefined);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ choices: [{ message: { content: 'hi' } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }));
    try {
      const res = await LlmClient.generateCompletion({ systemPrompt: 's', userPrompt: 'u', taskId: 't', taskName: 'T', maxTokens: 80 });
      expect(res?.text).toBe('hi');
      expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).reasoning).toEqual({ enabled: false });
    } finally { config.llm.openrouterApiKey = previous.key; config.llm.anthropicApiKey = previous.anthropic; }
  });
});

describe('reddit drafting and cycle bounds', () => {
  const thread = { name: 't3_abc', title: 'Retry loop duplicates my tool calls', selftext: 'idempotency?', subreddit: 'mcp', created_utc: Date.now() / 1000, score: 1 };
  const draftJson = JSON.stringify({ threadId: 't3_abc', body: `Key every write on a request id. ${REDDIT_DISCLOSURE}`, relevant: true });
  const state = RedditService as unknown as { localLlmDownUntil: number; nextCycleAt: number; busy: boolean; rejectedThreads: Set<string> };
  beforeEach(() => {
    state.localLlmDownUntil = 0; state.nextCycleAt = 0; state.busy = false; state.rejectedThreads.clear();
    vi.spyOn(TraceService, 'recordTrace').mockResolvedValue(undefined);
  });
  it('falls back to the cloud model when the local model is down, and parses fenced JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(connectError('ECONNREFUSED'));
    const cloud = vi.spyOn(LlmClient, 'generateCompletion').mockResolvedValue({ text: `\`\`\`json\n${draftJson}\n\`\`\``, model: 'm', inputTokens: 1, outputTokens: 1, costUsd: 0 });
    const draft = await RedditService.draftComment(thread);
    expect(draft).toEqual({ threadId: 't3_abc', body: expect.stringContaining('request id'), relevant: true });
    expect(cloud).toHaveBeenCalledOnce();
  });
  it('accepts cloud answers with prose around the JSON and echoed extra fields', async () => {
    state.localLlmDownUntil = Date.now() + 60_000;
    const answer = `Here you go:\n${JSON.stringify({ threadId: 't3_abc', title: 'echoed', body: `Use idempotency keys. ${REDDIT_DISCLOSURE}`, relevant: true })}\nHope it helps.`;
    vi.spyOn(LlmClient, 'generateCompletion').mockResolvedValue({ text: answer, model: 'm', inputTokens: 1, outputTokens: 1, costUsd: 0 });
    expect(await RedditService.draftComment(thread)).toEqual({ threadId: 't3_abc', body: `Use idempotency keys. ${REDDIT_DISCLOSURE}`, relevant: true });
  });
  it('stops hammering a dead local model for 30 minutes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(connectError('ECONNREFUSED'));
    vi.spyOn(LlmClient, 'generateCompletion').mockResolvedValue(null);
    await RedditService.draftComment(thread);
    const afterFirst = fetchMock.mock.calls.length;
    await RedditService.draftComment(thread);
    expect(fetchMock.mock.calls.length).toBe(afterFirst);
  });
  it('returns null when no LLM answers and rejects drafts that do not match the schema', async () => {
    state.localLlmDownUntil = Date.now() + 60_000;
    const cloud = vi.spyOn(LlmClient, 'generateCompletion').mockResolvedValueOnce(null).mockResolvedValueOnce({ text: 'not json', model: 'm', inputTokens: 0, outputTokens: 0, costUsd: 0 });
    expect(await RedditService.draftComment(thread)).toBeNull();
    expect(await RedditService.draftComment(thread)).toBeNull();
    expect(cloud).toHaveBeenCalledTimes(2);
  });
  it('drafts at most 4 threads per cycle and does not retry real rejections', async () => {
    vi.spyOn(RedditService, 'credentialsAvailable').mockReturnValue(true);
    vi.spyOn(PostingWatchdogService, 'isBrowserDown').mockReturnValue(false);
    vi.spyOn(RedditService, 'checkAccountHealth').mockResolvedValue({ isReadyForPosting: false } as never);
    vi.spyOn(prisma.trace, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.trace, 'findUnique').mockResolvedValue(null);
    const items = Array.from({ length: 10 }, (_, i) => ({ ...thread, name: `t3_${i}` }));
    vi.spyOn(RedditMcpClient, 'listing').mockResolvedValue({ items, after: null });
    const draft = vi.spyOn(RedditService, 'draftComment').mockImplementation(async t => ({ threadId: t.name, body: 'no', relevant: false }));
    await RedditService.runAutonomousCycle();
    expect(draft).toHaveBeenCalledTimes(4);
    state.nextCycleAt = 0;
    await RedditService.runAutonomousCycle();
    expect(draft.mock.calls.slice(4).map(c => c[0].name)).toEqual(['t3_4', 't3_5', 't3_6', 't3_7']);
  });
  it('skips the cycle while the browser is down and no OAuth fallback exists', async () => {
    vi.spyOn(RedditService, 'credentialsAvailable').mockReturnValue(true);
    vi.spyOn(PostingWatchdogService, 'isBrowserDown').mockReturnValue(true);
    vi.spyOn(RedditMcpClient, 'hasValidCredentials').mockReturnValue(false);
    const health = vi.spyOn(RedditService, 'checkAccountHealth');
    await RedditService.runAutonomousCycle();
    expect(health).not.toHaveBeenCalled();
  });
});

describe('HN cycle safety', () => {
  const trace = (over: Record<string, unknown> = {}) => ({ id: 'claim-1', ...over });
  beforeEach(() => {
    (HnService as unknown as { nextAttemptAt: number }).nextAttemptAt = 0;
    vi.spyOn(HnMcpClient, 'hasBrowserPoster').mockReturnValue(true);
    vi.spyOn(PostingWatchdogService, 'isBrowserDown').mockReturnValue(false);
    vi.spyOn(prisma.trace, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.trace, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.trace, 'create').mockResolvedValue(trace() as never);
    vi.spyOn(prisma.trace, 'update').mockResolvedValue(trace() as never);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  it('skips silently while the browser is known to be down', async () => {
    vi.mocked(PostingWatchdogService.isBrowserDown).mockReturnValue(true);
    const submit = vi.spyOn(HnMcpClient, 'submitPost');
    await HnService.runAutonomousCycle();
    expect(submit).not.toHaveBeenCalled();
    expect(prisma.trace.create).not.toHaveBeenCalled();
  });
  it('claims before sending and marks success afterwards', async () => {
    vi.spyOn(HnMcpClient, 'submitPost').mockResolvedValue({ hnId: '1', url: 'https://news.ycombinator.com/item?id=1', title: 't', createdAt: '' });
    await HnService.runAutonomousCycle();
    expect(vi.mocked(prisma.trace.create).mock.calls[0][0].data.status).toBe('pending');
    expect(vi.mocked(prisma.trace.update).mock.calls[0][0].data.status).toBe('success');
  });
  it('releases the claim when the poster was unreachable, then backs off', async () => {
    const submit = vi.spyOn(HnMcpClient, 'submitPost').mockRejectedValue(new BrowserPosterUnavailableError('down'));
    await HnService.runAutonomousCycle();
    expect(vi.mocked(prisma.trace.update).mock.calls[0][0].data.status).toBe('error');
    await HnService.runAutonomousCycle();
    expect(submit).toHaveBeenCalledOnce();
  });
  it('keeps the claim pending when the outcome is unclear', async () => {
    vi.spyOn(HnMcpClient, 'submitPost').mockRejectedValue(new Error('Browser poster error (HTTP 500)'));
    await HnService.runAutonomousCycle();
    expect(prisma.trace.update).not.toHaveBeenCalled();
  });
  it('counts pending claims against the daily limit', async () => {
    vi.mocked(prisma.trace.findMany).mockResolvedValue([{ createdAt: new Date(), status: 'pending' }] as never);
    const submit = vi.spyOn(HnMcpClient, 'submitPost');
    await HnService.runAutonomousCycle();
    expect(submit).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.trace.findMany).mock.calls[0][0]?.where?.status).toEqual({ in: ['success', 'pending'] });
  });
});
