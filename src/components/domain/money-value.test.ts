import { describe, expect, it } from 'vitest';

import { formatBrlMinorUnits } from './money-format';

describe('formatBrlMinorUnits', () => {
  it('formats synthetic BRL minor units without converting through floating point', () => {
    expect(formatBrlMinorUnits(486012n)).toBe('R$\u00a04.860,12');
  });

  it('preserves exact cents for large synthetic values', () => {
    expect(formatBrlMinorUnits(900719925474099312n)).toBe(
      'R$\u00a09.007.199.254.740.993,12'
    );
  });

  it('uses the typographic minus sign for negative adjustments', () => {
    expect(formatBrlMinorUnits(-1250n)).toBe('−R$\u00a012,50');
  });

  it('only omits zero cents when explicitly requested', () => {
    expect(formatBrlMinorUnits(120000n, 'when-needed')).toBe('R$\u00a01.200');
    expect(formatBrlMinorUnits(120001n, 'when-needed')).toBe('R$\u00a01.200,01');
  });
});
