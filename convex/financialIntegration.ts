import { ConvexError, v } from 'convex/values';

import { action, env } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';
import {
  inspectPluggyConnection,
  PluggyIntegrationError,
  readPluggyConfig,
} from './lib/pluggyClient';

const accountCoverageValidator = v.object({
  total: v.number(),
  bank: v.number(),
  credit: v.number(),
  subtypes: v.array(v.string()),
});

export const inspectConnection = action({
  args: {},
  returns: v.object({
    availability: v.union(v.literal('ready'), v.literal('partial'), v.literal('unavailable')),
    connectorName: v.string(),
    itemStatus: v.string(),
    executionStatus: v.string(),
    lastUpdatedAt: v.union(v.string(), v.null()),
    nextAutoSyncAt: v.union(v.string(), v.null()),
    accountWarningCount: v.number(),
    accounts: v.union(accountCoverageValidator, v.null()),
  }),
  handler: async (ctx) => {
    await requireAuthorizedOwner(ctx);

    try {
      return await inspectPluggyConnection(readPluggyConfig(env));
    } catch (error) {
      if (error instanceof PluggyIntegrationError) {
        throw new ConvexError({
          code: error.code,
          httpStatus: error.httpStatus,
          errorId: error.errorId,
        });
      }

      throw new ConvexError({ code: 'PLUGGY_UNEXPECTED_ERROR' });
    }
  },
});
