import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset } from '@/constants/theme';

export function ImportScreen() {
  const router = useRouter();
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
          <Text variant="overline">Companion web</Text>
          <Text variant="screenTitle">Importar arquivos</Text>
          <Text variant="caption">
            Ciclo mensal com Itaú Pessoal, fatura e Itaú Empresa
          </Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>Faça o envio pelo computador</CardTitle>
            <CardDescription className="text-body leading-6">
              A seleção e o envio do arquivo ficam disponíveis na versão web do mesmo Brenotion.
              Depois do processamento temporário, o arquivo bruto é apagado e somente os dados
              estruturados seguem para confirmação. Cada entrada mantém seu Patrimônio de Origem.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <Button className="w-full" onPress={() => router.replace('/review')}>
              <Text>Ir para Revisar</Text>
            </Button>
            <Button variant="outline" onPress={() => router.replace('/more')}>
              <Text>Voltar para Mais</Text>
            </Button>
          </CardContent>
        </Card>

        <View className="gap-1 px-1">
          <Text variant="label">No Android</Text>
          <Text variant="caption" className="leading-5">
            Use Revisar para acompanhar os lotes confirmados e as movimentações importadas no dia a
            dia.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
