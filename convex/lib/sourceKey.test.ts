import { describe, expect, it } from 'vitest';

import { createCreditCardSourceKey, createOfxSourceKey } from './sourceKey';

describe('source keys', () => {
  it('keeps otherwise identical OFX movements separate by source patrimony', async () => {
    const input = {
      externalId: 'synthetic-external-id',
      postedOn: '2026-07-14',
      amountInMinorUnits: -12_345n,
      description: 'Synthetic movement',
    };

    const [personal, business] = await Promise.all([
      createOfxSourceKey({ ...input, sourcePatrimony: 'personal' }),
      createOfxSourceKey({ ...input, sourcePatrimony: 'business' }),
    ]);

    expect(personal).not.toBe(business);
  });

  it('keeps otherwise identical card movements separate by source patrimony', async () => {
    const input = {
      statementCompetence: '2026-07',
      sequence: 1,
      postedOn: '2026-07-10',
      amountInMinorUnits: -9_876n,
      description: 'Synthetic card movement',
      transactionType: 'purchase',
      installmentCurrent: null,
      installmentTotal: null,
    };

    const personal = await createCreditCardSourceKey({
      ...input,
      sourcePatrimony: 'personal',
    });
    const business = await createCreditCardSourceKey({
      ...input,
      sourcePatrimony: 'business',
    });

    expect(personal).not.toBe(business);
  });
});
