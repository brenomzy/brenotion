import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

export const READINESS_VERSION = 'monthly-closure-readiness-v1' as const;
export const CLOSURE_POLICY_VERSION = 'metadata-only-partial-v1' as const;
export const MAX_READINESS_ITEMS = 200;

export const UNAVAILABLE_CAPABILITIES = [
  'classificationCompleteness',
  'identifiedObligationPayments',
  'reportedExpenseClosureCheck',
  'documents',
  'distributions',
  'unexpectedMargin',
  'businessSummary',
  'financialCalculation',
] as const;

export type MonthlyClosureCheckCode =
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

export type UnavailableCapability = (typeof UNAVAILABLE_CAPABILITIES)[number];
type ReadinessCtx = Pick<QueryCtx | MutationCtx, 'db'>;
type SourceName = 'personalBank' | 'creditCard' | 'businessBank';
type SourceStatus = 'missing' | 'preview' | 'confirmed';

type SourceCoverage = {
  source: SourceName;
  status: SourceStatus;
  batchId: Id<'importBatches'> | null;
  importedAt: number | null;
};

export type MonthlyClosureReadiness = Awaited<
  ReturnType<typeof buildMonthlyClosureReadiness>
>;

const SOURCE_DEFINITIONS = [
  { source: 'personalBank', format: 'ofx', patrimony: 'personal' },
  { source: 'creditCard', format: 'itauCreditCardXlsx', patrimony: 'personal' },
  { source: 'businessBank', format: 'ofx', patrimony: 'business' },
] as const;

const CAPABILITY_CHECKS: readonly MonthlyClosureCheckCode[] = [
  'CLASSIFICATION_COMPLETENESS_UNAVAILABLE',
  'OBLIGATION_PAYMENT_IDENTIFICATION_UNAVAILABLE',
  'REPORTED_EXPENSE_CLOSURE_CHECK_UNAVAILABLE',
  'DOCUMENT_CHECK_UNAVAILABLE',
  'DISTRIBUTION_CHECK_UNAVAILABLE',
  'MARGIN_CHECK_UNAVAILABLE',
  'BUSINESS_SUMMARY_UNAVAILABLE',
  'FINANCIAL_CALCULATION_UNAVAILABLE',
];

const NON_ACKNOWLEDGEABLE_CODES = new Set<MonthlyClosureCheckCode>([
  'OWNER_PROFILE_UNAVAILABLE',
  'IMPORT_SEARCH_TRUNCATED',
  'OBLIGATION_SEARCH_TRUNCATED',
]);

export async function buildMonthlyClosureReadiness(
  ctx: ReadinessCtx,
  ownerId: string,
  competence: string,
) {
  const [profile, recentBatches, occurrences, activeObligations, existingClosure] =
    await Promise.all([
      ctx.db
        .query('ownerProfiles')
        .withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
        .unique(),
      ctx.db
        .query('importBatches')
        .withIndex('by_ownerId_and_createdAt', (q) => q.eq('ownerId', ownerId))
        .order('desc')
        .take(MAX_READINESS_ITEMS + 1),
      ctx.db
        .query('obligationOccurrences')
        .withIndex('by_ownerId_and_competence_and_dueOn', (q) =>
          q.eq('ownerId', ownerId).eq('competence', competence),
        )
        .take(MAX_READINESS_ITEMS + 1),
      ctx.db
        .query('obligations')
        .withIndex('by_ownerId_and_isActive_and_name', (q) =>
          q.eq('ownerId', ownerId).eq('isActive', true),
        )
        .take(MAX_READINESS_ITEMS + 1),
      ctx.db
        .query('monthlyClosures')
        .withIndex('by_ownerId_and_competence_and_revisionNumber', (q) =>
          q.eq('ownerId', ownerId).eq('competence', competence),
        )
        .order('desc')
        .first(),
    ]);

  const importSearchExhaustive = recentBatches.length <= MAX_READINESS_ITEMS;
  const occurrenceSearchExhaustive =
    occurrences.length <= MAX_READINESS_ITEMS &&
    activeObligations.length <= MAX_READINESS_ITEMS;
  const boundedBatches = recentBatches.slice(0, MAX_READINESS_ITEMS);
  const boundedOccurrences = occurrences.slice(0, MAX_READINESS_ITEMS);
  const boundedActiveObligations = activeObligations.slice(0, MAX_READINESS_ITEMS);
  const sources = SOURCE_DEFINITIONS.map((definition) =>
    getSourceCoverage(boundedBatches, competence, definition),
  );
  const occurrenceSummary = {
    total: boundedOccurrences.length,
    pending: countStatus(boundedOccurrences, 'pending'),
    completed: countStatus(boundedOccurrences, 'completed'),
    waived: countStatus(boundedOccurrences, 'waived'),
    needsAttention: countStatus(boundedOccurrences, 'needsAttention'),
    manualCompletionCount: boundedOccurrences.filter(
      (occurrence) =>
        occurrence.status === 'completed' &&
        occurrence.completionKind === 'manualConfirmation',
    ).length,
    identifiedPaymentCount: 0 as const,
    isSearchExhaustive: occurrenceSearchExhaustive,
  };
  const checkCodes: MonthlyClosureCheckCode[] = [];

  if (!profile) checkCodes.push('OWNER_PROFILE_UNAVAILABLE');
  if (!importSearchExhaustive) checkCodes.push('IMPORT_SEARCH_TRUNCATED');
  if (!occurrenceSearchExhaustive) checkCodes.push('OBLIGATION_SEARCH_TRUNCATED');
  for (const source of sources) {
    const code = sourceCheckCode(source);
    if (code) checkCodes.push(code);
  }
  if (boundedActiveObligations.length > 0 && boundedOccurrences.length === 0) {
    checkCodes.push('OBLIGATION_OCCURRENCES_NOT_MATERIALIZED');
  }
  if (occurrenceSummary.pending > 0) {
    checkCodes.push('OBLIGATION_OCCURRENCES_PENDING');
  }
  if (occurrenceSummary.needsAttention > 0) {
    checkCodes.push('OBLIGATION_OCCURRENCES_NEED_ATTENTION');
  }
  checkCodes.push(...CAPABILITY_CHECKS);

  const checks = checkCodes.map((code) => ({
    code,
    severity: NON_ACKNOWLEDGEABLE_CODES.has(code)
      ? ('blocking' as const)
      : ('attention' as const),
    acknowledgementAllowed: !NON_ACKNOWLEDGEABLE_CODES.has(code),
  }));
  const status = checks.some((check) => check.severity === 'blocking')
    ? ('blocked' as const)
    : checks.length > 0
      ? ('attention' as const)
      : ('ready' as const);
  const existingClosureSummary = existingClosure
    ? {
        closureId: existingClosure._id,
        revisionNumber: existingClosure.revisionNumber,
        closedAt: existingClosure.closedAt,
        financialCalculationStatus: existingClosure.financialCalculationStatus,
      }
    : null;
  const fingerprint = await createFingerprint({
    competence,
    timeZone: profile?.timeZone ?? null,
    sources,
    importSearchExhaustive,
    occurrences: boundedOccurrences.map((occurrence) => ({
      id: occurrence._id,
      status: occurrence.status,
      completionKind: occurrence.completionKind ?? null,
      waiverReason: occurrence.waiverReason ?? null,
      updatedAt: occurrence.updatedAt,
    })),
    occurrenceSearchExhaustive,
    activeObligations: boundedActiveObligations.map((obligation) => ({
      id: obligation._id,
      updatedAt: obligation.updatedAt,
    })),
    checkCodes,
    existingClosureId: existingClosure?._id ?? null,
    readinessVersion: READINESS_VERSION,
    closurePolicyVersion: CLOSURE_POLICY_VERSION,
  });

  return {
    competence,
    status,
    fingerprint,
    readinessVersion: READINESS_VERSION,
    closurePolicyVersion: CLOSURE_POLICY_VERSION,
    timeZone: profile?.timeZone ?? null,
    checks,
    coverage: {
      complete: sources.every((source) => source.status === 'confirmed'),
      isSearchExhaustive: importSearchExhaustive,
      sources,
    },
    obligations: occurrenceSummary,
    unavailableCapabilities: [...UNAVAILABLE_CAPABILITIES],
    existingClosure: existingClosureSummary,
    nextRevisionNumber: (existingClosure?.revisionNumber ?? 0n) + 1n,
    financialCalculationStatus: 'unavailable' as const,
  };
}

export function acknowledgementAllowed(code: MonthlyClosureCheckCode): boolean {
  return !NON_ACKNOWLEDGEABLE_CODES.has(code);
}

function getSourceCoverage(
  batches: Doc<'importBatches'>[],
  competence: string,
  definition: (typeof SOURCE_DEFINITIONS)[number],
): SourceCoverage {
  const matches = batches.filter(
    (batch) =>
      (batch.status === 'confirmed' || batch.status === 'preview') &&
      batch.format === definition.format &&
      batch.sourcePatrimony === definition.patrimony &&
      matchesCompetence(batch, competence),
  );
  const candidates = matches.some((batch) => batch.status === 'confirmed')
    ? matches.filter((batch) => batch.status === 'confirmed')
    : matches;
  const selected = candidates.reduce<Doc<'importBatches'> | undefined>(
    (latest, candidate) => {
      if (!latest) return candidate;
      const latestAt = batchTimestamp(latest);
      const candidateAt = batchTimestamp(candidate);
      if (candidateAt !== latestAt) return candidateAt > latestAt ? candidate : latest;
      return candidate._creationTime > latest._creationTime ? candidate : latest;
    },
    undefined,
  );

  if (!selected) {
    return { source: definition.source, status: 'missing', batchId: null, importedAt: null };
  }
  return {
    source: definition.source,
    status: selected.status as 'preview' | 'confirmed',
    batchId: selected._id,
    importedAt:
      selected.status === 'confirmed'
        ? (selected.confirmedAt ?? selected.updatedAt)
        : selected.updatedAt,
  };
}

function sourceCheckCode(source: SourceCoverage): MonthlyClosureCheckCode | null {
  const suffix = source.status === 'missing' ? 'MISSING' : 'PREVIEW_ONLY';
  if (source.status === 'confirmed') return null;
  if (source.source === 'personalBank') return `PERSONAL_BANK_${suffix}`;
  if (source.source === 'creditCard') return `CREDIT_CARD_${suffix}`;
  return `BUSINESS_BANK_${suffix}`;
}

function matchesCompetence(batch: Doc<'importBatches'>, competence: string): boolean {
  if (batch.format === 'itauCreditCardXlsx') {
    return batch.statementCompetence === competence;
  }
  if (!batch.periodStart || !batch.periodEnd) return false;
  const monthStart = `${competence}-01`;
  const [yearText, monthText] = competence.split('-');
  const lastDay = new Date(
    Date.UTC(Number(yearText), Number(monthText), 0),
  ).getUTCDate();
  const monthEnd = `${competence}-${String(lastDay).padStart(2, '0')}`;
  return batch.periodStart <= monthEnd && batch.periodEnd >= monthStart;
}

function batchTimestamp(batch: Doc<'importBatches'>): number {
  return batch.status === 'confirmed'
    ? (batch.confirmedAt ?? batch.updatedAt)
    : batch.updatedAt;
}

function countStatus(
  occurrences: Doc<'obligationOccurrences'>[],
  status: Doc<'obligationOccurrences'>['status'],
): number {
  return occurrences.filter((occurrence) => occurrence.status === status).length;
}

async function createFingerprint(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
