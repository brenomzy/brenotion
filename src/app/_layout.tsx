import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

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
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
