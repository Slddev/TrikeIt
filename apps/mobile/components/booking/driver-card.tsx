import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Booking } from '@/lib/api';
import { call } from '@/lib/navigation';
import { PhoneIcon, UserIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

export function DriverCard({ driver }: { driver: NonNullable<Booking['driver']> }) {
  const vehicle = [
    driver.plateNumber && `Plate ${driver.plateNumber}`,
    driver.bodyNumber && `Body no. ${driver.bodyNumber}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="flex-row items-center gap-4 rounded-2xl bg-brand-cream p-4">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-navy">
        <Icon as={UserIcon} size={22} className="text-brand-yellow" />
      </View>
      <View className="flex-1">
        <Text className="font-poppins-semibold text-base text-brand-navy">{driver.name}</Text>
        {!!vehicle && <Text className="font-poppins text-sm text-brand-navy/70">{vehicle}</Text>}
        {!!driver.todaName && (
          <Text className="font-poppins text-xs text-brand-navy/60">{driver.todaName}</Text>
        )}
      </View>
      {!!driver.phoneNumber && (
        <Pressable
          onPress={() => call(driver.phoneNumber!)}
          accessibilityLabel={`Call ${driver.name}`}
          className="h-12 w-12 items-center justify-center rounded-full bg-brand-navy active:opacity-80">
          <Icon as={PhoneIcon} size={20} className="text-brand-yellow" />
        </Pressable>
      )}
    </View>
  );
}
