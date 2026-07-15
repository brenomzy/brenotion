import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import {
  TabList,
  type TabListProps,
  TabSlot,
  TabTrigger,
  type TabTriggerSlotProps,
  Tabs,
} from 'expo-router/ui';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme';
import { cn } from '@/lib/utils';

const TAB_ITEMS = [
  {
    name: 'home',
    href: '/',
    label: 'Início',
    icon: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  {
    name: 'plan',
    href: '/plan',
    label: 'Plano',
    icon: { ios: 'chart.pie.fill', android: 'pie_chart', web: 'pie_chart' },
  },
  {
    name: 'review',
    href: '/review',
    label: 'Revisar',
    icon: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  },
  {
    name: 'more',
    href: '/more',
    label: 'Mais',
    icon: { ios: 'ellipsis.circle.fill', android: 'more_horiz', web: 'more_horiz' },
  },
] as const;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot className="h-full" />
      <TabList asChild>
        <CustomTabList>
          {TAB_ITEMS.map((item) => (
            <TabTrigger key={item.name} name={item.name} href={item.href} asChild>
              <TabButton icon={item.icon}>{item.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  children,
  icon,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: SymbolViewProps['name'] }) {
  const tintColor = isFocused ? Colors.light.actionPrimary : Colors.light.textSecondary;
  const accessibilityLabel = typeof children === 'string' ? children : undefined;

  return (
    <Pressable
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tab"
      className="min-h-11 flex-1 items-center justify-center rounded-control px-2 active:scale-[0.96] web:transition-transform web:duration-150">
      <View className="items-center gap-1">
        <View aria-hidden importantForAccessibility="no-hide-descendants">
          <SymbolView aria-hidden name={icon} size={19} tintColor={tintColor} />
        </View>
        <Text
          variant="caption"
          className={cn(
            'font-semibold',
            isFocused ? 'text-action-primary' : 'text-ink-muted'
          )}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  return (
    <View className="absolute inset-x-0 bottom-0 z-50 border-t border-divider bg-surface/95 px-3 pb-3 pt-2 web:fixed web:backdrop-blur-xl">
      <View {...props} className="mx-auto w-full max-w-[720px] flex-row gap-1">
        {props.children}
      </View>
    </View>
  );
}
