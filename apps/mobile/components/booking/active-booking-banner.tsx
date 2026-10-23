import { SlotMeter } from '@/components/booking/slot-meter';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Booking } from '@/lib/api';
import { formatSlot } from '@/lib/schedule';
import { router } from 'expo-router';
import { ChevronRightIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

export function ActiveBookingBanner({ booking }: { booking: Booking }) {
  const { trip } = booking;
  const label =
    trip.status === 'filling' || trip.status === 'ready'
      ? booking.order
        ? 'Waiting for a trike…'
        : trip.status === 'filling'
          ? 'Batching your parcel'
          : booking.scheduledFor
            ? `Scheduled · ${formatSlot(booking.scheduledFor)}`
            : 'Finding a rider'
      : booking.pickedUp
        ? 'Out for delivery'
        : 'Rider on the way to pick up';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/booking/[id]', params: { id: booking.id } })}
      className="gap-3 rounded-3xl bg-white p-5 active:opacity-90">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-poppins text-xs uppercase tracking-wider text-brand-navy/50">
            {booking.order ? `Order from ${booking.order.merchantName}` : 'Delivery in progress'}
          </Text>
          <Text className="font-poppins-bold text-lg text-brand-navy">{label}</Text>
        </View>
        <Icon as={ChevronRightIcon} size={24} className="text-brand-navy" />
      </View>
      {trip.status === 'filling' && (
        <SlotMeter filled={trip.slotsFilled} capacity={trip.capacity} />
      )}
    </Pressable>
  );
}
