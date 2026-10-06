import { beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/db/client.js';

// Global test setup
beforeAll(async () => {
  // Ensure test database is initialized
  process.env.DATABASE_URL = 'file:./test.db';
  process.env.NODE_ENV = 'test';
});

beforeEach(async () => {
  // Clean up database before each test (optional)
  // await prisma.payment.deleteMany({});
  // await prisma.trace.deleteMany({});
});

afterAll(async () => {
  // Close database connection
  await prisma.$disconnect();
});
