/// <reference types="vite/client" />

import { makeFunctionReference } from 'convex/server';
import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';

type CoverageResult = {
  competence: string;
  complete: boolean;
  isSearchExhaustive: boolean;
  sources: {
    source: 'personalBank' | 'creditCard' | 'businessBank';
    expectedFormat: 'ofx' | 'itauCreditCardXlsx';
    expectedSourcePatrimony: 'personal' | 'business';
    status: 'missing' | 'preview' | 'confirmed';
    batchId: Id<'importBatches'> | null;
    periodStart: string | null;
    periodEnd: string | null;
    statementCompetence: string | null;
    transactionCount: number;
    duplicateCount: number;
    importedAt: number | null;
  }[];
};

const getMonthlyImportCoverage = makeFunctionReference<
  'query',
  { competence: string },
  CoverageResult
>('monthlyImportCoverage:get');

describe('monthlyImportCoverage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires the authorized owner', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const other = t.withIdentity({ subject: SYNTHETIC_OTHER_ID });

    await expect(
      t.query(getMonthlyImportCoverage, { competence: '2026-07' }),
    ).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    await expect(
      other.query(getMonthlyImportCoverage, { competence: '2026-07' }),
    ).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
  });

  it('derives complete coverage from the three explicitly separated sources', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const ownerId = ownerIdentityKey(SYNTHETIC_OWNER_ID);

    const personalBatchId = await insertBatch(t, ownerId, {
      fileHash: 'synthetic-personal-bank',
      format: 'ofx',
      sourcePatrimony: 'personal',
      status: 'confirmed',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      timestamp: 10,
    });
    const cardBatchId = await insertBatch(t, ownerId, {
      fileHash: 'synthetic-card-statement',
      format: 'itauCreditCardXlsx',
      sourcePatrimony: 'personal',
      status: 'confirmed',
      periodStart: '2026-06-05',
      periodEnd: '2026-07-05',
      statementCompetence: '2026-07',
      timestamp: 20,
    });
    const businessBatchId = await insertBatch(t, ownerId, {
      fileHash: 'synthetic-business-bank',
      format: 'ofx',
      sourcePatrimony: 'business',
      status: 'confirmed',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      timestamp: 30,
    });
    await insertBatch(t, 'https://convex.test|isolated-owner', {
      fileHash: 'synthetic-isolated-owner',
      format: 'ofx',
      sourcePatrimony: 'business',
      status: 'confirmed',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      timestamp: 40,
    });

    const result = await owner.query(getMonthlyImportCoverage, {
      competence: '2026-07',
    });

    expect(result).toEqual({
      competence: '2026-07',
      complete: true,
      isSearchExhaustive: true,
      sources: [
        expect.objectContaining({
          source: 'personalBank',
          expectedFormat: 'ofx',
          expectedSourcePatrimony: 'personal',
          status: 'confirmed',
          batchId: personalBatchId,
        }),
        expect.objectContaining({
          source: 'creditCard',
          expectedFormat: 'itauCreditCardXlsx',
          expectedSourcePatrimony: 'personal',
          status: 'confirmed',
          batchId: cardBatchId,
          statementCompetence: '2026-07',
        }),
        expect.objectContaining({
          source: 'businessBank',
          expectedFormat: 'ofx',
          expectedSourcePatrimony: 'business',
          status: 'confirmed',
          batchId: businessBatchId,
        }),
      ],
    });
  });

  it('prefers the newest confirmed batch over a newer preview and reports missing sources', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const ownerId = ownerIdentityKey(SYNTHETIC_OWNER_ID);

    const confirmedBatchId = await insertBatch(t, ownerId, {
      fileHash: 'synthetic-confirmed-personal',
      format: 'ofx',
      sourcePatrimony: 'personal',
      status: 'confirmed',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      timestamp: 10,
    });
    await insertBatch(t, ownerId, {
      fileHash: 'synthetic-newer-preview-personal',
      format: 'ofx',
      sourcePatrimony: 'personal',
      status: 'preview',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      timestamp: 20,
    });
    const businessPreviewId = await insertBatch(t, ownerId, {
      fileHash: 'synthetic-business-preview',
      format: 'ofx',
      sourcePatrimony: 'business',
      status: 'preview',
      periodStart: '2026-07-15',
      periodEnd: '2026-08-15',
      timestamp: 30,
    });

    const result = await owner.query(getMonthlyImportCoverage, {
      competence: '2026-07',
    });

    expect(result.complete).toBe(false);
    expect(result.sources).toEqual([
      expect.objectContaining({
        source: 'personalBank',
        status: 'confirmed',
        batchId: confirmedBatchId,
      }),
      expect.objectContaining({
        source: 'creditCard',
        status: 'missing',
        batchId: null,
        transactionCount: 0,
        importedAt: null,
      }),
      expect.objectContaining({
        source: 'businessBank',
        status: 'preview',
        batchId: businessPreviewId,
      }),
    ]);
  });

  it('uses statement competence for the card and validates the requested competence', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const ownerId = ownerIdentityKey(SYNTHETIC_OWNER_ID);

    await insertBatch(t, ownerId, {
      fileHash: 'synthetic-card-other-competence',
      format: 'itauCreditCardXlsx',
      sourcePatrimony: 'personal',
      status: 'confirmed',
      periodStart: '2026-06-01',
      periodEnd: '2026-07-15',
      statementCompetence: '2026-08',
      timestamp: 10,
    });

    const result = await owner.query(getMonthlyImportCoverage, {
      competence: '2026-07',
    });
    expect(result.sources[1].status).toBe('missing');

    await expect(
      owner.query(getMonthlyImportCoverage, { competence: '2026-13' }),
    ).rejects.toMatchObject({
      data: { code: 'INVALID_COMPETENCE' },
    });
  });
});

type TestBackend = TestConvex<typeof schema>;

type BatchInput = {
  fileHash: string;
  format: 'ofx' | 'itauCreditCardXlsx';
  sourcePatrimony: 'personal' | 'business';
  status: 'preview' | 'confirmed';
  periodStart: string;
  periodEnd: string;
  statementCompetence?: string;
  timestamp: number;
};

function ownerIdentityKey(subject: string): string {
  return `https://convex.test|${subject}`;
}

async function insertBatch(
  t: TestBackend,
  ownerId: string,
  input: BatchInput,
): Promise<Id<'importBatches'>> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('importBatches', {
      ownerId,
      fileHash: input.fileHash,
      format: input.format,
      sourceAccountKind: input.format === 'ofx' ? 'bankAccount' : 'creditCard',
      sourcePatrimony: input.sourcePatrimony,
      parserVersion: 'synthetic-parser-v1',
      status: input.status,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      statementCompetence: input.statementCompetence,
      transactionCount: 3,
      duplicateCount: 1,
      creditTotal: money(0n),
      debitTotal: money(0n),
      rawFileStatus: 'deleted',
      rawDeletedAt: input.timestamp,
      insertedCount: input.status === 'confirmed' ? 2 : undefined,
      createdAt: input.timestamp,
      updatedAt: input.timestamp,
      confirmedAt: input.status === 'confirmed' ? input.timestamp : undefined,
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
