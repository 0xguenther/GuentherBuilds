import { describe, it, expect, vi } from 'vitest';
import { executeWithRetry, DEFAULT_RETRY_CONFIG } from '../src/utils/retryUtil.js';

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
          const error: any = new Error('Too Many Requests');
          error.status = 429;
          throw error;
        }
        return 'success';
      });

      const result = await executeWithRetry(mockFn, {
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
          const error: any = new Error('Internal Server Error');
          error.status = 500;
          throw error;
        }
        return 'recovered';
      });

      const result = await executeWithRetry(mockFn, {
        maxRetries: 3,
        initialDelayMs: 10,
        retryableStatuses: [429, 500, 502, 503, 504],
      });

      expect(result).toBe('recovered');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should fail immediately on non-retryable errors', async () => {
      const mockFn = vi.fn(async () => {
        const error: any = new Error('Not Found');
        error.status = 404; // Not in retryable list
        throw error;
      });

      await expect(
        executeWithRetry(mockFn, {
          maxRetries: 3,
          retryableStatuses: [429, 500, 502, 503, 504],
        })
      ).rejects.toThrow('Not Found');

      // Should only try once
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries limit', async () => {
      const mockFn = vi.fn(async () => {
        const error: any = new Error('Rate Limited');
        error.status = 429;
        throw error;
      });

      await expect(
        executeWithRetry(mockFn, {
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
          const error: any = new Error('Rate Limited');
          error.status = 429;
          throw error;
        }
        return 'success';
      });

      const startTime = Date.now();
      await executeWithRetry(mockFn, {
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
