import { describe, expect, it } from 'vitest';

import {
  creditCardSpendingCompetence,
  creditCardStatementMatchesSpendingCompetence,
} from './credit-card-competence';

describe('credit card competence', () => {
  it('maps the payment month to the previous spending month', () => {
    expect(creditCardSpendingCompetence('2026-07')).toBe('2026-06');
    expect(
      creditCardStatementMatchesSpendingCompetence('2026-07', '2026-06'),
    ).toBe(true);
  });

  it('crosses the year boundary', () => {
    expect(creditCardSpendingCompetence('2026-01')).toBe('2025-12');
  });

  it('rejects absent or invalid source competences', () => {
    expect(creditCardSpendingCompetence(null)).toBeNull();
    expect(creditCardSpendingCompetence('2026-13')).toBeNull();
    expect(
      creditCardStatementMatchesSpendingCompetence('invalid', '2026-06'),
    ).toBe(false);
  });
});
