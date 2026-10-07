import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../src/config/index.js';
import { XMcpClient, XCreditDepletedError, XUnconfirmedError } from '../src/mcp/xMcp.js';
import { RedditMcpClient } from '../src/mcp/redditMcp.js';
import { LlmClient } from '../src/core/llmClient.js';
import { TraceService } from '../src/services/traceService.js';
import { sendEmail } from '../src/services/emailService.js';
import { prisma } from '../src/db/client.js';

const original = { x: { ...config.x }, reddit: { ...config.reddit }, llm: { ...config.llm }, langfuse: { ...config.langfuse }, env: config.server.env };

function response(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Retry-After': '0' } });
}

describe('HTTP client retry policies', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    config.server.env = 'production';
    Object.assign(config.x, { apiKey: 'test', apiSecret: 'test', accessToken: 'test', accessSecret: 'test' });
    Object.assign(config.reddit, { clientId: 'test', clientSecret: 'test', username: 'test', password: 'test' });
    Object.assign(config.llm, { anthropicApiKey: 'test', openrouterApiKey: '' });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(TraceService, 'recordTrace').mockResolvedValue(undefined);
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
    Object.assign(config.x, original.x);
    Object.assign(config.reddit, original.reddit);
    Object.assign(config.llm, original.llm);
    Object.assign(config.langfuse, original.langfuse);
    config.server.env = original.env;
  });

  it.each([429, 500, 502, 503, 504])('retries X GETs on %s', async (status) => {
    fetchMock.mockResolvedValueOnce(response(status)).mockResolvedValueOnce(response(200, { data: [{ id: 'tweet', text: 'test' }] }));
    expect(await XMcpClient.searchRecentTweets({ query: 'test' })).toEqual([{ id: 'tweet', text: 'test', authorId: undefined }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a tweet only after 429 and preserves claim/finish transitions', async () => {
    const claim = vi.spyOn(XMcpClient, 'claimIdempotency').mockResolvedValue({ traceId: 'claim' });
    const finish = vi.spyOn(XMcpClient, 'finishIdempotency').mockResolvedValue(undefined);
    fetchMock.mockResolvedValueOnce(response(429)).mockResolvedValueOnce(response(200, { data: { id: 'tweet', text: 'test' } }));
    expect(await XMcpClient.postTweet({ text: 'test', idempotencyKey: 'key' })).toMatchObject({ tweetId: 'tweet' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(claim).toHaveBeenCalledTimes(2);
    expect(finish).toHaveBeenNthCalledWith(1, 'claim', 'error');
    expect(finish).toHaveBeenNthCalledWith(2, 'claim', 'ok', 'tweet');
    expect(fetchMock.mock.calls[0][1]?.headers).not.toEqual(fetchMock.mock.calls[1][1]?.headers);
  });

  it.each(['500', '503', 'network'])('leaves X claims pending after %s without resending', async (failure) => {
    vi.spyOn(XMcpClient, 'claimIdempotency').mockResolvedValue({ traceId: 'claim' });
    const finish = vi.spyOn(XMcpClient, 'finishIdempotency').mockResolvedValue(undefined);
    if (failure === 'network') fetchMock.mockRejectedValue(new TypeError('network failed'));
    else fetchMock.mockResolvedValue(response(Number(failure)));
    await expect(XMcpClient.postTweet({ text: 'test', idempotencyKey: 'key' })).rejects.toBeInstanceOf(XUnconfirmedError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(finish).not.toHaveBeenCalled();
  });

  it('marks exhausted X rate limits and credit depletion as definite failures', async () => {
    vi.spyOn(XMcpClient, 'claimIdempotency').mockResolvedValue({ traceId: 'claim' });
    const finish = vi.spyOn(XMcpClient, 'finishIdempotency').mockResolvedValue(undefined);
    fetchMock.mockImplementation(async () => response(429));
    await expect(XMcpClient.postTweet({ text: 'test' })).rejects.toThrow('429');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(finish).toHaveBeenCalledWith('claim', 'error');
    fetchMock.mockReset().mockResolvedValue(response(402));
    await expect(XMcpClient.postTweet({ text: 'test' })).rejects.toBeInstanceOf(XCreditDepletedError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('replays an existing X claim without sending', async () => {
    vi.spyOn(XMcpClient, 'claimIdempotency').mockResolvedValue({ replay: { tweetId: 'existing', text: '', createdAt: 'now' } });
    expect(await XMcpClient.postTweet({ text: 'test', idempotencyKey: 'key' })).toMatchObject({ tweetId: 'existing' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['anthropic', 'openrouter'])('retries %s LLM 5xx and includes the author in traces', async (provider) => {
    if (provider === 'openrouter') Object.assign(config.llm, { anthropicApiKey: '', openrouterApiKey: 'test' });
    const body = provider === 'anthropic' ? { content: [{ type: 'text', text: 'reply' }] } : { choices: [{ message: { content: 'reply' } }] };
    fetchMock.mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(200, body));
    expect(await LlmClient.generateClaudeReply('author', 'question', 'task')).toBe('reply');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(TraceService.recordTrace).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task', user: 'author', status: 'ok' }));
  });

  it('does not retry LLM authentication errors', async () => {
    fetchMock.mockResolvedValue(response(401));
    expect(await LlmClient.generateCompletion({ systemPrompt: '', userPrompt: '', taskId: 'task', taskName: 'test' })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('limits local routing to one retry and retains the fallback', async () => {
    fetchMock.mockImplementation(async () => response(503));
    expect(await LlmClient.routeWithLocalLlm('event', 'task', 'author')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(TraceService.recordTrace).toHaveBeenCalledWith(expect.objectContaining({ user: 'author', status: 'error' }));
  });

  it.each([429, 503])('retries Reddit token exchange on %s', async (status) => {
    fetchMock.mockResolvedValueOnce(response(status)).mockResolvedValueOnce(response(400));
    // A failed exchange leaves the token cache empty for subsequent tests.
    await expect(RedditMcpClient.getAccessToken()).rejects.toThrow('400');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries Reddit GETs on 5xx but submit only on 429', async () => {
    vi.spyOn(RedditMcpClient, 'getAccessToken').mockResolvedValue('test-token');
    fetchMock.mockResolvedValueOnce(response(502)).mockResolvedValueOnce(response(200, { name: 'test' }));
    expect(await RedditMcpClient.getAccountInfo()).toMatchObject({ username: 'test' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockReset().mockResolvedValueOnce(response(429)).mockResolvedValueOnce(response(200, { json: { data: { id: 'post', url: 'https://reddit.test/post' } } }));
    expect(await RedditMcpClient.submitPost({ subreddit: 'test', title: 'test' })).toMatchObject({ redditId: 'post' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockReset().mockResolvedValue(response(500));
    await expect(RedditMcpClient.submitPost({ subreddit: 'test', title: 'test' })).rejects.toThrow('500');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries Resend only on 429', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test');
    const email = { to: 'test@example.test', subject: 'test', html: 'test', text: 'test' };
    fetchMock.mockResolvedValueOnce(response(429)).mockResolvedValueOnce(response(200));
    expect(await sendEmail(email)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockReset().mockResolvedValue(response(500));
    expect(await sendEmail(email)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends task/model/user tags to Langfuse, defaults the user, and swallows an outage after two retries', async () => {
    vi.mocked(TraceService.recordTrace).mockRestore();
    vi.spyOn(prisma.trace, 'create').mockResolvedValue({ id: 'trace' } as Awaited<ReturnType<typeof prisma.trace.create>>);
    Object.assign(config.langfuse, { publicKey: 'test', secretKey: 'test' });
    fetchMock.mockResolvedValue(response(200));
    await TraceService.recordTrace({ taskId: 'task-id', model: 'model-name', task: 'LLM_TASK', user: 'author' });
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.userId).toBe('author');
    expect(payload.tags).toEqual(expect.arrayContaining(['task:task-id', 'model:model-name', 'user:author', 'task:LLM_TASK', 'status:ok', 'autonomous-agent']));
    fetchMock.mockReset().mockImplementation(async () => response(503));
    await expect(TraceService.recordTrace({ taskId: 'task-id', model: 'model-name', task: 'LLM_TASK' })).resolves.toMatchObject({ id: 'trace' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ userId: 'günther-core', tags: expect.arrayContaining(['user:günther-core']) });
  });
});
