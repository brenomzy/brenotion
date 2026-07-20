import { ConvexError, v } from 'convex/values';

import {
  CLASSIFICATION_PROMPT_VERSION,
  CLASSIFICATION_SANITIZER_VERSION,
  CLASSIFICATION_SCHEMA_VERSION,
  CLASSIFICATION_TAXONOMY_VERSION,
} from '../shared/ai-classification';
import type { Doc, Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import {
  env,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import { buildMonthlyClassificationPreparation } from './lib/monthlyClassificationPreparation';
import {
  aiClassificationEvidenceValidator,
  aiClassificationUncertaintyValidator,
  classificationCategoryValidator,
} from './schema';

const MAX_SUGGESTIONS_PER_JOB = 300;
const CLASSIFICATION_RULE_VERSION = 'classification-rule-v1' as const;

const jobSummaryValidator = v.object({
  jobId: v.id('aiClassificationJobs'),
  competence: v.string(),
  status: v.union(
    v.literal('queued'),
    v.literal('running'),
    v.literal('needs_review'),
    v.literal('completed'),
    v.literal('failed'),
  ),
  adapter: v.union(v.literal('openai'), v.literal('fake')),
  model: v.string(),
  attemptCount: v.number(),
  modelCallCount: v.number(),
  totalGroupCount: v.number(),
  resolvedByRuleCount: v.number(),
  manualReviewCount: v.number(),
  suggestedCount: v.number(),
  abstainedCount: v.number(),
  rejectedCount: v.number(),
  requestedAt: v.number(),
  updatedAt: v.number(),
  inputTokens: v.union(v.number(), v.null()),
  outputTokens: v.union(v.number(), v.null()),
  totalTokens: v.union(v.number(), v.null()),
  latencyMs: v.union(v.number(), v.null()),
  estimatedCostInUsdMicros: v.union(v.number(), v.null()),
  errorCode: v.union(v.string(), v.null()),
  retryable: v.union(v.boolean(), v.null()),
});

const suggestionValidator = v.object({
  suggestionId: v.id('aiClassificationSuggestions'),
  groupId: v.string(),
  displayDescription: v.union(v.string(), v.null()),
  source: v.union(v.literal('model'), v.literal('manual_review')),
  manualReviewReason: v.union(
    v.literal('sensitive_transfer'),
    v.literal('possible_prompt_injection'),
    v.literal('empty_after_redaction'),
    v.null(),
  ),
  suggestedCategoryId: v.union(classificationCategoryValidator, v.null()),
  evidence: aiClassificationEvidenceValidator,
  uncertainty: aiClassificationUncertaintyValidator,
  status: v.union(
    v.literal('pending'),
    v.literal('confirmed'),
    v.literal('corrected'),
    v.literal('abstained'),
  ),
  selectedCategoryId: v.union(classificationCategoryValidator, v.null()),
});

const preparedSuggestionValidator = v.object({
  groupId: v.string(),
  groupKey: v.string(),
  sanitizedDescription: v.union(v.string(), v.null()),
  source: v.union(v.literal('model'), v.literal('manual_review')),
  manualReviewReason: v.optional(
    v.union(
      v.literal('sensitive_transfer'),
      v.literal('possible_prompt_injection'),
      v.literal('empty_after_redaction'),
    ),
  ),
  suggestedCategoryId: v.union(classificationCategoryValidator, v.null()),
  evidence: aiClassificationEvidenceValidator,
  uncertainty: aiClassificationUncertaintyValidator,
});

export const requestMonthlyClassification = mutation({
  args: { competence: v.string() },
  returns: v.object({
    jobId: v.id('aiClassificationJobs'),
    status: v.union(
      v.literal('queued'),
      v.literal('running'),
      v.literal('needs_review'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const preparation = await buildMonthlyClassificationPreparation(
      ctx,
      ownerId,
      args.competence,
    );
    const existing = await ctx.db
      .query('aiClassificationJobs')
      .withIndex('by_ownerId_and_inputHash', (q) =>
        q.eq('ownerId', ownerId).eq('inputHash', preparation.inputHash),
      )
      .unique();

    if (existing) {
      if (existing.status === 'failed' && existing.retryable === true) {
        const now = Date.now();
        await ctx.db.patch('aiClassificationJobs', existing._id, {
          status: 'queued',
          updatedAt: now,
          errorCode: undefined,
          retryable: undefined,
        });
        await ctx.scheduler.runAfter(
          0,
          internal.aiClassificationAction.processMonthlyClassification,
          { jobId: existing._id },
        );
        return { jobId: existing._id, status: 'queued' as const, created: false };
      }

      return {
        jobId: existing._id,
        status: existing.status,
        created: false,
      };
    }

    const adapter = configuredAdapter();
    const now = Date.now();
    const jobId = await ctx.db.insert('aiClassificationJobs', {
      ownerId,
      competence: args.competence,
      inputHash: preparation.inputHash,
      status: 'queued',
      adapter,
      model: configuredModel(),
      promptVersion: CLASSIFICATION_PROMPT_VERSION,
      schemaVersion: CLASSIFICATION_SCHEMA_VERSION,
      taxonomyVersion: CLASSIFICATION_TAXONOMY_VERSION,
      sanitizerVersion: CLASSIFICATION_SANITIZER_VERSION,
      attemptCount: 0,
      modelCallCount: 0,
      totalGroupCount: preparation.totalGroupCount,
      resolvedByRuleCount: preparation.resolvedByRuleCount,
      manualReviewCount: 0,
      suggestedCount: 0,
      abstainedCount: 0,
      rejectedCount: 0,
      requestedAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('auditEvents', {
      ownerId,
      action: 'classification_job.requested',
      targetType: 'classification_job',
      targetId: jobId,
      result: 'succeeded',
      occurredAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.aiClassificationAction.processMonthlyClassification,
      { jobId },
    );

    return { jobId, status: 'queued' as const, created: true };
  },
});

export const getMonthlyClassificationReview = query({
  args: { competence: v.string() },
  returns: v.object({
    job: v.union(jobSummaryValidator, v.null()),
    suggestions: v.array(suggestionValidator),
  }),
  handler: async (ctx, args) => {
    validateCompetence(args.competence);
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const job = await ctx.db
      .query('aiClassificationJobs')
      .withIndex('by_ownerId_and_competence_and_requestedAt', (q) =>
        q.eq('ownerId', ownerId).eq('competence', args.competence),
      )
      .order('desc')
      .first();

    if (!job) {
      return { job: null, suggestions: [] };
    }

    const suggestions = await ctx.db
      .query('aiClassificationSuggestions')
      .withIndex('by_ownerId_and_jobId', (q) =>
        q.eq('ownerId', ownerId).eq('jobId', job._id),
      )
      .take(MAX_SUGGESTIONS_PER_JOB + 1);

    if (suggestions.length > MAX_SUGGESTIONS_PER_JOB) {
      throw new ConvexError({ code: 'CLASSIFICATION_REVIEW_TRUNCATED' });
    }

    return {
      job: toJobSummary(job),
      suggestions: suggestions.map((suggestion) => ({
        suggestionId: suggestion._id,
        groupId: suggestion.groupId,
        displayDescription: suggestion.sanitizedDescription,
        source: suggestion.source,
        manualReviewReason: suggestion.manualReviewReason ?? null,
        suggestedCategoryId: suggestion.suggestedCategoryId,
        evidence: suggestion.evidence,
        uncertainty: suggestion.uncertainty,
        status: suggestion.status,
        selectedCategoryId: suggestion.selectedCategoryId ?? null,
      })),
    };
  },
});

export const reviewSuggestion = mutation({
  args: {
    suggestionId: v.id('aiClassificationSuggestions'),
    decision: v.union(
      v.literal('confirm'),
      v.literal('correct'),
      v.literal('abstain'),
    ),
    categoryId: v.union(classificationCategoryValidator, v.null()),
  },
  returns: v.object({
    status: v.union(
      v.literal('confirmed'),
      v.literal('corrected'),
      v.literal('abstained'),
      v.literal('unchanged'),
    ),
    ruleId: v.union(v.id('classificationRules'), v.null()),
  }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const suggestion = await ctx.db.get(
      'aiClassificationSuggestions',
      args.suggestionId,
    );

    if (!suggestion || suggestion.ownerId !== ownerId) {
      throw new ConvexError({ code: 'CLASSIFICATION_SUGGESTION_NOT_FOUND' });
    }

    if (suggestion.status !== 'pending') {
      return { status: 'unchanged' as const, ruleId: null };
    }

    validateReviewDecision(suggestion, args.decision, args.categoryId);
    const now = Date.now();
    let ruleId: Id<'classificationRules'> | null = null;
    let status: 'confirmed' | 'corrected' | 'abstained';

    if (args.decision === 'abstain') {
      status = 'abstained';
    } else {
      const categoryId = args.categoryId;
      if (!categoryId) {
        throw new ConvexError({ code: 'CLASSIFICATION_CATEGORY_REQUIRED' });
      }
      status =
        categoryId === suggestion.suggestedCategoryId
          ? 'confirmed'
          : 'corrected';
      ruleId = await upsertClassificationRule(
        ctx,
        ownerId,
        suggestion.groupKey,
        categoryId,
        now,
      );
    }

    await ctx.db.patch('aiClassificationSuggestions', suggestion._id, {
      status,
      ...(args.categoryId ? { selectedCategoryId: args.categoryId } : {}),
      decidedAt: now,
    });
    await ctx.db.insert('auditEvents', {
      ownerId,
      action: 'classification_suggestion.reviewed',
      targetType: 'classification_suggestion',
      targetId: suggestion._id,
      result: 'succeeded',
      occurredAt: now,
    });
    await completeJobWhenReviewFinished(ctx, ownerId, suggestion.jobId, now);

    return { status, ruleId };
  },
});

export const prepareForAction = internalQuery({
  args: { jobId: v.id('aiClassificationJobs') },
  handler: async (ctx, args) => {
    const job = await ctx.db.get('aiClassificationJobs', args.jobId);
    if (!job) {
      throw new ConvexError({ code: 'CLASSIFICATION_JOB_NOT_FOUND' });
    }
    const preparation = await buildMonthlyClassificationPreparation(
      ctx,
      job.ownerId,
      job.competence,
    );
    return { job, preparation };
  },
});

export const markRunning = internalMutation({
  args: { jobId: v.id('aiClassificationJobs') },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get('aiClassificationJobs', args.jobId);
    if (!job || job.status !== 'queued') {
      return false;
    }
    const now = Date.now();
    await ctx.db.patch('aiClassificationJobs', job._id, {
      status: 'running',
      attemptCount: job.attemptCount + 1,
      startedAt: now,
      updatedAt: now,
    });
    return true;
  },
});

export const persistActionResult = internalMutation({
  args: {
    jobId: v.id('aiClassificationJobs'),
    suggestions: v.array(preparedSuggestionValidator),
    modelCallCount: v.number(),
    metadata: v.object({
      responseId: v.union(v.string(), v.null()),
      inputTokens: v.union(v.number(), v.null()),
      outputTokens: v.union(v.number(), v.null()),
      totalTokens: v.union(v.number(), v.null()),
      latencyMs: v.union(v.number(), v.null()),
      estimatedCostInUsdMicros: v.union(v.number(), v.null()),
      pricingVersion: v.union(
        v.literal('openai-standard-2026-07-19'),
        v.null(),
      ),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get('aiClassificationJobs', args.jobId);
    if (!job || job.status !== 'running') {
      return null;
    }

    if (args.suggestions.length > MAX_SUGGESTIONS_PER_JOB) {
      throw new ConvexError({ code: 'TOO_MANY_CLASSIFICATION_SUGGESTIONS' });
    }

    const now = Date.now();
    for (const suggestion of args.suggestions) {
      const existing = await ctx.db
        .query('aiClassificationSuggestions')
        .withIndex('by_jobId_and_groupId', (q) =>
          q.eq('jobId', job._id).eq('groupId', suggestion.groupId),
        )
        .unique();
      const record = {
        ownerId: job.ownerId,
        jobId: job._id,
        groupId: suggestion.groupId,
        groupKey: suggestion.groupKey,
        sanitizedDescription: suggestion.sanitizedDescription,
        source: suggestion.source,
        ...(suggestion.manualReviewReason
          ? { manualReviewReason: suggestion.manualReviewReason }
          : {}),
        suggestedCategoryId: suggestion.suggestedCategoryId,
        evidence: suggestion.evidence,
        uncertainty: suggestion.uncertainty,
        status: 'pending' as const,
        createdAt: existing?.createdAt ?? now,
      };

      if (existing) {
        await ctx.db.replace('aiClassificationSuggestions', existing._id, record);
      } else {
        await ctx.db.insert('aiClassificationSuggestions', record);
      }
    }

    const manualReviewCount = args.suggestions.filter(
      (suggestion) => suggestion.source === 'manual_review',
    ).length;
    const suggestedCount = args.suggestions.filter(
      (suggestion) => suggestion.suggestedCategoryId !== null,
    ).length;
    const abstainedCount = args.suggestions.filter(
      (suggestion) =>
        suggestion.source === 'model' &&
        suggestion.suggestedCategoryId === null,
    ).length;
    const completedAt = args.suggestions.length === 0 ? now : undefined;
    await ctx.db.patch('aiClassificationJobs', job._id, {
      status:
        args.suggestions.length === 0 ? 'completed' : 'needs_review',
      modelCallCount: job.modelCallCount + args.modelCallCount,
      manualReviewCount,
      suggestedCount,
      abstainedCount,
      rejectedCount: 0,
      updatedAt: now,
      completedAt,
      ...(args.metadata.responseId
        ? { responseId: args.metadata.responseId }
        : {}),
      ...(args.metadata.inputTokens !== null
        ? { inputTokens: args.metadata.inputTokens }
        : {}),
      ...(args.metadata.outputTokens !== null
        ? { outputTokens: args.metadata.outputTokens }
        : {}),
      ...(args.metadata.totalTokens !== null
        ? { totalTokens: args.metadata.totalTokens }
        : {}),
      ...(args.metadata.latencyMs !== null
        ? { latencyMs: args.metadata.latencyMs }
        : {}),
      ...(args.metadata.estimatedCostInUsdMicros !== null
        ? {
            estimatedCostInUsdMicros:
              args.metadata.estimatedCostInUsdMicros,
          }
        : {}),
      ...(args.metadata.pricingVersion
        ? { pricingVersion: args.metadata.pricingVersion }
        : {}),
    });

    return null;
  },
});

export const failAction = internalMutation({
  args: {
    jobId: v.id('aiClassificationJobs'),
    errorCode: v.string(),
    retryable: v.boolean(),
    modelCallCount: v.optional(v.number()),
    metadata: v.optional(
      v.object({
        responseId: v.union(v.string(), v.null()),
        inputTokens: v.union(v.number(), v.null()),
        outputTokens: v.union(v.number(), v.null()),
        totalTokens: v.union(v.number(), v.null()),
        latencyMs: v.union(v.number(), v.null()),
        estimatedCostInUsdMicros: v.union(v.number(), v.null()),
        pricingVersion: v.union(
          v.literal('openai-standard-2026-07-19'),
          v.null(),
        ),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get('aiClassificationJobs', args.jobId);
    if (!job || (job.status !== 'running' && job.status !== 'queued')) {
      return null;
    }
    const now = Date.now();
    await ctx.db.patch('aiClassificationJobs', job._id, {
      status: 'failed',
      errorCode: args.errorCode,
      retryable: args.retryable,
      rejectedCount: Math.max(
        0,
        job.totalGroupCount - job.resolvedByRuleCount,
      ),
      modelCallCount: job.modelCallCount + (args.modelCallCount ?? 0),
      updatedAt: now,
      completedAt: now,
      ...(args.metadata?.responseId
        ? { responseId: args.metadata.responseId }
        : {}),
      ...(args.metadata?.inputTokens !== null &&
      args.metadata?.inputTokens !== undefined
        ? { inputTokens: args.metadata.inputTokens }
        : {}),
      ...(args.metadata?.outputTokens !== null &&
      args.metadata?.outputTokens !== undefined
        ? { outputTokens: args.metadata.outputTokens }
        : {}),
      ...(args.metadata?.totalTokens !== null &&
      args.metadata?.totalTokens !== undefined
        ? { totalTokens: args.metadata.totalTokens }
        : {}),
      ...(args.metadata?.latencyMs !== null &&
      args.metadata?.latencyMs !== undefined
        ? { latencyMs: args.metadata.latencyMs }
        : {}),
      ...(args.metadata?.estimatedCostInUsdMicros !== null &&
      args.metadata?.estimatedCostInUsdMicros !== undefined
        ? {
            estimatedCostInUsdMicros:
              args.metadata.estimatedCostInUsdMicros,
          }
        : {}),
      ...(args.metadata?.pricingVersion
        ? { pricingVersion: args.metadata.pricingVersion }
        : {}),
    });
    return null;
  },
});

function configuredAdapter(): 'openai' | 'fake' {
  const value = env.AI_CLASSIFICATION_ADAPTER?.trim();
  if (!value || value === 'openai') return 'openai';
  if (value === 'fake') return 'fake';
  throw new ConvexError({ code: 'AI_CLASSIFICATION_ADAPTER_INVALID' });
}

function configuredModel(): string {
  const value = env.OPENAI_CLASSIFICATION_MODEL?.trim();
  if (!value || value.length > 100) {
    throw new ConvexError({
      code: 'AI_CLASSIFICATION_MODEL_NOT_CONFIGURED',
    });
  }
  return value;
}

function validateCompetence(value: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new ConvexError({ code: 'INVALID_COMPETENCE' });
  }
}

function validateReviewDecision(
  suggestion: Doc<'aiClassificationSuggestions'>,
  decision: 'confirm' | 'correct' | 'abstain',
  categoryId: Doc<'aiClassificationSuggestions'>['suggestedCategoryId'],
): void {
  if (decision === 'abstain') {
    if (categoryId !== null) {
      throw new ConvexError({ code: 'CLASSIFICATION_CATEGORY_NOT_ALLOWED' });
    }
    return;
  }

  if (categoryId === null) {
    throw new ConvexError({ code: 'CLASSIFICATION_CATEGORY_REQUIRED' });
  }

  if (
    decision === 'confirm' &&
    (suggestion.suggestedCategoryId === null ||
      categoryId !== suggestion.suggestedCategoryId)
  ) {
    throw new ConvexError({
      code: 'CLASSIFICATION_CONFIRMATION_MISMATCH',
    });
  }
}

async function upsertClassificationRule(
  ctx: MutationCtx,
  ownerId: string,
  groupKey: string,
  categoryId: Doc<'classificationRules'>['categoryId'],
  now: number,
): Promise<Id<'classificationRules'>> {
  const existing = await ctx.db
    .query('classificationRules')
    .withIndex('by_ownerId_and_groupKey', (q) =>
      q.eq('ownerId', ownerId).eq('groupKey', groupKey),
    )
    .unique();

  if (existing?.categoryId === categoryId) {
    return existing._id;
  }

  const revisionNumber = (existing?.revisionNumber ?? 0n) + 1n;
  const snapshot = {
    groupKey,
    categoryId,
    taxonomyVersion: CLASSIFICATION_TAXONOMY_VERSION,
    ruleVersion: CLASSIFICATION_RULE_VERSION,
    confirmedAt: existing?.confirmedAt ?? now,
    updatedAt: now,
  };
  const ruleId =
    existing?._id ??
    (await ctx.db.insert('classificationRules', {
      ownerId,
      ...snapshot,
      revisionNumber,
    }));
  const revisionId = await ctx.db.insert('classificationRuleRevisions', {
    ownerId,
    ruleId,
    revisionNumber,
    reason: existing ? 'updated' : 'created',
    snapshot,
    recordedAt: now,
  });

  if (existing) {
    await ctx.db.replace('classificationRules', existing._id, {
      ownerId,
      ...snapshot,
      revisionNumber,
      currentRevisionId: revisionId,
    });
  } else {
    await ctx.db.patch('classificationRules', ruleId, {
      currentRevisionId: revisionId,
    });
  }
  await ctx.db.insert('auditEvents', {
    ownerId,
    action: 'classification_rule.upserted',
    targetType: 'classification_rule',
    targetId: ruleId,
    revisionId,
    result: 'succeeded',
    occurredAt: now,
  });

  return ruleId;
}

async function completeJobWhenReviewFinished(
  ctx: MutationCtx,
  ownerId: string,
  jobId: Id<'aiClassificationJobs'>,
  now: number,
): Promise<void> {
  const suggestions = await ctx.db
    .query('aiClassificationSuggestions')
    .withIndex('by_ownerId_and_jobId', (q) =>
      q.eq('ownerId', ownerId).eq('jobId', jobId),
    )
    .take(MAX_SUGGESTIONS_PER_JOB + 1);

  if (
    suggestions.length <= MAX_SUGGESTIONS_PER_JOB &&
    suggestions.every((suggestion) => suggestion.status !== 'pending')
  ) {
    await ctx.db.patch('aiClassificationJobs', jobId, {
      status: 'completed',
      updatedAt: now,
      completedAt: now,
    });
  }
}

function toJobSummary(job: Doc<'aiClassificationJobs'>) {
  return {
    jobId: job._id,
    competence: job.competence,
    status: job.status,
    adapter: job.adapter,
    model: job.model,
    attemptCount: job.attemptCount,
    modelCallCount: job.modelCallCount,
    totalGroupCount: job.totalGroupCount,
    resolvedByRuleCount: job.resolvedByRuleCount,
    manualReviewCount: job.manualReviewCount,
    suggestedCount: job.suggestedCount,
    abstainedCount: job.abstainedCount,
    rejectedCount: job.rejectedCount,
    requestedAt: job.requestedAt,
    updatedAt: job.updatedAt,
    inputTokens: job.inputTokens ?? null,
    outputTokens: job.outputTokens ?? null,
    totalTokens: job.totalTokens ?? null,
    latencyMs: job.latencyMs ?? null,
    estimatedCostInUsdMicros: job.estimatedCostInUsdMicros ?? null,
    errorCode: job.errorCode ?? null,
    retryable: job.retryable ?? null,
  };
}
