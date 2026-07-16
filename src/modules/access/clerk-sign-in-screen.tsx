import { AuthView } from '@clerk/expo/native';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';

export function ClerkSignInScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        backgroundColor: Colors.light.background,
      }}>
      <View style={{ width: '100%', height: '78%' }}>
        <AuthView mode="signIn" isDismissible={false} logoMaxHeight={56} />
      </View>
    </View>
  );
}
