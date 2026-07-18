/* eslint-disable import/no-unresolved -- HugeIcons publishes per-icon JS subpaths without per-icon declarations. */
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon';
import Home01Icon from '@hugeicons/core-free-icons/Home01Icon';
import MoreHorizontalCircle01Icon from '@hugeicons/core-free-icons/MoreHorizontalCircle01Icon';
import PieChartIcon from '@hugeicons/core-free-icons/PieChartIcon';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
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
    icon: Home01Icon,
  },
  {
    name: 'plan',
    href: '/plan',
    label: 'Plano',
    icon: PieChartIcon,
  },
  {
    name: 'review',
    href: '/review',
    label: 'Revisar',
    icon: CheckmarkCircle02Icon,
  },
  {
    name: 'more',
    href: '/more',
    label: 'Mais',
    icon: MoreHorizontalCircle01Icon,
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
}: TabTriggerSlotProps & { icon: IconSvgElement }) {
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
          <HugeiconsIcon
            aria-hidden
            icon={icon}
            size={19}
            color={tintColor}
            strokeWidth={1.8}
          />
        </View>
        <Text
          variant="caption"
          className={cn(
            'font-sans-semibold',
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
