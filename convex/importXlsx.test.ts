// @vitest-environment node
/// <reference types="vite/client" />

import { readFile } from 'node:fs/promises';

import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';
const FIXTURE_PATH = new URL(
  './testFixtures/sanitized/synthetic-itau-credit-card.xlsx',
  import.meta.url,
);

type TestBackend = TestConvex<typeof schema>;
type TestClient = ReturnType<TestBackend['withIdentity']>;

describe('XLSX imports', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires the authorized owner before parsing an XLSX upload', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const other = t.withIdentity({ subject: SYNTHETIC_OTHER_ID });
    const stored = await storeSyntheticXlsxUpload(t, owner);

    await expect(
      other.action(api.importXlsx.createPreview, stored),
    ).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
    expect(
      await t.run(async (ctx) => Boolean(await ctx.storage.get(stored.storageId))),
    ).toBe(true);
  });

  it('deletes, confirms and reprocesses the synthetic XLSX without duplication', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const stored = await storeSyntheticXlsxUpload(t, owner);

    const preview = await owner.action(api.importXlsx.createPreview, stored);

    expect(preview).toMatchObject({
      format: 'itauCreditCardXlsx',
      sourceAccountKind: 'creditCard',
      sourcePatrimony: 'personal',
      parserVersion: 'itau-credit-card-xlsx-v3',
      status: 'preview',
      statementTitle: 'Fatura Paga - Julho/2026',
      statementCompetence: '2026-07',
      statementDueOn: '2026-07-12',
      statementTotal: money(34_455n),
      purchaseTotal: money(39_455n),
      creditAdjustmentTotal: money(5_000n),
      settlementTotal: money(50_000n),
      transactionCount: 5,
      creditTotal: money(55_000n),
      debitTotal: money(39_455n),
      rawFileStatus: 'deleted',
    });
    await expect(t.run((ctx) => ctx.storage.get(stored.storageId))).resolves.toBeNull();

    const confirmed = await owner.mutation(api.imports.confirmBatch, {
      batchId: preview.batchId,
    });
    const retried = await owner.mutation(api.imports.confirmBatch, {
      batchId: preview.batchId,
    });
    expect(confirmed).toMatchObject({ status: 'confirmed', insertedCount: 5 });
    expect(retried).toEqual(confirmed);

    const persisted = await t.run(async (ctx) => ({
      entries: await ctx.db.query('importBatchEntries').take(10),
      sources: await ctx.db.query('sourceTransactions').take(10),
    }));
    expect(persisted.entries).toHaveLength(5);
    expect(persisted.sources).toHaveLength(5);
    expect(
      persisted.sources.map((source) => [
        source.transactionType,
        source.amount.amountInMinorUnits,
      ]),
    ).toEqual([
      ['purchase', -12_345n],
      ['purchase', -20_000n],
      ['creditAdjustment', 5_000n],
      ['statementPayment', 50_000n],
      ['purchase', -7_110n],
    ]);
    expect(persisted.sources[1]).toMatchObject({
      sourceAccountKind: 'creditCard',
      sourcePatrimony: 'personal',
      installmentCurrent: 2,
      installmentTotal: 4,
    });

    const reimported = await owner.action(
      api.importXlsx.createPreview,
      await storeSyntheticXlsxUpload(t, owner),
    );
    expect(reimported).toMatchObject({
      batchId: preview.batchId,
      status: 'confirmed',
      insertedCount: 5,
    });
    await expect(
      t.run((ctx) => ctx.db.query('sourceTransactions').take(10)),
    ).resolves.toHaveLength(5);
  });
});

async function storeSyntheticXlsxUpload(t: TestBackend, owner: TestClient) {
  const upload = await owner.mutation(api.imports.generateUploadUrl, {
    format: 'itauCreditCardXlsx',
    sourcePatrimony: 'personal',
  });
  const bytes = await readFile(FIXTURE_PATH);
  const storageId = await t.run((ctx) =>
    ctx.storage.store(
      new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    ),
  );
  return { uploadId: upload.uploadId, storageId };
}

function money(amountInMinorUnits: bigint) {
  return {
    amountInMinorUnits,
    currency: 'BRL' as const,
    minorUnit: 'cent' as const,
  };
}
