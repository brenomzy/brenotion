import { describe, expect, it } from 'vitest';

import {
  ItauCreditCardXlsxParseError,
  parseItauCreditCardStatementRows,
} from './itauCreditCardStatement';

describe('parseItauCreditCardStatementRows', () => {
  it('separates statement metadata, purchases, credits, payment and installments', () => {
    const parsed = parseItauCreditCardStatementRows(syntheticRows());

    expect(parsed).toMatchObject({
      statementTitle: 'Fatura Paga - Julho/2026',
      statementCompetence: '2026-07',
      statementDueOn: '2026-07-12',
      statementTotalInMinorUnits: 34_455n,
      periodStart: '2026-04-15',
      periodEnd: '2026-07-05',
      debitTotalInMinorUnits: 39_455n,
      creditTotalInMinorUnits: 55_000n,
      purchaseTotalInMinorUnits: 39_455n,
      creditAdjustmentTotalInMinorUnits: 5_000n,
      settlementTotalInMinorUnits: 50_000n,
    });
    expect(parsed.transactions).toEqual([
      {
        sequence: 0,
        postedOn: '2026-06-02',
        amountInMinorUnits: -12_345n,
        description: 'Mercado Sintético',
        transactionType: 'purchase',
        installmentCurrent: null,
        installmentTotal: null,
      },
      {
        sequence: 1,
        postedOn: '2026-04-15',
        amountInMinorUnits: -20_000n,
        description: 'Curso Sintético',
        transactionType: 'purchase',
        installmentCurrent: 2,
        installmentTotal: 4,
      },
      {
        sequence: 2,
        postedOn: '2026-06-20',
        amountInMinorUnits: 5_000n,
        description: 'Estorno Sintético',
        transactionType: 'creditAdjustment',
        installmentCurrent: null,
        installmentTotal: null,
      },
      {
        sequence: 3,
        postedOn: '2026-07-05',
        amountInMinorUnits: 50_000n,
        description: 'Pagamento Efetuado',
        transactionType: 'statementPayment',
        installmentCurrent: null,
        installmentTotal: null,
      },
      {
        sequence: 4,
        postedOn: '2026-06-28',
        amountInMinorUnits: -7_110n,
        description: 'Farmácia Sintética',
        transactionType: 'purchase',
        installmentCurrent: null,
        installmentTotal: null,
      },
    ]);
  });

  it('tolerates binary float noise below one ten-millionth before exact minor units', () => {
    const rows = syntheticRows();
    rows[14][4] = 123.45000004;
    rows[9][6] = 344.55000004;

    const parsed = parseItauCreditCardStatementRows(rows);

    expect(parsed.statementTotalInMinorUnits).toBe(34_455n);
    expect(parsed.transactions[0].amountInMinorUnits).toBe(-12_345n);
  });

  it('rejects a real subcent value', () => {
    const rows = syntheticRows();
    rows[14][4] = 123.451;

    expect(() => parseItauCreditCardStatementRows(rows)).toThrowError(
      expect.objectContaining<Partial<ItauCreditCardXlsxParseError>>({
        code: 'XLSX_SUBCENT_VALUE',
      }),
    );
  });

  it('reconciles only statement components and rejects a mismatched total', () => {
    const rows = syntheticRows();
    rows[9][6] = 844.55;

    expect(() => parseItauCreditCardStatementRows(rows)).toThrowError(
      expect.objectContaining<Partial<ItauCreditCardXlsxParseError>>({
        code: 'XLSX_TOTAL_MISMATCH',
      }),
    );
  });

  it('rejects malformed installment metadata', () => {
    const rows = syntheticRows();
    rows[15][3] = 'Parcela 5 de 4';

    expect(() => parseItauCreditCardStatementRows(rows)).toThrowError(
      expect.objectContaining<Partial<ItauCreditCardXlsxParseError>>({
        code: 'XLSX_INVALID_TRANSACTION',
      }),
    );
  });
});

function syntheticRows(): unknown[][] {
  const rows = Array.from({ length: 20 }, () => Array<unknown>(10).fill(null));
  rows[7][1] = 'Fatura Paga - Julho/2026';
  rows[8][6] = 'Total da fatura';
  rows[8][8] = 'Vencimento';
  rows[9][6] = 344.55;
  rows[9][8] = new Date(Date.UTC(2026, 6, 12));
  rows[13] = [
    null,
    'Data',
    'Lançamento',
    'Parcelamento',
    'Valor',
    null,
    'Titularidade',
    'Nome',
    'Tipo do cartão',
    'Número do cartão',
  ];
  rows[14] = transactionRow('2026-06-02', 'Mercado Sintético', null, 123.45);
  rows[15] = transactionRow('2026-04-15', 'Curso Sintético', 'Parcela 2 de 4', 200);
  rows[16] = transactionRow('2026-06-20', 'Estorno Sintético', null, -50);
  rows[17] = transactionRow('2026-07-05', 'Pagamento Efetuado', null, -500);
  rows[18] = transactionRow('2026-06-28', 'Farmácia Sintética', null, 71.1);
  return rows;
}

function transactionRow(
  postedOn: string,
  description: string,
  installment: string | null,
  amount: number,
): unknown[] {
  return [
    null,
    new Date(`${postedOn}T00:00:00.000Z`),
    description,
    installment,
    amount,
    null,
    'IGNORED OWNER',
    'IGNORED NAME',
    'IGNORED TYPE',
    '0000',
  ];
}
