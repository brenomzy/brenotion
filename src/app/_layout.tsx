import { DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { Colors } from '@/constants/theme';
import { AccessProvider, useAccessSession } from '@/modules/access/clerk-access-session';
import {
  AccessConfigurationScreen,
  AccessDeniedScreen,
  AccessLoadingScreen,
  AccessUnavailableScreen,
} from '@/modules/access/access-screen';
import { ClerkSignInScreen } from '@/modules/access/clerk-sign-in-screen';
import { useServerAuthorization } from '@/modules/access/server-authorization';

import '@/global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AccessProvider missingConfigurationFallback={<AccessConfigurationScreen />}>
      <ProtectedApp />
    </AccessProvider>
  );
}

function ProtectedApp() {
  const access = useAccessSession();

  if (access.status === 'loading') {
    return <AccessLoadingScreen />;
  }

  if (access.status === 'signed-out') {
    return <ClerkSignInScreen />;
  }

  return <ServerAuthorizedApp />;
}

function ServerAuthorizedApp() {
  const authorization = useServerAuthorization();
  const nativeColors = Colors.light;
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: nativeColors.background,
      card: nativeColors.backgroundElement,
      text: nativeColors.text,
      border: nativeColors.divider,
      primary: nativeColors.actionPrimary,
    },
  };

  if (authorization.status === 'loading') {
    return <AccessLoadingScreen />;
  }

  if (authorization.status === 'denied') {
    return <AccessDeniedScreen />;
  }

  if (authorization.status === 'unavailable') {
    return <AccessUnavailableScreen />;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="dark" />
      <AppTabs />
    </ThemeProvider>
  );
}
