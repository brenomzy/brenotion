const { platformSelect } = require('nativewind/theme');
const colors = require('tailwindcss/colors');

const zinc25NativeFallback = '#FCFCFC';

const isWebBuild =
  process.env.NATIVEWIND_OS === undefined || process.env.NATIVEWIND_OS === 'web';

function semanticColor(variable, nativeFallback) {
  return isWebBuild
    ? `oklch(var(--${variable}) / <alpha-value>)`
    : nativeFallback;
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  safelist: ['bg-zinc-25'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        zinc: {
          25: semanticColor('zinc-25', zinc25NativeFallback),
        },
        canvas: semanticColor('canvas', zinc25NativeFallback),
        surface: semanticColor('surface', colors.white),
        'surface-muted': semanticColor('surface-muted', colors.zinc[100]),
        ink: semanticColor('ink', colors.zinc[950]),
        'ink-muted': semanticColor('ink-muted', colors.zinc[600]),
        'ink-on-action': semanticColor('ink-on-action', colors.white),
        divider: semanticColor('divider', colors.zinc[200]),
        'action-primary': semanticColor('action-primary', colors.zinc[950]),
        'action-primary-soft': semanticColor('action-primary-soft', colors.zinc[100]),
        'action-primary-pressed': semanticColor('action-primary-pressed', colors.zinc[800]),
        'focus-ring': semanticColor('focus-ring', colors.zinc[500]),
        'scope-personal': semanticColor('scope-personal', colors.zinc[700]),
        'scope-personal-soft': semanticColor('scope-personal-soft', colors.zinc[100]),
        'scope-company': semanticColor('scope-company', colors.zinc[950]),
        'scope-company-soft': semanticColor('scope-company-soft', colors.zinc[100]),
        'money-protected': semanticColor('money-protected', colors.zinc[200]),
        'status-recent': semanticColor('status-recent', colors.zinc[800]),
        'status-recent-soft': semanticColor('status-recent-soft', colors.zinc[100]),
        'status-warning': semanticColor('status-warning', colors.zinc[700]),
        'status-warning-soft': semanticColor('status-warning-soft', colors.zinc[200]),
        'status-danger': semanticColor('status-danger', colors.zinc[950]),
        'status-danger-soft': semanticColor('status-danger-soft', colors.zinc[300]),
      },
      fontFamily: {
        sans: isWebBuild
          ? '"Geist_400Regular", ui-sans-serif, system-ui, sans-serif'
          : platformSelect({
              android: 'Geist_400Regular',
              ios: 'Geist_400Regular',
            }),
        'sans-medium': isWebBuild
          ? '"Geist_500Medium", ui-sans-serif, system-ui, sans-serif'
          : platformSelect({
              android: 'Geist_500Medium',
              ios: 'Geist_500Medium',
            }),
        'sans-semibold': isWebBuild
          ? '"Geist_600SemiBold", ui-sans-serif, system-ui, sans-serif'
          : platformSelect({
              android: 'Geist_600SemiBold',
              ios: 'Geist_600SemiBold',
            }),
        'sans-bold': isWebBuild
          ? '"Geist_700Bold", ui-sans-serif, system-ui, sans-serif'
          : platformSelect({
              android: 'Geist_700Bold',
              ios: 'Geist_700Bold',
            }),
      },
      fontSize: {
        'display-money': ['44px', { lineHeight: '48px', letterSpacing: '-1px' }],
        'title-screen': ['28px', { lineHeight: '32px', letterSpacing: '-0.4px' }],
        'title-section': ['20px', { lineHeight: '24px', letterSpacing: '-0.2px' }],
        body: ['16px', { lineHeight: '24px' }],
        label: ['14px', { lineHeight: '20px' }],
        caption: ['13px', { lineHeight: '18px' }],
        overline: ['12px', { lineHeight: '16px', letterSpacing: '0.5px' }],
      },
      borderRadius: {
        control: '8px',
        card: '12px',
      },
      boxShadow: {
        card: isWebBuild
          ? [
              '0 0 0 1px oklch(0 0 0 / 0.06)',
              '0 1px 2px -1px oklch(0 0 0 / 0.06)',
              '0 2px 4px oklch(0 0 0 / 0.04)',
            ].join(', ')
          : '0 1px 3px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
