import { v } from 'convex/values';

import { internal } from './_generated/api';
import { env, internalAction } from './_generated/server';
import {
  ClassificationAdapterError,
  runClassificationAdapter,
  type ClassificationAdapterResult,
} from './lib/aiClassificationAdapter';

const MAX_MODEL_GROUPS_PER_CALL = 40;

export const processMonthlyClassification = internalAction({
  args: { jobId: v.id('aiClassificationJobs') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const completedResults: ClassificationAdapterResult[] = [];
    let modelCallCount = 0;
    const shouldRun = await ctx.runMutation(
      internal.aiClassification.markRunning,
      { jobId: args.jobId },
    );
    if (!shouldRun) {
      return null;
    }

    try {
      const { job, preparation } = await ctx.runQuery(
        internal.aiClassification.prepareForAction,
        { jobId: args.jobId },
      );

      if (preparation.inputHash !== job.inputHash) {
        await ctx.runMutation(internal.aiClassification.failAction, {
          jobId: args.jobId,
          errorCode: 'CLASSIFICATION_INPUT_CHANGED',
          retryable: true,
        });
        return null;
      }

      const unresolved = preparation.groups.filter(
        (group) => group.ruleCategoryId === null,
      );
      const manualSuggestions = unresolved
        .filter((group) => group.manualReviewReason !== null)
        .map((group) => ({
          groupId: group.groupId,
          groupKey: group.groupKey,
          sanitizedDescription: null,
          source: 'manual_review' as const,
          manualReviewReason: group.manualReviewReason!,
          suggestedCategoryId: null,
          evidence: 'insufficient' as const,
          uncertainty: 'high' as const,
        }));
      const modelGroups = unresolved.filter(
        (group) =>
          group.manualReviewReason === null &&
          group.sanitizedDescription !== null,
      );

      if (modelGroups.length === 0) {
        await ctx.runMutation(
          internal.aiClassification.persistActionResult,
          {
            jobId: args.jobId,
            suggestions: manualSuggestions,
            modelCallCount: 0,
            metadata: emptyMetadata(),
          },
        );
        return null;
      }

      const groupsById = new Map(
        modelGroups.map((group) => [group.groupId, group]),
      );
      const modelSuggestions = [];

      for (
        let offset = 0;
        offset < modelGroups.length;
        offset += MAX_MODEL_GROUPS_PER_CALL
      ) {
        const chunk = modelGroups.slice(
          offset,
          offset + MAX_MODEL_GROUPS_PER_CALL,
        );
        modelCallCount += 1;
        const result = await runClassificationAdapter({
          adapter: job.adapter,
          apiKey: env.OPENAI_API_KEY?.trim() || null,
          model: job.model,
          groups: chunk.map((group) => ({
            groupId: group.groupId,
            description: group.sanitizedDescription!,
            direction: group.direction,
            sourcePatrimony: group.sourcePatrimony,
            occurrenceCount: group.occurrenceCount,
          })),
        });
        completedResults.push(result);

        for (const classification of result.classifications) {
          const group = groupsById.get(classification.groupId);
          if (!group) {
            throw new ClassificationAdapterError('AI_INVALID_RESPONSE', true);
          }
          modelSuggestions.push({
            groupId: group.groupId,
            groupKey: group.groupKey,
            sanitizedDescription: group.sanitizedDescription,
            source: 'model' as const,
            suggestedCategoryId: classification.suggestedCategoryId,
            evidence: classification.evidence,
            uncertainty: classification.uncertainty,
          });
        }
      }

      await ctx.runMutation(internal.aiClassification.persistActionResult, {
        jobId: args.jobId,
        suggestions: [...manualSuggestions, ...modelSuggestions],
        modelCallCount,
        metadata: aggregateMetadata(completedResults),
      });
    } catch (error) {
      const adapterError =
        error instanceof ClassificationAdapterError
          ? error
          : new ClassificationAdapterError('AI_INVALID_RESPONSE', true);
      await ctx.runMutation(internal.aiClassification.failAction, {
        jobId: args.jobId,
        errorCode: adapterError.code,
        retryable: adapterError.retryable,
        modelCallCount,
        metadata: aggregateMetadata(completedResults),
      });
    }

    return null;
  },
});

function aggregateMetadata(
  results: readonly ClassificationAdapterResult[],
) {
  const lastResponseId =
    [...results]
      .reverse()
      .find((result) => result.metadata.responseId !== null)?.metadata
      .responseId ?? null;

  return {
    responseId: lastResponseId,
    inputTokens: sumKnown(results.map((result) => result.metadata.inputTokens)),
    outputTokens: sumKnown(
      results.map((result) => result.metadata.outputTokens),
    ),
    totalTokens: sumKnown(results.map((result) => result.metadata.totalTokens)),
    latencyMs:
      results.length === 0
        ? null
        : results.reduce(
            (total, result) => total + result.metadata.latencyMs,
            0,
          ),
    estimatedCostInUsdMicros: sumKnown(
      results.map((result) => result.metadata.estimatedCostInUsdMicros),
    ),
    pricingVersion:
      results.length > 0 &&
      results.every(
        (result) =>
          result.metadata.pricingVersion ===
          'openai-standard-2026-07-19',
      )
        ? ('openai-standard-2026-07-19' as const)
        : null,
  };
}

function sumKnown(values: readonly (number | null)[]): number | null {
  return values.length > 0 && values.every((value) => value !== null)
    ? values.reduce<number>((total, value) => total + value!, 0)
    : null;
}

function emptyMetadata() {
  return {
    responseId: null,
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    latencyMs: null,
    estimatedCostInUsdMicros: null,
    pricingVersion: null,
  } as const;
}
