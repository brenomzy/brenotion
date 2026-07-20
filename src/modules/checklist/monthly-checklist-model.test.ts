import { describe, expect, it } from 'vitest';

import {
  actionsForChecklistStatus,
  buildMonthlyChecklistProgress,
} from './monthly-checklist-model';

describe('monthly checklist model', () => {
  it('counts completed and waived items as resolved without conflating their evidence', () => {
    expect(
      buildMonthlyChecklistProgress([
        { status: 'pending' },
        { status: 'needsAttention' },
        { status: 'completed' },
        { status: 'waived' },
      ]),
    ).toEqual({
      total: 4,
      resolved: 2,
      remaining: 2,
      percentage: 50,
      label: '2 de 4 itens resolvidos',
    });
  });

  it('offers direct actions only while an item is unresolved', () => {
    expect(actionsForChecklistStatus('pending')).toEqual([
      'complete',
      'waive',
    ]);
    expect(actionsForChecklistStatus('needsAttention')).toEqual([
      'complete',
      'waive',
    ]);
    expect(actionsForChecklistStatus('completed')).toEqual(['reopen']);
    expect(actionsForChecklistStatus('waived')).toEqual(['reopen']);
  });

  it('returns an honest empty progress state', () => {
    expect(buildMonthlyChecklistProgress([])).toEqual({
      total: 0,
      resolved: 0,
      remaining: 0,
      percentage: 0,
      label: 'Nenhum item neste mês',
    });
  });
});
