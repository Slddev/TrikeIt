import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { View } from 'react-native';

export function SlotMeter({ filled, capacity }: { filled: number; capacity: number }) {
  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        {Array.from({ length: capacity }, (_, i) => (
          <View
            key={i}
            className={cn(
              'h-3 flex-1 rounded-full',
              i < filled ? 'bg-brand-navy' : 'bg-brand-navy/15'
            )}
          />
        ))}
      </View>
      <Text className="font-poppins-medium text-sm text-brand-navy/70">
        {filled} of {capacity} slots booked
      </Text>
    </View>
  );
}
