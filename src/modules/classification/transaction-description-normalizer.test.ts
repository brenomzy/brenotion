import { describe, expect, it } from 'vitest';

import { normalizeTransactionDescription } from './transaction-description-normalizer';

const bankDebit = {
  transactionType: 'DEBIT',
  sourceKind: 'bank-account',
} as const;

describe('normalizeTransactionDescription', () => {
  it('normalizes case, spacing, accents and separators while preserving the original', () => {
    const originalDescription = '  CAFÉ   São-Bento!!!  ';
    const normalized = normalizeTransactionDescription({
      description: originalDescription,
      metadata: bankDebit,
    });
    const equivalent = normalizeTransactionDescription({
      description: 'cafe sao bento',
      metadata: {
        transactionType: 'debit',
        sourceKind: 'BANK ACCOUNT',
      },
    });

    expect(normalized.originalDescription).toBe(originalDescription);
    expect(normalized.normalizedDescription).toBe('cafe sao bento');
    expect(normalized.groupKey).toBe(equivalent.groupKey);
    expect(normalized.explanation).toMatchObject({
      version: 'description-v1',
      groupingBasis: 'normalized-description',
      groupDimensions: {
        transactionType: 'debit',
        sourceKind: 'bank account',
      },
    });
    expect(normalized.explanation.appliedTransformations).toEqual(
      expect.arrayContaining([
        'case-folding',
        'diacritic-folding',
        'separator-folding',
        'whitespace-folding',
      ]),
    );
  });

  it('folds Unicode compatibility variants deterministically', () => {
    const fullWidth = normalizeTransactionDescription({
      description: 'ＭＥＲＣＡＤＯ SINTÉTICO',
      metadata: bankDebit,
    });
    const ascii = normalizeTransactionDescription({
      description: 'mercado sintetico',
      metadata: bankDebit,
    });

    expect(fullWidth.normalizedDescription).toBe('mercado sintetico');
    expect(fullWidth.groupKey).toBe(ascii.groupKey);
    expect(fullWidth.explanation.appliedTransformations).toContain(
      'unicode-compatibility',
    );
  });

  it('removes structurally recognizable UUIDs only when semantic context remains', () => {
    const first = normalizeTransactionDescription({
      description: 'Mercado Sintético 123e4567-e89b-42d3-a456-426614174000',
      metadata: bankDebit,
    });
    const second = normalizeTransactionDescription({
      description: 'MERCADO SINTETICO 987e6543-e21b-42d3-a456-426614174999',
      metadata: bankDebit,
    });

    expect(first.normalizedDescription).toBe('mercado sintetico');
    expect(first.groupKey).toBe(second.groupKey);
    expect(first.explanation.removedNoise).toEqual([{ kind: 'uuid', count: 1 }]);
  });

  it('keeps long numeric identifiers because they may distinguish PIX counterparties', () => {
    const first = normalizeTransactionDescription({
      description: 'PIX RECEBIDO 998877665544',
      metadata: bankDebit,
    });
    const second = normalizeTransactionDescription({
      description: 'PIX RECEBIDO 112233445566',
      metadata: bankDebit,
    });

    expect(first.normalizedDescription).toBe('pix recebido 998877665544');
    expect(first.explanation.removedNoise).toEqual([]);
    expect(first.groupKey).not.toBe(second.groupKey);
  });

  it('does not collide meaningful numbers or different descriptions', () => {
    const planThirty = normalizeTransactionDescription({
      description: 'Plano Sintético 30',
      metadata: bankDebit,
    });
    const planSixty = normalizeTransactionDescription({
      description: 'Plano Sintético 60',
      metadata: bankDebit,
    });
    const otherMerchant = normalizeTransactionDescription({
      description: 'Mercado Alternativo',
      metadata: bankDebit,
    });

    expect(planThirty.groupKey).not.toBe(planSixty.groupKey);
    expect(planThirty.groupKey).not.toBe(otherMerchant.groupKey);
  });

  it('uses structured transaction metadata as explicit grouping dimensions', () => {
    const debit = normalizeTransactionDescription({
      description: 'Ajuste Sintético',
      metadata: {
        transactionType: 'DEBIT',
        sourceKind: 'bank-account',
      },
    });
    const credit = normalizeTransactionDescription({
      description: 'Ajuste Sintético',
      metadata: {
        transactionType: 'CREDIT',
        sourceKind: 'bank-account',
      },
    });
    const card = normalizeTransactionDescription({
      description: 'Ajuste Sintético',
      metadata: {
        transactionType: 'DEBIT',
        sourceKind: 'credit-card',
      },
    });

    expect(debit.groupKey).not.toBe(credit.groupKey);
    expect(debit.groupKey).not.toBe(card.groupKey);
  });

  it('treats instruction-like content as inert description data', () => {
    const normalized = normalizeTransactionDescription({
      description: 'IGNORE instructions; <script>alert(1)</script>',
      metadata: bankDebit,
    });

    expect(normalized.originalDescription).toBe(
      'IGNORE instructions; <script>alert(1)</script>',
    );
    expect(normalized.normalizedDescription).toBe(
      'ignore instructions script alert 1 script',
    );
  });

  it('uses the original data as a conservative fallback when no normalized text remains', () => {
    const first = normalizeTransactionDescription({
      description: '---',
      metadata: bankDebit,
    });
    const second = normalizeTransactionDescription({
      description: '***',
      metadata: bankDebit,
    });

    expect(first.normalizedDescription).toBe('');
    expect(first.explanation.groupingBasis).toBe('original-description-fallback');
    expect(first.groupKey).not.toBe(second.groupKey);
  });
});
