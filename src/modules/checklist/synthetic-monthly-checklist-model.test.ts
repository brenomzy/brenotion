import { describe, expect, it } from 'vitest';

import {
  actionsForSyntheticChecklistStatus,
  applySyntheticChecklistAction,
  SYNTHETIC_CHECKLIST_ITEMS,
} from './synthetic-monthly-checklist-model';

describe('synthetic monthly checklist model', () => {
  it('keeps the demonstration dataset explicitly synthetic and varied', () => {
    expect(SYNTHETIC_CHECKLIST_ITEMS).toHaveLength(6);
    expect(
      new Set(SYNTHETIC_CHECKLIST_ITEMS.map((item) => item.status)),
    ).toEqual(
      new Set(['pending', 'needsAttention', 'completed', 'waived']),
    );
  });

  it('supports the complete, skip-this-month and reopen demonstration flow', () => {
    const pending = SYNTHETIC_CHECKLIST_ITEMS.find(
      (item) => item.status === 'pending',
    );

    expect(pending).toBeDefined();
    expect(actionsForSyntheticChecklistStatus('pending')).toEqual([
      'complete',
      'waive',
    ]);
    expect(
      applySyntheticChecklistAction(pending!, 'complete').status,
    ).toBe('completed');
    expect(applySyntheticChecklistAction(pending!, 'waive').status).toBe(
      'waived',
    );
    expect(
      applySyntheticChecklistAction(
        { ...pending!, status: 'completed' },
        'reopen',
      ).status,
    ).toBe('pending');
  });
});

