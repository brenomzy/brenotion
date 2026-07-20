import { ConvexError, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import {
  acknowledgementAllowed,
  buildMonthlyClosureReadiness,
  type MonthlyClosureCheckCode,
} from './lib/monthlyClosureReadiness';
import {
  monthlyClosureCheckCodeValidator,
  monthlyClosureUnavailableCapabilityValidator,
} from './schema';

const MAX_CLOSURE_REVISIONS = 50;

const sourceNameValidator = v.union(
  v.literal('personalBank'),
  v.literal('creditCard'),
  v.literal('businessBank'),
);
const sourceStatusValidator = v.union(
  v.literal('missing'),
  v.literal('preview'),
  v.literal('confirmed'),
);
const sourceCoverageValidator = v.object({
  source: sourceNameValidator,
  status: sourceStatusValidator,
  batchId: v.union(v.id('importBatches'), v.null()),
  importedAt: v.union(v.number(), v.null()),
});
const sourceSnapshotValidator = v.object({
  status: sourceStatusValidator,
  batchId: v.union(v.id('importBatches'), v.null()),
  importedAt: v.union(v.number(), v.null()),
});
const occurrenceSummaryValidator = v.object({
  total: v.number(),
  pending: v.number(),
  completed: v.number(),
  waived: v.number(),
  needsAttention: v.number(),
  manualCompletionCount: v.number(),
  identifiedPaymentCount: v.literal(0),
  isSearchExhaustive: v.boolean(),
});
const existingClosureValidator = v.union(
  v.null(),
  v.object({
    closureId: v.id('monthlyClosures'),
    revisionNumber: v.int64(),
    closedAt: v.number(),
    financialCalculationStatus: v.literal('unavailable'),
  }),
);
const readinessValidator = v.object({
  competence: v.string(),
  status: v.union(v.literal('ready'), v.literal('attention'), v.literal('blocked')),
  fingerprint: v.string(),
  readinessVersion: v.literal('monthly-closure-readiness-v1'),
  closurePolicyVersion: v.literal('metadata-only-partial-v1'),
  timeZone: v.union(v.string(), v.null()),
  checks: v.array(
    v.object({
      code: monthlyClosureCheckCodeValidator,
      severity: v.union(v.literal('attention'), v.literal('blocking')),
      acknowledgementAllowed: v.boolean(),
    }),
  ),
  coverage: v.object({
    complete: v.boolean(),
    isSearchExhaustive: v.boolean(),
    sources: v.array(sourceCoverageValidator),
  }),
  obligations: occurrenceSummaryValidator,
  unavailableCapabilities: v.array(monthlyClosureUnavailableCapabilityValidator),
  existingClosure: existingClosureValidator,
  nextRevisionNumber: v.int64(),
  financialCalculationStatus: v.literal('unavailable'),
});
const closureValidator = v.object({
  closureId: v.id('monthlyClosures'),
  competence: v.string(),
  revisionNumber: v.int64(),
  supersedesClosureId: v.optional(v.id('monthlyClosures')),
  closedAt: v.number(),
  timeZone: v.string(),
  readinessVersion: v.literal('monthly-closure-readiness-v1'),
  closurePolicyVersion: v.literal('metadata-only-partial-v1'),
  inputFingerprint: v.string(),
  sourceCoverage: v.object({
    personalBank: sourceSnapshotValidator,
    creditCard: sourceSnapshotValidator,
    businessBank: sourceSnapshotValidator,
  }),
  occurrenceSummary: occurrenceSummaryValidator,
  acknowledgedCheckCodes: v.array(monthlyClosureCheckCodeValidator),
  unavailableCapabilities: v.array(monthlyClosureUnavailableCapabilityValidator),
  confidenceAtClosure: v.literal('partial'),
  financialCalculationStatus: v.literal('unavailable'),
  idempotencyKey: v.string(),
});

export const getReadiness = query({
  args: { competence: v.string() },
  returns: readinessValidator,
  handler: async (ctx, args) => {
    const competence = validateCompetence(args.competence);
    const { ownerId } = await requireAuthorizedOwner(ctx);
    return await buildMonthlyClosureReadiness(ctx, ownerId, competence);
  },
});

export const getByCompetence = query({
  args: { competence: v.string() },
  returns: v.object({
    latest: v.union(v.null(), closureValidator),
    revisions: v.array(closureValidator),
    isTruncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const competence = validateCompetence(args.competence);
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const closures = await ctx.db
      .query('monthlyClosures')
      .withIndex('by_ownerId_and_competence_and_revisionNumber', (q) =>
        q.eq('ownerId', ownerId).eq('competence', competence),
      )
      .order('desc')
      .take(MAX_CLOSURE_REVISIONS + 1);
    const revisions = closures.slice(0, MAX_CLOSURE_REVISIONS).map(toClosure);
    return {
      latest: revisions[0] ?? null,
      revisions,
      isTruncated: closures.length > MAX_CLOSURE_REVISIONS,
    };
  },
});

export const getLatestClosed = query({
  args: {},
  returns: v.union(v.null(), closureValidator),
  handler: async (ctx) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const closure = await ctx.db
      .query('monthlyClosures')
      .withIndex('by_ownerId_and_closedAt', (q) => q.eq('ownerId', ownerId))
      .order('desc')
      .first();
    return closure ? toClosure(closure) : null;
  },
});

export const close = mutation({
  args: {
    competence: v.string(),
    readinessFingerprint: v.string(),
    acknowledgedCheckCodes: v.array(monthlyClosureCheckCodeValidator),
    idempotencyKey: v.string(),
  },
  returns: v.object({
    status: v.union(v.literal('created'), v.literal('unchanged')),
    closure: closureValidator,
  }),
  handler: async (ctx, args) => {
    const competence = validateCompetence(args.competence);
    const readinessFingerprint = validateFingerprint(args.readinessFingerprint);
    const idempotencyKey = validateIdempotencyKey(args.idempotencyKey);
    const acknowledgedCheckCodes = normalizeAcknowledgements(
      args.acknowledgedCheckCodes,
    );
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const existingRequest = await ctx.db
      .query('monthlyClosures')
      .withIndex('by_ownerId_and_idempotencyKey', (q) =>
        q.eq('ownerId', ownerId).eq('idempotencyKey', idempotencyKey),
      )
      .unique();

    if (existingRequest) {
      if (
        existingRequest.competence !== competence ||
        existingRequest.inputFingerprint !== readinessFingerprint ||
        !sameCodes(existingRequest.acknowledgedCheckCodes, acknowledgedCheckCodes)
      ) {
        throwClosureError('IDEMPOTENCY_KEY_REUSED');
      }
      return { status: 'unchanged' as const, closure: toClosure(existingRequest) };
    }

    const readiness = await buildMonthlyClosureReadiness(ctx, ownerId, competence);
    if (readiness.fingerprint !== readinessFingerprint) {
      throw new ConvexError({
        code: 'READINESS_CHANGED',
        currentFingerprint: readiness.fingerprint,
      });
    }
    const blockingCodes = readiness.checks
      .filter((check) => !check.acknowledgementAllowed)
      .map((check) => check.code);
    if (blockingCodes.length > 0 || !readiness.timeZone) {
      throw new ConvexError({ code: 'MONTHLY_CLOSURE_BLOCKED', blockingCodes });
    }
    const requiredAcknowledgements = readiness.checks
      .filter((check) => acknowledgementAllowed(check.code))
      .map((check) => check.code)
      .sort();
    if (!sameCodes(requiredAcknowledgements, acknowledgedCheckCodes)) {
      throw new ConvexError({
        code: 'ACKNOWLEDGEMENTS_REQUIRED',
        requiredCheckCodes: requiredAcknowledgements,
      });
    }

    const closedAt = Date.now();
    const personalBank = requireSource(readiness.coverage.sources, 'personalBank');
    const creditCard = requireSource(readiness.coverage.sources, 'creditCard');
    const businessBank = requireSource(readiness.coverage.sources, 'businessBank');
    const closureId = await ctx.db.insert('monthlyClosures', {
      ownerId,
      competence,
      revisionNumber: readiness.nextRevisionNumber,
      supersedesClosureId: readiness.existingClosure?.closureId,
      closedAt,
      timeZone: readiness.timeZone,
      readinessVersion: readiness.readinessVersion,
      closurePolicyVersion: readiness.closurePolicyVersion,
      inputFingerprint: readiness.fingerprint,
      sourceCoverage: {
        personalBank: toSourceSnapshot(personalBank),
        creditCard: toSourceSnapshot(creditCard),
        businessBank: toSourceSnapshot(businessBank),
      },
      occurrenceSummary: readiness.obligations,
      acknowledgedCheckCodes,
      unavailableCapabilities: readiness.unavailableCapabilities,
      confidenceAtClosure: 'partial',
      financialCalculationStatus: 'unavailable',
      idempotencyKey,
    });
    await ctx.db.insert('auditEvents', {
      ownerId,
      action: 'monthly_closure.closed',
      targetType: 'monthly_closure',
      targetId: closureId,
      result: 'succeeded',
      occurredAt: closedAt,
    });
    const closure = await ctx.db.get('monthlyClosures', closureId);
    if (!closure) throwClosureError('MONTHLY_CLOSURE_NOT_FOUND');
    return { status: 'created' as const, closure: toClosure(closure) };
  },
});

function toClosure(closure: Doc<'monthlyClosures'>) {
  return {
    closureId: closure._id,
    competence: closure.competence,
    revisionNumber: closure.revisionNumber,
    supersedesClosureId: closure.supersedesClosureId,
    closedAt: closure.closedAt,
    timeZone: closure.timeZone,
    readinessVersion: closure.readinessVersion,
    closurePolicyVersion: closure.closurePolicyVersion,
    inputFingerprint: closure.inputFingerprint,
    sourceCoverage: closure.sourceCoverage,
    occurrenceSummary: closure.occurrenceSummary,
    acknowledgedCheckCodes: closure.acknowledgedCheckCodes,
    unavailableCapabilities: closure.unavailableCapabilities,
    confidenceAtClosure: closure.confidenceAtClosure,
    financialCalculationStatus: closure.financialCalculationStatus,
    idempotencyKey: closure.idempotencyKey,
  };
}

function validateCompetence(value: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throwClosureError('INVALID_COMPETENCE');
  }
  return value;
}

function validateFingerprint(value: string): string {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throwClosureError('INVALID_READINESS_FINGERPRINT');
  }
  return value;
}

function validateIdempotencyKey(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(normalized)) {
    throwClosureError('INVALID_IDEMPOTENCY_KEY');
  }
  return normalized;
}

function normalizeAcknowledgements(codes: MonthlyClosureCheckCode[]) {
  if (codes.length > 32 || new Set(codes).size !== codes.length) {
    throwClosureError('INVALID_ACKNOWLEDGEMENTS');
  }
  return [...codes].sort();
}

function sameCodes(
  left: readonly MonthlyClosureCheckCode[],
  right: readonly MonthlyClosureCheckCode[],
): boolean {
  return left.length === right.length && left.every((code, index) => code === right[index]);
}

function requireSource(
  sources: Array<{
    source: 'personalBank' | 'creditCard' | 'businessBank';
    status: 'missing' | 'preview' | 'confirmed';
    batchId: Doc<'monthlyClosures'>['sourceCoverage']['personalBank']['batchId'];
    importedAt: number | null;
  }>,
  sourceName: 'personalBank' | 'creditCard' | 'businessBank',
) {
  const source = sources.find((item) => item.source === sourceName);
  if (!source) throwClosureError('INVALID_READINESS_STATE');
  return source;
}

function toSourceSnapshot(source: ReturnType<typeof requireSource>) {
  return { status: source.status, batchId: source.batchId, importedAt: source.importedAt };
}

type MonthlyClosureErrorCode =
  | 'INVALID_COMPETENCE'
  | 'INVALID_READINESS_FINGERPRINT'
  | 'INVALID_IDEMPOTENCY_KEY'
  | 'INVALID_ACKNOWLEDGEMENTS'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'MONTHLY_CLOSURE_NOT_FOUND'
  | 'INVALID_READINESS_STATE';

function throwClosureError(code: MonthlyClosureErrorCode): never {
  throw new ConvexError({ code });
}
