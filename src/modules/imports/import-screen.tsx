import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset } from '@/constants/theme';

export function ImportScreen() {
  const router = useRouter();
  const { competence: competenceParam } = useLocalSearchParams<{
    competence?: string | string[];
  }>();
  const requestedCompetence = Array.isArray(competenceParam)
    ? competenceParam[0]
    : competenceParam;
  const competence =
    requestedCompetence &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedCompetence)
      ? requestedCompetence
      : null;
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + BottomTabInset + 32,
      }}>
      <View className="w-full max-w-[720px] self-center gap-6 px-5">
        <View className="gap-1">
          <Text variant="overline">Organização mensal</Text>
          <Text variant="screenTitle">Atualizar mês</Text>
          <Text variant="caption">
            Itaú Pessoal, fatura do cartão e Itaú Empresa
          </Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>Adicione as três fontes pelo computador</CardTitle>
            <CardDescription className="text-body leading-6">
              A atualização fica disponível na versão web do mesmo Brenotion. Você confere cada
              prévia antes de confirmar; o arquivo bruto é apagado e somente os dados estruturados
              permanecem. Cada fonte mantém seu Patrimônio de Origem.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <Button
              className="w-full"
              disabled={!competence}
              onPress={() =>
                competence
                  ? router.replace({
                      pathname: '/review',
                      params: { competence },
                    })
                  : undefined
              }>
              <Text>Ver dados já adicionados</Text>
            </Button>
            {!competence ? (
              <Text variant="caption">
                Abra Atualizar mês pelo Início para preservar a competência.
              </Text>
            ) : null}
            <Button variant="outline" onPress={() => router.replace('/')}>
              <Text>Voltar ao Início</Text>
            </Button>
          </CardContent>
        </Card>

        <View className="gap-1 px-1">
          <Text variant="label">Acompanhe pelo Android</Text>
          <Text variant="caption" className="leading-5">
            Consulte os dados já adicionados. O envio de novos arquivos continua no companion web.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
