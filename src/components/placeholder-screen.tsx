import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset } from '@/constants/theme';

export function PlaceholderScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{
        paddingTop: Platform.OS === 'web' ? 40 : insets.top + 16,
        paddingBottom: insets.bottom + BottomTabInset + 32,
      }}>
      <View className="w-full max-w-[720px] self-center gap-6 px-5 web:px-8">
        <View className="gap-1">
          <Text variant="overline">Próxima fatia</Text>
          <Text variant="screenTitle">{title}</Text>
        </View>
        <Card>
          <CardHeader>
            <CardTitle>Em construção</CardTitle>
            <CardDescription className="text-body leading-6">{description}</CardDescription>
          </CardHeader>
        </Card>
      </View>
    </ScrollView>
  );
}
