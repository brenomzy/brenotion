/// <reference types="vite/client" />

import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';

type HomeActivationResult = {
  competence: string;
  coverage: {
    complete: boolean;
    confirmedCount: number;
    isSearchExhaustive: boolean;
    sources: {
      source: 'personalBank' | 'creditCard' | 'businessBank';
      status: 'missing' | 'preview' | 'confirmed';
      transactionCount: number;
    }[];
  };
  review: {
    classificationDecisionCount: number;
    isSearchExhaustive: boolean;
  };
  obligations: {
    activeCount: number;
    needsPaymentOriginConfirmationCount: number;
    isSearchExhaustive: boolean;
  };
  monthlyClosure: {
    closureId: string;
    revisionNumber: bigint;
    closedAt: number;
    confidenceAtClosure: 'partial';
    financialCalculationStatus: 'unavailable';
  } | null;
  officialSnapshot: {
    asOf: number;
    confidence: 'recent' | 'partial' | 'stale';
    calculationVersion: string;
  } | null;
};

const getHomeActivation = makeFunctionReference<
  'query',
  { competence: string },
  HomeActivationResult
>('homeActivation:get');

describe('homeActivation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires the authorized owner and validates competence', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const backend = convexTest(schema, modules);
    const owner = backend.withIdentity({ subject: SYNTHETIC_OWNER_ID });

    await expect(
      backend.query(getHomeActivation, { competence: '2026-07' }),
    ).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    await expect(
      owner.query(getHomeActivation, { competence: '2026-13' }),
    ).rejects.toMatchObject({
      data: { code: 'INVALID_COMPETENCE' },
    });
  });

  it('returns an honest empty activation state without financial values', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const owner = convexTest(schema, modules).withIdentity({
      subject: SYNTHETIC_OWNER_ID,
    });

    await expect(
      owner.query(getHomeActivation, { competence: '2026-07' }),
    ).resolves.toEqual({
      competence: '2026-07',
      coverage: {
        complete: false,
        confirmedCount: 0,
        isSearchExhaustive: true,
        sources: [
          { source: 'personalBank', status: 'missing', transactionCount: 0 },
          { source: 'creditCard', status: 'missing', transactionCount: 0 },
          { source: 'businessBank', status: 'missing', transactionCount: 0 },
        ],
      },
      review: {
        classificationDecisionCount: 0,
        isSearchExhaustive: true,
      },
      obligations: {
        activeCount: 0,
        needsPaymentOriginConfirmationCount: 0,
        isSearchExhaustive: true,
      },
      monthlyClosure: null,
      officialSnapshot: null,
    });
  });

  it('combines monthly coverage, review progress, obligations and snapshot metadata', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const owner = convexTest(schema, modules).withIdentity({
      subject: SYNTHETIC_OWNER_ID,
    });
    const ownerId = `https://convex.test|${SYNTHETIC_OWNER_ID}`;

    await owner.run(async (ctx) => {
      await ctx.db.insert('importBatches', {
        ownerId,
        fileHash: 'synthetic-personal',
        format: 'ofx',
        sourceAccountKind: 'bankAccount',
        sourcePatrimony: 'personal',
        parserVersion: 'synthetic-v1',
        status: 'confirmed',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        transactionCount: 4,
        duplicateCount: 0,
        creditTotal: money(0n),
        debitTotal: money(0n),
        rawFileStatus: 'deleted',
        rawDeletedAt: 1,
        insertedCount: 4,
        createdAt: 1,
        updatedAt: 1,
        confirmedAt: 1,
      });
      await ctx.db.insert('importBatches', {
        ownerId,
        fileHash: 'synthetic-card',
        format: 'itauCreditCardXlsx',
        sourceAccountKind: 'creditCard',
        sourcePatrimony: 'personal',
        parserVersion: 'synthetic-v1',
        status: 'preview',
        periodStart: '2026-06-05',
        periodEnd: '2026-07-05',
        statementCompetence: '2026-08',
        transactionCount: 2,
        duplicateCount: 0,
        creditTotal: money(0n),
        debitTotal: money(0n),
        rawFileStatus: 'deleted',
        rawDeletedAt: 2,
        createdAt: 2,
        updatedAt: 2,
      });
      await ctx.db.insert('classificationDecisions', {
        ownerId,
        groupKey: 'description-normalizer-v1|bankaccount|debit|synthetic',
        normalizedDescription: 'synthetic',
        economicNature: 'personal',
        decidedAt: 3,
        updatedAt: 3,
      });
      await ctx.db.insert('obligations', {
        ownerId,
        obligationKey: 'synthetic-obligation',
        name: 'Synthetic obligation',
        economicNature: 'personal',
        paymentOrigin: 'needsConfirmation',
        isActive: true,
        createdAt: 4,
        updatedAt: 4,
      });
      await ctx.db.insert('financialSnapshots', {
        ownerId,
        availableToSpend: money(123n),
        asOf: 5,
        timeZone: 'America/Sao_Paulo',
        confidence: 'partial',
        calculationVersion: 'synthetic-v1',
        updatedAt: 5,
      });
      await ctx.db.insert('monthlyClosures', {
        ownerId,
        competence: '2026-07',
        revisionNumber: 1n,
        closedAt: 6,
        timeZone: 'America/Sao_Paulo',
        readinessVersion: 'monthly-closure-readiness-v1',
        closurePolicyVersion: 'metadata-only-partial-v1',
        inputFingerprint: 'a'.repeat(64),
        sourceCoverage: {
          personalBank: {
            status: 'confirmed',
            batchId: null,
            importedAt: 1,
          },
          creditCard: {
            status: 'preview',
            batchId: null,
            importedAt: 2,
          },
          businessBank: {
            status: 'missing',
            batchId: null,
            importedAt: null,
          },
        },
        occurrenceSummary: {
          total: 0,
          pending: 0,
          completed: 0,
          waived: 0,
          needsAttention: 0,
          manualCompletionCount: 0,
          identifiedPaymentCount: 0,
          isSearchExhaustive: true,
        },
        acknowledgedCheckCodes: ['CREDIT_CARD_PREVIEW_ONLY'],
        unavailableCapabilities: ['financialCalculation'],
        confidenceAtClosure: 'partial',
        financialCalculationStatus: 'unavailable',
        idempotencyKey: 'synthetic-home-closure-v1',
      });
    });

    const result = await owner.query(getHomeActivation, {
      competence: '2026-07',
    });

    expect(result).toMatchObject({
      competence: '2026-07',
      coverage: {
        complete: false,
        confirmedCount: 1,
        sources: [
          { source: 'personalBank', status: 'confirmed', transactionCount: 4 },
          { source: 'creditCard', status: 'preview', transactionCount: 2 },
          { source: 'businessBank', status: 'missing', transactionCount: 0 },
        ],
      },
      review: { classificationDecisionCount: 1 },
      obligations: {
        activeCount: 1,
        needsPaymentOriginConfirmationCount: 1,
      },
      monthlyClosure: {
        revisionNumber: 1n,
        closedAt: 6,
        confidenceAtClosure: 'partial',
        financialCalculationStatus: 'unavailable',
      },
      officialSnapshot: {
        asOf: 5,
        confidence: 'partial',
        calculationVersion: 'synthetic-v1',
      },
    });
    expect(result).not.toHaveProperty('availableToSpend');
    expect(result.officialSnapshot).not.toHaveProperty('availableToSpend');
    expect(result.monthlyClosure).not.toHaveProperty('availableToSpend');
  });
});

function money(amountInMinorUnits: bigint) {
  return {
    amountInMinorUnits,
    currency: 'BRL' as const,
    minorUnit: 'cent' as const,
  };
}
