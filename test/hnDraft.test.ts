import { it, expect, beforeAll } from 'vitest';
import { prisma } from '../src/db/client.js';
import { HnDraftService, type HnThread } from '../src/services/hnDraftService.js';

beforeAll(async () => {
  process.env.DATABASE_URL = 'file:./test.db';
  process.env.NODE_ENV = 'test';
  await prisma.$executeRawUnsafe('DELETE FROM HnDraft');
});

it('lists empty queue without throwing', async () => {
  const drafts = await HnDraftService.listPending();
  expect(Array.isArray(drafts)).toBe(true);
});

it('stores an approved draft and tracks a manual post', async () => {
  const row = await prisma.hnDraft.create({
    data: {
      threadId: '1001',
      threadTitle: 'Agent tool calls keep timing out',
      threadUrl: 'https://news.ycombinator.com/item?id=1001',
      draftBody: 'Check the write before you retry. If the record exists, treat the timeout as success and avoid the duplicate.',
      score: 80,
      status: 'pending',
    },
  });

  const approved = await HnDraftService.approve(row.id, 'Check the write first. If the row is there, do not retry blindly.');
  expect(approved.status).toBe('approved');
  expect(approved.draftBody).toContain('Check the write first');

  const posted = await HnDraftService.markPosted(row.id, 'https://news.ycombinator.com/item?id=1001&n=1');
  expect(posted.status).toBe('posted');
  expect(posted.postedUrl).toContain('1001');

  // Posted drafts leave the pending queue.
  const pending = await HnDraftService.listPending();
  expect(pending.find((d) => d.id === row.id)).toBeUndefined();
});

it('rejects a draft', async () => {
  const row = await prisma.hnDraft.create({
    data: {
      threadId: '1002',
      threadTitle: 'Unrelated cooking thread',
      threadUrl: 'https://news.ycombinator.com/item?id=1002',
      draftBody: 'This is not about agents at all but still long enough to store for the test.',
      score: 30,
      status: 'pending',
    },
  });
  const rejected = await HnDraftService.reject(row.id);
  expect(rejected.status).toBe('rejected');
});

it('runScan is rate-limited and returns a safe shape', async () => {
  (HnDraftService as unknown as { nextScanAt: number }).nextScanAt = 0;
  (HnDraftService as unknown as { busy: boolean }).busy = false;
  const result = await HnDraftService.runScan(true);
  expect(result).toHaveProperty('scanned');
  expect(result).toHaveProperty('created');
  expect(Array.isArray(result.drafts)).toBe(true);
});
