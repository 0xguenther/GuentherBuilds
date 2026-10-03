import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { prisma } from '../db/client.js';
import { AUDIT_TIERS, AuditTier } from './auditOrderService.js';

// Nur diese vier Schreibaktionen sind in Phase 1 zulässig (siehe STAND.md, Schritt 2).
export const ALLOWED_TOOLS = ['create_invoice', 'send_email', 'create_ticket', 'place_order'] as const;

// Harness-Läufe pro Stufe. Quick = ein Durchlauf, Standard = 10 Wiederholungen.
const REPS_BY_TIER: Record<AuditTier, number> = { quick: 1, standard: 10, fix: 10 };
const COST_CAP_USD = 0.5;
const DAILY_ORDER_LIMIT = Number(process.env.AUDIT_DAILY_ORDER_LIMIT ?? 5);
const DOWNLOAD_TTL_MS = 48 * 60 * 60 * 1000;
const DOWNLOAD_MAX = 5;

const CANARY_DIR = process.env.CANARY_RUNNER_DIR ?? 'C:/ClaudeProjects/canary-experiment';
const ROUTE = process.env.AUDIT_ROUTE ?? 'R5';
const REPORTS_DIR = path.resolve(process.cwd(), 'data', 'audit-reports');

export function validateTools(tools: Array<Record<string, unknown>>): { ok: true } | { ok: false; reason: string } {
  const names = tools.map((t) => String(t.name ?? ''));
  const unknown = names.filter((n) => !(ALLOWED_TOOLS as readonly string[]).includes(n));
  if (unknown.length) return { ok: false, reason: `Nicht unterstützte Tools: ${unknown.join(', ')}` };
  if (names.some((n) => !n)) return { ok: false, reason: 'Tool ohne Namen' };
  return { ok: true };
}

function runCommand(args: string[], env: NodeJS.ProcessEnv): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: CANARY_DIR, env, windowsHide: true });
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (out += d.toString()));
    child.on('exit', (code) => resolve({ code: code ?? 1, out }));
  });
}

export class AuditFulfillmentService {
  /**
   * Arbeitet bezahlte Bestellungen ab. Eine Bestellung nach der anderen, Tageslimit beachtet.
   */
  static async processPaidOrders(): Promise<number> {
    const startedToday = await prisma.auditOrder.count({
      where: { status: { in: ['running', 'delivered', 'failed', 'rejected'] }, updatedAt: { gte: startOfDay() } },
    });
    if (startedToday >= DAILY_ORDER_LIMIT) return 0;

    const next = await prisma.auditOrder.findFirst({ where: { status: 'paid' }, orderBy: { createdAt: 'asc' } });
    if (!next) return 0;
    await this.fulfil(next.id);
    return 1;
  }

  static async fulfil(orderId: string): Promise<void> {
    // CAS: nur paid -> running, damit kein Auftrag doppelt läuft
    const claim = await prisma.auditOrder.updateMany({ where: { id: orderId, status: 'paid' }, data: { status: 'running' } });
    if (claim.count === 0) return;

    const order = await prisma.auditOrder.findUnique({ where: { id: orderId } });
    if (!order) return;
    const config = JSON.parse(order.configJson) as { tools: Array<Record<string, unknown>> };
    const check = validateTools(config.tools);
    if (!check.ok) {
      await prisma.auditOrder.update({ where: { id: orderId }, data: { status: 'rejected' } });
      console.log(`[Audit] ${orderId} abgelehnt: ${check.reason}. Rückerstattung offen (Entscheidung beim Menschen).`);
      return;
    }

    const tier = order.tier as AuditTier;
    const phase = `audit-${orderId}`;
    const env = { ...process.env, NODE_EXTRA_CA_CERTS: undefined };

    const run = await runCommand(
      [path.join(CANARY_DIR, 'src', 'run.mjs'), 'run', '--phase', phase, '--routes', ROUTE,
        '--cases', 'C01,C02,C03,C04,C05,C06,C07,C08,C09,C10', '--reps', String(REPS_BY_TIER[tier]), '--cap', String(COST_CAP_USD)],
      env
    );
    if (run.code !== 0) {
      await prisma.auditOrder.update({ where: { id: orderId }, data: { status: 'failed' } });
      console.log(`[Audit] ${orderId} Harness-Lauf fehlgeschlagen (Exit ${run.code}).`);
      return;
    }

    const rep = await runCommand([path.join(CANARY_DIR, 'src', 'report.mjs'), '--phases', phase, '--name', phase], env);
    const reportSrc = path.join(CANARY_DIR, 'results', 'reports', `${phase}.html`);
    if (rep.code !== 0 || !fs.existsSync(reportSrc)) {
      await prisma.auditOrder.update({ where: { id: orderId }, data: { status: 'failed' } });
      console.log(`[Audit] ${orderId} Bericht fehlgeschlagen.`);
      return;
    }

    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const reportPath = path.join(REPORTS_DIR, `${orderId}.html`);
    fs.copyFileSync(reportSrc, reportPath);

    const token = crypto.randomBytes(24).toString('hex');
    await prisma.auditOrder.update({
      where: { id: orderId },
      data: {
        status: 'delivered',
        reportPath,
        downloadToken: token,
        downloadExpiresAt: new Date(Date.now() + DOWNLOAD_TTL_MS),
        downloadCount: 0,
      },
    });
    console.log(`[Audit] ${orderId} geliefert. Link: /api/audit/download/${token}`);
  }

  /** Liefert den Bericht über den Token. Begrenzt auf Ablaufzeit und Anzahl Downloads. */
  static async consumeDownload(token: string): Promise<{ ok: true; path: string } | { ok: false; reason: string }> {
    const order = await prisma.auditOrder.findUnique({ where: { downloadToken: token } });
    if (!order || !order.reportPath) return { ok: false, reason: 'Ungültiger Link' };
    if (!order.downloadExpiresAt || order.downloadExpiresAt < new Date()) return { ok: false, reason: 'Link abgelaufen' };
    if (order.downloadCount >= DOWNLOAD_MAX) return { ok: false, reason: 'Download-Limit erreicht' };
    await prisma.auditOrder.update({ where: { id: order.id }, data: { downloadCount: { increment: 1 } } });
    return { ok: true, path: order.reportPath };
  }
}

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export { AUDIT_TIERS };
