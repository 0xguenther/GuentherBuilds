import { LlmClient } from '../core/llmClient.js';
import { TraceService } from './traceService.js';

/** Günther's field. Search terms are chosen inside this frame only. */
export const RESEARCH_FRAME =
  'Reliability and cost of production AI agents: tool-call write paths (duplicates, timeouts, retries, idempotency), ' +
  'MCP/tool-server infrastructure, agent observability and debugging, LLM cost per run, and agent security (secrets, sandboxing).';

/** Used when the LLM is unavailable or returns nothing usable. */
export const FALLBACK_QUERIES = ['tool call duplicate', 'agent idempotency', 'MCP server', 'agent observability', 'LLM agent cost'];

const MAX_QUERIES = 6;
const QUERY_RE = /^[a-z0-9][a-z0-9 .+\-/]{2,59}$/i;

/** Pure: keeps only short plain-text queries; no URLs or operators that could widen a search. */
export function sanitizeQueries(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const q = item.trim().replace(/\s+/g, ' ');
    if (!QUERY_RE.test(q) || /https?:|www\./i.test(q)) continue;
    if (!out.some((o) => o.toLowerCase() === q.toLowerCase())) out.push(q);
    if (out.length === MAX_QUERIES) break;
  }
  return out;
}

/** Günther picks this week's search terms himself, inside RESEARCH_FRAME. */
export async function chooseResearchQueries(): Promise<string[]> {
  const completion = await LlmClient.generateCompletion({
    systemPrompt:
      'You plan market research for an autonomous seller of agent reliability tooling. ' +
      `Scope: ${RESEARCH_FRAME} ` +
      'Reply with a JSON array of 4 to 6 short search queries (2 to 5 words each) that find what practitioners are struggling with right now. ' +
      'No URLs, no quotes, no boolean operators. JSON array only.',
    userPrompt: 'Plan this week\'s queries.',
    maxTokens: 200,
    taskId: `research-plan-${Date.now()}`,
    taskName: 'MARKET_RESEARCH_PLAN',
    timeoutMs: 15000,
  });
  if (!completion) return FALLBACK_QUERIES;

  const match = completion.text.match(/\[[\s\S]*\]/);
  if (!match) return FALLBACK_QUERIES;
  try {
    const queries = sanitizeQueries(JSON.parse(match[0]));
    return queries.length >= 2 ? queries : FALLBACK_QUERIES;
  } catch {
    return FALLBACK_QUERIES;
  }
}

function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'gunther-market-research/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Hacker News (public Algolia search): stories and comments. */
export async function fetchHnLines(queries: string[], sinceUnix: number): Promise<string[]> {
  const lines: string[] = [];
  for (const query of queries) {
    try {
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=(story,comment)&numericFilters=created_at_i>${sinceUnix}&hitsPerPage=30`;
      const body = (await getJson(url)) as { hits?: { title?: string; story_title?: string; comment_text?: string; story_text?: string }[] };
      for (const hit of body.hits ?? []) {
        const text = stripTags(`${hit.title ?? hit.story_title ?? ''} ${hit.comment_text ?? hit.story_text ?? ''}`);
        if (text) lines.push(text.slice(0, 2000));
      }
    } catch {
      // One failing query must not stop the others.
    }
  }
  return lines;
}

/** GitHub (public repo search, unauthenticated): what people build and star around the problem. */
export async function fetchGithubLines(queries: string[], sinceIso: string): Promise<string[]> {
  const lines: string[] = [];
  for (const query of queries) {
    try {
      const q = encodeURIComponent(`${query} pushed:>${sinceIso.slice(0, 10)}`);
      const body = (await getJson(`https://api.github.com/search/repositories?q=${q}&sort=updated&per_page=15`)) as {
        items?: { full_name?: string; description?: string | null; stargazers_count?: number }[];
      };
      for (const repo of body.items ?? []) {
        const text = `${repo.full_name ?? ''}: ${repo.description ?? ''} (${repo.stargazers_count ?? 0} stars)`.trim();
        if (text.length > 10) lines.push(text.slice(0, 2000));
      }
    } catch {
      // Rate limits (10 req/min unauthenticated) just skip the rest of this source.
    }
  }
  return lines;
}

/** Stack Overflow (public API, no key): recent questions practitioners actually ask. */
export async function fetchStackOverflowLines(queries: string[], sinceUnix: number): Promise<string[]> {
  const lines: string[] = [];
  for (const query of queries) {
    try {
      const url = `https://api.stackexchange.com/2.3/search/advanced?q=${encodeURIComponent(query)}&site=stackoverflow&sort=creation&order=desc&fromdate=${sinceUnix}&pagesize=20&filter=!nKzQUR3Ej`;
      const body = (await getJson(url)) as { items?: { title?: string; tags?: string[] }[] };
      for (const item of body.items ?? []) {
        const text = stripTags(`${item.title ?? ''} [${(item.tags ?? []).join(', ')}]`);
        if (text.length > 5) lines.push(text.slice(0, 2000));
      }
    } catch {
      // Stack Exchange quota is 300/day without key; skip on error.
    }
  }
  return lines;
}

/** Runs one research pass over all public sources and records which queries were used. */
export async function collectResearchLines(windowDays: number): Promise<string[]> {
  const queries = await chooseResearchQueries();
  const sinceUnix = Math.floor(Date.now() / 1000) - windowDays * 86400;
  const sinceIso = new Date(sinceUnix * 1000).toISOString();

  const [hn, gh, so] = await Promise.all([
    fetchHnLines(queries, sinceUnix),
    fetchGithubLines(queries, sinceIso),
    fetchStackOverflowLines(queries, sinceUnix),
  ]);

  await TraceService.recordTrace({
    taskId: `market-research-${Date.now()}`,
    model: 'market-research',
    task: 'MARKET_RESEARCH_RUN',
    status: 'ok',
    metadata: { queries, hn: hn.length, github: gh.length, stackoverflow: so.length },
  });
  return [...hn, ...gh, ...so];
}
