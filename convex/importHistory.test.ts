/// <reference types="vite/client" />

import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';
const PAGE_SIZE = 2;

describe('importHistory', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires the authorized owner for every public history query', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const other = t.withIdentity({ subject: SYNTHETIC_OTHER_ID });
    const paginationOpts = { cursor: null, numItems: PAGE_SIZE };
    const batchId = await insertConfirmedBatch(t, ownerIdentityKey(SYNTHETIC_OWNER_ID), {
      fileHash: 'synthetic-protected-history',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      confirmedAt: 30,
    });

    await expect(
      t.query(api.importHistory.listConfirmedBatches, { paginationOpts }),
    ).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    await expect(
      other.query(api.importHistory.listConfirmedBatches, { paginationOpts }),
    ).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
    await expect(
      t.query(api.importHistory.listSourceTransactions, {
        batchId,
        paginationOpts,
      }),
    ).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    await expect(
      other.query(api.importHistory.listSourceTransactions, {
        batchId,
        paginationOpts,
      }),
    ).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
  });

  it('lists only the owner confirmed batches newest first and paginates them', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const ownerId = ownerIdentityKey(SYNTHETIC_OWNER_ID);

    const oldestId = await insertConfirmedBatch(t, ownerId, {
      fileHash: 'synthetic-hash-oldest',
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      confirmedAt: 10,
    });
    const middleId = await insertConfirmedBatch(t, ownerId, {
      fileHash: 'synthetic-hash-middle',
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      confirmedAt: 20,
    });
    const newestId = await insertConfirmedBatch(t, ownerId, {
      fileHash: 'synthetic-hash-newest',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      confirmedAt: 30,
    });
    await insertConfirmedBatch(t, 'synthetic-issuer|isolated-owner', {
      fileHash: 'synthetic-hash-isolated',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      confirmedAt: 40,
    });
    await insertPreviewBatch(t, ownerId);

    const firstPage = await owner.query(api.importHistory.listConfirmedBatches, {
      paginationOpts: { cursor: null, numItems: PAGE_SIZE },
    });
    const secondPage = await owner.query(api.importHistory.listConfirmedBatches, {
      paginationOpts: {
        cursor: firstPage.continueCursor,
        numItems: PAGE_SIZE,
      },
    });

    expect(firstPage.page.map((batch) => batch.batchId)).toEqual([newestId, middleId]);
    expect(firstPage.isDone).toBe(false);
    expect(secondPage.page.map((batch) => batch.batchId)).toEqual([oldestId]);
    expect(secondPage.isDone).toBe(true);
    expect(firstPage.page[0]).toEqual({
      batchId: newestId,
      format: 'ofx',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      transactionCount: 2,
      duplicateCount: 0,
      insertedCount: 2,
      creditTotal: money(25_000n),
      debitTotal: money(3_500n),
      confirmedAt: 30,
    });
  });

  it('lists only source transactions from an owned confirmed batch in date order', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const ownerId = ownerIdentityKey(SYNTHETIC_OWNER_ID);
    const batchId = await insertConfirmedBatch(t, ownerId, {
      fileHash: 'synthetic-source-history',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      confirmedAt: 30,
    });

    const oldestId = await insertSourceTransaction(t, ownerId, batchId, {
      sourceKey: 'synthetic-source-oldest',
      postedOn: '2026-06-01',
      amountInMinorUnits: -1_000n,
      description: 'Synthetic expense alpha',
    });
    const middleId = await insertSourceTransaction(t, ownerId, batchId, {
      sourceKey: 'synthetic-source-middle',
      postedOn: '2026-06-15',
      amountInMinorUnits: -2_000n,
      description: 'Synthetic expense beta',
    });
    const newestId = await insertSourceTransaction(t, ownerId, batchId, {
      sourceKey: 'synthetic-source-newest',
      postedOn: '2026-06-30',
      amountInMinorUnits: 10_000n,
      description: 'Synthetic income gamma',
    });

    const firstPage = await owner.query(api.importHistory.listSourceTransactions, {
      batchId,
      paginationOpts: { cursor: null, numItems: PAGE_SIZE },
    });
    const secondPage = await owner.query(api.importHistory.listSourceTransactions, {
      batchId,
      paginationOpts: {
        cursor: firstPage.continueCursor,
        numItems: PAGE_SIZE,
      },
    });

    expect(firstPage.page.map((transaction) => transaction.transactionId)).toEqual([
      newestId,
      middleId,
    ]);
    expect(secondPage.page.map((transaction) => transaction.transactionId)).toEqual([
      oldestId,
    ]);
    expect(firstPage.page[0]).toEqual({
      transactionId: newestId,
      importBatchId: batchId,
      postedOn: '2026-06-30',
      amount: money(10_000n),
      description: 'Synthetic income gamma',
      transactionType: 'CREDIT',
    });
  });

  it('hides another owner batch and rejects invalid page sizes', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const isolatedBatchId = await insertConfirmedBatch(
      t,
      'synthetic-issuer|isolated-owner',
      {
        fileHash: 'synthetic-hidden-batch',
        periodStart: '2026-06-01',
        periodEnd: '2026-06-30',
        confirmedAt: 30,
      },
    );

    await expect(
      owner.query(api.importHistory.listSourceTransactions, {
        batchId: isolatedBatchId,
        paginationOpts: { cursor: null, numItems: PAGE_SIZE },
      }),
    ).rejects.toMatchObject({
      data: { code: 'IMPORT_BATCH_NOT_FOUND' },
    });
    await expect(
      owner.query(api.importHistory.listConfirmedBatches, {
        paginationOpts: { cursor: null, numItems: 51 },
      }),
    ).rejects.toMatchObject({
      data: { code: 'INVALID_PAGINATION_LIMIT', maxPageSize: 50 },
    });
  });
});

type TestBackend = TestConvex<typeof schema>;

function ownerIdentityKey(subject: string): string {
  return `https://convex.test|${subject}`;
}

async function insertConfirmedBatch(
  t: TestBackend,
  ownerId: string,
  input: {
    fileHash: string;
    periodStart: string;
    periodEnd: string;
    confirmedAt: number;
  },
): Promise<Id<'importBatches'>> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('importBatches', {
      ownerId,
      fileHash: input.fileHash,
      format: 'ofx',
      status: 'confirmed',
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      transactionCount: 2,
      duplicateCount: 0,
      creditTotal: money(25_000n),
      debitTotal: money(3_500n),
      rawFileStatus: 'deleted',
      rawDeletedAt: input.confirmedAt - 1,
      insertedCount: 2,
      createdAt: input.confirmedAt - 2,
      updatedAt: input.confirmedAt,
      confirmedAt: input.confirmedAt,
    });
  });
}

async function insertPreviewBatch(t: TestBackend, ownerId: string): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert('importBatches', {
      ownerId,
      fileHash: 'synthetic-preview-batch',
      format: 'ofx',
      status: 'preview',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      transactionCount: 1,
      duplicateCount: 0,
      creditTotal: money(0n),
      debitTotal: money(500n),
      rawFileStatus: 'deleted',
      rawDeletedAt: 40,
      createdAt: 40,
      updatedAt: 40,
    });
  });
}

async function insertSourceTransaction(
  t: TestBackend,
  ownerId: string,
  importBatchId: Id<'importBatches'>,
  input: {
    sourceKey: string;
    postedOn: string;
    amountInMinorUnits: bigint;
    description: string;
  },
): Promise<Id<'sourceTransactions'>> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('sourceTransactions', {
      ownerId,
      sourceKey: input.sourceKey,
      importBatchId,
      postedOn: input.postedOn,
      amount: money(input.amountInMinorUnits),
      description: input.description,
      transactionType: input.amountInMinorUnits >= 0n ? 'CREDIT' : 'DEBIT',
      createdAt: Date.now(),
    });
  });
}

function money(amountInMinorUnits: bigint) {
  return {
    amountInMinorUnits,
    currency: 'BRL' as const,
    minorUnit: 'cent' as const,
  };
}
