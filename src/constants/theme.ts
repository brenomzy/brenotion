import { Platform } from 'react-native';

// Native platform APIs do not consume NativeWind CSS variables. These values are
// sRGB fallbacks for navigation chrome and legacy starter components only; the
// semantic OKLCH source of truth lives in global.css.
export const Colors = {
  light: {
    text: '#09090B',
    background: '#FCFCFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F4F4F5',
    textSecondary: '#52525B',
    actionPrimary: '#09090B',
    divider: '#E4E4E7',
  },
  dark: {
    text: '#F5F5F5',
    background: '#111111',
    backgroundElement: '#1B1B1B',
    backgroundSelected: '#2A2A2A',
    textSecondary: '#A3A3A3',
    actionPrimary: '#F5F5F5',
    divider: '#333333',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'ui-sans-serif, system-ui, sans-serif',
    serif: 'Georgia, serif',
    rounded: 'ui-rounded, system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 72 }) ?? 0;
export const MaxContentWidth = 800;
