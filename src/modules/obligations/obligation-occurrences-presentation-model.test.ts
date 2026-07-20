import { describe, expect, it } from 'vitest';

import type { Id } from '../../../convex/_generated/dataModel';
import {
  buildObligationOccurrenceListItems,
  currentOccurrenceCompetence,
  formatOccurrenceCompetence,
  shiftOccurrenceCompetence,
  WAIVER_REASON_OPTIONS,
  type ObligationOccurrence,
} from './obligation-occurrences-presentation-model';

describe('obligation occurrence presentation model', () => {
  it('presents status, due date, separation of nature and origin, and allowed actions', () => {
    const [item] = buildObligationOccurrenceListItems([
      occurrence({
        status: 'pending',
        economicNature: 'personal',
        paymentOrigin: 'business',
        dueOn: '2026-07-12',
        expectedAmount: {
          amountInMinorUnits: 12_345n,
          currency: 'BRL',
          minorUnit: 'cent',
        },
      }),
    ]);

    expect(item).toMatchObject({
      statusLabel: 'Pendente',
      dueLabel: 'Vence em 12 de jul de 2026',
      economicNatureLabel: 'Pessoal',
      paymentOriginLabel: 'Empresa',
      expectedAmountLabel: 'R$ 123,45',
      actions: ['complete', 'markNeedsAttention', 'waive'],
    });
  });

  it('orders attention first and exposes only reopen for terminal states', () => {
    const items = buildObligationOccurrenceListItems([
      occurrence({ id: 'completed', status: 'completed' }),
      occurrence({ id: 'waived', status: 'waived' }),
      occurrence({ id: 'attention', status: 'needsAttention' }),
    ]);

    expect(items.map((item) => item.id)).toEqual([
      'attention',
      'completed',
      'waived',
    ]);
    expect(items[1].actions).toEqual(['reopen']);
    expect(items[2].actions).toEqual(['reopen']);
  });

  it('defines structured waiver reasons and navigates competence in São Paulo', () => {
    expect(WAIVER_REASON_OPTIONS.map((option) => option.value)).toEqual([
      'notDueThisCompetence',
      'cancelledForCompetence',
      'duplicateOccurrence',
    ]);
    expect(
      currentOccurrenceCompetence(new Date('2026-08-01T01:30:00.000Z')),
    ).toBe('2026-07');
    expect(shiftOccurrenceCompetence('2026-01', -1)).toBe('2025-12');
    expect(formatOccurrenceCompetence('2026-07')).toBe('julho de 2026');
  });
});

function occurrence(
  overrides: Partial<ObligationOccurrence> & { id?: string } = {},
): ObligationOccurrence {
  const { id = 'occurrence', ...occurrenceOverrides } = overrides;
  return {
    occurrenceId: id as Id<'obligationOccurrences'>,
    obligationId: 'obligation' as Id<'obligations'>,
    competence: '2026-07',
    name: id,
    economicNature: 'personal',
    paymentOrigin: 'personal',
    status: 'pending',
    ...occurrenceOverrides,
  };
}
