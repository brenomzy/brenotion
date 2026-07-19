import { describe, expect, it } from 'vitest';

import {
  buildReportedExpenseListItems,
  EMPTY_FINANCIAL_CYCLE_FORM,
  EMPTY_REPORTED_EXPENSE_FORM,
  expenseToFormValues,
  validateFinancialCycleForm,
  validateReportedExpenseForm,
  type ReportedExpense,
} from './reported-expenses-presentation-model';

describe('reported expenses presentation model', () => {
  it('keeps cycle and financial choices empty until the owner provides them', () => {
    expect(EMPTY_FINANCIAL_CYCLE_FORM).toEqual({
      startedOn: '',
      expectedNextReceiptOn: '',
    });
    expect(EMPTY_REPORTED_EXPENSE_FORM).toEqual({
      amount: '',
      description: '',
      occurredOn: '',
      economicNature: '',
      sourcePatrimony: '',
    });
    expect(
      validateFinancialCycleForm(EMPTY_FINANCIAL_CYCLE_FORM).status,
    ).toBe('invalid');
    expect(
      validateReportedExpenseForm(EMPTY_REPORTED_EXPENSE_FORM).status,
    ).toBe('invalid');
  });

  it('validates an explicit cycle and requires the next receipt after its start', () => {
    expect(
      validateFinancialCycleForm({
        startedOn: '2026-07-10',
        expectedNextReceiptOn: '2026-07-10',
      }),
    ).toEqual({
      status: 'invalid',
      errors: {
        expectedNextReceiptOn:
          'O próximo recebimento deve ocorrer depois do início do ciclo.',
      },
    });
    expect(
      validateFinancialCycleForm({
        startedOn: '2026-07-10',
        expectedNextReceiptOn: '2026-08-10',
      }),
    ).toMatchObject({ status: 'valid' });
  });

  it('parses explicit expense data without deriving nature or patrimony', () => {
    expect(
      validateReportedExpenseForm({
        amount: '1.234,56',
        description: '  Compra   informada ',
        occurredOn: '2026-07-19',
        economicNature: 'personal',
        sourcePatrimony: 'business',
      }),
    ).toEqual({
      status: 'valid',
      errors: {},
      value: {
        amount: {
          amountInMinorUnits: 123_456n,
          currency: 'BRL',
          minorUnit: 'cent',
        },
        description: 'Compra informada',
        occurredOn: '2026-07-19',
        economicNature: 'personal',
        sourcePatrimony: 'business',
      },
    });
  });

  it('presents provisional, reconciled and voided expenses honestly', () => {
    const items = buildReportedExpenseListItems([
      expense({ id: 'voided', status: 'voided', occurredOn: '2026-07-17' }),
      expense({
        id: 'reconciled',
        status: 'reconciled',
        occurredOn: '2026-07-18',
      }),
      expense({
        id: 'provisional',
        status: 'provisional',
        occurredOn: '2026-07-19',
      }),
    ]);

    expect(items.map((item) => item.statusLabel)).toEqual([
      'Provisório',
      'Conciliado',
      'Anulado',
    ]);
    expect(items[0]).toMatchObject({
      canEdit: true,
      canVoid: true,
      canReconcile: true,
    });
    expect(items[1]).toMatchObject({
      canEdit: false,
      canVoid: false,
      canReconcile: false,
    });
  });

  it('prefills edit values only from the explicitly selected expense', () => {
    expect(
      expenseToFormValues(
        expense({
          amountInMinorUnits: 12_345n,
          economicNature: 'business',
          sourcePatrimony: 'needsConfirmation',
        }),
      ),
    ).toMatchObject({
      amount: '123,45',
      economicNature: 'business',
      sourcePatrimony: 'needsConfirmation',
    });
  });
});

function expense(
  overrides: {
    id?: string;
    status?: ReportedExpense['status'];
    occurredOn?: string;
    amountInMinorUnits?: bigint;
    economicNature?: ReportedExpense['economicNature'];
    sourcePatrimony?: ReportedExpense['sourcePatrimony'];
  } = {},
): ReportedExpense {
  return {
    reportedExpenseId: overrides.id ?? 'expense',
    financialCycleId: 'cycle',
    amount: {
      amountInMinorUnits: overrides.amountInMinorUnits ?? 1_000n,
      currency: 'BRL',
      minorUnit: 'cent',
    },
    description: 'Synthetic expense',
    occurredOn: overrides.occurredOn ?? '2026-07-19',
    economicNature: overrides.economicNature ?? 'personal',
    sourcePatrimony: overrides.sourcePatrimony ?? 'personal',
    status: overrides.status ?? 'provisional',
    createdAt: 1,
    updatedAt: 1,
  };
}
