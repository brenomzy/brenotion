import { useMutation, useQuery } from 'convex/react';
import { useCallback, useMemo } from 'react';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  buildObligationOccurrenceListItems,
  type ObligationOccurrence,
  type ObligationOccurrenceWaiverReason,
} from './obligation-occurrences-presentation-model';

export function useObligationOccurrencesSource(competence: string) {
  const result = useQuery(api.obligationOccurrences.listForCompetence, {
    competence,
  });
  const materializeMutation = useMutation(
    api.obligationOccurrences.materializeForCompetence,
  );
  const completeMutation = useMutation(
    api.obligationOccurrences.completeManually,
  );
  const markNeedsAttentionMutation = useMutation(
    api.obligationOccurrences.markNeedsAttention,
  );
  const waiveMutation = useMutation(api.obligationOccurrences.waive);
  const reopenMutation = useMutation(api.obligationOccurrences.reopen);
  const items = useMemo(
    () =>
      buildObligationOccurrenceListItems(
        (result?.items ?? []) as ObligationOccurrence[],
      ),
    [result?.items],
  );

  const materialize = useCallback(
    () => materializeMutation({ competence }),
    [competence, materializeMutation],
  );
  const complete = useCallback(
    (occurrenceId: Id<'obligationOccurrences'>) =>
      completeMutation({
        occurrenceId,
        completionKind: 'manualConfirmation',
      }),
    [completeMutation],
  );
  const markNeedsAttention = useCallback(
    (occurrenceId: Id<'obligationOccurrences'>) =>
      markNeedsAttentionMutation({ occurrenceId }),
    [markNeedsAttentionMutation],
  );
  const waive = useCallback(
    (
      occurrenceId: Id<'obligationOccurrences'>,
      waiverReason: ObligationOccurrenceWaiverReason,
    ) => waiveMutation({ occurrenceId, waiverReason }),
    [waiveMutation],
  );
  const reopen = useCallback(
    (occurrenceId: Id<'obligationOccurrences'>) =>
      reopenMutation({ occurrenceId }),
    [reopenMutation],
  );

  return {
    status: result === undefined ? ('loading' as const) : ('ready' as const),
    items,
    isTruncated: result?.isTruncated ?? false,
    materialize,
    complete,
    markNeedsAttention,
    waive,
    reopen,
  };
}
