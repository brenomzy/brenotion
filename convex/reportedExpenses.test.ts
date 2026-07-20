/// <reference types="vite/client" />
import { makeFunctionReference } from 'convex/server';
import { convexTest, type TestConvex } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const OWNER = 'user_test_authorized_owner';
const OWNER_TOKEN = `https://convex.test|${OWNER}`;
type Details = { amount: ReturnType<typeof money>; description: string; occurredOn: string; economicNature: 'personal' | 'business'; sourcePatrimony: 'personal' | 'business' | 'needsConfirmation' };
type Expense = Details & { reportedExpenseId: Id<'reportedExpenses'>; financialCycleId: Id<'financialCycles'>; status: 'provisional' | 'reconciled' | 'voided'; clientRequestId: string; createdAt: number; updatedAt: number; revisionNumber: bigint };
const create = makeFunctionReference<'mutation', Details & { clientRequestId: string }, { status: 'created' | 'updated' | 'unchanged'; expense: Expense }>('reportedExpenses:create');
const updateDetails = makeFunctionReference<'mutation', Details & { reportedExpenseId: Id<'reportedExpenses'> }, { status: 'created' | 'updated' | 'unchanged'; expense: Expense }>('reportedExpenses:updateDetails');
const voidExpense = makeFunctionReference<'mutation', { reportedExpenseId: Id<'reportedExpenses'> }, { status: 'created' | 'updated' | 'unchanged'; expense: Expense }>('reportedExpenses:void');
const list = makeFunctionReference<'query', Record<string, never>, { items: Expense[]; isTruncated: boolean }>('reportedExpenses:listForCurrentCycle');
type Candidate = { sourceTransactionId: Id<'sourceTransactions'>; postedOn: string; amount: ReturnType<typeof money>; description: string; sourcePatrimony: 'personal' | 'business'; dayDistance: number };
const candidates = makeFunctionReference<'query', { reportedExpenseId: Id<'reportedExpenses'> }, { ruleVersion: 'exact-opposite-within-seven-days-v1'; maximumDayDistance: number; candidates: Candidate[] }>('reportedExpenses:listReconciliationCandidates');
const confirm = makeFunctionReference<'mutation', { reportedExpenseId: Id<'reportedExpenses'>; sourceTransactionId: Id<'sourceTransactions'> }, { status: 'confirmed' | 'unchanged'; reconciliationId: Id<'reportedExpenseReconciliations'> }>('reportedExpenses:confirmReconciliation');

describe('reportedExpenses', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('creates exact provisional expenses idempotently and preserves update/void revisions', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', OWNER);
    const backend = convexTest(schema, modules);
    await expect(backend.mutation(create, input('synthetic-expense-1'))).rejects.toMatchObject({ data: { code: 'AUTHENTICATION_REQUIRED' } });
    await insertCycle(backend);
    const owner = backend.withIdentity({ subject: OWNER });
    const created = await owner.mutation(create, input('synthetic-expense-1'));
    await expect(owner.mutation(create, input('synthetic-expense-1'))).resolves.toEqual({ status: 'unchanged', expense: created.expense });
    expect(created.expense).toMatchObject({ amount: money(12_345n), status: 'provisional', revisionNumber: 1n });
    const updated = await owner.mutation(updateDetails, { amount: money(13_000n), description: 'Descrição atualizada', occurredOn: '2026-07-15', economicNature: 'personal', sourcePatrimony: 'personal', reportedExpenseId: created.expense.reportedExpenseId });
    expect(updated.expense).toMatchObject({ description: 'Descrição atualizada', amount: money(13_000n), revisionNumber: 2n });
    const voided = await owner.mutation(voidExpense, { reportedExpenseId: created.expense.reportedExpenseId });
    expect(voided.expense).toMatchObject({ status: 'voided', revisionNumber: 3n });
    await expect(owner.query(list, {})).resolves.toMatchObject({ items: [{ status: 'voided' }], isTruncated: false });
    const stored = await backend.run(async (ctx) => ({ revisions: await ctx.db.query('reportedExpenseRevisions').take(5), audits: (await ctx.db.query('auditEvents').take(10)).filter((e) => e.targetType === 'reported_expense') }));
    expect(stored.revisions.map((r) => r.reason)).toEqual(['created', 'updated', 'voided']);
    expect(stored.audits).toHaveLength(3);
    await expect(owner.mutation(create, { ...input('synthetic-invalid'), amount: money(0n) })).rejects.toMatchObject({ data: { code: 'INVALID_REPORTED_EXPENSE_AMOUNT' } });
  });

  it('offers only conservative candidates and confirms a one-to-one reconciliation explicitly', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', OWNER);
    const backend = convexTest(schema, modules);
    await insertCycle(backend);
    const owner = backend.withIdentity({ subject: OWNER });
    const expense = (await owner.mutation(create, input('synthetic-reconcile-1'))).expense;
    const valid = await insertTransaction(backend, { key: 'valid', amount: -12_345n, postedOn: '2026-07-16', patrimony: 'personal', type: 'DEBIT' });
    await insertTransaction(backend, { key: 'wrong-patrimony', amount: -12_345n, postedOn: '2026-07-16', patrimony: 'business', type: 'DEBIT' });
    await insertTransaction(backend, { key: 'statement', amount: -12_345n, postedOn: '2026-07-16', patrimony: 'personal', type: 'statementPayment' });
    const settlementDebit = await insertTransaction(backend, { key: 'settlement-debit', amount: -12_345n, postedOn: '2026-07-16', patrimony: 'personal', type: 'DEBIT' });
    const settlementPayment = await insertTransaction(backend, { key: 'settlement-payment', amount: 12_345n, postedOn: '2026-07-16', patrimony: 'personal', type: 'statementPayment', accountKind: 'creditCard' });
    await backend.run(async (ctx) => { await ctx.db.insert('cardSettlementReconciliations', { ownerId: OWNER_TOKEN, statementPaymentTransactionId: settlementPayment, bankDebitTransactionId: settlementDebit, ruleVersion: 'exact-opposite-within-seven-days-v1', dayDistance: 0, confirmedAt: 1 }); });
    const found = await owner.query(candidates, { reportedExpenseId: expense.reportedExpenseId });
    expect(found).toMatchObject({ ruleVersion: 'exact-opposite-within-seven-days-v1', maximumDayDistance: 7, candidates: [{ sourceTransactionId: valid, dayDistance: 1 }] });
    const confirmed = await owner.mutation(confirm, { reportedExpenseId: expense.reportedExpenseId, sourceTransactionId: valid });
    await expect(owner.mutation(confirm, { reportedExpenseId: expense.reportedExpenseId, sourceTransactionId: valid })).resolves.toEqual({ status: 'unchanged', reconciliationId: confirmed.reconciliationId });
    await expect(owner.query(list, {})).resolves.toMatchObject({ items: [{ status: 'reconciled', revisionNumber: 2n }] });
    const second = (await owner.mutation(create, { ...input('synthetic-reconcile-2'), occurredOn: '2026-07-16' })).expense;
    await expect(owner.mutation(confirm, { reportedExpenseId: second.reportedExpenseId, sourceTransactionId: valid })).rejects.toMatchObject({ data: { code: 'RECONCILIATION_CANDIDATE_INVALID' } });
    await expect(owner.mutation(voidExpense, { reportedExpenseId: expense.reportedExpenseId })).rejects.toMatchObject({ data: { code: 'RECONCILED_EXPENSE_CANNOT_BE_VOIDED' } });
    const persisted = await backend.run(async (ctx) => ({ expense: await ctx.db.get('reportedExpenses', expense.reportedExpenseId), revisions: await ctx.db.query('reportedExpenseRevisions').withIndex('by_ownerId_and_reportedExpenseId_and_revisionNumber', (q) => q.eq('ownerId', OWNER_TOKEN).eq('reportedExpenseId', expense.reportedExpenseId)).take(5), audit: (await ctx.db.query('auditEvents').take(10)).find((event) => event.action === 'reported_expense.reconciled') }));
    expect(persisted.revisions.map((revision) => revision.reason)).toEqual(['created', 'reconciled']);
    expect(persisted.expense?.currentRevisionId).toBe(persisted.revisions[1]._id);
    expect(persisted.revisions[1].snapshot.status).toBe('reconciled');
    expect(persisted.audit?.revisionId).toBe(persisted.revisions[1]._id);
  });
});

type Backend = TestConvex<typeof schema>;
function input(clientRequestId: string): Details & { clientRequestId: string } { return { amount: money(12_345n), description: 'Despesa sintética', occurredOn: '2026-07-15', economicNature: 'personal', sourcePatrimony: 'personal', clientRequestId }; }
async function insertCycle(backend: Backend) { await backend.run(async (ctx) => { await ctx.db.insert('financialCycles', { ownerId: OWNER_TOKEN, startedOn: '2026-07-01', expectedNextReceiptOn: '2026-08-01', timeZone: 'America/Sao_Paulo', status: 'open', clientRequestId: 'synthetic-cycle', openedAt: 1 }); }); }
let sequence = 0;
async function insertTransaction(backend: Backend, data: { key: string; amount: bigint; postedOn: string; patrimony: 'personal' | 'business'; type: string; accountKind?: 'bankAccount' | 'creditCard' }) { sequence += 1; return await backend.run(async (ctx) => { const batchId = await ctx.db.insert('importBatches', { ownerId: OWNER_TOKEN, fileHash: `hash-${data.key}-${sequence}`, format: data.accountKind === 'creditCard' ? 'itauCreditCardXlsx' : 'ofx', sourceAccountKind: data.accountKind ?? 'bankAccount', sourcePatrimony: data.patrimony, status: 'confirmed', transactionCount: 1, duplicateCount: 0, creditTotal: money(0n), debitTotal: money(0n), rawFileStatus: 'deleted', rawDeletedAt: 1, createdAt: 1, updatedAt: 1, confirmedAt: 1 }); return await ctx.db.insert('sourceTransactions', { ownerId: OWNER_TOKEN, sourceKey: data.key, importBatchId: batchId, postedOn: data.postedOn, amount: money(data.amount), description: data.key, transactionType: data.type, sourceAccountKind: data.accountKind ?? 'bankAccount', sourcePatrimony: data.patrimony, createdAt: 1 }); }); }
function money(amountInMinorUnits: bigint) { return { amountInMinorUnits, currency: 'BRL' as const, minorUnit: 'cent' as const }; }
