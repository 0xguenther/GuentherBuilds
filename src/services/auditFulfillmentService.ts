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
import { sendEmail, buildReportReadyEmail } from './emailService.js';

const REPS_BY_TIER: Record<AuditTier, number> = { quick: 3, standard: 5, fix: 10 };
const CAPS_BY_TIER: Record<AuditTier, number> = { quick: 5, standard: 10, fix: 20 };
const DAILY_ORDER_LIMIT = Number(process.env.AUDIT_DAILY_ORDER_LIMIT ?? 5);
const DOWNLOAD_TTL_MS = 48 * 60 * 60 * 1000;
const RUN_TIMEOUT_MS = Number(process.env.AUDIT_RUN_TIMEOUT_MS ?? 2 * 60 * 60 * 1000);
const DOWNLOAD_MAX = 5;

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
    const order = await prisma.auditOrder.update({ where: { id: orderId }, data: { status } });
    const refundAmount = await this.refundOrder(orderId);
    console.log(`[Audit] ${orderId}: ${status}.`);
    if (order.buyerEmail) {
      await sendEmail({
        to: order.buyerEmail,
        subject: `AgentCheck Order Update (${orderId.slice(0, 8)})`,
        html: status === 'rejected' ? rejectionEmail(orderId, reason ?? '', refundAmount) : failureEmail(orderId, refundAmount),
      }).catch(() => {});
    }
  }

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
        const tierLabel = AUDIT_TIERS[tier]?.label ?? tier;
        const email = buildReportReadyEmail(orderId, tierLabel, token);
        email.to = order.buyerEmail;
        await sendEmail(email).catch(err => console.error('[Audit] Email send failed:', err));
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
  static async consumeDownload(token: string): Promise<{ ok: true; path: string } | { ok: false; reason: string }> {
    const order = await prisma.auditOrder.findUnique({ where: { downloadToken: token } });
    if (!order || !order.reportPath) return { ok: false, reason: 'Ungültiger Link' };
    if (!order.downloadExpiresAt || order.downloadExpiresAt < new Date()) return { ok: false, reason: 'Link abgelaufen' };

    // Atomic CAS: only increment if below limit — prevents race condition
    const res = await prisma.auditOrder.updateMany({
      where: {
        id: order.id,
        downloadCount: { lt: DOWNLOAD_MAX },
      },
      data: { downloadCount: { increment: 1 } },
    });

    if (res.count === 0) return { ok: false, reason: 'Download-Limit erreicht' };
    return { ok: true, path: order.reportPath };
  }
}

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function rejectionEmail(orderId: string, reason: string, refundAmount?: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#05070B;color:#e2e8f0;padding:32px;max-width:600px;margin:0 auto">
<div style="border-bottom:1px solid #1e293b;padding-bottom:16px;margin-bottom:24px"><span style="color:#00FF66;font-family:monospace;font-size:20px;font-weight:bold">&gt;0xGünther■</span></div>
<h1 style="color:#fff;font-size:24px;margin-bottom:16px">Order Could Not Be Processed</h1>
<p style="color:#94a3b8;line-height:1.6">Your AgentCheck order <strong style="color:#fff">${orderId.slice(0, 8)}</strong> could not be processed.</p>
<div style="background:#1a0a0a;border:1px solid #7f1d1d;border-radius:8px;padding:16px;margin:24px 0"><p style="color:#f87171;margin:0;font-size:14px">${reason.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)}</p></div>
<p style="color:#94a3b8;line-height:1.6">${refundAmount ? `A refund of ${refundAmount} was issued and should appear within 5-10 business days.` : 'We will process a refund within 5 business days.'} If you have questions, reply to this email.</p>
<hr style="border:none;border-top:1px solid #1e293b;margin:32px 0">
<p style="color:#475569;font-size:12px">0xGünther Architecture Labs · Zürich, Schweiz<br><a href="https://0xguenther.org" style="color:#00FF66">0xguenther.org</a></p>
</body></html>`;
}

function failureEmail(orderId: string, refundAmount?: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#05070B;color:#e2e8f0;padding:32px;max-width:600px;margin:0 auto">
<div style="border-bottom:1px solid #1e293b;padding-bottom:16px;margin-bottom:24px"><span style="color:#00FF66;font-family:monospace;font-size:20px;font-weight:bold">&gt;0xGünther■</span></div>
<h1 style="color:#fff;font-size:24px;margin-bottom:16px">Audit Run Failed</h1>
<p style="color:#94a3b8;line-height:1.6">Your AgentCheck order <strong style="color:#fff">${orderId.slice(0, 8)}</strong> encountered a technical error during the audit run.</p>
<p style="color:#94a3b8;line-height:1.6">${refundAmount ? `A refund of ${refundAmount} was issued and should appear within 5-10 business days.` : 'We will process a refund within 5 business days.'} Our team has been notified and is investigating.</p>
<hr style="border:none;border-top:1px solid #1e293b;margin:32px 0">
<p style="color:#475569;font-size:12px">0xGünther Architecture Labs · Zürich, Schweiz<br><a href="https://0xguenther.org" style="color:#00FF66">0xguenther.org</a></p>
</body></html>`;
}

export { AUDIT_TIERS };
