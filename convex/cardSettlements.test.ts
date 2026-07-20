/// <reference types="vite/client" />

import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';

type TestBackend = TestConvex<typeof schema>;

describe('card settlement reconciliations', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('lists only exact opposite candidates with explicit provenance', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const fixture = await insertSyntheticFixture(t);

    const result = await owner.query(api.cardSettlements.listForStatementBatch, {
      batchId: fixture.statementBatchId,
    });

    expect(result).toMatchObject({
      ruleVersion: 'exact-opposite-within-seven-days-v1',
      maximumDayDistance: 7,
      statementPayments: [
        {
          transactionId: fixture.statementPaymentId,
          sourcePatrimony: 'personal',
          reconciliation: null,
          candidates: [
            {
              transactionId: fixture.exactBankDebitId,
              sourcePatrimony: 'business',
              dayDistance: 2,
            },
          ],
        },
      ],
    });
  });

  it('requires explicit confirmation, is idempotent and marks the bank debit role', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const fixture = await insertSyntheticFixture(t);

    const first = await owner.mutation(api.cardSettlements.confirm, {
      statementPaymentTransactionId: fixture.statementPaymentId,
      bankDebitTransactionId: fixture.exactBankDebitId,
    });
    const retried = await owner.mutation(api.cardSettlements.confirm, {
      statementPaymentTransactionId: fixture.statementPaymentId,
      bankDebitTransactionId: fixture.exactBankDebitId,
    });

    expect(retried).toEqual(first);
    const after = await owner.query(api.cardSettlements.listForStatementBatch, {
      batchId: fixture.statementBatchId,
    });
    expect(after.statementPayments[0]).toMatchObject({
      candidates: [],
      reconciliation: {
        reconciliationId: first.reconciliationId,
        bankDebit: {
          transactionId: fixture.exactBankDebitId,
          sourcePatrimony: 'business',
        },
      },
    });

    const history = await owner.query(api.importHistory.listSourceTransactions, {
      batchId: fixture.bankBatchId,
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(
      history.page.find(
        (transaction) => transaction.transactionId === fixture.exactBankDebitId,
      ),
    ).toMatchObject({ cardSettlementRole: 'bankDebit' });

    const persisted = await t.run(async (ctx) => ({
      reconciliations: await ctx.db.query('cardSettlementReconciliations').take(3),
      audits: (await ctx.db.query('auditEvents').take(10)).filter(
        (event) => event.action === 'card_settlement.reconciled',
      ),
    }));
    expect(persisted.reconciliations).toHaveLength(1);
    expect(persisted.audits).toHaveLength(1);
  });

  it('rejects another identity and a non-candidate without creating a relation', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: SYNTHETIC_OWNER_ID });
    const other = t.withIdentity({ subject: SYNTHETIC_OTHER_ID });
    const fixture = await insertSyntheticFixture(t);

    await expect(
      other.query(api.cardSettlements.listForStatementBatch, {
        batchId: fixture.statementBatchId,
      }),
    ).rejects.toMatchObject({ data: { code: 'ACCESS_DENIED' } });
    await expect(
      owner.mutation(api.cardSettlements.confirm, {
        statementPaymentTransactionId: fixture.statementPaymentId,
        bankDebitTransactionId: fixture.wrongAmountDebitId,
      }),
    ).rejects.toMatchObject({ data: { code: 'CARD_SETTLEMENT_CANDIDATE_INVALID' } });
    await expect(
      t.run((ctx) => ctx.db.query('cardSettlementReconciliations').take(3)),
    ).resolves.toHaveLength(0);
  });
});

async function insertSyntheticFixture(t: TestBackend) {
  const ownerId = `https://convex.test|${SYNTHETIC_OWNER_ID}`;
  return await t.run(async (ctx) => {
    const statementBatchId = await insertBatch(ctx, ownerId, {
      fileHash: 'synthetic-statement-batch',
      format: 'itauCreditCardXlsx',
      sourceAccountKind: 'creditCard',
      sourcePatrimony: 'personal',
    });
    const bankBatchId = await insertBatch(ctx, ownerId, {
      fileHash: 'synthetic-bank-batch',
      format: 'ofx',
      sourceAccountKind: 'bankAccount',
      sourcePatrimony: 'business',
    });
    const legacyBankBatchId = await insertBatch(ctx, ownerId, {
      fileHash: 'synthetic-legacy-bank-batch',
      format: 'ofx',
      sourceAccountKind: 'bankAccount',
      sourcePatrimony: undefined,
    });
    const statementPaymentId = await insertTransaction(ctx, ownerId, statementBatchId, {
      sourceKey: 'synthetic-statement-payment',
      postedOn: '2026-07-12',
      amountInMinorUnits: 50_000n,
      transactionType: 'statementPayment',
      sourceAccountKind: 'creditCard',
      sourcePatrimony: 'personal',
    });
    const exactBankDebitId = await insertTransaction(ctx, ownerId, bankBatchId, {
      sourceKey: 'synthetic-exact-bank-debit',
      postedOn: '2026-07-14',
      amountInMinorUnits: -50_000n,
      transactionType: 'DEBIT',
      sourceAccountKind: 'bankAccount',
      sourcePatrimony: 'business',
    });
    const wrongAmountDebitId = await insertTransaction(ctx, ownerId, bankBatchId, {
      sourceKey: 'synthetic-wrong-bank-debit',
      postedOn: '2026-07-13',
      amountInMinorUnits: -49_999n,
      transactionType: 'DEBIT',
      sourceAccountKind: 'bankAccount',
      sourcePatrimony: 'business',
    });
    await insertTransaction(ctx, ownerId, legacyBankBatchId, {
      sourceKey: 'synthetic-legacy-exact-debit',
      postedOn: '2026-07-12',
      amountInMinorUnits: -50_000n,
      transactionType: 'DEBIT',
      sourceAccountKind: 'bankAccount',
      sourcePatrimony: undefined,
    });
    await insertTransaction(ctx, ownerId, bankBatchId, {
      sourceKey: 'synthetic-outside-window-debit',
      postedOn: '2026-07-20',
      amountInMinorUnits: -50_000n,
      transactionType: 'DEBIT',
      sourceAccountKind: 'bankAccount',
      sourcePatrimony: 'business',
    });

    return {
      statementBatchId,
      bankBatchId,
      statementPaymentId,
      exactBankDebitId,
      wrongAmountDebitId,
    };
  });
}

async function insertBatch(
  ctx: Parameters<Parameters<TestBackend['run']>[0]>[0],
  ownerId: string,
  input: {
    fileHash: string;
    format: 'ofx' | 'itauCreditCardXlsx';
    sourceAccountKind: 'bankAccount' | 'creditCard';
    sourcePatrimony: 'personal' | 'business' | undefined;
  },
): Promise<Id<'importBatches'>> {
  return await ctx.db.insert('importBatches', {
    ownerId,
    fileHash: input.fileHash,
    format: input.format,
    sourceAccountKind: input.sourceAccountKind,
    sourcePatrimony: input.sourcePatrimony,
    parserVersion: 'synthetic-parser-v1',
    status: 'confirmed',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    transactionCount: 3,
    duplicateCount: 0,
    creditTotal: money(50_000n),
    debitTotal: money(50_000n),
    rawFileStatus: 'deleted',
    rawDeletedAt: 1,
    insertedCount: 3,
    createdAt: 1,
    updatedAt: 2,
    confirmedAt: 2,
  });
}

async function insertTransaction(
  ctx: Parameters<Parameters<TestBackend['run']>[0]>[0],
  ownerId: string,
  importBatchId: Id<'importBatches'>,
  input: {
    sourceKey: string;
    postedOn: string;
    amountInMinorUnits: bigint;
    transactionType: string;
    sourceAccountKind: 'bankAccount' | 'creditCard';
    sourcePatrimony: 'personal' | 'business' | undefined;
  },
): Promise<Id<'sourceTransactions'>> {
  return await ctx.db.insert('sourceTransactions', {
    ownerId,
    sourceKey: input.sourceKey,
    importBatchId,
    postedOn: input.postedOn,
    amount: money(input.amountInMinorUnits),
    description: 'Synthetic financial fixture',
    transactionType: input.transactionType,
    sourceAccountKind: input.sourceAccountKind,
    sourcePatrimony: input.sourcePatrimony,
    createdAt: 2,
  });
}

function money(amountInMinorUnits: bigint) {
  return {
    amountInMinorUnits,
    currency: 'BRL' as const,
    minorUnit: 'cent' as const,
  };
}
