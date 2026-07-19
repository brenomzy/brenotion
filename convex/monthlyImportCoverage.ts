import { ConvexError, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { query } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import { importFormatValidator, sourcePatrimonyValidator } from './schema';

const MAX_RECENT_BATCHES_TO_INSPECT = 200;

const coverageSourceValidator = v.union(
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
  source: coverageSourceValidator,
  expectedFormat: importFormatValidator,
  expectedSourcePatrimony: sourcePatrimonyValidator,
  status: coverageStatusValidator,
  batchId: v.union(v.id('importBatches'), v.null()),
  periodStart: v.union(v.string(), v.null()),
  periodEnd: v.union(v.string(), v.null()),
  statementCompetence: v.union(v.string(), v.null()),
  transactionCount: v.number(),
  duplicateCount: v.number(),
  importedAt: v.union(v.number(), v.null()),
});

type CoverageSource = 'personalBank' | 'creditCard' | 'businessBank';
type CoverageStatus = 'missing' | 'preview' | 'confirmed';
type ImportFormat = 'ofx' | 'itauCreditCardXlsx';
type SourcePatrimony = 'personal' | 'business';
type CoverageBatch = Doc<'importBatches'> & {
  status: Exclude<CoverageStatus, 'missing'>;
};

type SourceDefinition = {
  source: CoverageSource;
  expectedFormat: ImportFormat;
  expectedSourcePatrimony: SourcePatrimony;
};

const SOURCE_DEFINITIONS: readonly SourceDefinition[] = [
  {
    source: 'personalBank',
    expectedFormat: 'ofx',
    expectedSourcePatrimony: 'personal',
  },
  {
    source: 'creditCard',
    expectedFormat: 'itauCreditCardXlsx',
    expectedSourcePatrimony: 'personal',
  },
  {
    source: 'businessBank',
    expectedFormat: 'ofx',
    expectedSourcePatrimony: 'business',
  },
];

export const get = query({
  args: { competence: v.string() },
  returns: v.object({
    competence: v.string(),
    complete: v.boolean(),
    isSearchExhaustive: v.boolean(),
    sources: v.array(sourceCoverageValidator),
  }),
  handler: async (ctx, args) => {
    const competence = validateCompetence(args.competence);
    const { ownerId } = await requireAuthorizedOwner(ctx);

    const recentBatches = await ctx.db
      .query('importBatches')
      .withIndex('by_ownerId_and_createdAt', (q) => q.eq('ownerId', ownerId))
      .order('desc')
      .take(MAX_RECENT_BATCHES_TO_INSPECT + 1);

    const isSearchExhaustive = recentBatches.length <= MAX_RECENT_BATCHES_TO_INSPECT;
    const boundedBatches = recentBatches.slice(0, MAX_RECENT_BATCHES_TO_INSPECT);
    const sources = SOURCE_DEFINITIONS.map((definition) =>
      buildSourceCoverage(boundedBatches, competence, definition),
    );

    return {
      competence,
      complete: sources.every((source) => source.status === 'confirmed'),
      isSearchExhaustive,
      sources,
    };
  },
});

function buildSourceCoverage(
  batches: Doc<'importBatches'>[],
  competence: string,
  definition: SourceDefinition,
) {
  const matchingBatches = batches.filter(
    (batch): batch is CoverageBatch =>
      (batch.status === 'confirmed' || batch.status === 'preview') &&
      batch.format === definition.expectedFormat &&
      batch.sourcePatrimony === definition.expectedSourcePatrimony &&
      batchMatchesCompetence(batch, competence),
  );
  const selectedBatch = selectLatestBatch(matchingBatches);

  if (!selectedBatch) {
    return {
      ...definition,
      status: 'missing' as const,
      batchId: null,
      periodStart: null,
      periodEnd: null,
      statementCompetence: null,
      transactionCount: 0,
      duplicateCount: 0,
      importedAt: null,
    };
  }

  return {
    ...definition,
    status: selectedBatch.status,
    batchId: selectedBatch._id,
    periodStart: selectedBatch.periodStart ?? null,
    periodEnd: selectedBatch.periodEnd ?? null,
    statementCompetence: selectedBatch.statementCompetence ?? null,
    transactionCount: selectedBatch.transactionCount,
    duplicateCount: selectedBatch.duplicateCount,
    importedAt:
      selectedBatch.status === 'confirmed'
        ? (selectedBatch.confirmedAt ?? selectedBatch.updatedAt)
        : selectedBatch.updatedAt,
  };
}

function selectLatestBatch(batches: CoverageBatch[]): CoverageBatch | undefined {
  const candidates = batches.some((batch) => batch.status === 'confirmed')
    ? batches.filter((batch) => batch.status === 'confirmed')
    : batches;

  return candidates.reduce<CoverageBatch | undefined>((latest, candidate) => {
    if (!latest) {
      return candidate;
    }

    const latestTimestamp = getBatchRecencyTimestamp(latest);
    const candidateTimestamp = getBatchRecencyTimestamp(candidate);
    if (candidateTimestamp !== latestTimestamp) {
      return candidateTimestamp > latestTimestamp ? candidate : latest;
    }

    return candidate._creationTime > latest._creationTime ? candidate : latest;
  }, undefined);
}

function getBatchRecencyTimestamp(batch: CoverageBatch): number {
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

  const monthStart = `${competence}-01`;
  const monthEnd = getMonthEnd(competence);
  return batch.periodStart <= monthEnd && batch.periodEnd >= monthStart;
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
  const year = Number(yearText);
  const month = Number(monthText);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${competence}-${String(lastDay).padStart(2, '0')}`;
}
