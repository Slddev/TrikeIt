import { Gradient } from '@/components/brand/gradient';
import { QtyStepper } from '@/components/merchant/qty-stepper';
import { RemoteImage } from '@/components/merchant/remote-image';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api, type Booking, type BookingKind } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { deliveryFare, TRIP_CAPACITY } from '@/lib/fare';
import { useMerchant } from '@/lib/merchant';
import { distanceKm } from '@/lib/places';
import { useRoute } from '@/lib/use-route';
import { cn } from '@/lib/utils';
import { router } from 'expo-router';
import { ArrowLeftIcon, MapPinIcon, UtensilsIcon } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const OPTIONS: { kind: BookingKind; title: string; blurb: string }[] = [
  { kind: 'special', title: 'Express', blurb: 'A trike all to yourself · faster, higher rate' },
  {
    kind: 'regular',
    title: 'Regular',
    blurb: `Shares a trike with up to ${TRIP_CAPACITY - 1} other deliveries · takes longer, lower rate`,
  },
];

export default function CheckoutScreen() {
  const cart = useCart();
  const { merchant } = useMerchant(cart.merchant?.id);
  const [kind, setKind] = React.useState<BookingKind>('regular');
  const [placing, setPlacing] = React.useState(false);

  const store = merchant ? ([merchant.lng, merchant.lat] as [number, number]) : null;
  const route = useRoute(store && cart.address ? [store, cart.address.coords] : null);
  const km =
    route.status === 'done' && store && cart.address
      ? (route.route?.km ?? distanceKm(store, cart.address.coords))
      : null;
  const fee = km === null ? null : deliveryFare(kind, km);

  async function placeOrder() {
    if (!cart.merchant || !cart.address) return;
    setPlacing(true);
    try {
      const { address } = cart;
      const created = await api<Booking>('/api/orders', {
        method: 'POST',
        body: {
          merchantId: cart.merchant.id,
          kind,
          items: cart.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, note: l.note })),
          dropoff: {
            lng: address.coords[0],
            lat: address.coords[1],
            title: address.title,
            subtitle: address.subtitle,
            contact: { name: address.contact.name, phone: address.contact.phone },
          },
        },
      });
      cart.clear();
      router.dismissTo('/');
      router.push({ pathname: '/booking/[id]', params: { id: created.id } });
    } catch (e) {
      Alert.alert("Couldn't place your order", (e as Error).message);
    } finally {
      setPlacing(false);
    }
  }

  if (!cart.merchant || cart.lines.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-white px-10">
        <Text className="text-center font-poppins-semibold text-lg text-brand-navy">
          Your basket is empty
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="h-12 items-center justify-center rounded-2xl bg-brand-navy px-8 active:opacity-90">
          <Text className="font-poppins-semibold text-base text-brand-yellow">
            Back to the store
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Gradient colors={['#F3D873', '#FFE891']}>
        <SafeAreaView edges={['top']} className="flex-row items-center gap-3 px-6 pb-3 pt-2">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Back"
            className="h-10 w-10 items-center justify-center rounded-full bg-brand-navy active:opacity-80">
            <ArrowLeftIcon size={20} color="#FFE891" />
          </Pressable>
          <Text className="flex-1 font-poppins-bold text-lg text-brand-navy" numberOfLines={1}>
            {cart.merchant.name}
          </Text>
        </SafeAreaView>
      </Gradient>

      <ScrollView contentContainerClassName="gap-5 px-6 pb-6 pt-5">
        <View className="flex-row items-center justify-between">
          <Text className="font-poppins-bold text-xl text-brand-navy">Order Summary</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text className="font-poppins-semibold text-sm text-brand-navy underline">
              Add items
            </Text>
          </Pressable>
        </View>

        <View className="gap-4">
          {cart.lines.map((line) => (
            <View key={line.itemId} className="flex-row items-center gap-3">
              <RemoteImage
                url={line.imageUrl}
                fallbackIcon={UtensilsIcon}
                className="h-16 w-16 rounded-xl"
              />
              <View className="flex-1 gap-0.5">
                <Text className="font-poppins-semibold text-sm text-brand-navy" numberOfLines={2}>
                  {line.name}
                </Text>
                {!!line.note && (
                  <Text className="font-poppins text-xs text-brand-navy/60" numberOfLines={2}>
                    {line.note}
                  </Text>
                )}
                <Text className="font-poppins-bold text-sm text-brand-navy">
                  ₱{line.price * line.qty}
                </Text>
              </View>
              <QtyStepper
                size="sm"
                min={0}
                value={line.qty}
                onChange={(qty) => cart.setQty(line.itemId, qty)}
              />
            </View>
          ))}
        </View>

        <View className="gap-2 border-t border-brand-navy/10 pt-4">
          <Row label="Subtotal" value={`₱${cart.subtotal}`} />
          <Row
            label={km === null ? 'Delivery fee' : `Delivery fee · ${km.toFixed(1)} km`}
            value={fee === null ? '…' : `₱${fee}`}
          />
        </View>

        <Pressable
          onPress={() => router.push({ pathname: '/pick-location', params: { for: 'order' } })}
          className="flex-row items-center gap-3 rounded-2xl bg-brand-cream p-4 active:opacity-80">
          <Icon as={MapPinIcon} size={20} className="text-brand-navy" />
          <View className="flex-1">
            <Text className="font-poppins-semibold text-sm text-brand-navy" numberOfLines={1}>
              {cart.address?.title ?? 'Set your delivery address'}
            </Text>
            {cart.address && (
              <Text className="font-poppins text-xs text-brand-navy/60" numberOfLines={1}>
                {cart.address.contact.isMe ? 'For you' : `For ${cart.address.contact.name}`}
                {cart.address.subtitle ? ` · ${cart.address.subtitle}` : ''}
              </Text>
            )}
          </View>
          <Text className="font-poppins-semibold text-sm text-brand-navy underline">Change</Text>
        </Pressable>

        <View className="gap-3">
          <View>
            <Text className="font-poppins-semibold text-base text-brand-navy">
              Delivery options
            </Text>
            <Text className="font-poppins text-xs text-brand-navy/60">
              Demo fares · the actual TODA fare matrix applies at launch
            </Text>
          </View>
          {OPTIONS.map((option) => {
            const selected = kind === option.kind;
            return (
              <Pressable
                key={option.kind}
                onPress={() => setKind(option.kind)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                className={cn(
                  'flex-row items-center gap-3 rounded-2xl border-2 p-4',
                  selected
                    ? 'border-brand-navy bg-brand-gold'
                    : 'border-transparent bg-brand-yellow/60'
                )}>
                <View className="flex-1">
                  <Text className="font-poppins-semibold text-base text-brand-navy">
                    {option.title}
                  </Text>
                  <Text className="font-poppins text-xs text-brand-navy/70">{option.blurb}</Text>
                </View>
                <Text className="font-poppins-bold text-base text-brand-navy">
                  {km === null ? '₱ —' : `₱${deliveryFare(option.kind, km)}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <SafeAreaView
        edges={['bottom']}
        className="gap-3 rounded-t-3xl bg-white px-6 pt-4 shadow-lg shadow-black/10">
        <View>
          <Text className="font-poppins text-sm text-brand-navy/60">Total · cash on delivery</Text>
          <Text className="font-poppins-bold text-2xl text-brand-navy">
            {fee === null ? '…' : `₱${cart.subtotal + fee}`}
          </Text>
        </View>
        <Pressable
          onPress={placeOrder}
          disabled={placing || fee === null || !cart.address}
          className={cn(
            'mb-2 h-14 items-center justify-center rounded-2xl bg-brand-gold active:opacity-90',
            (placing || fee === null || !cart.address) && 'opacity-50'
          )}>
          {placing ? (
            <ActivityIndicator color="#0B0F3F" />
          ) : (
            <Text className="font-poppins-semibold text-base text-brand-navy">Place Order</Text>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="font-poppins text-sm text-brand-navy/70">{label}</Text>
      <Text className="font-poppins-medium text-sm text-brand-navy">{value}</Text>
    </View>
  );
}
