import { buildApp } from './server/app.js';
import { config } from './config/index.js';
import { checkDatabaseConnection } from './db/client.js';
import { guntherDaemon } from './cron/daemon.js';

async function main() {
  console.log('====================================================');
  console.log('  GÜNTHER CORE — Autonomous AI Entrepreneur');
  console.log('  "Ich baue, ich verkaufe, ich verbrenne Token."');
  console.log('====================================================');

  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    console.error('CRITICAL: SQLite database connection failed. Exiting.');
    process.exit(1);
  }
  console.log('✓ SQLite (Prisma) State Engine initialized & verified.');

  const app = await buildApp();

  try {
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });
    console.log(`✓ Webhook Hub & Health Endpoint listening on http://${config.server.host}:${config.server.port}`);
    console.log(`✓ Active network: ${config.web3.networkId}`);

    // Start 24/7 background reconciliation & heartbeat daemon
    guntherDaemon.start();

    console.log('Günther ReAct loop & Heartbeat Daemon are active.');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown handling
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[Shutdown] Received ${signal}. Shutting down gracefully...`);
    guntherDaemon.stop();
    await app.close();
    console.log('[Shutdown] All services stopped. Goodbye.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
