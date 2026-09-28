import { PaymentService } from '../services/paymentService.js';
import { BurnService } from '../services/burnService.js';
import { MarketingService } from '../services/marketingService.js';
import { TraceService } from '../services/traceService.js';
import { checkDatabaseConnection } from '../db/client.js';
import { config } from '../config/index.js';

export class GuntherDaemon {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isTickBusy = false;

  /**
   * Starts the background daemon with the configured heartbeat interval.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[Daemon] Günther Background Daemon started (Interval: ${config.monitoring.heartbeatIntervalMs / 1000}s)`);

    // Run first tick immediately
    this.tick().catch((err) => {
      console.error('[Daemon] Error in initial tick:', err);
    });

    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        console.error('[Daemon] Error in periodic tick:', err);
      });
    }, config.monitoring.heartbeatIntervalMs);
  }

  /**
   * Gracefully stops the daemon.
   */
  stop() {
    if (!this.isRunning) return;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[Daemon] Günther Background Daemon stopped gracefully.');
  }

  /**
   * Main recurring cycle: reconciliation of pending payments + heartbeat.
   */
  async tick() {
    if (this.isTickBusy) {
      console.log('[Daemon] Previous tick still in progress. Skipping cycle.');
      return;
    }

    this.isTickBusy = true;
    try {
      await this.reconcilePendingPayments();
      await this.emitHeartbeat();
    } finally {
      this.isTickBusy = false;
    }
  }

  /**
   * Reconciles payments that were received but not yet burned (e.g. after restart or temporary RPC glitch).
   */
  async reconcilePendingPayments(): Promise<number> {
    const pending = await PaymentService.getPendingPayments();
    if (pending.length === 0) return 0;

    console.log(`[Daemon] Found ${pending.length} pending payments requiring reconciliation.`);
    let processed = 0;

    for (const payment of pending) {
      try {
        console.log(`[Daemon] Reconciling payment ${payment.stripePaymentId} (${payment.amountCents} cents)...`);
        const burnResult = await BurnService.executeBurn(payment.stripePaymentId);

        if (burnResult.success && burnResult.burnAmount && burnResult.txHash) {
          await MarketingService.announceBurn(
            payment.amountCents,
            burnResult.burnAmount,
            burnResult.txHash
          );
          processed++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[Daemon] Failed to reconcile payment ${payment.stripePaymentId}: ${message}`);
      }
    }

    return processed;
  }

  /**
   * Emits system health metrics and pings Uptime Kuma if configured.
   */
  async emitHeartbeat(): Promise<boolean> {
    const dbHealthy = await checkDatabaseConnection();
    const memUsage = process.memoryUsage();
    const rssMb = (memUsage.rss / 1024 / 1024).toFixed(1);
    const uptimeSec = Math.floor(process.uptime());

    const isHealthy = dbHealthy;

    // Send push ping to Uptime Kuma if configured
    if (config.monitoring.kumaPushUrl) {
      try {
        const sep = config.monitoring.kumaPushUrl.includes('?') ? '&' : '?';
        const pushUrl = `${config.monitoring.kumaPushUrl}${sep}status=${isHealthy ? 'up' : 'down'}&msg=OK&ping=`;
        await fetch(pushUrl, { method: 'GET', signal: AbortSignal.timeout(4000) });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown network error';
        console.warn(`[Daemon] Failed to push heartbeat to Kuma: ${message}`);
      }
    }

    // Record heartbeat trace for observability
    await TraceService.recordTrace({
      taskId: `heartbeat-${Date.now()}`,
      model: 'system-daemon',
      task: 'HEARTBEAT_HEALTHCHECK',
      status: isHealthy ? 'ok' : 'error',
      metadata: {
        uptimeSeconds: uptimeSec,
        memoryRssMb: rssMb,
        database: dbHealthy ? 'connected' : 'disconnected',
        network: config.web3.networkId,
      },
    });

    return isHealthy;
  }
}

export const guntherDaemon = new GuntherDaemon();
