/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';
const SYNTHETIC_OWNER_TOKEN = `https://convex.test|${SYNTHETIC_OWNER_ID}`;
const SYNTHETIC_GROUP_KEY =
  'description-v1|transaction-type=debit|source-kind=bankaccount|basis=normalized-description|description=mercado%20sintetico';
const SYNTHETIC_SECOND_GROUP_KEY =
  'description-v1|transaction-type=purchase|source-kind=creditcard|basis=normalized-description|description=servico%20sintetico';

describe('classificationDecisions', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires the authorized owner for reads and writes', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const unauthenticated = convexTest(schema, modules);
    const otherUser = convexTest(schema, modules).withIdentity({
      subject: SYNTHETIC_OTHER_ID,
    });
    const decision = {
      groupKey: SYNTHETIC_GROUP_KEY,
      normalizedDescription: 'mercado sintetico',
      economicNature: 'personal' as const,
    };

    await expect(
      unauthenticated.mutation(api.classificationDecisions.upsert, decision),
    ).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    await expect(
      unauthenticated.query(api.classificationDecisions.listByGroupKeys, {
        groupKeys: [SYNTHETIC_GROUP_KEY],
      }),
    ).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    await expect(
      otherUser.mutation(api.classificationDecisions.upsert, decision),
    ).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
    await expect(
      otherUser.query(api.classificationDecisions.listByGroupKeys, {
        groupKeys: [SYNTHETIC_GROUP_KEY],
      }),
    ).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
  });

  it('creates, updates and reprocesses one decision idempotently', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules).withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const decision = {
      groupKey: SYNTHETIC_GROUP_KEY,
      normalizedDescription: 'mercado sintetico',
      economicNature: 'personal' as const,
    };

    const created = await t.mutation(api.classificationDecisions.upsert, decision);
    const unchanged = await t.mutation(api.classificationDecisions.upsert, decision);
    const updated = await t.mutation(api.classificationDecisions.upsert, {
      ...decision,
      economicNature: 'business',
    });
    const updatedAgain = await t.mutation(api.classificationDecisions.upsert, {
      ...decision,
      economicNature: 'business',
    });

    expect(created.status).toBe('created');
    expect(created.decision.decidedAt).toBe(created.decision.updatedAt);
    expect(unchanged).toEqual({
      status: 'unchanged',
      decision: created.decision,
    });
    expect(updated).toMatchObject({
      status: 'updated',
      decision: {
        decisionId: created.decision.decisionId,
        groupKey: SYNTHETIC_GROUP_KEY,
        normalizedDescription: 'mercado sintetico',
        economicNature: 'business',
        decidedAt: created.decision.decidedAt,
      },
    });
    expect(updatedAgain).toEqual({
      status: 'unchanged',
      decision: updated.decision,
    });

    const stored = await t.run(async (ctx) => ({
      decisions: await ctx.db.query('classificationDecisions').take(3),
      revisions: await ctx.db
        .query('classificationDecisionRevisions')
        .withIndex('by_ownerId_and_decisionId_and_revisionNumber', (q) =>
          q
            .eq('ownerId', SYNTHETIC_OWNER_TOKEN)
            .eq('decisionId', created.decision.decisionId),
        )
        .take(4),
      auditEvents: await ctx.db.query('auditEvents').take(4),
    }));
    expect(stored.decisions).toHaveLength(1);
    expect(stored.decisions[0]).toMatchObject({
      ownerId: expect.stringContaining(SYNTHETIC_OWNER_ID),
      groupKey: SYNTHETIC_GROUP_KEY,
      economicNature: 'business',
      decidedAt: created.decision.decidedAt,
      updatedAt: updated.decision.updatedAt,
      revisionNumber: 2n,
      currentRevisionId: stored.revisions[1]._id,
    });
    expect(stored.revisions).toHaveLength(2);
    expect(stored.revisions).toEqual([
      expect.objectContaining({
        decisionId: created.decision.decisionId,
        revisionNumber: 1n,
        reason: 'created',
        snapshot: {
          groupKey: SYNTHETIC_GROUP_KEY,
          normalizedDescription: 'mercado sintetico',
          economicNature: 'personal',
          decidedAt: created.decision.decidedAt,
          updatedAt: created.decision.updatedAt,
        },
      }),
      expect.objectContaining({
        decisionId: created.decision.decisionId,
        revisionNumber: 2n,
        reason: 'updated',
        snapshot: {
          groupKey: SYNTHETIC_GROUP_KEY,
          normalizedDescription: 'mercado sintetico',
          economicNature: 'business',
          decidedAt: created.decision.decidedAt,
          updatedAt: updated.decision.updatedAt,
        },
      }),
    ]);
    expect(stored.auditEvents).toHaveLength(2);
    expect(stored.auditEvents).toEqual([
      expect.objectContaining({
        action: 'classification_decision.upserted',
        targetType: 'classification_decision',
        targetId: created.decision.decisionId,
        revisionId: stored.revisions[0]._id,
        result: 'succeeded',
        occurredAt: created.decision.updatedAt,
      }),
      expect.objectContaining({
        action: 'classification_decision.upserted',
        targetType: 'classification_decision',
        targetId: created.decision.decisionId,
        revisionId: stored.revisions[1]._id,
        result: 'succeeded',
        occurredAt: updated.decision.updatedAt,
      }),
    ]);

    await expect(
      t.query(api.classificationDecisions.listRevisions, {
        decisionId: created.decision.decisionId,
      }),
    ).resolves.toEqual({
      items: stored.revisions.map((revision) => ({
        revisionId: revision._id,
        revisionNumber: revision.revisionNumber,
        reason: revision.reason,
        snapshot: revision.snapshot,
        recordedAt: revision.recordedAt,
      })),
      isTruncated: false,
    });
  });

  it('returns only requested decisions belonging to the authenticated owner', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules).withIdentity({ subject: SYNTHETIC_OWNER_ID });

    await t.run(async (ctx) => {
      await ctx.db.insert('classificationDecisions', {
        ownerId: 'synthetic-identity|isolated-owner',
        groupKey: SYNTHETIC_GROUP_KEY,
        normalizedDescription: 'mercado sintetico',
        economicNature: 'mixed',
        decidedAt: 1,
        updatedAt: 1,
      });
    });
    const expected = await t.mutation(api.classificationDecisions.upsert, {
      groupKey: SYNTHETIC_SECOND_GROUP_KEY,
      normalizedDescription: 'servico sintetico',
      economicNature: 'business',
    });

    await expect(
      t.query(api.classificationDecisions.listByGroupKeys, {
        groupKeys: [
          SYNTHETIC_GROUP_KEY,
          SYNTHETIC_SECOND_GROUP_KEY,
          'description-v1|transaction-type=credit|source-kind=bankaccount|basis=normalized-description|description=ausente',
        ],
      }),
    ).resolves.toEqual([expected.decision]);
  });

  it('rejects inconsistent, malformed, duplicate and excessive group keys', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules).withIdentity({ subject: SYNTHETIC_OWNER_ID });

    await expect(
      t.mutation(api.classificationDecisions.upsert, {
        groupKey: SYNTHETIC_GROUP_KEY,
        normalizedDescription: 'descricao divergente',
        economicNature: 'personal',
      }),
    ).rejects.toMatchObject({
      data: { code: 'CLASSIFICATION_GROUP_IDENTITY_MISMATCH' },
    });
    await expect(
      t.mutation(api.classificationDecisions.upsert, {
        groupKey: 'not-a-deterministic-group-key',
        normalizedDescription: 'mercado sintetico',
        economicNature: 'personal',
      }),
    ).rejects.toMatchObject({
      data: { code: 'INVALID_CLASSIFICATION_GROUP_KEY' },
    });
    await expect(
      t.query(api.classificationDecisions.listByGroupKeys, {
        groupKeys: [SYNTHETIC_GROUP_KEY, SYNTHETIC_GROUP_KEY],
      }),
    ).rejects.toMatchObject({
      data: { code: 'DUPLICATE_CLASSIFICATION_GROUP_KEY' },
    });
    await expect(
      t.query(api.classificationDecisions.listByGroupKeys, {
        groupKeys: Array.from({ length: 101 }, (_, index) =>
          SYNTHETIC_GROUP_KEY.replace(
            'mercado%20sintetico',
            `mercado%20sintetico%20${index}`,
          ),
        ),
      }),
    ).rejects.toMatchObject({
      data: {
        code: 'TOO_MANY_CLASSIFICATION_GROUP_KEYS',
        maxGroupKeys: 100,
      },
    });

    const stored = await t.run(async (ctx) => ({
      decisions: await ctx.db.query('classificationDecisions').take(1),
      auditEvents: await ctx.db.query('auditEvents').take(1),
    }));
    expect(stored).toEqual({ decisions: [], auditEvents: [] });
  });

  it('backfills a legacy baseline only for a material change', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const legacyDecisionId = await backend.run(async (ctx) => {
      return await ctx.db.insert('classificationDecisions', {
        ownerId: SYNTHETIC_OWNER_TOKEN,
        groupKey: SYNTHETIC_GROUP_KEY,
        normalizedDescription: 'mercado sintetico',
        economicNature: 'personal',
        decidedAt: 10,
        updatedAt: 10,
      });
    });

    const unchanged = await owner.mutation(api.classificationDecisions.upsert, {
      groupKey: SYNTHETIC_GROUP_KEY,
      normalizedDescription: 'mercado sintetico',
      economicNature: 'personal',
    });
    expect(unchanged.status).toBe('unchanged');
    await expect(
      backend.run(async (ctx) => ({
        revisions: await ctx.db.query('classificationDecisionRevisions').take(3),
        audits: await ctx.db.query('auditEvents').take(3),
      })),
    ).resolves.toEqual({ revisions: [], audits: [] });

    const updated = await owner.mutation(api.classificationDecisions.upsert, {
      groupKey: SYNTHETIC_GROUP_KEY,
      normalizedDescription: 'mercado sintetico',
      economicNature: 'mixed',
    });
    expect(updated.status).toBe('updated');

    const stored = await backend.run(async (ctx) => ({
      decision: await ctx.db.get('classificationDecisions', legacyDecisionId),
      revisions: await ctx.db
        .query('classificationDecisionRevisions')
        .withIndex('by_ownerId_and_decisionId_and_revisionNumber', (q) =>
          q
            .eq('ownerId', SYNTHETIC_OWNER_TOKEN)
            .eq('decisionId', legacyDecisionId),
        )
        .take(3),
      audits: await ctx.db.query('auditEvents').take(3),
    }));
    expect(stored.revisions).toHaveLength(2);
    expect(stored.revisions[0]).toMatchObject({
      revisionNumber: 1n,
      reason: 'legacyBaseline',
      snapshot: { economicNature: 'personal', updatedAt: 10 },
    });
    expect(stored.revisions[1]).toMatchObject({
      revisionNumber: 2n,
      reason: 'updated',
      snapshot: { economicNature: 'mixed' },
    });
    expect(stored.decision).toMatchObject({
      revisionNumber: 2n,
      currentRevisionId: stored.revisions[1]._id,
    });
    expect(stored.audits).toEqual([
      expect.objectContaining({
        action: 'classification_decision.upserted',
        revisionId: stored.revisions[1]._id,
      }),
    ]);
  });

  it('does not expose revision history for another owner', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const otherDecisionId = await backend.run(async (ctx) => {
      return await ctx.db.insert('classificationDecisions', {
        ownerId: 'https://convex.test|isolated-owner',
        groupKey: SYNTHETIC_GROUP_KEY,
        normalizedDescription: 'mercado sintetico',
        economicNature: 'business',
        decidedAt: 1,
        updatedAt: 1,
      });
    });

    await expect(
      owner.query(api.classificationDecisions.listRevisions, {
        decisionId: otherDecisionId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'CLASSIFICATION_DECISION_NOT_FOUND' },
    });
  });
});
