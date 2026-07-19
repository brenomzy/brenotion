import { describe, expect, it } from 'vitest';

import {
  formatReviewDate,
  formatReviewPeriod,
  getSelectedBatch,
  type ReviewImportBatch,
  type ReviewReadyModel,
} from './review-screen-model';

const batch: ReviewImportBatch = {
  id: 'batch-1',
  periodStart: '2026-06-01',
  periodEnd: '2026-06-30',
  transactionCount: 42,
  duplicateCount: 2,
  insertedCount: 40,
  creditTotal: {
    amountInMinorUnits: 500_000n,
    currency: 'BRL',
    minorUnit: 'cent',
  },
  debitTotal: {
    amountInMinorUnits: 320_000n,
    currency: 'BRL',
    minorUnit: 'cent',
  },
  confirmedAt: Date.UTC(2026, 6, 19, 12),
};

describe('review screen model', () => {
  it('formats imported dates in UTC without shifting the calendar day', () => {
    expect(formatReviewDate('2026-06-01')).toBe('01 de jun de 2026');
  });

  it('formats the complete batch coverage period', () => {
    expect(formatReviewPeriod(batch)).toBe('01 de jun de 2026 – 30 de jun de 2026');
  });

  it('returns an explicit label when the batch has no period', () => {
    expect(formatReviewPeriod({ ...batch, periodStart: null, periodEnd: null })).toBe(
      'Período não informado',
    );
  });

  it('resolves the batch selected by the source adapter', () => {
    const model: ReviewReadyModel = {
      status: 'ready',
      origin: { kind: 'persisted' },
      selectedBatchId: batch.id,
      batches: [batch],
      hasMoreBatches: false,
      isLoadingMoreBatches: false,
      transactions: [],
      isLoadingTransactions: false,
      hasMoreTransactions: false,
      isLoadingMoreTransactions: false,
    };

    expect(getSelectedBatch(model)).toBe(batch);
  });
});
