import { useConvex, useConvexAuth } from 'convex/react';
import { ConvexError } from 'convex/values';
import { useEffect, useState } from 'react';

import { api } from '../../../convex/_generated/api';

type ServerAuthorization =
  | { status: 'loading' }
  | { status: 'authorized' }
  | { status: 'denied' }
  | { status: 'unavailable' };

export function useServerAuthorization(): ServerAuthorization {
  const convex = useConvex();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [authorization, setAuthorization] = useState<ServerAuthorization | null>(null);

  useEffect(() => {
    let isCurrent = true;

    if (isLoading || !isAuthenticated) {
      return () => {
        isCurrent = false;
      };
    }

    void convex
      .query(api.access.verifyOwner, {})
      .then(() => {
        if (isCurrent) {
          setAuthorization({ status: 'authorized' });
        }
      })
      .catch((error: unknown) => {
        if (!isCurrent) {
          return;
        }

        setAuthorization({ status: isAuthorizationDenial(error) ? 'denied' : 'unavailable' });
      });

    return () => {
      isCurrent = false;
    };
  }, [convex, isAuthenticated, isLoading]);

  if (isLoading) {
    return { status: 'loading' };
  }

  if (!isAuthenticated) {
    return { status: 'unavailable' };
  }

  return authorization ?? { status: 'loading' };
}

function isAuthorizationDenial(error: unknown): boolean {
  if (!(error instanceof ConvexError) || typeof error.data !== 'object' || error.data === null) {
    return false;
  }

  const code = 'code' in error.data ? error.data.code : undefined;

  return code === 'AUTHENTICATION_REQUIRED' || code === 'ACCESS_DENIED';
}
