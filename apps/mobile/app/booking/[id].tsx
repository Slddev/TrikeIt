import { BuySlotsCard } from '@/components/booking/buy-slots-card';
import { DriverCard } from '@/components/booking/driver-card';
import { StatusHero } from '@/components/booking/status-hero';
import { SlotMeter } from '@/components/booking/slot-meter';
import { Gradient } from '@/components/brand/gradient';
import { StopDot } from '@/components/brand/stop-dot';
import { Text } from '@/components/ui/text';
import { api, type Booking } from '@/lib/api';
import { formatE164 } from '@/lib/phone';
import { formatSlot } from '@/lib/schedule';
import { usePoll } from '@/lib/use-poll';
import { cn } from '@/lib/utils';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: shown,
    error,
    setData,
  } = usePoll(id, () => api<Booking>(`/api/bookings/${id}`), {
    // A completed or cancelled booking won't change again.
    stopWhen: (booking) => booking.status !== 'active',
  });
  const [busy, setBusy] = React.useState(false);

  async function run(action: 'buy-slots' | 'cancel', body?: unknown) {
    setBusy(true);
    try {
      setData(await api<Booking>(`/api/bookings/${id}/${action}`, { method: 'POST', body }));
    } catch (e) {
      Alert.alert('Something went wrong', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function confirmBuy(slots: number) {
    if (!shown?.buyout) return;
    const fare = slots * shown.buyout.slotFare;
    const fills = slots === shown.buyout.maxSlots;
    Alert.alert(
      fills ? 'Leave now?' : `Pay for ${slots} slot${slots > 1 ? 's' : ''}?`,
      fills
        ? `Pay ₱${fare} more and your delivery goes to riders right away.`
        : `Pay ₱${fare} more. Your delivery goes out once the rest fill up.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: `Pay ₱${fare}`, onPress: () => run('buy-slots', { slots }) },
      ]
    );
  }

  function confirmCancel() {
    Alert.alert('Cancel delivery?', 'You can book again anytime.', [
      { text: 'Keep delivery', style: 'cancel' },
      { text: 'Cancel delivery', style: 'destructive', onPress: () => run('cancel') },
    ]);
  }

  return (
    <Gradient colors={['#F3D873', '#FFF3C4', '#FFFFFF']} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-row items-center gap-3 px-6 pt-2">
          <Pressable
            onPress={() => router.dismissTo('/')}
            accessibilityLabel="Back"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/70 active:bg-white">
            <ArrowLeftIcon size={22} color="#0B0F3F" />
          </Pressable>
          <Text className="font-poppins-bold text-xl text-brand-navy">
            {shown?.order ? 'Your order' : 'Your delivery'}
          </Text>
        </View>

        {!shown ? (
          <View className="flex-1 items-center justify-center gap-3 px-10">
            {error ? (
              <Text className="text-center font-poppins text-base text-brand-navy/70">{error}</Text>
            ) : (
              <ActivityIndicator color="#0B0F3F" />
            )}
          </View>
        ) : (
          <ScrollView contentContainerClassName="gap-4 px-6 pb-6 pt-6">
            <StatusCard booking={shown} onBuy={confirmBuy} busy={busy} />
            <DetailsCard booking={shown} />
            {error && (
              <Text className="text-center font-poppins text-sm text-brand-navy/60">
                Couldn't refresh: {error}
              </Text>
            )}
          </ScrollView>
        )}

        {shown && (
          <View className="gap-3 px-6 pb-2">
            {shown.status === 'active' &&
            (shown.trip.status === 'filling' || shown.trip.status === 'ready') ? (
              <Pressable
                onPress={confirmCancel}
                disabled={busy}
                className="h-14 items-center justify-center rounded-2xl border-2 border-brand-navy active:bg-white/60">
                <Text className="font-poppins-semibold text-base text-brand-navy">
                  {shown.order ? 'Cancel order' : 'Cancel delivery'}
                </Text>
              </Pressable>
            ) : shown.status !== 'active' ? (
              <Pressable
                onPress={() => router.dismissTo('/')}
                className="h-14 items-center justify-center rounded-2xl bg-brand-navy active:opacity-90">
                <Text className="font-poppins-semibold text-base text-brand-yellow">Done</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </SafeAreaView>
    </Gradient>
  );
}

function StatusCard({
  booking,
  onBuy,
  busy,
}: {
  booking: Booking;
  onBuy: (slots: number) => void;
  busy: boolean;
}) {
  const { trip, order } = booking;
  const owed = booking.total + (order?.itemsTotal ?? 0);

  if (booking.status === 'cancelled') {
    return (
      <Card
        title={order ? 'Order cancelled' : 'Delivery cancelled'}
        body={`This ${order ? 'order' : 'delivery'} was cancelled. You weren't charged.`}
      />
    );
  }
  if (booking.status === 'completed') {
    return (
      <Card
        title="Delivered"
        body={
          order
            ? `Your order from ${order.merchantName} arrived. Enjoy!`
            : booking.payer === 'recipient'
              ? `${booking.recipient.name} received the parcel and paid ₱${owed} in cash.`
              : `${booking.recipient.name} received the parcel. Thanks for sending with TrikeIt!`
        }
      />
    );
  }

  switch (trip.status) {
    case 'filling':
      return (
        <>
          <StatusHero variant="waiting" label="Waiting for a trike…" />
          <Card
            body={`Your ${order ? 'order' : 'parcel'} goes out once ${trip.capacity} slots heading your way are booked.`}>
            <SlotMeter filled={trip.slotsFilled} capacity={trip.capacity} />
            {booking.buyout && <BuySlotsCard buyout={booking.buyout} busy={busy} onBuy={onBuy} />}
          </Card>
        </>
      );
    case 'ready':
      return (
        <>
          <StatusHero variant="waiting" label="Waiting for a trike…" />
          <Card
            body={
              booking.scheduledFor && booking.awaitingDispatch
                ? `Scheduled for ${formatSlot(booking.scheduledFor)}. Riders nearby will see it 30 minutes before.`
                : 'Your trip has been sent to approved riders nearby.'
            }
          />
        </>
      );
    case 'accepted':
    case 'in_progress':
      return (
        <>
          {!booking.pickedUp && <StatusHero variant="found" label="Found your rider!" />}
          <Card
            title={booking.pickedUp ? 'Out for delivery' : undefined}
            body={
              booking.pickedUp
                ? `Heading to ${booking.recipient.name} at the drop-off.`
                : order
                  ? `They're picking up your order at ${order.merchantName}. Have ₱${owed} in cash ready.`
                  : 'Have the parcel ready at the pick-up point. The rider may collect others first.'
            }>
            {booking.driver && <DriverCard driver={booking.driver} />}
          </Card>
        </>
      );
    default:
      return <Card title="Trip ended" body="This trip is no longer active." />;
  }
}

function DetailsCard({ booking }: { booking: Booking }) {
  if (booking.order) return <OrderCard booking={booking} order={booking.order} />;
  return (
    <View className="gap-4 rounded-3xl bg-white p-5">
      <View className="gap-3">
        <PlaceRow stop="pickup" title={booking.pickup.title} subtitle={booking.pickup.subtitle} />
        <PlaceRow
          stop="dropoff"
          title={booking.dropoff.title}
          subtitle={booking.dropoff.subtitle}
        />
        {booking.extraDropoffs.map((d, i) => (
          <PlaceRow key={i} stop="dropoff" title={d.place.title} subtitle={d.place.subtitle} />
        ))}
      </View>
      <View className="h-px bg-brand-navy/10" />
      {booking.scheduledFor && <Row label="Pick-up" value={formatSlot(booking.scheduledFor)} />}
      <Row label="Sender" value={`${booking.sender.name} · ${formatE164(booking.sender.phone)}`} />
      {[booking.recipient, ...booking.extraDropoffs.map((d) => d.recipient)].map((r, i, all) => (
        <Row
          key={i}
          label={all.length > 1 ? `Recipient ${i + 1}` : 'Recipient'}
          value={`${r.name} · ${formatE164(r.phone)}`}
        />
      ))}
      {!!booking.parcelNotes && <Row label="Parcel" value={booking.parcelNotes} />}
      <Row label="Type" value={booking.kind === 'special' ? 'Express' : 'Regular'} />
      <Row label="Distance" value={`${booking.distanceKm.toFixed(1)} km`} />
      <Row
        label="Payment"
        value={
          booking.payer === 'recipient'
            ? 'Recipient pays cash on delivery'
            : `Sender pays ${booking.payment === 'cod' ? 'cash at pick-up' : 'online'}`
        }
      />
      <Row
        label={`${booking.slots} slot${booking.slots > 1 ? 's' : ''} × ₱${booking.slotFare}`}
        value={`₱${booking.total}`}
        strong
      />
    </View>
  );
}

function OrderCard({ booking, order }: { booking: Booking; order: NonNullable<Booking['order']> }) {
  return (
    <View className="gap-4 rounded-3xl bg-white p-5">
      <View>
        <Text className="font-poppins-bold text-lg text-brand-navy">{order.merchantName}</Text>
        <Text className="font-poppins text-xs text-brand-navy/60">
          {booking.kind === 'special' ? 'Express' : 'Regular'} delivery
        </Text>
      </View>
      <View className="gap-2">
        {order.items.map((item) => (
          <View key={item.itemId} className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="font-poppins-medium text-sm text-brand-navy">
                {item.qty}× {item.name}
              </Text>
              {!!item.note && (
                <Text className="font-poppins text-xs text-brand-navy/60">{item.note}</Text>
              )}
            </View>
            <Text className="font-poppins-medium text-sm text-brand-navy">
              ₱{item.price * item.qty}
            </Text>
          </View>
        ))}
      </View>
      <View className="h-px bg-brand-navy/10" />
      <Row label="Subtotal" value={`₱${order.itemsTotal}`} />
      <Row
        label={`Delivery fee · ${booking.distanceKm.toFixed(1)} km`}
        value={`₱${booking.total}`}
      />
      <PlaceRow stop="dropoff" title={booking.dropoff.title} subtitle={booking.dropoff.subtitle} />
      <Row label="Total · cash on delivery" value={`₱${order.itemsTotal + booking.total}`} strong />
    </View>
  );
}

function Card({
  title,
  body,
  children,
}: {
  // Left out under a StatusHero, whose caption already says it.
  title?: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <View className="gap-4 rounded-3xl bg-white p-5">
      <View className="gap-1">
        {title && <Text className="font-poppins-bold text-2xl text-brand-navy">{title}</Text>}
        <Text className="font-poppins text-sm text-brand-navy/70">{body}</Text>
      </View>
      {children}
    </View>
  );
}

function PlaceRow({
  stop,
  title,
  subtitle,
}: {
  stop: 'pickup' | 'dropoff';
  title: string;
  subtitle: string;
}) {
  return (
    <View className="flex-row gap-3">
      <StopDot stop={stop} className="mt-1" />
      <View className="flex-1">
        <Text className="font-poppins-medium text-base text-brand-navy" numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text className="font-poppins text-xs text-brand-navy/60" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <Text className="font-poppins text-sm text-brand-navy/70">{label}</Text>
      <Text
        className={cn(
          'flex-shrink text-right text-brand-navy',
          strong ? 'font-poppins-bold text-lg' : 'font-poppins-medium text-sm'
        )}>
        {value}
      </Text>
    </View>
  );
}
