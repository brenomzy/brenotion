import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset } from '@/constants/theme';
import { useAccessSession } from '@/modules/access/clerk-access-session';
import { ConnectionInspectionCard } from '@/modules/financial-integration/connection-inspection-card';

export default function MoreRoute() {
  const access = useAccessSession();
  const insets = useSafeAreaInsets();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  const handleSignOut = async () => {
    setSignOutFailed(false);
    setIsSigningOut(true);
    const result = await access.signOut();
    setIsSigningOut(false);
    setSignOutFailed(result.status !== 'success');
  };

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{
        paddingTop: Platform.OS === 'web' ? 40 : insets.top + 16,
        paddingBottom: insets.bottom + BottomTabInset + 32,
      }}>
      <View className="w-full max-w-[720px] self-center gap-6 px-5 web:px-8">
        <View className="gap-1">
          <Text variant="overline">Configurações</Text>
          <Text variant="screenTitle">Mais</Text>
        </View>

        <ConnectionInspectionCard />

        <Card>
          <CardHeader>
            <CardTitle>Acesso</CardTitle>
            <CardDescription className="text-body leading-6">
              Encerre a sessão deste aparelho. Um novo acesso exigirá a conta Google autorizada.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <Button variant="outline" disabled={isSigningOut} onPress={handleSignOut}>
              <Text>{isSigningOut ? 'Saindo…' : 'Sair do Brenotion'}</Text>
            </Button>
            {signOutFailed ? (
              <Text accessibilityLiveRegion="polite" variant="caption">
                Não foi possível encerrar a sessão. Verifique a conexão e tente novamente.
              </Text>
            ) : null}
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
