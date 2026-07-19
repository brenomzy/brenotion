/// <reference types="vite/client" />

import { makeFunctionReference } from 'convex/server';
import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';
const SYNTHETIC_OWNER_TOKEN = `https://convex.test|${SYNTHETIC_OWNER_ID}`;
let syntheticSequence = 0;

type CheckCode =
  | 'OWNER_PROFILE_UNAVAILABLE'
  | 'IMPORT_SEARCH_TRUNCATED'
  | 'OBLIGATION_SEARCH_TRUNCATED'
  | 'PERSONAL_BANK_MISSING'
  | 'PERSONAL_BANK_PREVIEW_ONLY'
  | 'CREDIT_CARD_MISSING'
  | 'CREDIT_CARD_PREVIEW_ONLY'
  | 'BUSINESS_BANK_MISSING'
  | 'BUSINESS_BANK_PREVIEW_ONLY'
  | 'OBLIGATION_OCCURRENCES_NOT_MATERIALIZED'
  | 'OBLIGATION_OCCURRENCES_PENDING'
  | 'OBLIGATION_OCCURRENCES_NEED_ATTENTION'
  | 'CLASSIFICATION_COMPLETENESS_UNAVAILABLE'
  | 'OBLIGATION_PAYMENT_IDENTIFICATION_UNAVAILABLE'
  | 'REPORTED_EXPENSE_CLOSURE_CHECK_UNAVAILABLE'
  | 'DOCUMENT_CHECK_UNAVAILABLE'
  | 'DISTRIBUTION_CHECK_UNAVAILABLE'
  | 'MARGIN_CHECK_UNAVAILABLE'
  | 'BUSINESS_SUMMARY_UNAVAILABLE'
  | 'FINANCIAL_CALCULATION_UNAVAILABLE';

type ReadinessResult = {
  competence: string;
  status: 'ready' | 'attention' | 'blocked';
  fingerprint: string;
  readinessVersion: 'monthly-closure-readiness-v1';
  closurePolicyVersion: 'metadata-only-partial-v1';
  timeZone: string | null;
  checks: {
    code: CheckCode;
    severity: 'attention' | 'blocking';
    acknowledgementAllowed: boolean;
  }[];
  coverage: {
    complete: boolean;
    isSearchExhaustive: boolean;
    sources: {
      source: 'personalBank' | 'creditCard' | 'businessBank';
      status: 'missing' | 'preview' | 'confirmed';
      batchId: Id<'importBatches'> | null;
      importedAt: number | null;
    }[];
  };
  obligations: {
    total: number;
    pending: number;
    completed: number;
    waived: number;
    needsAttention: number;
    manualCompletionCount: number;
    identifiedPaymentCount: 0;
    isSearchExhaustive: boolean;
  };
  unavailableCapabilities: string[];
  existingClosure: {
    closureId: Id<'monthlyClosures'>;
    revisionNumber: bigint;
    closedAt: number;
    financialCalculationStatus: 'unavailable';
  } | null;
  nextRevisionNumber: bigint;
  financialCalculationStatus: 'unavailable';
};

type ClosureView = {
  closureId: Id<'monthlyClosures'>;
  competence: string;
  revisionNumber: bigint;
  supersedesClosureId?: Id<'monthlyClosures'>;
  closedAt: number;
  timeZone: string;
  readinessVersion: 'monthly-closure-readiness-v1';
  closurePolicyVersion: 'metadata-only-partial-v1';
  inputFingerprint: string;
  sourceCoverage: Record<
    'personalBank' | 'creditCard' | 'businessBank',
    {
      status: 'missing' | 'preview' | 'confirmed';
      batchId: Id<'importBatches'> | null;
      importedAt: number | null;
    }
  >;
  occurrenceSummary: ReadinessResult['obligations'];
  acknowledgedCheckCodes: CheckCode[];
  unavailableCapabilities: string[];
  confidenceAtClosure: 'partial';
  financialCalculationStatus: 'unavailable';
  idempotencyKey: string;
};

const getReadiness = makeFunctionReference<
  'query',
  { competence: string },
  ReadinessResult
>('monthlyClosures:getReadiness');
const getByCompetence = makeFunctionReference<
  'query',
  { competence: string },
  { latest: ClosureView | null; revisions: ClosureView[]; isTruncated: boolean }
>('monthlyClosures:getByCompetence');
const getLatestClosed = makeFunctionReference<'query', Record<string, never>, ClosureView | null>(
  'monthlyClosures:getLatestClosed',
);
const close = makeFunctionReference<
  'mutation',
  {
    competence: string;
    readinessFingerprint: string;
    acknowledgedCheckCodes: CheckCode[];
    idempotencyKey: string;
  },
  { status: 'created' | 'unchanged'; closure: ClosureView }
>('monthlyClosures:close');

describe('monthlyClosures', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('requires the authorized owner for readiness, history and closing', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const other = backend.withIdentity({ subject: SYNTHETIC_OTHER_ID });

    await expect(
      backend.query(getReadiness, { competence: '2026-07' }),
    ).rejects.toMatchObject({ data: { code: 'AUTHENTICATION_REQUIRED' } });
    await expect(other.query(getLatestClosed, {})).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
    await expect(
      other.query(getByCompetence, { competence: '2026-07' }),
    ).rejects.toMatchObject({ data: { code: 'ACCESS_DENIED' } });
    await expect(
      backend.mutation(close, {
        competence: '2026-07',
        readinessFingerprint: '0'.repeat(64),
        acknowledgedCheckCodes: [],
        idempotencyKey: 'synthetic-request-unauthenticated',
      }),
    ).rejects.toMatchObject({ data: { code: 'AUTHENTICATION_REQUIRED' } });
  });

  it('reports honest operational readiness, unavailable capabilities and owner isolation', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });

    const blocked = await owner.query(getReadiness, { competence: '2026-07' });
    expect(blocked).toMatchObject({
      competence: '2026-07',
      status: 'blocked',
      timeZone: null,
      financialCalculationStatus: 'unavailable',
      existingClosure: null,
      nextRevisionNumber: 1n,
    });
    expect(blocked.checks).toContainEqual({
      code: 'OWNER_PROFILE_UNAVAILABLE',
      severity: 'blocking',
      acknowledgementAllowed: false,
    });
    expect(blocked.checks).toContainEqual({
      code: 'CLASSIFICATION_COMPLETENESS_UNAVAILABLE',
      severity: 'attention',
      acknowledgementAllowed: true,
    });
    expect(blocked.unavailableCapabilities).toEqual(
      expect.arrayContaining(['classificationCompleteness', 'financialCalculation']),
    );

    await insertProfile(backend);
    await insertCompleteCoverage(backend, SYNTHETIC_OWNER_TOKEN, '2026-07');
    await insertOccurrence(backend, SYNTHETIC_OWNER_TOKEN, '2026-07', 'pending');
    await insertOccurrence(
      backend,
      'https://convex.test|isolated-owner',
      '2026-07',
      'needsAttention',
    );
    const readiness = await owner.query(getReadiness, { competence: '2026-07' });

    expect(readiness.status).toBe('attention');
    expect(readiness.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(readiness.coverage).toMatchObject({ complete: true, isSearchExhaustive: true });
    expect(readiness.coverage.sources.map((source) => source.status)).toEqual([
      'confirmed',
      'confirmed',
      'confirmed',
    ]);
    expect(readiness.obligations).toMatchObject({
      total: 1,
      pending: 1,
      needsAttention: 0,
      identifiedPaymentCount: 0,
      isSearchExhaustive: true,
    });
    expect(readiness.checks).toContainEqual({
      code: 'OBLIGATION_OCCURRENCES_PENDING',
      severity: 'attention',
      acknowledgementAllowed: true,
    });
  });

  it('rejects blocked, stale or incompletely acknowledged closure attempts', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const initiallyBlocked = await owner.query(getReadiness, { competence: '2026-07' });
    await expect(
      owner.mutation(close, closeInput(initiallyBlocked, 'synthetic-blocked-request')),
    ).rejects.toMatchObject({ data: { code: 'MONTHLY_CLOSURE_BLOCKED' } });

    await insertProfile(backend);
    await insertCompleteCoverage(backend, SYNTHETIC_OWNER_TOKEN, '2026-07');
    const occurrenceId = await insertOccurrence(
      backend,
      SYNTHETIC_OWNER_TOKEN,
      '2026-07',
      'waived',
    );
    const stale = await owner.query(getReadiness, { competence: '2026-07' });
    await backend.run(async (ctx) => {
      await ctx.db.patch('obligationOccurrences', occurrenceId, {
        status: 'pending',
        waivedAt: undefined,
        waiverReason: undefined,
        updatedAt: 999,
      });
    });
    await expect(
      owner.mutation(close, closeInput(stale, 'synthetic-stale-request')),
    ).rejects.toMatchObject({ data: { code: 'READINESS_CHANGED' } });

    const current = await owner.query(getReadiness, { competence: '2026-07' });
    await expect(
      owner.mutation(close, {
        ...closeInput(current, 'synthetic-missing-acks'),
        acknowledgedCheckCodes: ['CLASSIFICATION_COMPLETENESS_UNAVAILABLE'],
      }),
    ).rejects.toMatchObject({ data: { code: 'ACKNOWLEDGEMENTS_REQUIRED' } });
  });

  it('creates append-only revisions, audits them and makes retries idempotent', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    await insertProfile(backend);
    await insertCompleteCoverage(backend, SYNTHETIC_OWNER_TOKEN, '2026-07');
    await insertOccurrence(backend, SYNTHETIC_OWNER_TOKEN, '2026-07', 'waived');

    const firstReadiness = await owner.query(getReadiness, { competence: '2026-07' });
    const firstInput = closeInput(firstReadiness, 'synthetic-closure-request-1');
    const first = await owner.mutation(close, firstInput);
    const retry = await owner.mutation(close, firstInput);

    expect(first.status).toBe('created');
    expect(retry).toEqual({ status: 'unchanged', closure: first.closure });
    expect(first.closure).toMatchObject({
      competence: '2026-07',
      revisionNumber: 1n,
      confidenceAtClosure: 'partial',
      financialCalculationStatus: 'unavailable',
    });
    expect(first.closure).not.toHaveProperty('availableToSpend');
    await expect(
      owner.mutation(close, { ...firstInput, readinessFingerprint: '0'.repeat(64) }),
    ).rejects.toMatchObject({ data: { code: 'IDEMPOTENCY_KEY_REUSED' } });

    const secondReadiness = await owner.query(getReadiness, { competence: '2026-07' });
    expect(secondReadiness.existingClosure).toMatchObject({
      closureId: first.closure.closureId,
      revisionNumber: 1n,
    });
    const second = await owner.mutation(
      close,
      closeInput(secondReadiness, 'synthetic-closure-request-2'),
    );
    expect(second.closure).toMatchObject({
      revisionNumber: 2n,
      supersedesClosureId: first.closure.closureId,
    });

    const history = await owner.query(getByCompetence, { competence: '2026-07' });
    expect(history).toMatchObject({
      latest: { closureId: second.closure.closureId, revisionNumber: 2n },
      isTruncated: false,
    });
    expect(history.revisions.map((closure) => closure.revisionNumber)).toEqual([2n, 1n]);
    await expect(owner.query(getLatestClosed, {})).resolves.toMatchObject({
      closureId: second.closure.closureId,
    });

    const stored = await backend.run(async (ctx) => ({
      closures: await ctx.db.query('monthlyClosures').take(5),
      audits: (await ctx.db.query('auditEvents').take(20)).filter(
        (event) => event.targetType === 'monthly_closure',
      ),
    }));
    expect(stored.closures).toHaveLength(2);
    expect(stored.audits).toHaveLength(2);
    expect(stored.audits.every((event) => event.action === 'monthly_closure.closed')).toBe(true);
  });

  it('blocks a non-exhaustive import search even if the code is supplied as acknowledgement', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    await insertProfile(backend);
    for (let sequence = 0; sequence < 201; sequence += 1) {
      await insertBatch(backend, SYNTHETIC_OWNER_TOKEN, {
        fileHash: `synthetic-overflow-${sequence}`,
        format: 'ofx',
        sourcePatrimony: 'personal',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        timestamp: sequence,
      });
    }

    const readiness = await owner.query(getReadiness, { competence: '2026-07' });
    expect(readiness.status).toBe('blocked');
    expect(readiness.checks).toContainEqual({
      code: 'IMPORT_SEARCH_TRUNCATED',
      severity: 'blocking',
      acknowledgementAllowed: false,
    });
    await expect(
      owner.mutation(close, {
        ...closeInput(readiness, 'synthetic-truncated-request'),
        acknowledgedCheckCodes: [
          ...acknowledgements(readiness),
          'IMPORT_SEARCH_TRUNCATED',
        ],
      }),
    ).rejects.toMatchObject({ data: { code: 'MONTHLY_CLOSURE_BLOCKED' } });
  });
});

type TestBackend = TestConvex<typeof schema>;

function acknowledgements(readiness: ReadinessResult): CheckCode[] {
  return readiness.checks
    .filter((check) => check.acknowledgementAllowed)
    .map((check) => check.code)
    .sort();
}

function closeInput(readiness: ReadinessResult, idempotencyKey: string) {
  return {
    competence: readiness.competence,
    readinessFingerprint: readiness.fingerprint,
    acknowledgedCheckCodes: acknowledgements(readiness),
    idempotencyKey,
  };
}

async function insertProfile(backend: TestBackend) {
  await backend.run(async (ctx) => {
    await ctx.db.insert('ownerProfiles', {
      ownerId: SYNTHETIC_OWNER_TOKEN,
      preferredCurrency: 'BRL',
      locale: 'pt-BR',
      timeZone: 'America/Sao_Paulo',
      updatedAt: 1,
    });
  });
}

async function insertCompleteCoverage(
  backend: TestBackend,
  ownerId: string,
  competence: string,
) {
  await insertBatch(backend, ownerId, {
    fileHash: 'synthetic-personal',
    format: 'ofx',
    sourcePatrimony: 'personal',
    periodStart: `${competence}-01`,
    periodEnd: `${competence}-28`,
    timestamp: 10,
  });
  await insertBatch(backend, ownerId, {
    fileHash: 'synthetic-card',
    format: 'itauCreditCardXlsx',
    sourcePatrimony: 'personal',
    statementCompetence: competence,
    periodStart: `${competence}-01`,
    periodEnd: `${competence}-28`,
    timestamp: 20,
  });
  await insertBatch(backend, ownerId, {
    fileHash: 'synthetic-business',
    format: 'ofx',
    sourcePatrimony: 'business',
    periodStart: `${competence}-01`,
    periodEnd: `${competence}-28`,
    timestamp: 30,
  });
}

async function insertBatch(
  backend: TestBackend,
  ownerId: string,
  input: {
    fileHash: string;
    format: 'ofx' | 'itauCreditCardXlsx';
    sourcePatrimony: 'personal' | 'business';
    periodStart: string;
    periodEnd: string;
    statementCompetence?: string;
    timestamp: number;
  },
) {
  await backend.run(async (ctx) => {
    await ctx.db.insert('importBatches', {
      ownerId,
      fileHash: input.fileHash,
      format: input.format,
      sourceAccountKind: input.format === 'ofx' ? 'bankAccount' : 'creditCard',
      sourcePatrimony: input.sourcePatrimony,
      parserVersion: 'synthetic-v1',
      status: 'confirmed',
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      statementCompetence: input.statementCompetence,
      transactionCount: 1,
      duplicateCount: 0,
      creditTotal: money(0n),
      debitTotal: money(100n),
      rawFileStatus: 'deleted',
      rawDeletedAt: input.timestamp,
      insertedCount: 1,
      createdAt: input.timestamp,
      updatedAt: input.timestamp,
      confirmedAt: input.timestamp,
    });
  });
}

async function insertOccurrence(
  backend: TestBackend,
  ownerId: string,
  competence: string,
  status: 'pending' | 'waived' | 'needsAttention',
) {
  return await backend.run(async (ctx) => {
    syntheticSequence += 1;
    const sequence = syntheticSequence;
    const obligationId = await ctx.db.insert('obligations', {
      ownerId,
      obligationKey: `synthetic-${sequence}`,
      name: 'Obrigação sintética',
      economicNature: 'personal',
      paymentOrigin: 'personal',
      isActive: true,
      createdAt: sequence,
      updatedAt: sequence,
    });
    return await ctx.db.insert('obligationOccurrences', {
      ownerId,
      obligationId,
      competence,
      obligationKey: `synthetic-${sequence}`,
      name: 'Ocorrência sintética',
      economicNature: 'personal',
      paymentOrigin: 'personal',
      status,
      materializedAt: sequence,
      updatedAt: sequence,
      waivedAt: status === 'waived' ? sequence : undefined,
      waiverReason: status === 'waived' ? 'notDueThisCompetence' : undefined,
    });
  });
}

function money(amountInMinorUnits: bigint) {
  return { amountInMinorUnits, currency: 'BRL' as const, minorUnit: 'cent' as const };
}
