/// <reference types="vite/client" />
import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const OWNER = 'user_test_authorized_owner';
type Cycle = { financialCycleId: Id<'financialCycles'>; startedOn: string; expectedNextReceiptOn: string; timeZone: string; status: 'open'; clientRequestId: string; openedAt: number };
const getCurrent = makeFunctionReference<'query', Record<string, never>, Cycle | null>('financialCycles:getCurrent');
const open = makeFunctionReference<'mutation', { startedOn: string; expectedNextReceiptOn: string; timeZone: string; clientRequestId: string }, { status: 'created' | 'unchanged'; cycle: Cycle }>('financialCycles:open');

describe('financialCycles', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('authorizes, opens explicitly and enforces one idempotent open cycle', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', OWNER);
    const backend = convexTest(schema, modules);
    await expect(backend.query(getCurrent, {})).rejects.toMatchObject({ data: { code: 'AUTHENTICATION_REQUIRED' } });
    const owner = backend.withIdentity({ subject: OWNER });
    const input = { startedOn: '2026-07-10', expectedNextReceiptOn: '2026-08-10', timeZone: 'America/Sao_Paulo', clientRequestId: 'synthetic-cycle-1' };
    const created = await owner.mutation(open, input);
    await expect(owner.mutation(open, input)).resolves.toEqual({ status: 'unchanged', cycle: created.cycle });
    await expect(owner.query(getCurrent, {})).resolves.toEqual(created.cycle);
    await expect(owner.mutation(open, { ...input, clientRequestId: 'synthetic-cycle-2', startedOn: '2026-08-10', expectedNextReceiptOn: '2026-09-10' })).rejects.toMatchObject({ data: { code: 'FINANCIAL_CYCLE_ALREADY_OPEN' } });
    await expect(owner.mutation(open, { ...input, clientRequestId: 'synthetic-cycle-3', expectedNextReceiptOn: '2026-07-01' })).rejects.toMatchObject({ data: { code: 'INVALID_CYCLE_RANGE' } });
    const audits = await backend.run(async (ctx) => (await ctx.db.query('auditEvents').take(5)).filter((e) => e.targetType === 'financial_cycle'));
    expect(audits).toHaveLength(1);
  });
});
