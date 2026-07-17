import { query } from './_generated/server';
import { requireAuthorizedOwner } from './lib/authorization';

export const verifyOwner = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthorizedOwner(ctx);

    return { status: 'authorized' as const };
  },
});
