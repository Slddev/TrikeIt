import { NavigateSheet } from '@/components/driver/navigate-sheet';
import { DRIVER_TRIPS_KEY } from '@/components/driver/driver-home';
import { Gradient } from '@/components/brand/gradient';
import { StopDot } from '@/components/brand/stop-dot';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api, type ApiPlace, type DriverTrips } from '@/lib/api';
import { currentLocation } from '@/lib/location';
import { call } from '@/lib/navigation';
import {
  cashAt,
  contactAt,
  isActionable,
  isDone,
  orderStops,
  type TripStop,
} from '@/lib/trip-stops';
import { usePoll } from '@/lib/use-poll';
import { cn } from '@/lib/utils';
import { router } from 'expo-router';
import { ArrowLeftIcon, CheckIcon, MapIcon, NavigationIcon, PhoneIcon } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TripScreen() {
  const { data, error, setData } = usePoll(DRIVER_TRIPS_KEY, () =>
    api<DriverTrips>('/api/driver/trips')
  );
  const [busy, setBusy] = React.useState(false);
  const [navigateTo, setNavigateTo] = React.useState<ApiPlace | null>(null);

  const trip = data?.active ?? null;
  const stops = React.useMemo(() => (trip ? orderStops(trip) : []), [trip]);
  const next = stops.find(isActionable);

  /** The server checks the rider is within reach of the stop before accepting this. */
  async function confirm(stop: TripStop) {
    if (!trip) return;
    setBusy(true);
    try {
      const location = await currentLocation();
      const result = await api<DriverTrips>(`/api/driver/trips/${trip.id}/${stop.stop}`, {
        method: 'POST',
        body: { location, bookingId: stop.booking.id },
      });
      setData(result);
      if (!result.active) {
        Alert.alert('Trip complete', 'Every parcel has been delivered.');
        router.back();
      }
    } catch (e) {
      Alert.alert("Couldn't confirm", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const cash =
    trip?.bookings.filter((b) => b.payment === 'cod').reduce((sum, b) => sum + b.fare, 0) ?? 0;

  return (
    <Gradient colors={['#F3D873', '#FFF3C4', '#FFFFFF']} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between px-6 pt-2">
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Back"
              className="h-11 w-11 items-center justify-center rounded-full bg-white/70 active:bg-white">
              <ArrowLeftIcon size={22} color="#0B0F3F" />
            </Pressable>
            <Text className="font-poppins-bold text-xl text-brand-navy">Current trip</Text>
          </View>
          {trip && (
            <Pressable
              onPress={() => router.push('/trip-map')}
              className="flex-row items-center gap-2 rounded-full bg-brand-navy px-4 py-2.5 active:opacity-90">
              <Icon as={MapIcon} size={16} className="text-brand-yellow" />
              <Text className="font-poppins-semibold text-sm text-brand-yellow">Route map</Text>
            </Pressable>
          )}
        </View>

        {!data ? (
          <View className="flex-1 items-center justify-center px-10">
            {error ? (
              <Text className="text-center font-poppins text-base text-brand-navy/70">{error}</Text>
            ) : (
              <ActivityIndicator color="#0B0F3F" />
            )}
          </View>
        ) : !trip ? (
          <View className="flex-1 items-center justify-center gap-4 px-10">
            <Text className="text-center font-poppins-semibold text-lg text-brand-navy">
              No trip in progress
            </Text>
            <Pressable
              onPress={() => router.back()}
              className="h-12 items-center justify-center rounded-2xl bg-brand-navy px-8 active:opacity-90">
              <Text className="font-poppins-semibold text-base text-brand-yellow">
                Back to trips
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ScrollView contentContainerClassName="gap-4 px-6 pb-6 pt-6">
              <View className="flex-row gap-3">
                <Summary
                  label="Stops left"
                  value={String(stops.filter((s) => !isDone(s)).length)}
                />
                <Summary label="Cash to collect" value={`₱${cash}`} />
              </View>
              <Text className="font-poppins text-xs text-brand-navy/60">
                Confirm each stop when you're there. Your location is checked, so be within about
                150 m.
              </Text>

              <View className="gap-1 rounded-3xl bg-white p-2">
                {stops.map((stop, i) => (
                  <StopRow
                    key={`${stop.stop}-${stop.booking.id}`}
                    index={i + 1}
                    stop={stop}
                    isNext={stop === next}
                    onNavigate={() => setNavigateTo(stop.place)}
                  />
                ))}
              </View>
            </ScrollView>

            {next && (
              <View className="px-6 pb-2">
                <Pressable
                  onPress={() => confirm(next)}
                  disabled={busy}
                  className={cn(
                    'h-14 items-center justify-center rounded-2xl bg-brand-navy active:opacity-90',
                    busy && 'opacity-50'
                  )}>
                  {busy ? (
                    <ActivityIndicator color="#FFE891" />
                  ) : (
                    <Text className="font-poppins-semibold text-base text-brand-yellow">
                      {next.stop === 'pickup' ? 'Picked up from' : 'Delivered to'}{' '}
                      {contactAt(next).name}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </>
        )}

        <NavigateSheet place={navigateTo} onClose={() => setNavigateTo(null)} />
      </SafeAreaView>
    </Gradient>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-white p-4">
      <Text className="font-poppins text-xs text-brand-navy/50">{label}</Text>
      <Text className="font-poppins-bold text-lg text-brand-navy">{value}</Text>
    </View>
  );
}

function StopRow({
  index,
  stop,
  isNext,
  onNavigate,
}: {
  index: number;
  stop: TripStop;
  isNext: boolean;
  onNavigate: () => void;
}) {
  const { booking, place } = stop;
  const done = isDone(stop);
  const contact = contactAt(stop);

  return (
    <View
      className={cn(
        'flex-row items-center gap-3 rounded-2xl p-3',
        isNext && 'bg-brand-cream',
        done && 'opacity-40'
      )}>
      <View className="items-center gap-1">
        {done ? (
          <Icon as={CheckIcon} size={16} className="text-brand-navy" />
        ) : (
          <Text className="font-poppins-semibold text-xs text-brand-navy/50">{index}</Text>
        )}
        <StopDot stop={stop.stop} />
      </View>
      <View className="flex-1">
        <Text className="font-poppins text-xs text-brand-navy/60">
          {stop.stop === 'pickup' ? 'Pick up from' : 'Deliver to'} {contact.name}
          {booking.slots > 1 && ` (${booking.slots} slots)`}
          {done && ' · done'}
        </Text>
        <Text className="font-poppins-semibold text-base text-brand-navy" numberOfLines={1}>
          {place.title}
        </Text>
        {!!place.subtitle && (
          <Text className="font-poppins text-xs text-brand-navy/60" numberOfLines={1}>
            {place.subtitle}
          </Text>
        )}
        {cashAt(stop) > 0 && !done && (
          <Text className="mt-1 font-poppins-semibold text-xs text-brand-navy">
            Collect ₱{cashAt(stop)} cash
          </Text>
        )}
        {stop.stop === 'pickup' && !!booking.parcelNotes && (
          <Text className="mt-1 font-poppins-medium text-xs text-brand-navy" numberOfLines={2}>
            Parcel: {booking.parcelNotes}
          </Text>
        )}
      </View>
      {!done && !!contact.phone && (
        <Pressable
          onPress={() => call(contact.phone!)}
          accessibilityLabel={`Call ${contact.name}`}
          className="h-10 w-10 items-center justify-center rounded-full bg-brand-cream active:opacity-80">
          <Icon as={PhoneIcon} size={18} className="text-brand-navy" />
        </Pressable>
      )}
      {!done && (
        <Pressable
          onPress={onNavigate}
          accessibilityLabel={`Navigate to ${place.title}`}
          className="h-10 w-10 items-center justify-center rounded-full bg-brand-navy active:opacity-80">
          <Icon as={NavigationIcon} size={18} className="text-brand-yellow" />
        </Pressable>
      )}
    </View>
  );
}
