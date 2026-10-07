import { StripeMcpClient } from '../mcp/stripeMcp.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AuditConfigSchema, canaryRunnerDir } from './auditRunnerService.js';
import { spawn } from 'child_process';
import { prisma } from '../db/client.js';
import { AUDIT_TIERS, AuditTier } from './auditOrderService.js';
import { TraceService } from './traceService.js';
import { sendEmail } from './emailService.js';
import { orderLang, buildReportReadyEmail, buildFailureEmail, buildRejectionEmail } from './auditMailTemplates.js';

const REPS_BY_TIER: Record<AuditTier, number> = { quick: 3, standard: 5, fix: 10 };
const CAPS_BY_TIER: Record<AuditTier, number> = { quick: 5, standard: 10, fix: 20 };
const DAILY_ORDER_LIMIT = Number(process.env.AUDIT_DAILY_ORDER_LIMIT ?? 5);
const DOWNLOAD_TTL_MS = 48 * 60 * 60 * 1000;
const RUN_TIMEOUT_MS = Number(process.env.AUDIT_RUN_TIMEOUT_MS ?? 2 * 60 * 60 * 1000);
export const DOWNLOAD_MAX = 5;

const REPORTS_DIR = path.resolve(process.cwd(), 'data', 'audit-reports');

function runCommand(args: string[], env: NodeJS.ProcessEnv): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: canaryRunnerDir(), env, windowsHide: true });
    let out = '';
    // Ein hängender Runner darf die Warteschlange nicht blockieren (Status bliebe 'running').
    const timer = setTimeout(() => child.kill(), RUN_TIMEOUT_MS);
    child.stdout.on('data', (d) => (out = (out + d.toString()).slice(-20000)));
    child.stderr.on('data', (d) => (out = (out + d.toString()).slice(-20000)));
    child.on('error', (err) => { clearTimeout(timer); resolve({ code: 1, out: err.message }); });
    child.on('exit', (code) => { clearTimeout(timer); resolve({ code: code ?? 1, out }); });
  });
}

export class AuditFulfillmentService {
  /** Stripe's stable idempotency key also covers concurrent calls and interrupted DB writes. */
  static async refundOrder(orderId: string): Promise<string | undefined> {
    try {
      const order = await prisma.auditOrder.findUnique({ where: { id: orderId } });
      if (!order || !['rejected', 'failed'].includes(order.status)) return undefined;
      if (order.refundId) {
        const tier = AUDIT_TIERS[order.tier as AuditTier];
        return tier ? `CHF ${(tier.priceCents / 100).toFixed(2)}` : undefined;
      }
      const refund = await StripeMcpClient.refundAuditOrder(order);
      if (refund.status === 'failed' || refund.status === 'canceled') {
        throw new Error(`Stripe refund ${refund.id}: ${refund.status}`);
      }
      await prisma.auditOrder.update({
        where: { id: orderId },
        data: { refundId: refund.id, refundedAt: new Date(), refundError: null },
      });
      await TraceService.recordTrace({
        taskId: `audit-${orderId}`, model: 'stripe', task: 'AUDIT_REFUND', status: 'ok',
        metadata: { refundId: refund.id, amount: refund.amount, currency: refund.currency },
      });
      return `${refund.currency.toUpperCase()} ${(refund.amount / 100).toFixed(2)}`;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown refund error';
      await prisma.auditOrder.update({ where: { id: orderId }, data: { refundError: message } })
        .catch((error: unknown) => console.error('[Audit] Could not store refund error:', error));
      await TraceService.recordTrace({
        taskId: `audit-${orderId}`, model: 'stripe', task: 'AUDIT_REFUND', status: 'error',
        metadata: { error: message },
      });
      return undefined;
    }
  }

  private static async finishUnfulfilled(orderId: string, status: 'rejected' | 'failed', reason?: string): Promise<void> {
    const claim = await prisma.auditOrder.updateMany({ where: { id: orderId, status: 'running' }, data: { status } });
    if (claim.count === 0) return;
    await this.notifyUnfulfilled(orderId, status, reason);
  }

  private static async notifyUnfulfilled(orderId: string, status: 'rejected' | 'failed', reason?: string): Promise<void> {
    const order = await prisma.auditOrder.findUniqueOrThrow({ where: { id: orderId } });
    const refundAmount = await this.refundOrder(orderId);
    console.log(`[Audit] ${orderId}: ${status}.`);
    if (order.buyerEmail) {
      const lang = orderLang(order.configJson);
      const mail = status === 'rejected'
        ? buildRejectionEmail({ orderId, lang, reason: reason ?? '', refundAmount })
        : buildFailureEmail({ orderId, lang, refundAmount });
      await sendEmail({ to: order.buyerEmail, ...mail }).catch(() => {});
    }
  }

  /**
   * Arbeitet bezahlte Bestellungen ab. Eine Bestellung nach der anderen, Tageslimit beachtet.
   */
  static async processPaidOrders(): Promise<number> {
    const cutoff = new Date(Date.now() - RUN_TIMEOUT_MS - 10 * 60 * 1000);
    const stale = {
      status: 'running',
      OR: [{ startedAt: { lt: cutoff } }, { startedAt: null, updatedAt: { lt: cutoff } }],
    };
    const orphans = await prisma.auditOrder.findMany({ where: stale, select: { id: true } });
    for (const order of orphans) {
      const claim = await prisma.auditOrder.updateMany({
        where: { id: order.id, ...stale }, data: { status: 'failed' },
      });
      if (claim.count > 0) await this.notifyUnfulfilled(order.id, 'failed');
    }
    const startedToday = await prisma.auditOrder.count({
      where: { startedAt: { gte: startOfDay() } },
    });
    if (startedToday >= DAILY_ORDER_LIMIT) return 0;

    const next = await prisma.auditOrder.findFirst({ where: { status: 'paid' }, orderBy: { createdAt: 'asc' } });
    if (!next) return 0;
    await this.fulfil(next.id);
    return 1;
  }

  static async fulfil(orderId: string): Promise<void> {
    // CAS: nur paid -> running, damit kein Auftrag doppelt läuft
    const claim = await prisma.auditOrder.updateMany({ where: { id: orderId, status: 'paid' }, data: { status: 'running', startedAt: new Date() } });
    if (claim.count === 0) {
      await this.refundOrder(orderId);
      return;
    }

    const order = await prisma.auditOrder.findUnique({ where: { id: orderId } });
    if (!order) return;
    let workDir: string | undefined;
    let summary: Record<string, number> = {};
    let model = 'customer-runner';
    try {
      const config = AuditConfigSchema.parse(JSON.parse(order.configJson));
      model = config.model;
      const tier = order.tier as AuditTier;
      if (!(tier in REPS_BY_TIER)) throw new Error('Invalid audit tier');
      const cap = Number(process.env[`AUDIT_COST_CAP_USD_${tier.toUpperCase()}`] ?? CAPS_BY_TIER[tier]);
      if (!Number.isFinite(cap) || cap <= 0) throw new Error('Invalid audit cost cap');
      workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `audit-${orderId}-`));
      const configPath = path.join(workDir, 'config.json');
      const outputDir = path.join(workDir, 'output');
      await fs.promises.writeFile(configPath, JSON.stringify(config), { mode: 0o600 });
      const env = { ...process.env, NODE_EXTRA_CA_CERTS: undefined };
      const run = await runCommand([
        path.join(canaryRunnerDir(), 'src/customer/run.mjs'), '--config', configPath,
        '--reps', String(REPS_BY_TIER[tier]), '--cap', String(cap), '--out', outputDir,
      ], env);
      const reportSrc = path.join(outputDir, 'report.html');
      if (run.code !== 0 || !fs.existsSync(reportSrc)) {
        await this.finishUnfulfilled(orderId, 'failed');
        return;
      }
      const result = JSON.parse(await fs.promises.readFile(path.join(outputDir, 'summary.json'), 'utf8'));
      for (const key of ['passRate', 'costUsd', 'cases', 'runs']) {
        if (typeof result[key] !== 'number' || !Number.isFinite(result[key])) throw new Error('Invalid audit summary');
        summary[key] = result[key];
      }
      await fs.promises.mkdir(REPORTS_DIR, { recursive: true });
      const reportPath = path.join(REPORTS_DIR, `${orderId}.html`);
      await fs.promises.copyFile(reportSrc, reportPath);

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
      console.log(`[Audit] ${orderId} geliefert. Token: ...${token.slice(-4)}`);

      // Email notification to buyer
      if (order.buyerEmail) {
        const email = buildReportReadyEmail({ orderId, tier, lang: orderLang(order.configJson), downloadToken: token });
        await sendEmail({ to: order.buyerEmail, ...email }).catch(err => console.error('[Audit] Email send failed:', err));
      }
    } catch (err: unknown) {
      console.error(`[Audit] ${orderId} fulfillment failed:`, err);
      const current = await prisma.auditOrder.findUnique({ where: { id: orderId } });
      if (current?.status === 'running') await this.finishUnfulfilled(orderId, 'failed');
    } finally {
      if (workDir) await fs.promises.rm(workDir, { recursive: true, force: true })
        .catch(error => console.warn('[Audit] Temporary cleanup failed:', error));
      const done = await prisma.auditOrder.findUnique({ where: { id: orderId } });
      await TraceService.recordTrace({
        taskId: `audit-${orderId}`, model, task: 'AUDIT_FULFILMENT',
        status: done?.status === 'delivered' ? 'ok' : 'error',
        costUsd: summary.costUsd,
        metadata: { status: done?.status ?? 'unknown', ...summary },
      });
    }
  }

  /** Liefert den Bericht über den Token. Begrenzt auf Ablaufzeit und Anzahl Downloads. */
  static async consumeDownload(token: string, consume = true): Promise<
    { ok: true; path: string } | { ok: false; reason: 'invalid' | 'expired' | 'limit'; lang: 'de' | 'en' | undefined }
  > {
    const order = await prisma.auditOrder.findUnique({ where: { downloadToken: token } });
    const lang = order ? orderLang(order.configJson) : undefined;
    if (!order || !order.reportPath || order.status !== 'delivered') return { ok: false, reason: 'invalid', lang };
    if (!order.downloadExpiresAt || order.downloadExpiresAt <= new Date()) return { ok: false, reason: 'expired', lang };
    if (order.downloadCount >= DOWNLOAD_MAX) return { ok: false, reason: 'limit', lang };
    if (!consume) return { ok: true, path: order.reportPath };

    // Atomic CAS: only increment if below limit — prevents race condition
    const res = await prisma.auditOrder.updateMany({
      where: {
        id: order.id,
        status: 'delivered',
        downloadExpiresAt: { gt: new Date() },
        downloadCount: { lt: DOWNLOAD_MAX },
      },
      data: { downloadCount: { increment: 1 } },
    });

    if (res.count === 0) return { ok: false, reason: 'limit', lang };
    return { ok: true, path: order.reportPath };
  }
}

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export { AUDIT_TIERS };
