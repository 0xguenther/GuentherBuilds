import { config } from '../config/index.js';
import { prisma } from '../db/client.js';
import { TraceService } from './traceService.js';
import { posterHeaders, redditPoster, hnPoster, type PosterTarget } from '../mcp/browserPoster.js';

export interface PosterHealth {
  status: 'ok' | 'degraded' | 'down';
  browserConnected: boolean;
  redditSession: boolean;
  hnSession: boolean;
  error?: string | null;
  braveRestarts?: number;
}

export interface PostingCheckInput {
  posterConfigured: boolean;
  poster: PosterHealth | null;
  posterError: string | null;
  xConfigured: boolean;
  lastXPostAt: Date | null;
  now: number;
  xMaxSilenceMs: number;
  /** HN login only matters while HN autoposting is on (default true). */
  hnExpected?: boolean;
}

/** Pure decision: which parts of the posting chain are broken right now. */
export function evaluatePosting(input: PostingCheckInput): string[] {
  const problems: string[] = [];
  if (input.posterConfigured) {
    if (!input.poster) {
      problems.push(`Browser-Poster nicht erreichbar${input.posterError ? `: ${input.posterError}` : ''}`);
    } else {
      if (!input.poster.browserConnected) problems.push(`Brave/CDP down${input.poster.error ? `: ${input.poster.error}` : ''}`);
      else {
        if (!input.poster.redditSession) problems.push('Reddit-Login in Brave abgelaufen');
        if (!input.poster.hnSession && input.hnExpected !== false) problems.push('HN-Login in Brave abgelaufen');
      }
    }
  }
  if (input.xConfigured) {
    const silentMs = input.lastXPostAt ? input.now - input.lastXPostAt.getTime() : Infinity;
    if (silentMs > input.xMaxSilenceMs) {
      problems.push(input.lastXPostAt
        ? `Kein X-Post seit ${Math.round(silentMs / 3_600_000)} h`
        : 'Noch nie auf X gepostet');
    }
  }
  return problems;
}

export class PostingWatchdogService {
  private static browserDown = false;
  private static lastKey: string | null = null;

  /** True while the poster/browser is known to be down: callers skip posting instead of failing every minute. */
  static isBrowserDown(): boolean {
    return this.browserDown;
  }

  private static posterTarget(): PosterTarget | null {
    const reddit = redditPoster();
    if (reddit.baseUrl) return reddit;
    const hn = hnPoster();
    return hn.baseUrl ? hn : null;
  }

  static async fetchPosterHealth(target: PosterTarget): Promise<{ poster: PosterHealth | null; error: string | null }> {
    try {
      const res = await fetch(`${target.baseUrl}/health`, { headers: posterHeaders(target), signal: AbortSignal.timeout(45_000) });
      const body = await res.json().catch(() => null) as PosterHealth | null;
      // 503 carries a valid "down" report; anything else without a body is a broken poster.
      if (body && typeof body.status === 'string') return { poster: body, error: null };
      return { poster: null, error: `HTTP ${res.status}` };
    } catch (err) {
      const cause = (err as { cause?: { code?: string } }).cause?.code;
      return { poster: null, error: cause ?? (err instanceof Error ? err.message : 'unknown') };
    }
  }

  /** One watchdog pass: evaluate, log state changes once, tell Kuma. Never throws. */
  static async check(now = Date.now()): Promise<string[]> {
    if (process.env.NODE_ENV === 'test' || config.server.env === 'test') return [];
    try {
      const target = this.posterTarget();
      const health = target ? await this.fetchPosterHealth(target) : { poster: null, error: null };
      this.browserDown = Boolean(target) && (!health.poster || !health.poster.browserConnected);

      const xConfigured = Boolean(config.x.apiKey && config.x.apiSecret && config.x.accessToken && config.x.accessSecret);
      const lastX = xConfigured
        ? await prisma.trace.findFirst({ where: { taskId: { startsWith: 'x-idem:' }, status: 'ok' }, orderBy: { createdAt: 'desc' } })
        : null;

      const problems = evaluatePosting({
        posterConfigured: Boolean(target),
        poster: health.poster,
        posterError: health.error,
        xConfigured,
        lastXPostAt: lastX?.createdAt ?? null,
        now,
        xMaxSilenceMs: config.monitoring.xMaxSilenceHours * 3_600_000,
        hnExpected: config.hn.autopostEnabled,
      });

      await this.report(problems, health.poster);
      return problems;
    } catch (err) {
      console.warn('[PostingWatchdog] check failed:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  private static async report(problems: string[], poster: PosterHealth | null): Promise<void> {
    const key = problems.join('|');
    if (key !== this.lastKey) {
      const first = this.lastKey === null;
      this.lastKey = key;
      if (problems.length) console.error(`[PostingWatchdog] STÖRUNG: ${problems.join('; ')}`);
      else if (!first) console.log('[PostingWatchdog] Posting-Kette wieder gesund.');
      if (problems.length || !first) {
        await TraceService.recordTrace({
          taskId: `posting-health-${Date.now()}`, model: 'posting-watchdog', task: 'POSTING_HEALTH',
          status: problems.length ? 'error' : 'ok',
          metadata: { problems, braveRestarts: poster?.braveRestarts ?? null },
        }).catch(() => undefined);
      }
    }

    const pushUrl = config.monitoring.postingKumaPushUrl;
    if (!pushUrl) return;
    try {
      const url = new URL(pushUrl);
      url.searchParams.set('status', problems.length ? 'down' : 'up');
      url.searchParams.set('msg', (problems.join('; ') || 'OK').slice(0, 200));
      await fetch(url, { signal: AbortSignal.timeout(4000) });
    } catch (err) {
      console.warn('[PostingWatchdog] Kuma push failed:', err instanceof Error ? err.message : err);
    }
  }
}
