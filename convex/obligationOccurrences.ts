import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import {
  brlMoneyValidator,
  economicNatureValidator,
  obligationOccurrenceCompletionKindValidator,
  obligationOccurrenceStatusValidator,
  obligationOccurrenceWaiverReasonValidator,
  paymentOriginValidator,
} from './schema';

const MAX_OCCURRENCES_PER_COMPETENCE = 200;

const occurrenceValidator = v.object({
  occurrenceId: v.id('obligationOccurrences'),
  obligationId: v.id('obligations'),
  sourceObligationRevisionId: v.optional(v.id('obligationRevisions')),
  competence: v.string(),
  obligationKey: v.string(),
  name: v.string(),
  economicNature: economicNatureValidator,
  paymentOrigin: paymentOriginValidator,
  expectedAmount: v.optional(brlMoneyValidator),
  dueDayOfMonth: v.optional(v.number()),
  dueOn: v.optional(v.string()),
  status: obligationOccurrenceStatusValidator,
  materializedAt: v.number(),
  updatedAt: v.number(),
  completedAt: v.optional(v.number()),
  completionKind: v.optional(obligationOccurrenceCompletionKindValidator),
  waivedAt: v.optional(v.number()),
  waiverReason: v.optional(obligationOccurrenceWaiverReasonValidator),
});

export const listForCompetence = query({
  args: {
    competence: v.string(),
    status: v.optional(obligationOccurrenceStatusValidator),
  },
  returns: v.object({
    items: v.array(occurrenceValidator),
    isTruncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const competence = validateCompetence(args.competence);
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const status = args.status;
    const occurrences = await (status === undefined
      ? ctx.db
          .query('obligationOccurrences')
          .withIndex('by_ownerId_and_competence_and_dueOn', (q) =>
            q.eq('ownerId', ownerId).eq('competence', competence),
          )
      : ctx.db
          .query('obligationOccurrences')
          .withIndex('by_ownerId_and_competence_and_status_and_dueOn', (q) =>
            q
              .eq('ownerId', ownerId)
              .eq('competence', competence)
              .eq('status', status),
          )
    ).take(MAX_OCCURRENCES_PER_COMPETENCE + 1);

    return {
      items: occurrences.slice(0, MAX_OCCURRENCES_PER_COMPETENCE).map(toOccurrence),
      isTruncated: occurrences.length > MAX_OCCURRENCES_PER_COMPETENCE,
    };
  },
});

export const materializeForCompetence = mutation({
  args: { competence: v.string() },
  returns: v.object({
    competence: v.string(),
    createdCount: v.number(),
    existingCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const competence = validateCompetence(args.competence);
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const obligations = await ctx.db
      .query('obligations')
      .withIndex('by_ownerId_and_isActive_and_name', (q) =>
        q.eq('ownerId', ownerId).eq('isActive', true),
      )
      .take(MAX_OCCURRENCES_PER_COMPETENCE + 1);

    if (obligations.length > MAX_OCCURRENCES_PER_COMPETENCE) {
      throwOccurrenceError('OCCURRENCE_MATERIALIZATION_LIMIT_EXCEEDED');
    }

    let createdCount = 0;
    let existingCount = 0;

    for (const obligation of obligations) {
      const existing = await ctx.db
        .query('obligationOccurrences')
        .withIndex('by_ownerId_and_competence_and_obligationId', (q) =>
          q
            .eq('ownerId', ownerId)
            .eq('competence', competence)
            .eq('obligationId', obligation._id),
        )
        .unique();

      if (existing) {
        existingCount += 1;
        continue;
      }

      const materializedAt = Date.now();
      const occurrenceId = await ctx.db.insert('obligationOccurrences', {
        ownerId,
        obligationId: obligation._id,
        sourceObligationRevisionId: obligation.currentRevisionId,
        competence,
        obligationKey: obligation.obligationKey,
        name: obligation.name,
        economicNature: obligation.economicNature,
        paymentOrigin: obligation.paymentOrigin,
        expectedAmount: obligation.expectedAmount,
        dueDayOfMonth: obligation.dueDayOfMonth,
        dueOn: getDueOn(competence, obligation.dueDayOfMonth),
        status: 'pending',
        materializedAt,
        updatedAt: materializedAt,
      });
      await insertOccurrenceAuditEvent(
        ctx,
        ownerId,
        'obligation_occurrence.materialized',
        occurrenceId,
        materializedAt,
        {},
      );
      createdCount += 1;
    }

    return { competence, createdCount, existingCount };
  },
});

export const completeManually = mutation({
  args: {
    occurrenceId: v.id('obligationOccurrences'),
    completionKind: v.literal('manualConfirmation'),
  },
  returns: v.object({
    status: v.union(v.literal('updated'), v.literal('unchanged')),
    occurrence: occurrenceValidator,
  }),
  handler: async (ctx, args) =>
    await changeStatus(ctx, args.occurrenceId, 'completed', {
      completionKind: args.completionKind,
    }),
});

export const waive = mutation({
  args: {
    occurrenceId: v.id('obligationOccurrences'),
    waiverReason: obligationOccurrenceWaiverReasonValidator,
  },
  returns: v.object({
    status: v.union(v.literal('updated'), v.literal('unchanged')),
    occurrence: occurrenceValidator,
  }),
  handler: async (ctx, args) =>
    await changeStatus(ctx, args.occurrenceId, 'waived', {
      waiverReason: args.waiverReason,
    }),
});

export const markNeedsAttention = mutation({
  args: { occurrenceId: v.id('obligationOccurrences') },
  returns: v.object({
    status: v.union(v.literal('updated'), v.literal('unchanged')),
    occurrence: occurrenceValidator,
  }),
  handler: async (ctx, args) =>
    await changeStatus(ctx, args.occurrenceId, 'needsAttention'),
});

export const reopen = mutation({
  args: { occurrenceId: v.id('obligationOccurrences') },
  returns: v.object({
    status: v.union(v.literal('updated'), v.literal('unchanged')),
    occurrence: occurrenceValidator,
  }),
  handler: async (ctx, args) => await changeStatus(ctx, args.occurrenceId, 'pending'),
});

async function changeStatus(
  ctx: MutationCtx,
  occurrenceId: Id<'obligationOccurrences'>,
  nextStatus: Doc<'obligationOccurrences'>['status'],
  evidence: StatusEvidence = {},
) {
  const { ownerId } = await requireAuthorizedOwner(ctx);
  const occurrence = await ctx.db.get('obligationOccurrences', occurrenceId);

  if (!occurrence || occurrence.ownerId !== ownerId) {
    throwOccurrenceError('OBLIGATION_OCCURRENCE_NOT_FOUND');
  }

  if (
    occurrence.status === nextStatus &&
    occurrence.completionKind === evidence.completionKind &&
    occurrence.waiverReason === evidence.waiverReason
  ) {
    return { status: 'unchanged' as const, occurrence: toOccurrence(occurrence) };
  }

  const updatedAt = Date.now();
  const completionFields =
    nextStatus === 'completed'
      ? {
          completedAt: updatedAt,
          completionKind: evidence.completionKind,
          waivedAt: undefined,
          waiverReason: undefined,
        }
      : nextStatus === 'waived'
        ? {
            completedAt: undefined,
            completionKind: undefined,
            waivedAt: updatedAt,
            waiverReason: evidence.waiverReason,
          }
        : {
            completedAt: undefined,
            completionKind: undefined,
            waivedAt: undefined,
            waiverReason: undefined,
          };
  await ctx.db.patch('obligationOccurrences', occurrenceId, {
    status: nextStatus,
    updatedAt,
    ...completionFields,
  });
  await insertOccurrenceAuditEvent(
    ctx,
    ownerId,
    auditActionForStatus(nextStatus),
    occurrenceId,
    updatedAt,
    evidence,
  );

  return {
    status: 'updated' as const,
    occurrence: toOccurrence({
      ...occurrence,
      status: nextStatus,
      updatedAt,
      ...completionFields,
    }),
  };
}

function validateCompetence(value: string): string {
  const normalized = value.trim();
  const match = /^(\d{4})-(\d{2})$/.exec(normalized);
  const month = match ? Number(match[2]) : Number.NaN;

  if (!match || month < 1 || month > 12) {
    throwOccurrenceError('INVALID_COMPETENCE');
  }

  return normalized;
}

function getDueOn(competence: string, dueDayOfMonth: number | undefined) {
  if (dueDayOfMonth === undefined) {
    return undefined;
  }

  const [yearText, monthText] = competence.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dueDay = Math.min(dueDayOfMonth, lastDayOfMonth);
  return `${competence}-${String(dueDay).padStart(2, '0')}`;
}

function toOccurrence(occurrence: Doc<'obligationOccurrences'>) {
  return {
    occurrenceId: occurrence._id,
    obligationId: occurrence.obligationId,
    sourceObligationRevisionId: occurrence.sourceObligationRevisionId,
    competence: occurrence.competence,
    obligationKey: occurrence.obligationKey,
    name: occurrence.name,
    economicNature: occurrence.economicNature,
    paymentOrigin: occurrence.paymentOrigin,
    expectedAmount: occurrence.expectedAmount,
    dueDayOfMonth: occurrence.dueDayOfMonth,
    dueOn: occurrence.dueOn,
    status: occurrence.status,
    materializedAt: occurrence.materializedAt,
    updatedAt: occurrence.updatedAt,
    completedAt: occurrence.completedAt,
    completionKind: occurrence.completionKind,
    waivedAt: occurrence.waivedAt,
    waiverReason: occurrence.waiverReason,
  };
}

function auditActionForStatus(
  status: Doc<'obligationOccurrences'>['status'],
): OccurrenceAuditAction {
  switch (status) {
    case 'completed':
      return 'obligation_occurrence.manual_completion_confirmed';
    case 'waived':
      return 'obligation_occurrence.waived';
    case 'needsAttention':
      return 'obligation_occurrence.marked_needs_attention';
    case 'pending':
      return 'obligation_occurrence.reopened';
  }
}

type OccurrenceAuditAction =
  | 'obligation_occurrence.materialized'
  | 'obligation_occurrence.manual_completion_confirmed'
  | 'obligation_occurrence.waived'
  | 'obligation_occurrence.marked_needs_attention'
  | 'obligation_occurrence.reopened';

type StatusEvidence = {
  completionKind?: 'manualConfirmation';
  waiverReason?:
    | 'notDueThisCompetence'
    | 'cancelledForCompetence'
    | 'duplicateOccurrence';
};

async function insertOccurrenceAuditEvent(
  ctx: MutationCtx,
  ownerId: string,
  action: OccurrenceAuditAction,
  occurrenceId: Id<'obligationOccurrences'>,
  occurredAt: number,
  evidence: StatusEvidence,
): Promise<void> {
  await ctx.db.insert('auditEvents', {
    ownerId,
    action,
    targetType: 'obligation_occurrence',
    targetId: occurrenceId,
    occurrenceCompletionKind: evidence.completionKind,
    occurrenceWaiverReason: evidence.waiverReason,
    result: 'succeeded',
    occurredAt,
  });
}

type ObligationOccurrenceErrorCode =
  | 'INVALID_COMPETENCE'
  | 'OCCURRENCE_MATERIALIZATION_LIMIT_EXCEEDED'
  | 'OBLIGATION_OCCURRENCE_NOT_FOUND';

function throwOccurrenceError(code: ObligationOccurrenceErrorCode): never {
  throw new ConvexError({ code });
}
