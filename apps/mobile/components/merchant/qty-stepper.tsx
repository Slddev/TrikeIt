import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { MinusIcon, PlusIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

export function QtyStepper({
  value,
  onChange,
  min = 1,
  size = 'md',
}: {
  value: number;
  onChange: (qty: number) => void;
  min?: number;
  size?: 'sm' | 'md';
}) {
  const box = size === 'sm' ? 'h-7 w-7' : 'h-10 w-10';
  const icon = size === 'sm' ? 14 : 18;
  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        onPress={() => onChange(value - 1)}
        disabled={value <= min}
        accessibilityLabel="Fewer"
        className={cn(
          box,
          'items-center justify-center rounded-full bg-brand-yellow active:opacity-80',
          value <= min && 'opacity-40'
        )}>
        <Icon as={MinusIcon} size={icon} className="text-brand-navy" />
      </Pressable>
      <Text className="min-w-6 text-center font-poppins-semibold text-base text-brand-navy">
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        disabled={value >= 50}
        accessibilityLabel="More"
        className={cn(
          box,
          'items-center justify-center rounded-full bg-brand-navy active:opacity-80'
        )}>
        <Icon as={PlusIcon} size={icon} className="text-brand-yellow" />
      </Pressable>
    </View>
  );
}
