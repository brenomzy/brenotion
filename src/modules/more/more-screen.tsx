import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DataConfidence, ScreenStatePanel } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset } from '@/constants/theme';
import { useAccessSession } from '@/modules/access/clerk-access-session';
import { type MoreScreenModel } from './more-screen-model';

function MoreLoading() {
  return (
    <View accessibilityLiveRegion="polite" className="gap-3">
      <Text variant="sectionTitle">Carregando configurações</Text>
      <View className="h-32 rounded-card bg-surface-muted" />
    </View>
  );
}

export function MoreScreen({ model }: { model: MoreScreenModel }) {
  const router = useRouter();
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
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingTop: Platform.OS === 'web' ? 40 : insets.top + 16,
        paddingBottom: insets.bottom + BottomTabInset + 32,
      }}>
      <View className="w-full max-w-[720px] self-center gap-6 px-5 web:px-8">
        <View className="gap-1">
          <Text variant="overline">Demonstração com dados sintéticos</Text>
          <Text variant="screenTitle">Mais</Text>
          <Text variant="caption">Acesso do Titular e configurações</Text>
        </View>

        {model.scenario === 'loading' ? (
          <MoreLoading />
        ) : model.scenario === 'recent' ? (
          <Card>
            <CardHeader>
              <CardTitle>{model.state.title}</CardTitle>
              <DataConfidence status="recent" description={model.state.description} />
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full">
                <Text>{model.state.actionLabel}</Text>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ScreenStatePanel
            state={model.scenario}
            title={model.state.title}
            description={model.state.description}
            actionLabel={model.state.actionLabel!}
            onActionPress={() => undefined}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Importação financeira</CardTitle>
            <CardDescription className="text-body leading-6">
              Envie extratos OFX pelo companion web, confira a prévia e confirme somente os dados
              estruturados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" onPress={() => router.push('/import')}>
              <Text>Importar extrato OFX</Text>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferências e Cofre Fiscal</CardTitle>
            <CardDescription className="text-body leading-6">
              Entradas iniciais preservadas para a próxima fatia, sem documentos ou identificadores
              financeiros nesta demonstração.
            </CardDescription>
          </CardHeader>
        </Card>

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
