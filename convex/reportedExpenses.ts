import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { getCardSettlementDayDistance, shiftIsoDate } from './lib/cardSettlementReconciliation';
import { requireAuthorizedOwner } from './lib/authorization';
import {
  brlMoneyValidator,
  economicNatureValidator,
  reportedExpenseSourcePatrimonyValidator,
  reportedExpenseStatusValidator,
  sourcePatrimonyValidator,
} from './schema';

const RULE_VERSION = 'exact-opposite-within-seven-days-v1' as const;
const MAX_DAY_DISTANCE = 7;
const MAX_ITEMS = 200;

const expenseValidator = v.object({
  reportedExpenseId: v.id('reportedExpenses'),
  financialCycleId: v.id('financialCycles'),
  amount: brlMoneyValidator,
  description: v.string(),
  occurredOn: v.string(),
  economicNature: economicNatureValidator,
  sourcePatrimony: reportedExpenseSourcePatrimonyValidator,
  status: reportedExpenseStatusValidator,
  clientRequestId: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  revisionNumber: v.int64(),
});
const writeResultValidator = v.object({
  status: v.union(v.literal('created'), v.literal('updated'), v.literal('unchanged')),
  expense: expenseValidator,
});
const candidateValidator = v.object({
  sourceTransactionId: v.id('sourceTransactions'),
  postedOn: v.string(),
  amount: brlMoneyValidator,
  description: v.string(),
  sourcePatrimony: sourcePatrimonyValidator,
  dayDistance: v.number(),
});
const detailsArgs = {
  amount: brlMoneyValidator,
  description: v.string(),
  occurredOn: v.string(),
  economicNature: economicNatureValidator,
  sourcePatrimony: reportedExpenseSourcePatrimonyValidator,
};

export const create = mutation({
  args: { ...detailsArgs, clientRequestId: v.string() },
  returns: writeResultValidator,
  handler: async (ctx, args) => {
    const details = validateDetails(args);
    const clientRequestId = validateRequestId(args.clientRequestId);
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const existing = await ctx.db.query('reportedExpenses').withIndex('by_ownerId_and_clientRequestId', (q) => q.eq('ownerId', ownerId).eq('clientRequestId', clientRequestId)).unique();
    if (existing) {
      if (!sameDetails(existing, details)) throwError('CLIENT_REQUEST_ID_REUSED');
      return { status: 'unchanged' as const, expense: toExpense(existing) };
    }
    const cycle = await ctx.db.query('financialCycles').withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId).eq('status', 'open')).unique();
    if (!cycle) throwError('FINANCIAL_CYCLE_NOT_OPEN');
    if (details.occurredOn < cycle.startedOn || details.occurredOn >= cycle.expectedNextReceiptOn) throwError('EXPENSE_OUTSIDE_CURRENT_CYCLE');
    const now = Date.now();
    const reportedExpenseId = await ctx.db.insert('reportedExpenses', { ownerId, financialCycleId: cycle._id, ...details, status: 'provisional', clientRequestId, createdAt: now, updatedAt: now, revisionNumber: 1n });
    const revisionId = await insertRevision(ctx, ownerId, reportedExpenseId, 1n, 'created', { ...details, status: 'provisional', updatedAt: now }, now);
    await ctx.db.patch('reportedExpenses', reportedExpenseId, { currentRevisionId: revisionId });
    await auditExpense(ctx, ownerId, 'reported_expense.created', reportedExpenseId, revisionId, now);
    const stored = await ctx.db.get('reportedExpenses', reportedExpenseId);
    if (!stored) throwError('REPORTED_EXPENSE_NOT_FOUND');
    return { status: 'created' as const, expense: toExpense(stored) };
  },
});

export const updateDetails = mutation({
  args: { reportedExpenseId: v.id('reportedExpenses'), ...detailsArgs },
  returns: writeResultValidator,
  handler: async (ctx, args) => {
    const details = validateDetails(args);
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const expense = await requireExpense(ctx, ownerId, args.reportedExpenseId);
    if (expense.status !== 'provisional') throwError('REPORTED_EXPENSE_NOT_EDITABLE');
    const cycle = await ctx.db.get('financialCycles', expense.financialCycleId);
    if (!cycle || cycle.ownerId !== ownerId) throwError('FINANCIAL_CYCLE_NOT_FOUND');
    if (details.occurredOn < cycle.startedOn || details.occurredOn >= cycle.expectedNextReceiptOn) throwError('EXPENSE_OUTSIDE_CURRENT_CYCLE');
    if (sameDetails(expense, details)) return { status: 'unchanged' as const, expense: toExpense(expense) };
    const now = Date.now();
    const revisionNumber = expense.revisionNumber + 1n;
    const revisionId = await insertRevision(ctx, ownerId, expense._id, revisionNumber, 'updated', { ...details, status: 'provisional', updatedAt: now }, now);
    await ctx.db.replace('reportedExpenses', expense._id, { ownerId, financialCycleId: expense.financialCycleId, ...details, status: 'provisional', clientRequestId: expense.clientRequestId, createdAt: expense.createdAt, updatedAt: now, revisionNumber, currentRevisionId: revisionId });
    await auditExpense(ctx, ownerId, 'reported_expense.updated', expense._id, revisionId, now);
    const updated = await ctx.db.get('reportedExpenses', expense._id);
    if (!updated) throwError('REPORTED_EXPENSE_NOT_FOUND');
    return { status: 'updated' as const, expense: toExpense(updated) };
  },
});

export const voidExpense = mutation({
  args: { reportedExpenseId: v.id('reportedExpenses') },
  returns: writeResultValidator,
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const expense = await requireExpense(ctx, ownerId, args.reportedExpenseId);
    if (expense.status === 'voided') return { status: 'unchanged' as const, expense: toExpense(expense) };
    if (expense.status === 'reconciled') throwError('RECONCILED_EXPENSE_CANNOT_BE_VOIDED');
    const now = Date.now();
    const revisionNumber = expense.revisionNumber + 1n;
    const snapshot = { amount: expense.amount, description: expense.description, occurredOn: expense.occurredOn, economicNature: expense.economicNature, sourcePatrimony: expense.sourcePatrimony, status: 'voided' as const, updatedAt: now };
    const revisionId = await insertRevision(ctx, ownerId, expense._id, revisionNumber, 'voided', snapshot, now);
    await ctx.db.patch('reportedExpenses', expense._id, { status: 'voided', updatedAt: now, revisionNumber, currentRevisionId: revisionId });
    await auditExpense(ctx, ownerId, 'reported_expense.voided', expense._id, revisionId, now);
    const updated = await ctx.db.get('reportedExpenses', expense._id);
    if (!updated) throwError('REPORTED_EXPENSE_NOT_FOUND');
    return { status: 'updated' as const, expense: toExpense(updated) };
  },
});

export { voidExpense as void };

export const listForCurrentCycle = query({
  args: {},
  returns: v.object({ items: v.array(expenseValidator), isTruncated: v.boolean() }),
  handler: async (ctx) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const cycle = await ctx.db.query('financialCycles').withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId).eq('status', 'open')).unique();
    if (!cycle) return { items: [], isTruncated: false };
    const expenses = await ctx.db.query('reportedExpenses').withIndex('by_ownerId_and_financialCycleId_and_occurredOn', (q) => q.eq('ownerId', ownerId).eq('financialCycleId', cycle._id)).order('desc').take(MAX_ITEMS + 1);
    return { items: expenses.slice(0, MAX_ITEMS).map(toExpense), isTruncated: expenses.length > MAX_ITEMS };
  },
});

export const listReconciliationCandidates = query({
  args: { reportedExpenseId: v.id('reportedExpenses') },
  returns: v.object({ ruleVersion: v.literal(RULE_VERSION), maximumDayDistance: v.number(), candidates: v.array(candidateValidator) }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const expense = await requireExpense(ctx, ownerId, args.reportedExpenseId);
    if (expense.status !== 'provisional') return { ruleVersion: RULE_VERSION, maximumDayDistance: MAX_DAY_DISTANCE, candidates: [] };
    return { ruleVersion: RULE_VERSION, maximumDayDistance: MAX_DAY_DISTANCE, candidates: await findCandidates(ctx, ownerId, expense) };
  },
});

export const confirmReconciliation = mutation({
  args: { reportedExpenseId: v.id('reportedExpenses'), sourceTransactionId: v.id('sourceTransactions') },
  returns: v.object({ status: v.union(v.literal('confirmed'), v.literal('unchanged')), reconciliationId: v.id('reportedExpenseReconciliations') }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const expense = await requireExpense(ctx, ownerId, args.reportedExpenseId);
    const existingExpense = await ctx.db.query('reportedExpenseReconciliations').withIndex('by_ownerId_and_reportedExpenseId', (q) => q.eq('ownerId', ownerId).eq('reportedExpenseId', expense._id)).unique();
    if (existingExpense) {
      if (existingExpense.sourceTransactionId !== args.sourceTransactionId) throwError('REPORTED_EXPENSE_ALREADY_RECONCILED');
      return { status: 'unchanged' as const, reconciliationId: existingExpense._id };
    }
    if (expense.status !== 'provisional') throwError('REPORTED_EXPENSE_NOT_RECONCILABLE');
    const transaction = await ctx.db.get('sourceTransactions', args.sourceTransactionId);
    if (!transaction || transaction.ownerId !== ownerId || !(await isCandidate(ctx, ownerId, expense, transaction))) throwError('RECONCILIATION_CANDIDATE_INVALID');
    const used = await ctx.db.query('reportedExpenseReconciliations').withIndex('by_ownerId_and_sourceTransactionId', (q) => q.eq('ownerId', ownerId).eq('sourceTransactionId', transaction._id)).unique();
    if (used) throwError('SOURCE_TRANSACTION_ALREADY_USED');
    const confirmedAt = Date.now();
    const reconciliationId = await ctx.db.insert('reportedExpenseReconciliations', { ownerId, reportedExpenseId: expense._id, sourceTransactionId: transaction._id, ruleVersion: RULE_VERSION, dayDistance: getCardSettlementDayDistance(expense.occurredOn, transaction.postedOn), confirmedAt });
    const revisionNumber = expense.revisionNumber + 1n;
    const revisionId = await insertRevision(ctx, ownerId, expense._id, revisionNumber, 'reconciled', { amount: expense.amount, description: expense.description, occurredOn: expense.occurredOn, economicNature: expense.economicNature, sourcePatrimony: expense.sourcePatrimony, status: 'reconciled', updatedAt: confirmedAt }, confirmedAt);
    await ctx.db.patch('reportedExpenses', expense._id, { status: 'reconciled', updatedAt: confirmedAt, revisionNumber, currentRevisionId: revisionId });
    await ctx.db.insert('auditEvents', { ownerId, action: 'reported_expense.reconciled', targetType: 'reported_expense_reconciliation', targetId: reconciliationId, revisionId, result: 'succeeded', occurredAt: confirmedAt });
    return { status: 'confirmed' as const, reconciliationId };
  },
});

async function findCandidates(ctx: QueryCtx, ownerId: string, expense: Doc<'reportedExpenses'>) {
  const transactions = await ctx.db.query('sourceTransactions').withIndex('by_ownerId_and_postedOn', (q) => q.eq('ownerId', ownerId).gte('postedOn', shiftIsoDate(expense.occurredOn, -MAX_DAY_DISTANCE)).lte('postedOn', shiftIsoDate(expense.occurredOn, MAX_DAY_DISTANCE))).take(MAX_ITEMS + 1);
  if (transactions.length > MAX_ITEMS) throwError('RECONCILIATION_WINDOW_TOO_LARGE');
  const candidates = [];
  for (const transaction of transactions) {
    if (!(await isCandidate(ctx, ownerId, expense, transaction)) || !transaction.sourcePatrimony) continue;
    candidates.push({ sourceTransactionId: transaction._id, postedOn: transaction.postedOn, amount: transaction.amount, description: transaction.description, sourcePatrimony: transaction.sourcePatrimony, dayDistance: getCardSettlementDayDistance(expense.occurredOn, transaction.postedOn) });
  }
  return candidates.sort((a, b) => a.dayDistance - b.dayDistance || a.postedOn.localeCompare(b.postedOn));
}

async function isCandidate(ctx: QueryCtx | MutationCtx, ownerId: string, expense: Doc<'reportedExpenses'>, transaction: Doc<'sourceTransactions'>) {
  if (transaction.transactionType === 'statementPayment' || !transaction.sourcePatrimony || transaction.amount.amountInMinorUnits !== -expense.amount.amountInMinorUnits || getCardSettlementDayDistance(expense.occurredOn, transaction.postedOn) > MAX_DAY_DISTANCE) return false;
  if (expense.sourcePatrimony !== 'needsConfirmation' && transaction.sourcePatrimony !== expense.sourcePatrimony) return false;
  const [asStatementPayment, asBankDebit, used] = await Promise.all([
    ctx.db.query('cardSettlementReconciliations').withIndex('by_ownerId_and_statementPaymentTransactionId', (q) => q.eq('ownerId', ownerId).eq('statementPaymentTransactionId', transaction._id)).unique(),
    ctx.db.query('cardSettlementReconciliations').withIndex('by_ownerId_and_bankDebitTransactionId', (q) => q.eq('ownerId', ownerId).eq('bankDebitTransactionId', transaction._id)).unique(),
    ctx.db.query('reportedExpenseReconciliations').withIndex('by_ownerId_and_sourceTransactionId', (q) => q.eq('ownerId', ownerId).eq('sourceTransactionId', transaction._id)).unique(),
  ]);
  return !asStatementPayment && !asBankDebit && !used;
}

function validateDetails(args: { amount: { amountInMinorUnits: bigint; currency: 'BRL'; minorUnit: 'cent' }; description: string; occurredOn: string; economicNature: 'personal' | 'business'; sourcePatrimony: 'personal' | 'business' | 'needsConfirmation' }) {
  if (args.amount.amountInMinorUnits <= 0n) throwError('INVALID_REPORTED_EXPENSE_AMOUNT');
  const description = args.description.trim().replace(/\s+/g, ' ');
  if (description.length < 1 || description.length > 160) throwError('INVALID_REPORTED_EXPENSE_DESCRIPTION');
  const occurredOn = validateIsoDate(args.occurredOn);
  return { amount: args.amount, description, occurredOn, economicNature: args.economicNature, sourcePatrimony: args.sourcePatrimony };
}
function validateIsoDate(value: string) { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if (!match || new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).toISOString().slice(0, 10) !== value) throwError('INVALID_DATE'); return value; }
function validateRequestId(value: string) { const normalized = value.trim(); if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(normalized)) throwError('INVALID_CLIENT_REQUEST_ID'); return normalized; }
function sameDetails(expense: Pick<Doc<'reportedExpenses'>, 'amount' | 'description' | 'occurredOn' | 'economicNature' | 'sourcePatrimony'>, details: ReturnType<typeof validateDetails>) { return expense.amount.amountInMinorUnits === details.amount.amountInMinorUnits && expense.description === details.description && expense.occurredOn === details.occurredOn && expense.economicNature === details.economicNature && expense.sourcePatrimony === details.sourcePatrimony; }
async function requireExpense(ctx: QueryCtx | MutationCtx, ownerId: string, id: Id<'reportedExpenses'>) { const expense = await ctx.db.get('reportedExpenses', id); if (!expense || expense.ownerId !== ownerId) throwError('REPORTED_EXPENSE_NOT_FOUND'); return expense; }
function toExpense(expense: Doc<'reportedExpenses'>) { return { reportedExpenseId: expense._id, financialCycleId: expense.financialCycleId, amount: expense.amount, description: expense.description, occurredOn: expense.occurredOn, economicNature: expense.economicNature, sourcePatrimony: expense.sourcePatrimony, status: expense.status, clientRequestId: expense.clientRequestId, createdAt: expense.createdAt, updatedAt: expense.updatedAt, revisionNumber: expense.revisionNumber }; }
async function insertRevision(ctx: MutationCtx, ownerId: string, id: Id<'reportedExpenses'>, revisionNumber: bigint, reason: 'created' | 'updated' | 'voided' | 'reconciled', snapshot: Doc<'reportedExpenseRevisions'>['snapshot'], recordedAt: number) { return await ctx.db.insert('reportedExpenseRevisions', { ownerId, reportedExpenseId: id, revisionNumber, reason, snapshot, recordedAt }); }
async function auditExpense(ctx: MutationCtx, ownerId: string, action: 'reported_expense.created' | 'reported_expense.updated' | 'reported_expense.voided', id: Id<'reportedExpenses'>, revisionId: Id<'reportedExpenseRevisions'>, occurredAt: number) { await ctx.db.insert('auditEvents', { ownerId, action, targetType: 'reported_expense', targetId: id, revisionId, result: 'succeeded', occurredAt }); }
type ErrorCode = 'CLIENT_REQUEST_ID_REUSED' | 'FINANCIAL_CYCLE_NOT_OPEN' | 'FINANCIAL_CYCLE_NOT_FOUND' | 'EXPENSE_OUTSIDE_CURRENT_CYCLE' | 'REPORTED_EXPENSE_NOT_FOUND' | 'REPORTED_EXPENSE_NOT_EDITABLE' | 'RECONCILED_EXPENSE_CANNOT_BE_VOIDED' | 'REPORTED_EXPENSE_ALREADY_RECONCILED' | 'REPORTED_EXPENSE_NOT_RECONCILABLE' | 'RECONCILIATION_CANDIDATE_INVALID' | 'SOURCE_TRANSACTION_ALREADY_USED' | 'RECONCILIATION_WINDOW_TOO_LARGE' | 'INVALID_REPORTED_EXPENSE_AMOUNT' | 'INVALID_REPORTED_EXPENSE_DESCRIPTION' | 'INVALID_DATE' | 'INVALID_CLIENT_REQUEST_ID';
function throwError(code: ErrorCode): never { throw new ConvexError({ code }); }
