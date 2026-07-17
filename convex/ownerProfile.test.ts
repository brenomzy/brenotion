/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';

describe('ownerProfile', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('denies unauthenticated and non-owner reads and writes', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const unauthenticated = convexTest(schema, modules);
    const otherUser = convexTest(schema, modules).withIdentity({
      subject: SYNTHETIC_OTHER_ID,
    });

    await expect(unauthenticated.query(api.ownerProfile.getCurrent)).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    await expect(
      unauthenticated.mutation(api.ownerProfile.updatePreferences, {
        timeZone: 'America/Sao_Paulo',
      }),
    ).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    await expect(otherUser.query(api.ownerProfile.getCurrent)).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
    await expect(
      otherUser.mutation(api.ownerProfile.updatePreferences, {
        timeZone: 'America/Sao_Paulo',
      }),
    ).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
  });

  it('upserts preferences idempotently and keeps the owner isolated', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules).withIdentity({ subject: SYNTHETIC_OWNER_ID });

    await t.run(async (ctx) => {
      await ctx.db.insert('ownerProfiles', {
        ownerId: 'synthetic-identity|isolated-owner',
        preferredCurrency: 'BRL',
        locale: 'pt-BR',
        timeZone: 'UTC',
        updatedAt: 1,
      });
    });

    const created = await t.mutation(api.ownerProfile.updatePreferences, {
      timeZone: ' America/Sao_Paulo ',
    });
    const unchanged = await t.mutation(api.ownerProfile.updatePreferences, {
      timeZone: 'America/Sao_Paulo',
    });

    expect(created.status).toBe('created');
    expect(unchanged).toEqual({
      status: 'unchanged',
      preferences: created.preferences,
    });
    await expect(t.query(api.ownerProfile.getCurrent)).resolves.toEqual(created.preferences);

    const stored = await t.run(async (ctx) => ({
      profiles: await ctx.db.query('ownerProfiles').take(3),
      auditEvents: await ctx.db
        .query('auditEvents')
        .withIndex('by_ownerId_and_occurredAt')
        .take(3),
    }));

    expect(stored.profiles).toHaveLength(2);
    expect(stored.profiles.filter((profile) => profile.timeZone === 'America/Sao_Paulo')).toHaveLength(
      1,
    );
    expect(stored.auditEvents).toHaveLength(1);
    expect(stored.auditEvents[0]).toMatchObject({
      action: 'owner_profile.created',
      targetType: 'owner_profile',
      result: 'succeeded',
    });
  });

  it('updates the existing profile instead of creating a duplicate', async () => {
    vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
    const t = convexTest(schema, modules).withIdentity({ subject: SYNTHETIC_OWNER_ID });

    await t.mutation(api.ownerProfile.updatePreferences, {
      timeZone: 'America/Sao_Paulo',
    });
    const updated = await t.mutation(api.ownerProfile.updatePreferences, {
      timeZone: 'UTC',
    });

    expect(updated.status).toBe('updated');
    expect(updated.preferences.timeZone).toBe('UTC');

    const counts = await t.run(async (ctx) => ({
      profiles: (await ctx.db.query('ownerProfiles').take(3)).length,
      auditEvents: (await ctx.db.query('auditEvents').take(3)).length,
    }));
    expect(counts).toEqual({ profiles: 1, auditEvents: 2 });
  });
});
