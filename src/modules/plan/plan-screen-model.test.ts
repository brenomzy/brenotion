import { describe, expect, it } from 'vitest';

import { buildOperationalPlanModel } from './plan-screen-model';

describe('operational plan model', () => {
  it('does not invent a plan when there is no open cycle', () => {
    const model = buildOperationalPlanModel({
      cycle: null,
      reportedExpenses: { items: [], isTruncated: false },
    });

    expect(model.status).toBe('noCycle');
    expect(model.cycleTitle).toBe('Ciclo Financeiro ainda não aberto');
    expect(model.expenseSummary.total).toBe(0);
    expect(model.calculation.description).toContain(
      'Disponível para Gastar ainda não foram calculados',
    );
  });

  it('summarizes the persisted cycle without summing financial values', () => {
    const model = buildOperationalPlanModel({
      cycle: {
        financialCycleId: 'cycle-synthetic',
        startedOn: '2026-07-03',
        expectedNextReceiptOn: '2026-08-02',
        timeZone: 'America/Sao_Paulo',
        openedAt: 1,
      },
      reportedExpenses: {
        items: [
          { status: 'provisional', sourcePatrimony: 'needsConfirmation' },
          { status: 'provisional', sourcePatrimony: 'personal' },
          { status: 'reconciled', sourcePatrimony: 'business' },
          { status: 'voided', sourcePatrimony: 'personal' },
        ],
        isTruncated: true,
      },
    });

    expect(model).toMatchObject({
      status: 'active',
      cycleTitle: 'Ciclo de 03 de jul de 2026 a 02 de ago de 2026',
      expenseSummary: {
        total: 3,
        provisional: 2,
        reconciled: 1,
        voided: 1,
        needsSourceConfirmation: 1,
        isTruncated: true,
      },
    });
    expect(model).not.toHaveProperty('availableToSpend');
    expect(model).not.toHaveProperty('limit');
  });
});
