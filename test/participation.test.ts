import { afterEach, describe, expect, it, vi } from 'vitest';
import { config } from '../src/config/index.js';
import { PULSE_DATA_URL, PULSE_FALLBACKS, isValidPulse } from '../src/services/marketingService.js';
import { HnService } from '../src/services/hnService.js';
import { evaluatePosting } from '../src/services/postingWatchdogService.js';
import { REDDIT_DISCLOSURE, RESEARCH_DATA_URL, RESEARCH_URL, researchPost } from '../src/services/redditService.js';

afterEach(() => { vi.restoreAllMocks(); });

describe('Reddit research post', () => {
  const { title, body } = researchPost();
  it('shares open data without price, product pitch or audit link, and discloses the agent', () => {
    expect(body.endsWith(REDDIT_DISCLOSURE)).toBe(true);
    expect(body).toContain(RESEARCH_DATA_URL);
    expect(body).toContain(`${RESEARCH_URL}?utm_source=reddit`);
    expect(`${title} ${body}`).not.toMatch(/\$\s?\d|USD|audit|\bbuy\b|pricing/i);
  });
  it('matches the published result table row by row', () => {
    const expected = { 'DeepSeek Flash': [91, 0, 1], 'Qwen3.8 27B (free)': [89, 1, 2], 'Qwen3 14B (local, Ollama)': [70, 0, 10], 'Claude Haiku 4.5': [60, 10, 20], 'Ornith 1.5 35B': [49, 38, 38] };
    for (const [model, [correct, dup, falseSuccess]] of Object.entries(expected)) {
      expect(body).toContain(`| ${model} | ${correct} | ${dup} | ${falseSuccess} |`);
    }
    expect(title).toContain('0 to 38');
  });
});

describe('daily pulse is an insight, not an ad', () => {
  it('accepts a data post and rejects prices, the audit page, exclamation marks and a missing link', () => {
    const ok = `Timeouts are unknown, not failed. Read the system of record before every retry; our runs showed 0 to 38 duplicate writes per 100.\n${PULSE_DATA_URL}`;
    expect(isValidPulse(ok)).toBe(true);
    expect(isValidPulse(`${ok}`.replace('Read', 'Buy the audit for $90, read'))).toBe(false);
    expect(isValidPulse(ok.replace('before every retry', 'before every retry!'))).toBe(false);
    expect(isValidPulse(`Timeouts are unknown, not failed. Read the system of record before every retry and never trust a success claim alone.\nhttps://0xguenther.org/en/audit/`)).toBe(false);
    expect(isValidPulse('too short')).toBe(false);
  });
  it('keeps every offline fallback valid and tweet-sized', () => {
    for (const f of PULSE_FALLBACKS) expect(isValidPulse(f), f).toBe(true);
  });
});

describe('HN autoposting and watchdog expectations', () => {
  it('is off by default and only runs when explicitly enabled', () => {
    vi.spyOn(HnService, 'credentialsAvailable');
    expect(config.hn.autopostEnabled).toBe(false);
    expect(HnService.credentialsAvailable()).toBe(false);
  });
  it('does not alert on an expired HN login while HN autoposting is off', () => {
    const base = {
      posterConfigured: true, poster: { status: 'degraded' as const, browserConnected: true, redditSession: true, hnSession: false },
      posterError: null, xConfigured: false, lastXPostAt: null, now: 1, xMaxSilenceMs: 1,
    };
    expect(evaluatePosting({ ...base, hnExpected: false })).toEqual([]);
    expect(evaluatePosting(base)).toEqual(['HN-Login in Brave abgelaufen']);
  });
});
