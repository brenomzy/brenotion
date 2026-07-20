// @vitest-environment node

import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { readItauCreditCardStatementFromXlsx } from './itauCreditCardXlsxAdapter';

const FIXTURE_PATH = new URL(
  '../testFixtures/sanitized/synthetic-itau-credit-card.xlsx',
  import.meta.url,
);

describe('readItauCreditCardStatementFromXlsx', () => {
  it('reads the synthetic XLSX through the Node adapter without retaining ignored columns', async () => {
    const bytes = await readFile(FIXTURE_PATH);
    const parsed = await readItauCreditCardStatementFromXlsx(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );

    expect(parsed).toMatchObject({
      statementTitle: 'Fatura Paga - Julho/2026',
      statementCompetence: '2026-07',
      statementDueOn: '2026-07-12',
      statementTotalInMinorUnits: 34_455n,
      purchaseTotalInMinorUnits: 39_455n,
      creditAdjustmentTotalInMinorUnits: 5_000n,
      settlementTotalInMinorUnits: 50_000n,
    });
    expect(parsed.transactions).toHaveLength(5);

    const sanitizedOutput = JSON.stringify(parsed, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    );
    expect(sanitizedOutput).not.toContain('DADO SINTÉTICO');
    expect(sanitizedOutput).not.toContain('IGNORAR');
  });
});
