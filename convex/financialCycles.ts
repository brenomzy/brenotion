import { ConvexError, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import { normalizeTimeZone } from './lib/persistence';

const cycleValidator = v.object({
  financialCycleId: v.id('financialCycles'),
  startedOn: v.string(),
  expectedNextReceiptOn: v.string(),
  timeZone: v.string(),
  status: v.literal('open'),
  clientRequestId: v.string(),
  openedAt: v.number(),
});

export const getCurrent = query({
  args: {},
  returns: v.union(v.null(), cycleValidator),
  handler: async (ctx) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const cycle = await ctx.db
      .query('financialCycles')
      .withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId).eq('status', 'open'))
      .unique();
    return cycle ? toCycle(cycle) : null;
  },
});

export const open = mutation({
  args: {
    startedOn: v.string(),
    expectedNextReceiptOn: v.string(),
    timeZone: v.string(),
    clientRequestId: v.string(),
  },
  returns: v.object({
    status: v.union(v.literal('created'), v.literal('unchanged')),
    cycle: cycleValidator,
  }),
  handler: async (ctx, args) => {
    const startedOn = validateIsoDate(args.startedOn);
    const expectedNextReceiptOn = validateIsoDate(args.expectedNextReceiptOn);
    if (expectedNextReceiptOn <= startedOn) throwError('INVALID_CYCLE_RANGE');
    const timeZone = normalizeTimeZone(args.timeZone);
    const clientRequestId = validateRequestId(args.clientRequestId);
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const existingRequest = await ctx.db
      .query('financialCycles')
      .withIndex('by_ownerId_and_clientRequestId', (q) =>
        q.eq('ownerId', ownerId).eq('clientRequestId', clientRequestId),
      )
      .unique();
    if (existingRequest) {
      if (
        existingRequest.startedOn !== startedOn ||
        existingRequest.expectedNextReceiptOn !== expectedNextReceiptOn ||
        existingRequest.timeZone !== timeZone
      ) throwError('CLIENT_REQUEST_ID_REUSED');
      return { status: 'unchanged' as const, cycle: toCycle(existingRequest) };
    }
    const current = await ctx.db
      .query('financialCycles')
      .withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId).eq('status', 'open'))
      .unique();
    if (current) throwError('FINANCIAL_CYCLE_ALREADY_OPEN');
    const openedAt = Date.now();
    const financialCycleId = await ctx.db.insert('financialCycles', {
      ownerId,
      startedOn,
      expectedNextReceiptOn,
      timeZone,
      status: 'open',
      clientRequestId,
      openedAt,
    });
    await ctx.db.insert('auditEvents', {
      ownerId,
      action: 'financial_cycle.opened',
      targetType: 'financial_cycle',
      targetId: financialCycleId,
      result: 'succeeded',
      occurredAt: openedAt,
    });
    return {
      status: 'created' as const,
      cycle: { financialCycleId, startedOn, expectedNextReceiptOn, timeZone, status: 'open' as const, clientRequestId, openedAt },
    };
  },
});

function toCycle(cycle: Doc<'financialCycles'>) {
  return { financialCycleId: cycle._id, startedOn: cycle.startedOn, expectedNextReceiptOn: cycle.expectedNextReceiptOn, timeZone: cycle.timeZone, status: cycle.status, clientRequestId: cycle.clientRequestId, openedAt: cycle.openedAt };
}

function validateIsoDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throwError('INVALID_DATE');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== value) throwError('INVALID_DATE');
  return value;
}

function validateRequestId(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(normalized)) throwError('INVALID_CLIENT_REQUEST_ID');
  return normalized;
}

function throwError(code: 'INVALID_DATE' | 'INVALID_CYCLE_RANGE' | 'INVALID_CLIENT_REQUEST_ID' | 'CLIENT_REQUEST_ID_REUSED' | 'FINANCIAL_CYCLE_ALREADY_OPEN'): never {
  throw new ConvexError({ code });
}
