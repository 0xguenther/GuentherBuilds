import { buildApp } from './server/app.js';
import { config } from './config/index.js';
import { checkDatabaseConnection } from './db/client.js';

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
    console.log('Günther ReAct loop is active and waiting for events.');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
