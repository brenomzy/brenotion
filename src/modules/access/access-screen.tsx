import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme';

export function AccessLoadingScreen() {
  return (
    <AccessScreenFrame>
      <Card>
        <CardContent className="flex-row items-center gap-3">
          <ActivityIndicator color={Colors.light.actionPrimary} />
          <Text>Verificando acesso seguro…</Text>
        </CardContent>
      </Card>
    </AccessScreenFrame>
  );
}

export function AccessConfigurationScreen() {
  return (
    <AccessScreenFrame>
      <Card>
        <CardHeader>
          <CardTitle>Configuração local necessária</CardTitle>
          <CardDescription className="text-body leading-6">
            Defina EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY e EXPO_PUBLIC_CONVEX_URL no arquivo .env local
            e reinicie o Metro. Nenhum valor deve ser enviado pela conversa ou registrado no Git.
          </CardDescription>
        </CardHeader>
      </Card>
    </AccessScreenFrame>
  );
}

export function AccessDeniedScreen() {
  return (
    <AccessScreenFrame>
      <Card>
        <CardHeader>
          <CardTitle>Acesso não autorizado</CardTitle>
          <CardDescription className="text-body leading-6">
            Esta identidade não está autorizada a acessar o Brenotion. Nenhum dado financeiro foi
            carregado.
          </CardDescription>
        </CardHeader>
      </Card>
    </AccessScreenFrame>
  );
}

export function AccessUnavailableScreen() {
  return (
    <AccessScreenFrame>
      <Card>
        <CardHeader>
          <CardTitle>Não foi possível validar o acesso</CardTitle>
          <CardDescription className="text-body leading-6">
            A validação segura com o backend está indisponível. Tente novamente após verificar a
            conexão e a configuração de desenvolvimento.
          </CardDescription>
        </CardHeader>
      </Card>
    </AccessScreenFrame>
  );
}

function AccessScreenFrame({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingTop: Platform.OS === 'web' ? 40 : insets.top + 24,
        paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 24,
      }}>
      <View className="w-full max-w-[520px] self-center gap-6 px-5 web:px-8">{children}</View>
    </ScrollView>
  );
}
