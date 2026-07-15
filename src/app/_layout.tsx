import { DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { Colors } from '@/constants/theme';

import '@/global.css';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
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

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="dark" />
      <AppTabs />
    </ThemeProvider>
  );
}
