import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import { appendAuditEvent, normalizeTimeZone } from './lib/persistence';

const preferencesValidator = v.object({
  preferredCurrency: v.literal('BRL'),
  locale: v.literal('pt-BR'),
  timeZone: v.string(),
  updatedAt: v.number(),
});

export const getCurrent = query({
  args: {},
  returns: v.union(preferencesValidator, v.null()),
  handler: async (ctx) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const profile = await ctx.db
      .query('ownerProfiles')
      .withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
      .unique();

    if (!profile) {
      return null;
    }

    return toPreferences(profile);
  },
});

export const updatePreferences = mutation({
  args: {
    timeZone: v.string(),
  },
  returns: v.object({
    status: v.union(v.literal('created'), v.literal('updated'), v.literal('unchanged')),
    preferences: preferencesValidator,
  }),
  handler: async (ctx, args) => {
    const { ownerId } = await requireAuthorizedOwner(ctx);
    const timeZone = normalizeTimeZone(args.timeZone);
    const existing = await ctx.db
      .query('ownerProfiles')
      .withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
      .unique();

    if (existing?.timeZone === timeZone) {
      return {
        status: 'unchanged' as const,
        preferences: toPreferences(existing),
      };
    }

    const updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch('ownerProfiles', existing._id, {
        timeZone,
        updatedAt,
      });
      await appendAuditEvent(
        ctx,
        ownerId,
        {
          action: 'owner_profile.preferences_updated',
          targetType: 'owner_profile',
          targetId: existing._id,
        },
        updatedAt,
      );

      return {
        status: 'updated' as const,
        preferences: {
          preferredCurrency: existing.preferredCurrency,
          locale: existing.locale,
          timeZone,
          updatedAt,
        },
      };
    }

    const profileId = await ctx.db.insert('ownerProfiles', {
      ownerId,
      preferredCurrency: 'BRL',
      locale: 'pt-BR',
      timeZone,
      updatedAt,
    });
    await appendAuditEvent(
      ctx,
      ownerId,
      {
        action: 'owner_profile.created',
        targetType: 'owner_profile',
        targetId: profileId,
      },
      updatedAt,
    );

    return {
      status: 'created' as const,
      preferences: {
        preferredCurrency: 'BRL' as const,
        locale: 'pt-BR' as const,
        timeZone,
        updatedAt,
      },
    };
  },
});

function toPreferences(profile: {
  preferredCurrency: 'BRL';
  locale: 'pt-BR';
  timeZone: string;
  updatedAt: number;
}) {
  return {
    preferredCurrency: profile.preferredCurrency,
    locale: profile.locale,
    timeZone: profile.timeZone,
    updatedAt: profile.updatedAt,
  };
}
