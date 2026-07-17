/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';
const EXACT_SYNTHETIC_AMOUNT = 9_007_199_254_740_993n;

const syntheticSnapshot = {
  availableToSpend: {
    amountInMinorUnits: EXACT_SYNTHETIC_AMOUNT,
    currency: 'BRL' as const,
    minorUnit: 'cent' as const,
  },
  asOf: Date.UTC(2026, 6, 17, 12),
  timeZone: 'America/Sao_Paulo',
  confidence: 'partial' as const,
  calculationVersion: 'synthetic-test-v1',
};

describe('financialSnapshot', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('denies unauthenticated and non-owner access', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const unauthenticated = convexTest(schema, modules);
    const otherUser = convexTest(schema, modules).withIdentity({
      subject: SYNTHETIC_OTHER_ID,
    });

    await expect(unauthenticated.query(api.financialSnapshot.getCurrent)).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    await expect(
      unauthenticated.mutation(internal.financialSnapshot.replaceCurrent, syntheticSnapshot),
    ).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    await expect(otherUser.query(api.financialSnapshot.getCurrent)).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
    await expect(
      otherUser.mutation(internal.financialSnapshot.replaceCurrent, syntheticSnapshot),
    ).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
  });

  it('preserves exact BRL minor units and makes replacement idempotent', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules).withIdentity({ subject: SYNTHETIC_OWNER_ID });

    const created = await t.mutation(
      internal.financialSnapshot.replaceCurrent,
      syntheticSnapshot,
    );
    const unchanged = await t.mutation(
      internal.financialSnapshot.replaceCurrent,
      syntheticSnapshot,
    );

    expect(created.status).toBe('created');
    expect(created.snapshot.availableToSpend).toEqual({
      amountInMinorUnits: EXACT_SYNTHETIC_AMOUNT,
      currency: 'BRL',
      minorUnit: 'cent',
    });
    expect(unchanged).toEqual({
      status: 'unchanged',
      snapshot: created.snapshot,
    });
    await expect(t.query(api.financialSnapshot.getCurrent)).resolves.toEqual(created.snapshot);

    const stored = await t.run(async (ctx) => ({
      snapshots: await ctx.db.query('financialSnapshots').take(3),
      auditEvents: await ctx.db.query('auditEvents').take(3),
    }));
    expect(stored.snapshots).toHaveLength(1);
    expect(stored.snapshots[0].availableToSpend.amountInMinorUnits).toBe(
      EXACT_SYNTHETIC_AMOUNT,
    );
    expect(stored.auditEvents).toHaveLength(1);
    expect(stored.auditEvents[0]).toMatchObject({
      action: 'financial_snapshot.replaced',
      targetType: 'financial_snapshot',
      result: 'succeeded',
    });
  });

  it('replaces one owner snapshot without exposing another owner record', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules).withIdentity({ subject: SYNTHETIC_OWNER_ID });

    await t.run(async (ctx) => {
      await ctx.db.insert('financialSnapshots', {
        ownerId: 'synthetic-identity|isolated-owner',
        availableToSpend: {
          amountInMinorUnits: 101n,
          currency: 'BRL',
          minorUnit: 'cent',
        },
        asOf: 1,
        timeZone: 'UTC',
        confidence: 'stale',
        calculationVersion: 'synthetic-isolated-v1',
        updatedAt: 1,
      });
    });

    await t.mutation(internal.financialSnapshot.replaceCurrent, syntheticSnapshot);
    const replaced = await t.mutation(internal.financialSnapshot.replaceCurrent, {
      ...syntheticSnapshot,
      confidence: 'recent',
      calculationVersion: 'synthetic-test-v2',
    });

    expect(replaced.status).toBe('replaced');
    expect(replaced.snapshot.confidence).toBe('recent');
    const stored = await t.run(async (ctx) => await ctx.db.query('financialSnapshots').take(3));
    expect(stored).toHaveLength(2);
    expect(stored.find((snapshot) => snapshot.ownerId === 'synthetic-identity|isolated-owner')).toMatchObject(
      {
        availableToSpend: { amountInMinorUnits: 101n },
        calculationVersion: 'synthetic-isolated-v1',
      },
    );
  });
});
