/// <reference types="vite/client" />

import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';
import { SYNTHETIC_OFX } from './testFixtures/syntheticOfx';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';

type TestBackend = TestConvex<typeof schema>;
type TestClient = ReturnType<TestBackend['withIdentity']>;

describe('imports', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires the authorized owner for upload and batch operations', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const otherUser = t.withIdentity({ subject: SYNTHETIC_OTHER_ID });

    await expect(t.mutation(api.imports.generateUploadUrl)).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    await expect(otherUser.mutation(api.imports.generateUploadUrl)).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });

    const stored = await storeSyntheticUpload(t, owner);
    await expect(
      otherUser.action(api.imports.createPreview, {
        uploadId: stored.uploadId,
        storageId: stored.storageId,
      }),
    ).rejects.toMatchObject({ data: { code: 'ACCESS_DENIED' } });
    expect(
      await t.run(async (ctx) => Boolean(await ctx.storage.get(stored.storageId))),
    ).toBe(true);

    const preview = await owner.action(api.imports.createPreview, stored);
    await expect(
      otherUser.mutation(api.imports.confirmBatch, { batchId: preview.batchId }),
    ).rejects.toMatchObject({ data: { code: 'ACCESS_DENIED' } });
  });

  it('deletes the raw OFX before returning a structured preview', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const stored = await storeSyntheticUpload(t, owner);

    const preview = await owner.action(api.imports.createPreview, stored);

    expect(preview).toMatchObject({
      status: 'preview',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      transactionCount: 2,
      duplicateCount: 0,
      creditTotal: { amountInMinorUnits: 250_000n, currency: 'BRL', minorUnit: 'cent' },
      debitTotal: { amountInMinorUnits: 12_345n, currency: 'BRL', minorUnit: 'cent' },
      rawFileStatus: 'deleted',
    });
    expect(preview.previewRows).toHaveLength(2);
    await expect(t.run((ctx) => ctx.storage.get(stored.storageId))).resolves.toBeNull();

    const persisted = await t.run(async (ctx) => ({
      uploads: await ctx.db.query('importUploads').take(3),
      batches: await ctx.db.query('importBatches').take(3),
      entries: await ctx.db.query('importBatchEntries').take(3),
      auditEvents: await ctx.db.query('auditEvents').take(6),
    }));
    expect(persisted.uploads).toHaveLength(1);
    expect(persisted.uploads[0]).toMatchObject({ status: 'consumed' });
    expect(persisted.uploads[0].storageId).toBeUndefined();
    expect(persisted.batches).toHaveLength(1);
    expect(persisted.entries).toHaveLength(2);
    expect(persisted.auditEvents.map((event) => event.action)).toEqual([
      'import_batch.preview_created',
      'bank_file.deleted',
    ]);
  });

  it('confirms a preview once and keeps source transactions immutable on retry', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const preview = await createSyntheticPreview(t, owner);

    const confirmed = await owner.mutation(api.imports.confirmBatch, {
      batchId: preview.batchId,
    });
    const retried = await owner.mutation(api.imports.confirmBatch, {
      batchId: preview.batchId,
    });

    expect(confirmed).toMatchObject({
      status: 'confirmed',
      insertedCount: 2,
      duplicateCount: 0,
    });
    expect(retried).toEqual(confirmed);
    const persisted = await t.run(async (ctx) => ({
      sources: await ctx.db.query('sourceTransactions').take(5),
      confirmedAudits: (await ctx.db.query('auditEvents').take(10)).filter(
        (event) => event.action === 'import_batch.confirmed',
      ),
    }));
    expect(persisted.sources).toHaveLength(2);
    expect(persisted.confirmedAudits).toHaveLength(1);
  });

  it('discards preview entries and safely reopens the same file without duplication', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const firstPreview = await createSyntheticPreview(t, owner);

    await expect(
      owner.mutation(api.imports.discardBatch, { batchId: firstPreview.batchId }),
    ).resolves.toEqual({ batchId: firstPreview.batchId, status: 'discarded' });
    await expect(
      t.run((ctx) => ctx.db.query('importBatchEntries').take(5)),
    ).resolves.toHaveLength(0);

    const reopened = await createSyntheticPreview(t, owner);
    expect(reopened).toMatchObject({
      batchId: firstPreview.batchId,
      status: 'preview',
      transactionCount: 2,
    });
    const confirmed = await owner.mutation(api.imports.confirmBatch, {
      batchId: reopened.batchId,
    });
    expect(confirmed.insertedCount).toBe(2);

    const sameConfirmedBatch = await createSyntheticPreview(t, owner);
    expect(sameConfirmedBatch).toMatchObject({
      batchId: firstPreview.batchId,
      status: 'confirmed',
      insertedCount: 2,
    });
    await expect(
      t.run((ctx) => ctx.db.query('sourceTransactions').take(5)),
    ).resolves.toHaveLength(2);
  });

  it('deletes and audits rejected raw files without persisting their contents', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const stored = await storeUpload(t, owner, 'synthetic invalid content', 'text/plain');

    await expect(owner.action(api.imports.createPreview, stored)).rejects.toMatchObject({
      data: { code: 'OFX_INVALID_FORMAT' },
    });
    await expect(t.run((ctx) => ctx.storage.get(stored.storageId))).resolves.toBeNull();

    const persisted = await t.run(async (ctx) => ({
      batch: (await ctx.db.query('importBatches').take(2))[0],
      entries: await ctx.db.query('importBatchEntries').take(2),
      auditEvents: await ctx.db.query('auditEvents').take(5),
    }));
    expect(persisted.batch).toMatchObject({
      status: 'rejected',
      rejectionCode: 'OFX_INVALID_FORMAT',
      rawFileStatus: 'deleted',
      transactionCount: 0,
    });
    expect(persisted.entries).toHaveLength(0);
    expect(persisted.auditEvents.map((event) => event.action)).toEqual([
      'import_batch.rejected',
      'bank_file.deleted',
    ]);
  });

  it('cleans an uploaded orphan idempotently after a client-side failure', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const stored = await storeSyntheticUpload(t, owner);

    await owner.mutation(api.imports.cleanupUpload, stored);
    await owner.mutation(api.imports.cleanupUpload, stored);

    await expect(t.run((ctx) => ctx.storage.get(stored.storageId))).resolves.toBeNull();
    const persisted = await t.run(async (ctx) => ({
      upload: await ctx.db.get('importUploads', stored.uploadId),
      auditEvents: await ctx.db.query('auditEvents').take(5),
    }));
    expect(persisted.upload).toMatchObject({ status: 'cleaned' });
    expect(persisted.upload?.storageId).toBeUndefined();
    expect(persisted.auditEvents.map((event) => event.action)).toEqual([
      'import_upload.cleaned',
    ]);
  });
});

async function createSyntheticPreview(t: TestBackend, owner: TestClient) {
  const stored = await storeSyntheticUpload(t, owner);
  return await owner.action(api.imports.createPreview, stored);
}

async function storeSyntheticUpload(t: TestBackend, owner: TestClient) {
  return await storeUpload(t, owner, SYNTHETIC_OFX, 'application/x-ofx');
}

async function storeUpload(
  t: TestBackend,
  owner: TestClient,
  content: string,
  contentType: string,
): Promise<{ uploadId: Id<'importUploads'>; storageId: Id<'_storage'> }> {
  const upload = await owner.mutation(api.imports.generateUploadUrl);
  const storageId = await t.run((ctx) => ctx.storage.store(new Blob([content], { type: contentType })));
  return { uploadId: upload.uploadId, storageId };
}
