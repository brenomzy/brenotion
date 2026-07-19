import { ConvexError, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { query } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import { confidenceValidator } from './schema';

const MAX_RECENT_BATCHES_TO_INSPECT = 200;
const MAX_CONFIGURATIONS_TO_COUNT = 200;

const sourceValidator = v.union(
  v.literal('personalBank'),
  v.literal('creditCard'),
  v.literal('businessBank'),
);

const coverageStatusValidator = v.union(
  v.literal('missing'),
  v.literal('preview'),
  v.literal('confirmed'),
);

const sourceCoverageValidator = v.object({
  source: sourceValidator,
  status: coverageStatusValidator,
  transactionCount: v.number(),
});

type CoverageSource = 'personalBank' | 'creditCard' | 'businessBank';
type CoverageStatus = 'missing' | 'preview' | 'confirmed';
type CoverageBatch = Doc<'importBatches'> & {
  status: Exclude<CoverageStatus, 'missing'>;
};

type SourceDefinition = Readonly<{
  source: CoverageSource;
  format: 'ofx' | 'itauCreditCardXlsx';
  sourcePatrimony: 'personal' | 'business';
}>;

const SOURCE_DEFINITIONS: readonly SourceDefinition[] = [
  { source: 'personalBank', format: 'ofx', sourcePatrimony: 'personal' },
  {
    source: 'creditCard',
    format: 'itauCreditCardXlsx',
    sourcePatrimony: 'personal',
  },
  { source: 'businessBank', format: 'ofx', sourcePatrimony: 'business' },
];

export const get = query({
  args: { competence: v.string() },
  returns: v.object({
    competence: v.string(),
    coverage: v.object({
      complete: v.boolean(),
      confirmedCount: v.number(),
      isSearchExhaustive: v.boolean(),
      sources: v.array(sourceCoverageValidator),
    }),
    review: v.object({
      classificationDecisionCount: v.number(),
      isSearchExhaustive: v.boolean(),
    }),
    obligations: v.object({
      activeCount: v.number(),
      needsPaymentOriginConfirmationCount: v.number(),
      isSearchExhaustive: v.boolean(),
    }),
    monthlyClosure: v.union(
      v.null(),
      v.object({
        closureId: v.id('monthlyClosures'),
        revisionNumber: v.int64(),
        closedAt: v.number(),
        confidenceAtClosure: v.literal('partial'),
        financialCalculationStatus: v.literal('unavailable'),
      }),
    ),
    officialSnapshot: v.union(
      v.null(),
      v.object({
        asOf: v.number(),
        confidence: confidenceValidator,
        calculationVersion: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const competence = validateCompetence(args.competence);
    const { ownerId } = await requireAuthorizedOwner(ctx);

    const [
      recentBatches,
      classificationDecisions,
      activeObligations,
      monthlyClosure,
      snapshot,
    ] = await Promise.all([
        ctx.db
          .query('importBatches')
          .withIndex('by_ownerId_and_createdAt', (q) => q.eq('ownerId', ownerId))
          .order('desc')
          .take(MAX_RECENT_BATCHES_TO_INSPECT + 1),
        ctx.db
          .query('classificationDecisions')
          .withIndex('by_ownerId_and_groupKey', (q) => q.eq('ownerId', ownerId))
          .take(MAX_CONFIGURATIONS_TO_COUNT + 1),
        ctx.db
          .query('obligations')
          .withIndex('by_ownerId_and_isActive_and_name', (q) =>
            q.eq('ownerId', ownerId).eq('isActive', true),
          )
          .take(MAX_CONFIGURATIONS_TO_COUNT + 1),
        ctx.db
          .query('monthlyClosures')
          .withIndex('by_ownerId_and_competence_and_revisionNumber', (q) =>
            q.eq('ownerId', ownerId).eq('competence', competence),
          )
          .order('desc')
          .first(),
        ctx.db
          .query('financialSnapshots')
          .withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
          .unique(),
      ]);

    const boundedBatches = recentBatches.slice(0, MAX_RECENT_BATCHES_TO_INSPECT);
    const boundedDecisions = classificationDecisions.slice(
      0,
      MAX_CONFIGURATIONS_TO_COUNT,
    );
    const boundedObligations = activeObligations.slice(
      0,
      MAX_CONFIGURATIONS_TO_COUNT,
    );
    const sources = SOURCE_DEFINITIONS.map((definition) =>
      buildSourceCoverage(boundedBatches, competence, definition),
    );

    return {
      competence,
      coverage: {
        complete: sources.every((source) => source.status === 'confirmed'),
        confirmedCount: sources.filter((source) => source.status === 'confirmed')
          .length,
        isSearchExhaustive:
          recentBatches.length <= MAX_RECENT_BATCHES_TO_INSPECT,
        sources,
      },
      review: {
        classificationDecisionCount: boundedDecisions.length,
        isSearchExhaustive:
          classificationDecisions.length <= MAX_CONFIGURATIONS_TO_COUNT,
      },
      obligations: {
        activeCount: boundedObligations.length,
        needsPaymentOriginConfirmationCount: boundedObligations.filter(
          (obligation) => obligation.paymentOrigin === 'needsConfirmation',
        ).length,
        isSearchExhaustive:
          activeObligations.length <= MAX_CONFIGURATIONS_TO_COUNT,
      },
      monthlyClosure: monthlyClosure
        ? {
            closureId: monthlyClosure._id,
            revisionNumber: monthlyClosure.revisionNumber,
            closedAt: monthlyClosure.closedAt,
            confidenceAtClosure: monthlyClosure.confidenceAtClosure,
            financialCalculationStatus:
              monthlyClosure.financialCalculationStatus,
          }
        : null,
      officialSnapshot: snapshot
        ? {
            asOf: snapshot.asOf,
            confidence: snapshot.confidence,
            calculationVersion: snapshot.calculationVersion,
          }
        : null,
    };
  },
});

function buildSourceCoverage(
  batches: readonly Doc<'importBatches'>[],
  competence: string,
  definition: SourceDefinition,
) {
  const matchingBatches = batches.filter(
    (batch): batch is CoverageBatch =>
      (batch.status === 'confirmed' || batch.status === 'preview') &&
      batch.format === definition.format &&
      batch.sourcePatrimony === definition.sourcePatrimony &&
      batchMatchesCompetence(batch, competence),
  );
  const selectedBatch = selectLatestBatch(matchingBatches);

  return {
    source: definition.source,
    status: selectedBatch?.status ?? ('missing' as const),
    transactionCount: selectedBatch?.transactionCount ?? 0,
  };
}

function selectLatestBatch(
  batches: readonly CoverageBatch[],
): CoverageBatch | undefined {
  const candidates = batches.some((batch) => batch.status === 'confirmed')
    ? batches.filter((batch) => batch.status === 'confirmed')
    : batches;

  return candidates.reduce<CoverageBatch | undefined>((latest, candidate) => {
    if (!latest) {
      return candidate;
    }

    const latestTimestamp = getBatchTimestamp(latest);
    const candidateTimestamp = getBatchTimestamp(candidate);

    if (candidateTimestamp !== latestTimestamp) {
      return candidateTimestamp > latestTimestamp ? candidate : latest;
    }

    return candidate._creationTime > latest._creationTime ? candidate : latest;
  }, undefined);
}

function getBatchTimestamp(batch: CoverageBatch): number {
  return batch.status === 'confirmed'
    ? (batch.confirmedAt ?? batch.updatedAt)
    : batch.updatedAt;
}

function batchMatchesCompetence(
  batch: Doc<'importBatches'>,
  competence: string,
): boolean {
  if (batch.format === 'itauCreditCardXlsx') {
    return batch.statementCompetence === competence;
  }

  if (!isIsoDate(batch.periodStart) || !isIsoDate(batch.periodEnd)) {
    return false;
  }

  return (
    batch.periodStart <= getMonthEnd(competence) &&
    batch.periodEnd >= `${competence}-01`
  );
}

function validateCompetence(value: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new ConvexError({ code: 'INVALID_COMPETENCE' });
  }

  return value;
}

function isIsoDate(value: string | undefined): value is string {
  return value !== undefined && /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value);
}

function getMonthEnd(competence: string): string {
  const [yearText, monthText] = competence.split('-');
  const lastDay = new Date(
    Date.UTC(Number(yearText), Number(monthText), 0),
  ).getUTCDate();
  return `${competence}-${String(lastDay).padStart(2, '0')}`;
}
