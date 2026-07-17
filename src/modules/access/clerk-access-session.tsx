import { ClerkProvider, useAuth, useClerk } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { ptBR } from '@clerk/localizations/pt-BR';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useCallback, type ReactNode } from 'react';

import { type AccessActionResult, type AccessSession } from './access-session';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL?.trim();
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function AccessProvider({
  children,
  missingConfigurationFallback,
}: {
  children: ReactNode;
  missingConfigurationFallback: ReactNode;
}) {
  if (!publishableKey || !convexClient) {
    return missingConfigurationFallback;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} localization={ptBR}>
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

export function useAccessSession(): AccessSession {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const { signOut: clerkSignOut } = useClerk();

  const signOut = useCallback(async (): Promise<AccessActionResult> => {
    try {
      await clerkSignOut();
      return { status: 'success' };
    } catch {
      return { status: 'unavailable' };
    }
  }, [clerkSignOut]);

  if (!isLoaded) {
    return { status: 'loading', signOut };
  }

  return {
    status: isSignedIn ? 'signed-in' : 'signed-out',
    signOut,
  };
}
