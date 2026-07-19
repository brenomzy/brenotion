import { describe, expect, it } from 'vitest';

import {
  chunkClassificationGroupKeys,
  collectClassificationQueryResults,
  reconcileRecentlySavedDecisions,
  resolveEconomicNature,
  selectTransactionsForEconomicNature,
  type ReviewClassificationDecision,
} from './review-classification-model';

describe('review classification model', () => {
  it('excludes card settlement while keeping purchases and credit adjustments classifiable', () => {
    const transactions = [
      { id: 'purchase', transactionType: 'purchase' },
      { id: 'credit', transactionType: 'creditAdjustment' },
      { id: 'settlement', transactionType: 'statementPayment' },
      {
        id: 'reconciled-bank-debit',
        transactionType: 'DEBIT',
        cardSettlementRole: 'bankDebit' as const,
      },
    ];

    expect(selectTransactionsForEconomicNature(transactions).map(({ id }) => id)).toEqual([
      'purchase',
      'credit',
    ]);
  });

  it('chunks every loaded group within the backend query limit', () => {
    const groupKeys = Array.from({ length: 205 }, (_, index) => `group-${index}`);

    const batches = chunkClassificationGroupKeys(groupKeys, 100);

    expect(batches.map((batch) => batch.length)).toEqual([100, 100, 5]);
    expect(batches.flat()).toEqual(groupKeys);
  });

  it('keeps an unclassified group without a silent economic nature default', () => {
    expect(resolveEconomicNature('unclassified', new Map(), {})).toBeNull();
  });

  it('collects persisted decisions while another query batch is loading', () => {
    const decision: ReviewClassificationDecision = {
      groupKey: 'group-a',
      normalizedDescription: 'grupo sintetico',
      economicNature: 'business',
      updatedAt: 20,
    };

    const result = collectClassificationQueryResults({
      'batch-0': [decision],
      'batch-1': undefined,
    });

    expect(result.status).toBe('loading');
    expect(result.decisionsByGroupKey.get('group-a')).toEqual(decision);
  });

  it('uses a locally confirmed decision until the reactive query catches up', () => {
    const persisted: ReviewClassificationDecision = {
      groupKey: 'group-a',
      normalizedDescription: 'grupo sintetico',
      economicNature: 'personal',
      updatedAt: 10,
    };

    expect(
      resolveEconomicNature('group-a', new Map([[persisted.groupKey, persisted]]), {
        'group-a': { economicNature: 'business', updatedAt: 20 },
      }),
    ).toBe('business');
  });

  it('reconciles a recent save once Convex publishes the same or a newer state', () => {
    const recent = {
      'group-a': { economicNature: 'personal', updatedAt: 20 },
    } as const;
    const stalePersisted: ReviewClassificationDecision = {
      groupKey: 'group-a',
      normalizedDescription: 'grupo sintetico',
      economicNature: 'business',
      updatedAt: 19,
    };
    const newerPersisted: ReviewClassificationDecision = {
      ...stalePersisted,
      economicNature: 'personal',
      updatedAt: 21,
    };

    expect(
      reconcileRecentlySavedDecisions(
        new Map([[stalePersisted.groupKey, stalePersisted]]),
        recent,
      ),
    ).toEqual(recent);
    expect(
      reconcileRecentlySavedDecisions(
        new Map([[newerPersisted.groupKey, newerPersisted]]),
        recent,
      ),
    ).toEqual({});
  });

  it('turns invalid or failed query responses into an explicit error state', () => {
    expect(
      collectClassificationQueryResults({
        'batch-0': new Error('synthetic failure'),
      }).status,
    ).toBe('error');
    expect(
      collectClassificationQueryResults({
        'batch-0': [{ groupKey: 'group-a', economicNature: 'personal' }],
      }).status,
    ).toBe('error');
  });
});
