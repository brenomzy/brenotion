import { SignIn } from '@clerk/expo/web';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';

export function ClerkSignInScreen() {
  const colors = Colors.light;

  return (
    <View className="flex-1 items-center justify-center bg-canvas px-5 py-10">
      <SignIn
        appearance={{
          variables: {
            colorBackground: colors.backgroundElement,
            colorBorder: colors.divider,
            colorForeground: colors.text,
            colorInput: colors.backgroundSelected,
            colorInputForeground: colors.text,
            colorMutedForeground: colors.textSecondary,
            colorPrimary: colors.actionPrimary,
            borderRadius: '12px',
            fontFamily: 'Geist_400Regular, ui-sans-serif, system-ui, sans-serif',
          },
        }}
        fallbackRedirectUrl="/"
        oauthFlow="popup"
        withSignUp={false}
      />
    </View>
  );
}
