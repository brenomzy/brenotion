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
          <Text variant="screenTitle">Importar extrato</Text>
          <Text variant="caption">Envio seguro de arquivos OFX do Itaú PF</Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>Continue pelo computador</CardTitle>
            <CardDescription className="text-body leading-6">
              A importação de extratos fica disponível na versão web do mesmo Brenotion. O Android
              continua como experiência principal para consulta e decisões do dia a dia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onPress={() => router.replace('/more')}>
              <Text>Voltar para Mais</Text>
            </Button>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
