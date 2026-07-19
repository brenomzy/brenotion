import { describe, expect, test } from 'vitest';

import {
  buildMonthlyImportCoverageView,
  currentCompetence,
  formatCompetenceLabel,
  shiftCompetence,
  type MonthlyImportCoverage,
} from './monthly-import-coverage-model';

function coverage(
  statuses: MonthlyImportCoverage['sources'][number]['status'][],
): MonthlyImportCoverage {
  return {
    competence: '2026-07',
    complete: statuses.every((status) => status === 'confirmed'),
    isSearchExhaustive: true,
    sources: [
      {
        source: 'personalBank',
        expectedFormat: 'ofx',
        expectedSourcePatrimony: 'personal',
        status: statuses[0],
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        statementCompetence: null,
        transactionCount: 12,
        importedAt: statuses[0] === 'confirmed' ? 1 : null,
      },
      {
        source: 'creditCard',
        expectedFormat: 'itauCreditCardXlsx',
        expectedSourcePatrimony: 'personal',
        status: statuses[1],
        periodStart: '2026-06-20',
        periodEnd: '2026-07-19',
        statementCompetence: '2026-07',
        transactionCount: 1,
        importedAt: statuses[1] === 'confirmed' ? 2 : null,
      },
      {
        source: 'businessBank',
        expectedFormat: 'ofx',
        expectedSourcePatrimony: 'business',
        status: statuses[2],
        periodStart: null,
        periodEnd: null,
        statementCompetence: null,
        transactionCount: 0,
        importedAt: statuses[2] === 'confirmed' ? 3 : null,
      },
    ],
  };
}

describe('buildMonthlyImportCoverageView', () => {
  test('keeps the three canonical sources in a stable order', () => {
    const model = buildMonthlyImportCoverageView(
      coverage(['missing', 'confirmed', 'preview']),
    );

    expect(model.items.map((item) => item.source)).toEqual([
      'personalBank',
      'creditCard',
      'businessBank',
    ]);
    expect(model.confirmedCount).toBe(1);
    expect(model.complete).toBe(false);
    expect(model.summary).toContain('1 de 3');
  });

  test('explains confirmed, preview and missing states without financial values', () => {
    const model = buildMonthlyImportCoverageView(
      coverage(['confirmed', 'preview', 'missing']),
    );

    expect(model.items.map((item) => item.statusLabel)).toEqual([
      'Confirmado',
      'Prévia pendente',
      'Pendente',
    ]);
    expect(model.items[0].description).toBe(
      '12 movimentações estruturadas nesta competência.',
    );
    expect(model.items[1].description).toContain('ainda não confirmada');
    expect(model.items[2].description).toContain('Nenhum lote confirmado');
  });

  test('marks the competence complete only when every source is confirmed', () => {
    const model = buildMonthlyImportCoverageView(
      coverage(['confirmed', 'confirmed', 'confirmed']),
    );

    expect(model.complete).toBe(true);
    expect(model.confirmedCount).toBe(3);
    expect(model.summary).toBe(
      'As três fontes desta competência estão confirmadas.',
    );
  });

  test('does not overstate coverage when the bounded search was not exhaustive', () => {
    const input = coverage(['confirmed', 'confirmed', 'confirmed']);
    input.isSearchExhaustive = false;

    const model = buildMonthlyImportCoverageView(input);

    expect(model.summary).toContain('lotes recentes');
    expect(model.summary).toContain('histórico completo ainda não foi verificado');
  });
});

describe('competence helpers', () => {
  test('formats and shifts competences across year boundaries', () => {
    expect(currentCompetence(new Date(2026, 6, 19))).toBe('2026-07');
    expect(shiftCompetence('2026-01', -1)).toBe('2025-12');
    expect(shiftCompetence('2026-12', 1)).toBe('2027-01');
    expect(formatCompetenceLabel('2026-07')).toBe('julho de 2026');
  });

  test('rejects invalid competences', () => {
    expect(() => shiftCompetence('2026-13', 1)).toThrow('INVALID_COMPETENCE');
  });
});
