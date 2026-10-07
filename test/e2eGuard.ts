/**
 * Safety guard for the tsx e2e scripts (npm run test:all).
 *
 * MUST be the first import of every e2e script: ES modules evaluate in import order, so this
 * runs before src/config (dotenv) and the Prisma client read DATABASE_URL / NODE_ENV.
 *
 * - Forces NODE_ENV=test, which puts Web3McpClient into simulation mode (no real Base burns).
 * - Defaults DATABASE_URL to the test DB; dotenv never overrides an already-set variable,
 *   so the production DATABASE_URL from .env cannot leak in.
 * - Aborts if DATABASE_URL was explicitly set to anything that is not a test database.
 * - Sets a fixed, test-only ADMIN_API_TOKEN so admin-guarded routes can be exercised.
 */
process.env.NODE_ENV = 'test';

const DEFAULT_TEST_DB = 'file:./test.db';
const url = process.env.DATABASE_URL;

if (!url) {
  process.env.DATABASE_URL = DEFAULT_TEST_DB;
} else if (!/test/i.test(url)) {
  console.error(JSON.stringify({ level: 'fatal', component: 'e2e-guard', msg: 'refusing to run e2e against non-test DATABASE_URL' }));
  process.exit(1);
}

const E2E_ADMIN_TOKEN = 'e2e-admin-token';
process.env.ADMIN_API_TOKEN = E2E_ADMIN_TOKEN;

export const E2E_ADMIN_AUTH = { authorization: `Bearer ${E2E_ADMIN_TOKEN}` };
