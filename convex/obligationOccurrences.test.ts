/// <reference types="vite/client" />

import { makeFunctionReference } from 'convex/server';
import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Id } from './_generated/dataModel';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';
const SYNTHETIC_OWNER_TOKEN = `https://convex.test|${SYNTHETIC_OWNER_ID}`;

type OccurrenceStatus = 'pending' | 'completed' | 'waived' | 'needsAttention';

type Occurrence = {
  occurrenceId: Id<'obligationOccurrences'>;
  obligationId: Id<'obligations'>;
  sourceObligationRevisionId?: Id<'obligationRevisions'>;
  competence: string;
  obligationKey: string;
  name: string;
  economicNature: 'personal' | 'business';
  paymentOrigin: 'personal' | 'business' | 'needsConfirmation';
  expectedAmount?: ReturnType<typeof money>;
  dueDayOfMonth?: number;
  dueOn?: string;
  status: OccurrenceStatus;
  materializedAt: number;
  updatedAt: number;
  completedAt?: number;
  completionKind?: 'manualConfirmation';
  waivedAt?: number;
  waiverReason?: 'notDueThisCompetence' | 'cancelledForCompetence' | 'duplicateOccurrence';
};

type ListResult = { items: Occurrence[]; isTruncated: boolean };
type MaterializationResult = {
  competence: string;
  createdCount: number;
  existingCount: number;
};
type StatusResult = {
  status: 'updated' | 'unchanged';
  occurrence: Occurrence;
};

const listForCompetence = makeFunctionReference<
  'query',
  { competence: string; status?: OccurrenceStatus },
  ListResult
>('obligationOccurrences:listForCompetence');
const materializeForCompetence = makeFunctionReference<
  'mutation',
  { competence: string },
  MaterializationResult
>('obligationOccurrences:materializeForCompetence');
const completeManually = makeFunctionReference<
  'mutation',
  { occurrenceId: Id<'obligationOccurrences'>; completionKind: 'manualConfirmation' },
  StatusResult
>('obligationOccurrences:completeManually');
const waive = makeFunctionReference<
  'mutation',
  {
    occurrenceId: Id<'obligationOccurrences'>;
    waiverReason: 'notDueThisCompetence' | 'cancelledForCompetence' | 'duplicateOccurrence';
  },
  StatusResult
>('obligationOccurrences:waive');
const markNeedsAttention = statusMutation('markNeedsAttention');
const reopen = statusMutation('reopen');

describe('obligationOccurrences', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('requires the authorized owner for every public operation', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const other = backend.withIdentity({ subject: SYNTHETIC_OTHER_ID });
    const syntheticOccurrenceId = await insertSyntheticOccurrence(
      backend,
      SYNTHETIC_OWNER_TOKEN,
      '2026-07',
      1,
    );
    const isolatedOccurrenceId = await insertSyntheticOccurrence(
      backend,
      'https://convex.test|isolated-owner',
      '2026-07',
      2,
    );
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });

    await expect(
      backend.query(listForCompetence, { competence: '2026-07' }),
    ).rejects.toMatchObject({ data: { code: 'AUTHENTICATION_REQUIRED' } });
    await expect(
      backend.mutation(materializeForCompetence, { competence: '2026-07' }),
    ).rejects.toMatchObject({ data: { code: 'AUTHENTICATION_REQUIRED' } });
    await expect(other.query(listForCompetence, { competence: '2026-07' })).rejects.toMatchObject(
      { data: { code: 'ACCESS_DENIED' } },
    );
    await expect(
      other.mutation(completeManually, {
        occurrenceId: syntheticOccurrenceId,
        completionKind: 'manualConfirmation',
      }),
    ).rejects.toMatchObject({ data: { code: 'ACCESS_DENIED' } });
    await expect(
      owner.mutation(completeManually, {
        occurrenceId: isolatedOccurrenceId,
        completionKind: 'manualConfirmation',
      }),
    ).rejects.toMatchObject({ data: { code: 'OBLIGATION_OCCURRENCE_NOT_FOUND' } });
  });

  it('materializes active configurations once with an exact, owner-isolated snapshot', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2028-02-01T12:00:00.000Z'));
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const created = await owner.mutation(api.obligations.upsert, {
      obligationKey: 'synthetic-month-end',
      name: 'Compromisso sintético',
      economicNature: 'personal',
      paymentOrigin: 'business',
      expectedAmount: money(9_007_199_254_740_993n),
      dueDayOfMonth: 31,
      isActive: true,
    });
    await owner.mutation(api.obligations.upsert, {
      obligationKey: 'synthetic-inactive',
      name: 'Configuração inativa',
      economicNature: 'business',
      paymentOrigin: 'business',
      isActive: false,
    });
    await insertSyntheticObligation(backend, 'https://convex.test|isolated-owner', 99);

    await expect(
      owner.mutation(materializeForCompetence, { competence: '2028-02' }),
    ).resolves.toEqual({ competence: '2028-02', createdCount: 1, existingCount: 0 });
    await expect(
      owner.mutation(materializeForCompetence, { competence: '2028-02' }),
    ).resolves.toEqual({ competence: '2028-02', createdCount: 0, existingCount: 1 });

    const visible = await owner.query(listForCompetence, { competence: '2028-02' });
    expect(visible).toEqual({
      items: [
        expect.objectContaining({
          obligationId: created.obligation.obligationId,
          sourceObligationRevisionId: expect.any(String),
          competence: '2028-02',
          obligationKey: 'synthetic-month-end',
          name: 'Compromisso sintético',
          economicNature: 'personal',
          paymentOrigin: 'business',
          expectedAmount: money(9_007_199_254_740_993n),
          dueDayOfMonth: 31,
          dueOn: '2028-02-29',
          status: 'pending',
        }),
      ],
      isTruncated: false,
    });

    const stored = await backend.run(async (ctx) => ({
      occurrences: await ctx.db.query('obligationOccurrences').take(5),
      audits: (await ctx.db.query('auditEvents').take(10)).filter(
        (event) => event.targetType === 'obligation_occurrence',
      ),
    }));
    expect(stored.occurrences).toHaveLength(1);
    expect(stored.occurrences[0].ownerId).toBe(SYNTHETIC_OWNER_TOKEN);
    expect(stored.audits).toHaveLength(1);
    expect(stored.audits[0]).toMatchObject({
      ownerId: SYNTHETIC_OWNER_TOKEN,
      action: 'obligation_occurrence.materialized',
      targetType: 'obligation_occurrence',
      result: 'succeeded',
    });
  });

  it('does not rewrite a materialized occurrence when its recurring configuration changes', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const owner = convexTest(schema, modules).withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const original = await owner.mutation(api.obligations.upsert, {
      obligationKey: 'synthetic-stable-key',
      name: 'Nome original',
      economicNature: 'personal',
      paymentOrigin: 'personal',
      expectedAmount: money(10_000n),
      dueDayOfMonth: 10,
      isActive: true,
    });
    await owner.mutation(materializeForCompetence, { competence: '2026-07' });
    await owner.mutation(api.obligations.upsert, {
      obligationKey: 'synthetic-stable-key',
      name: 'Nome atualizado',
      economicNature: 'business',
      paymentOrigin: 'business',
      expectedAmount: money(20_000n),
      dueDayOfMonth: 20,
      isActive: true,
    });

    await expect(
      owner.mutation(materializeForCompetence, { competence: '2026-07' }),
    ).resolves.toMatchObject({ createdCount: 0, existingCount: 1 });
    await owner.mutation(materializeForCompetence, { competence: '2026-08' });
    const july = await owner.query(listForCompetence, { competence: '2026-07' });
    const august = await owner.query(listForCompetence, { competence: '2026-08' });

    expect(july.items[0]).toMatchObject({
      sourceObligationRevisionId: expect.any(String),
      name: 'Nome original',
      economicNature: 'personal',
      paymentOrigin: 'personal',
      expectedAmount: money(10_000n),
      dueDayOfMonth: 10,
      dueOn: '2026-07-10',
    });
    expect(august.items[0]).toMatchObject({
      obligationId: original.obligation.obligationId,
      sourceObligationRevisionId: expect.any(String),
      name: 'Nome atualizado',
      economicNature: 'business',
      paymentOrigin: 'business',
      expectedAmount: money(20_000n),
      dueDayOfMonth: 20,
      dueOn: '2026-08-20',
    });
    expect(august.items[0].sourceObligationRevisionId).not.toBe(
      july.items[0].sourceObligationRevisionId,
    );
  });

  it('changes completion, waiver and attention states only through explicit audited mutations', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    await owner.mutation(api.obligations.upsert, {
      obligationKey: 'synthetic-status-one',
      name: 'Primeira ocorrência',
      economicNature: 'personal',
      paymentOrigin: 'personal',
      isActive: true,
    });
    await owner.mutation(api.obligations.upsert, {
      obligationKey: 'synthetic-status-two',
      name: 'Segunda ocorrência',
      economicNature: 'business',
      paymentOrigin: 'business',
      isActive: true,
    });
    await owner.mutation(materializeForCompetence, { competence: '2026-07' });
    const initial = await owner.query(listForCompetence, { competence: '2026-07' });
    const firstId = initial.items[0].occurrenceId;
    const secondId = initial.items[1].occurrenceId;

    const completed = await owner.mutation(completeManually, {
      occurrenceId: firstId,
      completionKind: 'manualConfirmation',
    });
    const completedRetry = await owner.mutation(completeManually, {
      occurrenceId: firstId,
      completionKind: 'manualConfirmation',
    });
    const waived = await owner.mutation(waive, {
      occurrenceId: secondId,
      waiverReason: 'notDueThisCompetence',
    });
    const needsAttention = await owner.mutation(markNeedsAttention, {
      occurrenceId: secondId,
    });
    const reopened = await owner.mutation(reopen, { occurrenceId: secondId });

    expect(completed).toMatchObject({
      status: 'updated',
      occurrence: {
        status: 'completed',
        completedAt: expect.any(Number),
        completionKind: 'manualConfirmation',
      },
    });
    expect(completedRetry).toEqual({ status: 'unchanged', occurrence: completed.occurrence });
    expect(waived).toMatchObject({
      status: 'updated',
      occurrence: {
        status: 'waived',
        waivedAt: expect.any(Number),
        waiverReason: 'notDueThisCompetence',
      },
    });
    expect(needsAttention.occurrence).toMatchObject({ status: 'needsAttention' });
    expect(needsAttention.occurrence).not.toHaveProperty('waivedAt');
    expect(needsAttention.occurrence).not.toHaveProperty('waiverReason');
    expect(reopened.occurrence).toMatchObject({ status: 'pending' });
    expect(reopened.occurrence).not.toHaveProperty('completedAt');
    expect(reopened.occurrence).not.toHaveProperty('waivedAt');
    await expect(
      owner.query(listForCompetence, { competence: '2026-07', status: 'completed' }),
    ).resolves.toMatchObject({ items: [{ occurrenceId: firstId, status: 'completed' }] });

    const statusAudits = await backend.run(async (ctx) =>
      (await ctx.db.query('auditEvents').take(20)).filter(
        (event) =>
          event.targetType === 'obligation_occurrence' &&
          event.action !== 'obligation_occurrence.materialized',
      ),
    );
    expect(statusAudits.map((event) => event.action)).toEqual([
      'obligation_occurrence.manual_completion_confirmed',
      'obligation_occurrence.waived',
      'obligation_occurrence.marked_needs_attention',
      'obligation_occurrence.reopened',
    ]);
    expect(statusAudits[0]).toMatchObject({
      occurrenceCompletionKind: 'manualConfirmation',
    });
    expect(statusAudits[1]).toMatchObject({
      occurrenceWaiverReason: 'notDueThisCompetence',
    });
  });

  it('bounds materialization and rejects invalid competences without partial writes', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });

    await expect(
      owner.query(listForCompetence, { competence: '2026-13' }),
    ).rejects.toMatchObject({ data: { code: 'INVALID_COMPETENCE' } });

    for (let sequence = 0; sequence < 201; sequence += 1) {
      await insertSyntheticObligation(backend, SYNTHETIC_OWNER_TOKEN, sequence);
    }
    await expect(
      owner.mutation(materializeForCompetence, { competence: '2026-07' }),
    ).rejects.toMatchObject({
      data: { code: 'OCCURRENCE_MATERIALIZATION_LIMIT_EXCEEDED' },
    });
    const stored = await backend.run(async (ctx) =>
      ctx.db.query('obligationOccurrences').take(1),
    );
    expect(stored).toEqual([]);
  });
});

function statusMutation(name: string) {
  return makeFunctionReference<
    'mutation',
    { occurrenceId: Id<'obligationOccurrences'> },
    StatusResult
  >(`obligationOccurrences:${name}`);
}

type TestBackend = TestConvex<typeof schema>;

async function insertSyntheticObligation(
  backend: TestBackend,
  ownerId: string,
  sequence: number,
) {
  return await backend.run(async (ctx) =>
    ctx.db.insert('obligations', {
      ownerId,
      obligationKey: `synthetic-${String(sequence).padStart(3, '0')}`,
      name: `Configuração sintética ${sequence}`,
      economicNature: 'personal',
      paymentOrigin: 'personal',
      isActive: true,
      createdAt: sequence,
      updatedAt: sequence,
    }),
  );
}

async function insertSyntheticOccurrence(
  backend: TestBackend,
  ownerId: string,
  competence: string,
  sequence: number,
) {
  const obligationId = await insertSyntheticObligation(backend, ownerId, sequence);
  return await backend.run(async (ctx) =>
    ctx.db.insert('obligationOccurrences', {
      ownerId,
      obligationId,
      competence,
      obligationKey: `synthetic-${String(sequence).padStart(3, '0')}`,
      name: `Ocorrência sintética ${sequence}`,
      economicNature: 'personal',
      paymentOrigin: 'personal',
      status: 'pending',
      materializedAt: sequence,
      updatedAt: sequence,
    }),
  );
}

function money(amountInMinorUnits: bigint) {
  return {
    amountInMinorUnits,
    currency: 'BRL' as const,
    minorUnit: 'cent' as const,
  };
}
