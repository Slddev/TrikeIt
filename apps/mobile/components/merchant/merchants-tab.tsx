import { ActiveBookingBanner } from '@/components/booking/active-booking-banner';
import { RemoteImage } from '@/components/merchant/remote-image';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api, type Booking, type MerchantSummary } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { useCart } from '@/lib/cart';
import { currentLocation } from '@/lib/location';
import { reverseGeocode } from '@/lib/places';
import { usePoll } from '@/lib/use-poll';
import { router } from 'expo-router';
import { ChevronRightIcon, MapPinIcon, StoreIcon } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

export function MerchantsTab() {
  const { address, setAddress } = useCart();
  const { data: session } = authClient.useSession();
  const [locating, setLocating] = React.useState(!address);

  // Start from where the customer is; they can change it to any address.
  const locate = React.useEffectEvent(async () => {
    if (address) return;
    try {
      const { lng, lat } = await currentLocation();
      const place = await reverseGeocode([lng, lat]);
      setAddress({
        ...place,
        contact: {
          isMe: true,
          name: session?.user.name ?? '',
          phone: session?.user.phoneNumber ?? '',
        },
      });
    } catch {
      // Falls back to asking them to set it.
    } finally {
      setLocating(false);
    }
  });
  React.useEffect(() => {
    locate();
  }, []);
  const query = address ? `?lng=${address.coords[0]}&lat=${address.coords[1]}` : null;
  const { data: active } = usePoll(
    'active-booking',
    () => api<{ booking: Booking | null }>('/api/bookings/active'),
    { intervalMs: 8000 }
  );
  const { data, error } = usePoll(
    query,
    () => api<{ merchants: MerchantSummary[] }>(`/api/merchants${query}`),
    { intervalMs: 60_000 }
  );

  return (
    <ScrollView contentContainerClassName="gap-4 px-6 pb-6 pt-4">
      {active?.booking && <ActiveBookingBanner booking={active.booking} />}
      <Pressable
        onPress={() => router.push({ pathname: '/pick-location', params: { for: 'order' } })}
        accessibilityRole="button"
        className="flex-row items-center gap-3 rounded-2xl bg-brand-navy px-4 py-3 active:opacity-90">
        <Icon as={MapPinIcon} size={20} className="text-brand-yellow" />
        <View className="flex-1">
          <Text className="font-poppins text-xs text-brand-yellow/70">Deliver to</Text>
          <Text className="font-poppins-semibold text-base text-brand-yellow" numberOfLines={1}>
            {address?.title ?? (locating ? 'Finding you…' : 'Set your location')}
          </Text>
        </View>
        <Icon as={ChevronRightIcon} size={20} className="text-brand-yellow" />
      </Pressable>

      {!address && locating ? (
        <ActivityIndicator color="#0B0F3F" className="py-10" />
      ) : !address ? (
        <Empty
          title="Where should we deliver?"
          body="Set your location to see stores that deliver to you."
        />
      ) : !data ? (
        <View className="items-center py-10">
          {error ? (
            <Text className="text-center font-poppins text-sm text-brand-navy/70">{error}</Text>
          ) : (
            <ActivityIndicator color="#0B0F3F" />
          )}
        </View>
      ) : data.merchants.length === 0 ? (
        <Empty title="No stores near you yet" body="Check back soon as more stores join TrikeIt!" />
      ) : (
        data.merchants.map((m) => <MerchantCard key={m.id} merchant={m} />)
      )}
    </ScrollView>
  );
}

function MerchantCard({ merchant: m }: { merchant: MerchantSummary }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/merchant/[id]', params: { id: m.id } })}
      className="flex-row gap-4 rounded-3xl bg-white p-3 active:opacity-90">
      <RemoteImage url={m.logoUrl || m.coverUrl} className="h-24 w-24 rounded-2xl" />
      <View className="flex-1 justify-center gap-0.5">
        <Text className="font-poppins-bold text-lg leading-6 text-brand-navy" numberOfLines={2}>
          {m.name}
        </Text>
        {!!m.description && (
          <Text className="font-poppins text-xs text-brand-navy/70" numberOfLines={2}>
            {m.description}
          </Text>
        )}
        <Text className="font-poppins text-xs text-brand-navy/50" numberOfLines={1}>
          {m.distanceKm !== null && `${m.distanceKm.toFixed(1)} km · `}
          {m.addressTitle}
        </Text>
      </View>
    </Pressable>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View className="items-center gap-3 px-4 py-10">
      <Icon as={StoreIcon} size={40} className="text-brand-navy/40" />
      <Text className="text-center font-poppins-semibold text-lg text-brand-navy">{title}</Text>
      <Text className="text-center font-poppins text-sm text-brand-navy/60">{body}</Text>
    </View>
  );
}
