import { useMutation, useQuery } from 'convex/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { ClassificationCategoryId } from '../../../shared/ai-classification';
import {
  shouldRequestMonthlyClassification,
  type MonthlyClassificationLocalStatus,
} from './monthly-classification-request-policy';

export function useMonthlyClassificationReview(competence: string | null) {
  const coverage = useQuery(
    api.monthlyImportCoverage.get,
    competence ? { competence } : 'skip',
  );
  const review = useQuery(
    api.aiClassification.getMonthlyClassificationReview,
    competence ? { competence } : 'skip',
  );
  const requestClassification = useMutation(
    api.aiClassification.requestMonthlyClassification,
  );
  const persistReview = useMutation(api.aiClassification.reviewSuggestion);
  const requestedCompetenceRef = useRef<string | null>(null);
  const [localStatus, setLocalStatus] =
    useState<MonthlyClassificationLocalStatus>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [savingSuggestionId, setSavingSuggestionId] =
    useState<Id<'aiClassificationSuggestions'> | null>(null);

  const request = useCallback(async () => {
    if (!competence || coverage?.complete !== true) return;
    setLocalStatus('requesting');
    setErrorCode(null);

    try {
      await requestClassification({ competence });
      requestedCompetenceRef.current = competence;
      setLocalStatus(null);
    } catch (error) {
      setErrorCode(classificationErrorCode(error));
      setLocalStatus('error');
    }
  }, [competence, coverage?.complete, requestClassification]);

  useEffect(() => {
    if (
      shouldRequestMonthlyClassification({
        competence,
        coverageComplete: coverage?.complete === true,
        reviewLoaded: review !== undefined,
        hasJob: review?.job !== null && review?.job !== undefined,
        requestedCompetence: requestedCompetenceRef.current,
        localStatus,
      })
    ) {
      requestedCompetenceRef.current = competence;
      void request();
    }
  }, [competence, coverage?.complete, localStatus, request, review]);

  const decide = useCallback(
    async (
      suggestionId: Id<'aiClassificationSuggestions'>,
      decision: 'confirm' | 'correct' | 'abstain',
      categoryId: ClassificationCategoryId | null,
    ) => {
      setSavingSuggestionId(suggestionId);
      setLocalStatus('saving');
      setErrorCode(null);

      try {
        await persistReview({ suggestionId, decision, categoryId });
        setSavingSuggestionId(null);
        setLocalStatus(null);
      } catch (error) {
        setErrorCode(classificationErrorCode(error));
        setSavingSuggestionId(null);
        setLocalStatus('error');
      }
    },
    [persistReview],
  );

  const pendingSuggestions = useMemo(
    () =>
      review?.suggestions.filter(
        (suggestion) => suggestion.status === 'pending',
      ) ?? [],
    [review?.suggestions],
  );

  return {
    competence,
    coverageComplete: coverage?.complete === true,
    review,
    pendingSuggestions,
    isLoading:
      competence !== null &&
      (coverage === undefined ||
        review === undefined ||
        localStatus === 'requesting'),
    isSaving: localStatus === 'saving',
    savingSuggestionId,
    localErrorCode: errorCode,
    canContinue: review?.job?.status === 'completed',
    request,
    decide,
  };
}

export type MonthlyClassificationReviewSource = ReturnType<
  typeof useMonthlyClassificationReview
>;

function classificationErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null && 'code' in data) {
      const code = (data as { code?: unknown }).code;
      if (typeof code === 'string') return code;
    }
  }

  if (error instanceof Error) {
    const match = /[A-Z][A-Z_]+/u.exec(error.message);
    if (match) return match[0];
  }

  return 'CLASSIFICATION_REQUEST_FAILED';
}
