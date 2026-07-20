import { describe, expect, it } from 'vitest';

import {
  groupSourceTransactions,
  type SourceTransactionForGrouping,
} from './group-source-transactions';

describe('groupSourceTransactions', () => {
  it('groups normalized descriptions and preserves exact group evidence', () => {
    const result = groupSourceTransactions({
      sourceCollectionCompleteness: 'partial',
      transactions: [
        syntheticTransaction({
          id: 'movement-older',
          description:
            '  Mercado   SINTÉTICO 123e4567-e89b-42d3-a456-426614174000 ',
          postedOn: '2026-06-03',
          amountInMinorUnits: -12_345n,
        }),
        syntheticTransaction({
          id: 'movement-newer',
          description:
            'Mercado sintetico 987e6543-e21b-42d3-a456-426614174999',
          postedOn: '2026-06-18',
          amountInMinorUnits: -5_055n,
        }),
      ],
    });

    expect(result.sourceCollectionCompleteness).toBe('partial');
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      representativeDescription:
        'Mercado sintetico 987e6543-e21b-42d3-a456-426614174999',
      normalizedDescription: 'mercado sintetico',
      count: 2,
      transactionIds: ['movement-newer', 'movement-older'],
      firstPostedOn: '2026-06-03',
      lastPostedOn: '2026-06-18',
      creditTotalInMinorUnits: 0n,
      debitTotalInMinorUnits: 17_400n,
      sourceCollectionCompleteness: 'partial',
    });
  });

  it('keeps credit and debit totals exact beyond the safe integer range', () => {
    const result = groupSourceTransactions({
      sourceCollectionCompleteness: 'complete',
      transactions: [
        syntheticTransaction({
          id: 'exact-credit-large',
          description: 'Fluxo Exato Sintético',
          transactionType: 'OTHER',
          amountInMinorUnits: 900_719_925_474_099_312n,
        }),
        syntheticTransaction({
          id: 'exact-credit-small',
          description: 'FLUXO EXATO SINTETICO',
          transactionType: 'OTHER',
          amountInMinorUnits: 88n,
        }),
        syntheticTransaction({
          id: 'exact-debit-large',
          description: 'Fluxo Exato Sintético',
          transactionType: 'OTHER',
          amountInMinorUnits: -900_719_925_474_099_399n,
        }),
        syntheticTransaction({
          id: 'exact-debit-small',
          description: 'Fluxo Exato Sintético',
          transactionType: 'OTHER',
          amountInMinorUnits: -1n,
        }),
      ],
    });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].creditTotalInMinorUnits).toBe(900_719_925_474_099_400n);
    expect(result.groups[0].debitTotalInMinorUnits).toBe(900_719_925_474_099_400n);
    expect(result.groups[0].sourceCollectionCompleteness).toBe('complete');
  });

  it('does not merge meaningful numbers or different grouping metadata', () => {
    const result = groupSourceTransactions({
      sourceCollectionCompleteness: 'complete',
      transactions: [
        syntheticTransaction({
          id: 'plan-30',
          description: 'Plano Sintético 30',
        }),
        syntheticTransaction({
          id: 'plan-60',
          description: 'Plano Sintético 60',
        }),
        syntheticTransaction({
          id: 'plan-30-credit',
          description: 'Plano Sintético 30',
          transactionType: 'CREDIT',
        }),
        syntheticTransaction({
          id: 'plan-30-card',
          description: 'Plano Sintético 30',
          sourceKind: 'credit-card',
        }),
      ],
    });

    expect(result.groups).toHaveLength(4);
    expect(new Set(result.groups.map((group) => group.groupKey)).size).toBe(4);
  });

  it('orders groups and IDs independently of input order', () => {
    const transactions = [
      syntheticTransaction({
        id: 'older',
        description: 'Grupo Antigo Sintético',
        postedOn: '2026-06-01',
      }),
      syntheticTransaction({
        id: 'beta',
        description: 'Beta Sintético',
        postedOn: '2026-06-10',
      }),
      syntheticTransaction({
        id: 'alpha-later-id',
        description: 'Alpha Sintético',
        postedOn: '2026-06-10',
      }),
      syntheticTransaction({
        id: 'alpha-earlier-date',
        description: 'ALPHA SINTETICO',
        postedOn: '2026-06-09',
      }),
      syntheticTransaction({
        id: 'alpha-earlier-id',
        description: 'Alpha Sintético',
        postedOn: '2026-06-10',
      }),
    ];

    const forward = groupSourceTransactions({
      sourceCollectionCompleteness: 'complete',
      transactions,
    });
    const reversed = groupSourceTransactions({
      sourceCollectionCompleteness: 'complete',
      transactions: [...transactions].reverse(),
    });

    expect(forward).toEqual(reversed);
    expect(forward.groups.map((group) => group.normalizedDescription)).toEqual([
      'alpha sintetico',
      'beta sintetico',
      'grupo antigo sintetico',
    ]);
    expect(forward.groups[0].transactionIds).toEqual([
      'alpha-earlier-id',
      'alpha-later-id',
      'alpha-earlier-date',
    ]);
  });

  it('keeps the partial-page marker even when the loaded page is empty', () => {
    expect(
      groupSourceTransactions({
        sourceCollectionCompleteness: 'partial',
        transactions: [],
      }),
    ).toEqual({
      sourceCollectionCompleteness: 'partial',
      groups: [],
    });
  });
});

function syntheticTransaction(
  overrides: Partial<SourceTransactionForGrouping>,
): SourceTransactionForGrouping {
  return {
    id: 'synthetic-movement',
    description: 'Descrição Sintética',
    transactionType: 'DEBIT',
    sourceKind: 'bank-account',
    postedOn: '2026-06-15',
    amountInMinorUnits: -100n,
    ...overrides,
  };
}
