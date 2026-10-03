import fs from 'fs';
import path from 'path';
import { prisma } from '../db/client.js';

// Schritt 5: Befund-Posts. Nur mit echter Run-ID, nur mit Tageslimit, Veröffentlichung nur bei Freigabe-Flag.
const CANARY_DIR = process.env.CANARY_RUNNER_DIR ?? 'C:/ClaudeProjects/canary-experiment';
const POSTS_ENABLED = process.env.AUDIT_POSTS_ENABLED === 'true';
const DAILY_LIMIT_PER_CHANNEL = Number(process.env.AUDIT_POSTS_PER_DAY ?? 2);

export interface Finding {
  phase: string;
  runIds: string[];
  rows: Array<{ route: string; stateOk: number; n: number; duplicates: number }>;
}

/** Liest einen abgeschlossenen Lauf und baut die Befunde. Ohne Run-ID kein Befund. */
export function loadFinding(phase: string): Finding | null {
  const file = path.join(CANARY_DIR, 'results', phase, 'runs.jsonl');
  if (!fs.existsSync(file)) return null;
  const runs = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const ok = runs.filter((r) => r.status === 'ok');
  if (!ok.length) return null;
  const byRoute: Record<string, { stateOk: number; n: number; duplicates: number }> = {};
  for (const r of ok) {
    const k = r.route.route_id;
    byRoute[k] ??= { stateOk: 0, n: 0, duplicates: 0 };
    byRoute[k].n++;
    byRoute[k].stateOk += r.outcome.state_ok ? 1 : 0;
    byRoute[k].duplicates += r.outcome.duplicates > 0 ? 1 : 0;
  }
  return {
    phase,
    runIds: ok.map((r) => r.run_id),
    rows: Object.entries(byRoute).map(([route, v]) => ({ route, ...v })),
  };
}

/** Englischer Post aus einem Befund. Jede Zahl stammt aus den Zeilen oben. */
export function buildPost(f: Finding): string {
  const lines = f.rows.map(
    (r) => `- ${r.route}: ${Math.round((r.stateOk / r.n) * 100)}% correct end state, ${r.duplicates}/${r.n} runs with duplicate writes`
  );
  return [
    'Timeout on a write action. Did the agent retry and duplicate it?',
    '',
    `We ran ${f.runIds.length} deterministic runs (run ids: ${f.runIds[0]} … ${f.runIds[f.runIds.length - 1]}).`,
    ...lines,
    '',
    `Phase: ${f.phase}. Full data and reports are available on request.`,
  ].join('\n');
}

export class AuditPostService {
  /** Prüft Tageslimit und Flag. Gibt zurück, ob veröffentlicht werden darf. */
  static async mayPublish(channel: string): Promise<{ ok: boolean; reason: string }> {
    if (!POSTS_ENABLED) return { ok: false, reason: 'Veröffentlichung nicht freigegeben (AUDIT_POSTS_ENABLED)' };
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = await prisma.trace.count({
      where: { taskId: { startsWith: `post-${channel}-` }, status: 'ok', createdAt: { gte: startOfDay } },
    });
    if (today >= DAILY_LIMIT_PER_CHANNEL) return { ok: false, reason: `Tageslimit ${channel} erreicht` };
    return { ok: true, reason: 'ok' };
  }

  /** Protokolliert jeden Post mit Run-ID im Trace. */
  static async record(channel: string, phase: string, text: string) {
    await prisma.trace.create({
      data: { taskId: `post-${channel}-${Date.now()}`, model: `phase:${phase}`, task: 'PUBLISH_FINDING', status: 'ok' },
    });
    return text;
  }
}
