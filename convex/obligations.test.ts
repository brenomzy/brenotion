/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';

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
      audits: await ctx.db.query('auditEvents').take(3),
    }));
    expect(stored.obligations).toHaveLength(2);
    expect(stored.audits).toHaveLength(1);
    expect(stored.audits[0]).toMatchObject({
      action: 'obligation.created',
      targetType: 'obligation',
      result: 'succeeded',
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
      audits: await ctx.db.query('auditEvents').take(3),
    }));
    expect(stored.obligations).toHaveLength(1);
    expect(stored.audits.map((event) => event.action)).toEqual([
      'obligation.created',
      'obligation.updated',
    ]);
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
