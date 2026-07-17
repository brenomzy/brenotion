import type { GenericQueryCtx } from 'convex/server';
import { ConvexError } from 'convex/values';

import { env } from '../_generated/server';

type AuthorizationErrorCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTHORIZATION_NOT_CONFIGURED'
  | 'ACCESS_DENIED';

type AuthContext = Pick<GenericQueryCtx<Record<string, never>>, 'auth'>;

export async function requireAuthorizedOwner(ctx: AuthContext): Promise<{ ownerId: string }> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throwAuthorizationError('AUTHENTICATION_REQUIRED');
  }

  const authorizedOwnerId = env.AUTHORIZED_CLERK_USER_ID?.trim();

  if (!authorizedOwnerId) {
    throwAuthorizationError('AUTHORIZATION_NOT_CONFIGURED');
  }

  if (identity.subject !== authorizedOwnerId) {
    throwAuthorizationError('ACCESS_DENIED');
  }

  return { ownerId: identity.tokenIdentifier };
}

function throwAuthorizationError(code: AuthorizationErrorCode): never {
  throw new ConvexError({ code });
}
