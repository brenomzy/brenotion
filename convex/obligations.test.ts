/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';
const SYNTHETIC_OWNER_TOKEN = `https://convex.test|${SYNTHETIC_OWNER_ID}`;

describe('obligations', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('denies unauthenticated and non-owner reads and writes', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const unauthenticated = convexTest(schema, modules);
    const otherUser = convexTest(schema, modules).withIdentity({
      subject: SYNTHETIC_OTHER_ID,
    });

    await expect(unauthenticated.query(api.obligations.list, {})).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    await expect(
      unauthenticated.mutation(api.obligations.upsert, personalObligation()),
    ).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    await expect(otherUser.query(api.obligations.list, {})).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
    await expect(
      otherUser.mutation(api.obligations.upsert, personalObligation()),
    ).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
  });

  it('upserts idempotently and keeps obligations isolated by owner', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });

    await backend.run(async (ctx) => {
      await ctx.db.insert('obligations', {
        ownerId: 'synthetic-identity|isolated-owner',
        obligationKey: 'synthetic-connectivity',
        name: 'Synthetic connectivity',
        economicNature: 'business',
        businessSharePolicy: { status: 'notApplicable' },
        paymentOrigin: 'business',
        isActive: true,
        createdAt: 1,
        updatedAt: 1,
      });
    });

    const input = personalObligation();
    const created = await owner.mutation(api.obligations.upsert, input);
    const unchanged = await owner.mutation(api.obligations.upsert, input);

    expect(created.status).toBe('created');
    expect(unchanged).toEqual({
      status: 'unchanged',
      obligation: created.obligation,
    });

    const visible = await owner.query(api.obligations.list, {});
    expect(visible).toEqual({
      items: [created.obligation],
      isTruncated: false,
    });

    const stored = await backend.run(async (ctx) => ({
      obligations: await ctx.db.query('obligations').take(3),
      revisions: await ctx.db.query('obligationRevisions').take(3),
      audits: await ctx.db.query('auditEvents').take(3),
    }));
    expect(stored.obligations).toHaveLength(2);
    expect(stored.revisions).toHaveLength(1);
    expect(stored.audits).toHaveLength(1);
    expect(stored.obligations[1]).toMatchObject({
      revisionNumber: 1n,
      currentRevisionId: stored.revisions[0]._id,
    });
    expect(stored.revisions[0]).toMatchObject({
      ownerId: SYNTHETIC_OWNER_TOKEN,
      obligationId: created.obligation.obligationId,
      revisionNumber: 1n,
      reason: 'created',
      snapshot: {
        ...input,
        obligationKey: input.obligationKey,
        name: input.name,
        createdAt: created.obligation.createdAt,
        updatedAt: created.obligation.updatedAt,
      },
    });
    expect(stored.audits[0]).toMatchObject({
      action: 'obligation.created',
      targetType: 'obligation',
      revisionId: stored.revisions[0]._id,
      result: 'succeeded',
    });

    await expect(
      owner.query(api.obligations.listRevisions, {
        obligationId: created.obligation.obligationId,
      }),
    ).resolves.toEqual({
      items: [
        {
          revisionId: stored.revisions[0]._id,
          revisionNumber: 1n,
          reason: 'created',
          snapshot: stored.revisions[0].snapshot,
          recordedAt: stored.revisions[0].recordedAt,
        },
      ],
      isTruncated: false,
    });
  });

  it('stores economic nature independently from payment origin', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const owner = convexTest(schema, modules).withIdentity({
      subject: SYNTHETIC_OWNER_ID,
    });

    const created = await owner.mutation(api.obligations.upsert, {
      ...personalObligation(),
      paymentOrigin: 'business',
    });

    expect(created.obligation).toMatchObject({
      economicNature: 'personal',
      paymentOrigin: 'business',
      businessSharePolicy: { status: 'notApplicable' },
    });
  });

  it('requires mixed business share to be confirmed or explicitly pending', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const owner = convexTest(schema, modules).withIdentity({
      subject: SYNTHETIC_OWNER_ID,
    });

    const pending = await owner.mutation(api.obligations.upsert, {
      obligationKey: 'synthetic-utilities',
      name: 'Synthetic utilities',
      economicNature: 'mixed',
      businessSharePolicy: { status: 'needsConfirmation' },
      paymentOrigin: 'personal',
      isActive: true,
    });
    const confirmed = await owner.mutation(api.obligations.upsert, {
      obligationKey: 'synthetic-utilities',
      name: 'Synthetic utilities',
      economicNature: 'mixed',
      businessSharePolicy: { status: 'confirmed', basisPoints: 3_500n },
      paymentOrigin: 'personal',
      isActive: true,
    });

    expect(pending.obligation.businessSharePolicy).toEqual({
      status: 'needsConfirmation',
    });
    expect(confirmed.status).toBe('updated');
    expect(confirmed.obligation.businessSharePolicy).toEqual({
      status: 'confirmed',
      basisPoints: 3_500n,
    });
  });

  it('rejects contradictory shares, invented percentages and invalid boundaries', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const owner = convexTest(schema, modules).withIdentity({
      subject: SYNTHETIC_OWNER_ID,
    });

    await expect(
      owner.mutation(api.obligations.upsert, {
        ...personalObligation(),
        businessSharePolicy: { status: 'needsConfirmation' },
      }),
    ).rejects.toMatchObject({
      data: { code: 'BUSINESS_SHARE_ONLY_FOR_MIXED_NATURE' },
    });
    await expect(
      owner.mutation(api.obligations.upsert, {
        ...personalObligation(),
        economicNature: 'mixed',
      }),
    ).rejects.toMatchObject({
      data: { code: 'MIXED_BUSINESS_SHARE_REQUIRED' },
    });
    await expect(
      owner.mutation(api.obligations.upsert, {
        ...personalObligation(),
        economicNature: 'mixed',
        businessSharePolicy: { status: 'confirmed', basisPoints: 0n },
      }),
    ).rejects.toMatchObject({
      data: { code: 'INVALID_MIXED_BUSINESS_SHARE' },
    });
    await expect(
      owner.mutation(api.obligations.upsert, {
        ...personalObligation(),
        obligationKey: 'INVALID KEY',
      }),
    ).rejects.toMatchObject({
      data: { code: 'INVALID_OBLIGATION_KEY' },
    });
    await expect(
      owner.mutation(api.obligations.upsert, {
        ...personalObligation(),
        dueDayOfMonth: 32,
      }),
    ).rejects.toMatchObject({
      data: { code: 'INVALID_DUE_DAY_OF_MONTH' },
    });
    await expect(
      owner.mutation(api.obligations.upsert, {
        ...personalObligation(),
        expectedAmount: {
          amountInMinorUnits: -1n,
          currency: 'BRL',
          minorUnit: 'cent',
        },
      }),
    ).rejects.toMatchObject({
      data: { code: 'INVALID_EXPECTED_AMOUNT' },
    });
  });

  it('updates and deactivates without duplicating the logical obligation', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });

    const created = await owner.mutation(api.obligations.upsert, personalObligation());
    const updated = await owner.mutation(api.obligations.upsert, {
      ...personalObligation(),
      name: 'Renamed synthetic housing',
      isActive: false,
    });

    expect(updated.status).toBe('updated');
    expect(updated.obligation.obligationId).toBe(created.obligation.obligationId);
    expect(updated.obligation.createdAt).toBe(created.obligation.createdAt);
    await expect(owner.query(api.obligations.list, {})).resolves.toEqual({
      items: [],
      isTruncated: false,
    });
    await expect(owner.query(api.obligations.list, { includeInactive: true })).resolves.toEqual({
      items: [updated.obligation],
      isTruncated: false,
    });

    const stored = await backend.run(async (ctx) => ({
      obligations: await ctx.db.query('obligations').take(3),
      revisions: await ctx.db
        .query('obligationRevisions')
        .withIndex('by_ownerId_and_obligationId_and_revisionNumber', (q) =>
          q
            .eq('ownerId', SYNTHETIC_OWNER_TOKEN)
            .eq('obligationId', created.obligation.obligationId),
        )
        .take(3),
      audits: await ctx.db.query('auditEvents').take(3),
    }));
    expect(stored.obligations).toHaveLength(1);
    expect(stored.revisions).toHaveLength(2);
    expect(stored.revisions.map((revision) => revision.revisionNumber)).toEqual([
      1n,
      2n,
    ]);
    expect(stored.revisions[0].snapshot.name).toBe('Synthetic housing');
    expect(stored.revisions[0].snapshot.isActive).toBe(true);
    expect(stored.revisions[1]).toMatchObject({
      reason: 'updated',
      snapshot: {
        name: 'Renamed synthetic housing',
        isActive: false,
      },
    });
    expect(stored.audits.map((event) => event.action)).toEqual([
      'obligation.created',
      'obligation.updated',
    ]);
    expect(stored.audits.map((event) => event.revisionId)).toEqual(
      stored.revisions.map((revision) => revision._id),
    );
  });

  it('backfills a legacy baseline only when a material update occurs', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const legacyId = await backend.run(async (ctx) => {
      return await ctx.db.insert('obligations', {
        ownerId: SYNTHETIC_OWNER_TOKEN,
        obligationKey: 'synthetic-legacy',
        name: 'Synthetic legacy',
        economicNature: 'personal',
        businessSharePolicy: { status: 'notApplicable' },
        paymentOrigin: 'personal',
        isActive: true,
        createdAt: 10,
        updatedAt: 10,
      });
    });

    const unchanged = await owner.mutation(api.obligations.upsert, {
      obligationKey: 'synthetic-legacy',
      name: 'Synthetic legacy',
      economicNature: 'personal',
      businessSharePolicy: { status: 'notApplicable' },
      paymentOrigin: 'personal',
      isActive: true,
    });
    expect(unchanged.status).toBe('unchanged');
    await expect(
      backend.run(async (ctx) => ({
        revisions: await ctx.db.query('obligationRevisions').take(3),
        audits: await ctx.db.query('auditEvents').take(3),
      })),
    ).resolves.toEqual({ revisions: [], audits: [] });

    const updated = await owner.mutation(api.obligations.upsert, {
      obligationKey: 'synthetic-legacy',
      name: 'Synthetic legacy renamed',
      economicNature: 'personal',
      businessSharePolicy: { status: 'notApplicable' },
      paymentOrigin: 'personal',
      isActive: true,
    });
    expect(updated.status).toBe('updated');

    const stored = await backend.run(async (ctx) => ({
      obligation: await ctx.db.get('obligations', legacyId),
      revisions: await ctx.db
        .query('obligationRevisions')
        .withIndex('by_ownerId_and_obligationId_and_revisionNumber', (q) =>
          q.eq('ownerId', SYNTHETIC_OWNER_TOKEN).eq('obligationId', legacyId),
        )
        .take(3),
      audits: await ctx.db.query('auditEvents').take(3),
    }));
    expect(stored.revisions).toHaveLength(2);
    expect(stored.revisions[0]).toMatchObject({
      revisionNumber: 1n,
      reason: 'legacyBaseline',
      snapshot: { name: 'Synthetic legacy', updatedAt: 10 },
    });
    expect(stored.revisions[1]).toMatchObject({
      revisionNumber: 2n,
      reason: 'updated',
      snapshot: { name: 'Synthetic legacy renamed' },
    });
    expect(stored.obligation).toMatchObject({
      revisionNumber: 2n,
      currentRevisionId: stored.revisions[1]._id,
    });
    expect(stored.audits).toEqual([
      expect.objectContaining({
        action: 'obligation.updated',
        revisionId: stored.revisions[1]._id,
      }),
    ]);
  });

  it('does not expose revision history for another owner', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const otherObligationId = await backend.run(async (ctx) => {
      return await ctx.db.insert('obligations', {
        ownerId: 'https://convex.test|isolated-owner',
        obligationKey: 'synthetic-isolated',
        name: 'Synthetic isolated',
        economicNature: 'business',
        businessSharePolicy: { status: 'notApplicable' },
        paymentOrigin: 'business',
        isActive: true,
        createdAt: 1,
        updatedAt: 1,
      });
    });

    await expect(
      owner.query(api.obligations.listRevisions, {
        obligationId: otherObligationId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'OBLIGATION_NOT_FOUND' },
    });
  });
});

function personalObligation() {
  return {
    obligationKey: 'synthetic-housing',
    name: 'Synthetic housing',
    economicNature: 'personal' as const,
    businessSharePolicy: { status: 'notApplicable' as const },
    paymentOrigin: 'personal' as const,
    expectedAmount: {
      amountInMinorUnits: 125_00n,
      currency: 'BRL' as const,
      minorUnit: 'cent' as const,
    },
    dueDayOfMonth: 12,
    isActive: true,
  };
}
