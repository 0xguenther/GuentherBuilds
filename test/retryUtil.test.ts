import { describe, it, expect, vi, afterEach } from 'vitest';
import { executeWithRetry, fetchWithRetry, HttpError, DEFAULT_RETRY_CONFIG } from '../src/utils/retryUtil.js';

describe('RetryUtil', () => {
  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValueOnce('success');
      const result = await executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 (Rate Limit)', async () => {
      let attempts = 0;
      const mockFn = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          const error = new HttpError(429);
          error.message = 'Too Many Requests';
          throw error;
        }
        return 'success';
      });

      const result = await executeWithRetry(mockFn, {
        jitter: false,
        maxRetries: 3,
        initialDelayMs: 10, // Short delay for tests
        backoffMultiplier: 2,
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should retry on 5xx server errors', async () => {
      let attempts = 0;
      const mockFn = vi.fn(async () => {
        attempts++;
        if (attempts < 2) {
          const error = new HttpError(500);
          error.message = 'Internal Server Error';
          throw error;
        }
        return 'recovered';
      });

      const result = await executeWithRetry(mockFn, {
        jitter: false,
        maxRetries: 3,
        initialDelayMs: 10,
        retryableStatuses: [429, 500, 502, 503, 504],
      });

      expect(result).toBe('recovered');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should fail immediately on non-retryable errors', async () => {
      const mockFn = vi.fn(async () => {
        const error = new HttpError(404);
          error.message = 'Not Found'; // Not in retryable list
        throw error;
      });

      await expect(
        executeWithRetry(mockFn, {
          jitter: false,
        maxRetries: 3,
          retryableStatuses: [429, 500, 502, 503, 504],
        })
      ).rejects.toThrow('Not Found');

      // Should only try once
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries limit', async () => {
      const mockFn = vi.fn(async () => {
        const error = new HttpError(429);
          error.message = 'Rate Limited';
        throw error;
      });

      await expect(
        executeWithRetry(mockFn, {
          jitter: false,
        maxRetries: 2,
          initialDelayMs: 10,
        })
      ).rejects.toThrow('Rate Limited');

      // Should try 2 times
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff with short delays', async () => {
      let attempts = 0;
      const mockFn = vi.fn(async () => {
        attempts++;
        if (attempts <= 2) {
          const error = new HttpError(429);
          error.message = 'Rate Limited';
          throw error;
        }
        return 'success';
      });

      const startTime = Date.now();
      await executeWithRetry(mockFn, {
        jitter: false,
        maxRetries: 3,
        initialDelayMs: 50,
        backoffMultiplier: 2,
        maxDelayMs: 200,
      });

      const elapsed = Date.now() - startTime;
      // Should have applied delays (50ms + 100ms = 150ms minimum)
      expect(elapsed).toBeGreaterThanOrEqual(80);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('default config', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.initialDelayMs).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
      expect(DEFAULT_RETRY_CONFIG.retryableStatuses).toContain(429);
      expect(DEFAULT_RETRY_CONFIG.retryableStatuses).toContain(500);
    });
  });
});


describe('HTTP retry timing', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it.each([
    ['seconds', '2', 2000],
    ['HTTP-date', 'Wed, 07 Oct 2026 00:00:03 GMT', 3000],
    ['cap', '60', 5000],
    ['invalid header', 'invalid', 1000],
    ['past date', 'Tue, 06 Oct 2026 00:00:00 GMT', 0],
  ])('honours Retry-After: %s', async (_name, retryAfter, waitMs) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T00:00:00Z'));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': retryAfter } }))
      .mockResolvedValueOnce(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);
    const timer = vi.spyOn(globalThis, 'setTimeout');
    const pending = fetchWithRetry('https://example.test', undefined, { jitter: false, maxDelayMs: 5000, logger: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    expect(timer).toHaveBeenCalledWith(expect.any(Function), waitMs);
    if (waitMs > 0) {
      await vi.advanceTimersByTimeAsync(waitMs - 1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
    }
    await expect(pending).resolves.toBeInstanceOf(Response);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws non-retryable 4xx immediately with a typed response', async () => {
    const response = new Response('', { status: 403 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchWithRetry('https://example.test')).rejects.toMatchObject({ status: 403, response });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses full jitter for exponential backoff and caps the initial delay', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const timer = vi.spyOn(globalThis, 'setTimeout');
    const fn = vi.fn().mockRejectedValueOnce(new HttpError(503)).mockResolvedValue('ok');
    const pending = executeWithRetry(fn, { initialDelayMs: 10000, maxDelayMs: 2000 });
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toBe('ok');
    expect(timer).toHaveBeenCalledWith(expect.any(Function), 500);
  });

  it('does not retry network failures', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchWithRetry('https://example.test')).rejects.toThrow('network');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aborts Retry-After waiting when the original request times out', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '30' } }));
    vi.stubGlobal('fetch', fetchMock);
    const pending = fetchWithRetry('https://example.test', { signal: controller.signal });
    const assertion = expect(pending).rejects.toThrow('timeout');
    await vi.advanceTimersByTimeAsync(0);
    controller.abort(new Error('timeout'));
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
