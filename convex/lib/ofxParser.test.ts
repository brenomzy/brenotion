import { describe, expect, it } from 'vitest';

import { SYNTHETIC_OFX } from '../testFixtures/syntheticOfx';
import { decodeOfxBytes, OfxParseError, parseOfx } from './ofxParser';

describe('parseOfx', () => {
  it('parses a synthetic Itaú-like SGML statement without exposing account metadata', () => {
    const parsed = parseOfx(SYNTHETIC_OFX);

    expect(parsed).toEqual({
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      creditTotalInMinorUnits: 250_000n,
      debitTotalInMinorUnits: 12_345n,
      transactions: [
        {
          sequence: 0,
          externalId: 'synthetic-credit',
          postedOn: '2026-06-05',
          amountInMinorUnits: 250_000n,
          description: 'Recebimento sintético',
          transactionType: 'CREDIT',
        },
        {
          sequence: 1,
          externalId: 'synthetic-debit',
          postedOn: '2026-06-06',
          amountInMinorUnits: -12_345n,
          description: 'Mercado & feira',
          transactionType: 'DEBIT',
        },
      ],
    });
    expect(JSON.stringify(parsed, (_, value) => (typeof value === 'bigint' ? value.toString() : value)))
      .not.toContain('synthetic-account');
  });

  it('preserves exact cents and accepts only trailing precision zeros', () => {
    const parsed = parseOfx(
      SYNTHETIC_OFX.replace('2500.00', '2500.0000').replace('-123.45', '-0.01'),
    );

    expect(parsed.creditTotalInMinorUnits).toBe(250_000n);
    expect(parsed.debitTotalInMinorUnits).toBe(1n);
    expect(() => parseOfx(SYNTHETIC_OFX.replace('-123.45', '-123.456'))).toThrowError(
      OfxParseError,
    );
  });

  it('rejects non-BRL and malformed statements', () => {
    expect(() => parseOfx(SYNTHETIC_OFX.replace('<CURDEF>BRL', '<CURDEF>USD'))).toThrowError(
      'OFX_UNSUPPORTED_CURRENCY',
    );
    expect(() => parseOfx('not-an-ofx-file')).toThrowError('OFX_INVALID_FORMAT');
  });

  it('decodes Windows-1252 content declared by the OFX header', () => {
    const encoded = Uint8Array.from(
      `ENCODING:USASCII\r\nCHARSET:1252\r\n\r\n<OFX><MEMO>Caf\xe9`.split('').map((char) =>
        char.charCodeAt(0),
      ),
    );

    expect(decodeOfxBytes(encoded.buffer)).toContain('Café');
  });
});
