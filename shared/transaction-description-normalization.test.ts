import { describe, expect, it } from 'vitest';

import {
  normalizeTransactionDescription,
  parseTransactionDescriptionGroupKey,
} from './transaction-description-normalization';

describe('transaction description group key contract', () => {
  it('parses the same canonical identity produced by normalization', () => {
    const normalized = normalizeTransactionDescription({
      description: 'Café Central',
      metadata: {
        transactionType: 'Debit',
        sourceKind: 'Bank Account',
      },
    });

    expect(parseTransactionDescriptionGroupKey(normalized.groupKey)).toEqual({
      transactionType: 'debit',
      sourceKind: 'bank account',
      groupingBasis: 'normalized-description',
      groupingText: 'cafe central',
    });
  });

  it('rejects non-canonical encoded dimensions', () => {
    expect(
      parseTransactionDescriptionGroupKey(
        'description-v1|transaction-type=%64ebit|source-kind=|basis=normalized-description|description=merchant',
      ),
    ).toBeNull();
  });

  it('rejects dimensions that bypass normalization', () => {
    expect(
      parseTransactionDescriptionGroupKey(
        'description-v1|transaction-type=Debit|source-kind=|basis=normalized-description|description=merchant',
      ),
    ).toBeNull();
  });
});
