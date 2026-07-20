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

export function MoreScreen() {
  return <MoreScreenContent model={null} />;
}

export function SyntheticMoreScreen({ model }: { model: MoreScreenModel }) {
  return <MoreScreenContent model={model} />;
}

function MoreScreenContent({ model }: { model: MoreScreenModel | null }) {
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
          <Text variant="overline">Configurações</Text>
          <Text variant="screenTitle">Mais</Text>
          <Text variant="caption">Acesso do Titular e configurações</Text>
        </View>

        {model ? (
          model.scenario === 'loading' ? (
            <MoreLoading />
          ) : model.scenario === 'recent' ? (
            <Card>
              <CardHeader>
                <Text variant="overline">Demonstração com dados sintéticos</Text>
                <CardTitle>{model.state.title}</CardTitle>
                <DataConfidence
                  status="recent"
                  description={model.state.description}
                />
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
          )
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Importação financeira</CardTitle>
            <CardDescription className="text-body leading-6">
              Acompanhe por competência o Itaú Pessoal, a fatura e o Itaú Empresa
              pelo companion web. Depois, revise os lotes confirmados.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <Button variant="secondary" className="w-full" onPress={() => router.push('/import')}>
              <Text>Importar extrato ou fatura</Text>
            </Button>
            <Button variant="ghost" className="w-full" onPress={() => router.push('/review')}>
              <Text>Revisar importações</Text>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Obrigações</CardTitle>
            <CardDescription className="text-body leading-6">
              Configure compromissos recorrentes com Natureza Econômica e origem
              pagadora independentes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="w-full"
              onPress={() => router.push('/obligations')}>
              <Text>Gerenciar Obrigações</Text>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fechamento Mensal</CardTitle>
            <CardDescription className="text-body leading-6">
              Revise cobertura e lacunas da competência. O registro atual é
              parcial e não publica Disponível para Gastar, limites ou reservas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="w-full"
              onPress={() => router.push('/close')}>
              <Text>Abrir Fechamento Mensal</Text>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ciclo Financeiro e Gastos Informados</CardTitle>
            <CardDescription className="text-body leading-6">
              Abra o ciclo explicitamente e registre gastos recentes como
              provisórios, sem inventar impacto no Plano Financeiro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="w-full"
              onPress={() => router.push('/reported-expenses')}>
              <Text>Abrir ciclo atual</Text>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferências e Cofre Fiscal</CardTitle>
            <CardDescription className="text-body leading-6">
              Entradas iniciais preservadas para uma fatia posterior, sem
              documentos ou identificadores financeiros nesta demonstração.
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
