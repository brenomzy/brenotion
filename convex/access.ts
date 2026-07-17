import { v } from 'convex/values';

import { query } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';

export const verifyOwner = query({
  args: {},
  returns: v.object({
    status: v.literal('authorized'),
  }),
  handler: async (ctx) => {
    await requireAuthorizedOwner(ctx);

    return { status: 'authorized' as const };
  },
});
