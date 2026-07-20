import { describe, expect, it } from 'vitest';

import {
  getCardSettlementDayDistance,
  isCardSettlementCandidate,
  shiftIsoDate,
} from './cardSettlementReconciliation';

const statementPayment = {
  postedOn: '2026-07-12',
  amountInMinorUnits: 50_000n,
  transactionType: 'statementPayment',
  sourceAccountKind: 'creditCard' as const,
};

describe('card settlement reconciliation rules', () => {
  it('accepts only an exact opposite bank debit within seven calendar days', () => {
    expect(
      isCardSettlementCandidate(statementPayment, {
        postedOn: '2026-07-15',
        amountInMinorUnits: -50_000n,
        transactionType: 'DEBIT',
        sourceAccountKind: 'bankAccount',
      }),
    ).toBe(true);
    expect(
      isCardSettlementCandidate(statementPayment, {
        postedOn: '2026-07-15',
        amountInMinorUnits: -49_999n,
        transactionType: 'DEBIT',
        sourceAccountKind: 'bankAccount',
      }),
    ).toBe(false);
    expect(
      isCardSettlementCandidate(statementPayment, {
        postedOn: '2026-07-20',
        amountInMinorUnits: -50_000n,
        transactionType: 'DEBIT',
        sourceAccountKind: 'bankAccount',
      }),
    ).toBe(false);
  });

  it('treats dates symmetrically and shifts across month boundaries', () => {
    expect(getCardSettlementDayDistance('2026-07-02', '2026-06-29')).toBe(3);
    expect(shiftIsoDate('2026-07-02', -7)).toBe('2026-06-25');
    expect(shiftIsoDate('2026-07-28', 7)).toBe('2026-08-04');
  });
});
