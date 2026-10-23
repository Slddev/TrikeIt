import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api, type DriverTrip, type DriverTrips } from '@/lib/api';
import {
  currentLocation,
  lastKnownLocation,
  useWatchedLocation,
  type Coords,
} from '@/lib/location';
import { usePoll } from '@/lib/use-poll';
import { formatSlot } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { router } from 'expo-router';
import {
  ChevronRightIcon,
  MapPinIcon,
  MoonIcon,
  RadarIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const DRIVER_TRIPS_KEY = 'driver-trips';

function tripsPath(at: Coords | null) {
  return at ? `/api/driver/trips?lng=${at.lng}&lat=${at.lat}` : '/api/driver/trips';
}

export function DriverHome() {
  const [online, setOnline] = React.useState<boolean | null>(null);
  const { data, error, setData } = usePoll(
    DRIVER_TRIPS_KEY,
    () => api<DriverTrips>(tripsPath(lastKnownLocation())),
    { intervalMs: 5000 }
  );
  // The server is the source of truth; local state only covers the moment of toggling.
  const isOnline = online ?? data?.online ?? false;
  const location = useWatchedLocation(isOnline);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [toggling, setToggling] = React.useState(false);
  // Trips the rider closed the pop-up for without deciding; they stay in the list.
  const [snoozed, setSnoozed] = React.useState<string[]>([]);

  async function toggle(next: boolean) {
    setToggling(true);
    try {
      const at = next ? await currentLocation() : undefined;
      setData(
        await api<DriverTrips>('/api/driver/status', {
          method: 'POST',
          body: { online: next, location: at },
        })
      );
      setOnline(next);
    } catch (e) {
      Alert.alert(next ? "Couldn't go online" : "Couldn't go offline", (e as Error).message);
    } finally {
      setToggling(false);
    }
  }

  async function act(tripId: string, action: 'accept' | 'decline') {
    setBusyId(tripId);
    try {
      const at = await currentLocation();
      setData(
        await api<DriverTrips>(`/api/driver/trips/${tripId}/${action}`, {
          method: 'POST',
          body: { location: at },
        })
      );
      if (action === 'accept') router.push('/trip');
    } catch (e) {
      Alert.alert(
        action === 'accept' ? "Couldn't accept" : "Couldn't decline",
        (e as Error).message
      );
    } finally {
      setBusyId(null);
    }
  }

  const popup =
    isOnline && !data?.active ? data?.open.find((t) => !snoozed.includes(t.id)) : undefined;
  const popupId = popup?.id;
  React.useEffect(() => {
    if (popupId) Vibration.vibrate([0, 250, 150, 250]);
  }, [popupId]);

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center px-10">
        {error ? (
          <Text className="text-center font-poppins text-base text-brand-navy/70">{error}</Text>
        ) : (
          <ActivityIndicator color="#0B0F3F" />
        )}
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerClassName="gap-4 px-6 pb-8 pt-4">
        {data.active ? (
          <ActiveTripCard trip={data.active} />
        ) : (
          <>
            <View className="flex-row items-center gap-4 rounded-3xl bg-white p-5">
              <View className="flex-1">
                <Text className="font-poppins-semibold text-base text-brand-navy">
                  Accepting bookings
                </Text>
                <Text className="font-poppins text-sm text-brand-navy/60">
                  {isOnline
                    ? 'You get trips with every stop within 3 km of you.'
                    : "You're offline. Turn on to get nearby trips."}
                </Text>
              </View>
              {toggling ? (
                <ActivityIndicator color="#0B0F3F" />
              ) : (
                <Switch
                  value={isOnline}
                  onValueChange={toggle}
                  trackColor={{ false: '#0B0F3F33', true: '#0B0F3F' }}
                  thumbColor={isOnline ? '#FFE891' : '#FFFFFF'}
                  accessibilityLabel="Accepting bookings"
                />
              )}
            </View>

            {!isOnline ? (
              <EmptyState
                icon={MoonIcon}
                text="Nearby trips will show here while you're accepting bookings."
              />
            ) : !location ? (
              <EmptyState icon={RadarIcon} text="Finding your location…" />
            ) : data.open.length === 0 ? (
              <EmptyState
                icon={RadarIcon}
                text="No full trips near you yet. New ones pop up automatically."
              />
            ) : (
              <>
                <Text className="font-poppins-bold text-xl text-brand-navy">Near you</Text>
                {data.open.map((trip) => (
                  <OpenTripCard
                    key={trip.id}
                    trip={trip}
                    busy={busyId === trip.id}
                    onAccept={() => act(trip.id, 'accept')}
                    onDecline={() => act(trip.id, 'decline')}
                  />
                ))}
              </>
            )}
          </>
        )}
        {error && (
          <Text className="text-center font-poppins text-xs text-brand-navy/50">
            Couldn't refresh: {error}
          </Text>
        )}
      </ScrollView>

      <Modal
        visible={!!popup}
        transparent
        animationType="slide"
        onRequestClose={() => popup && setSnoozed((ids) => [...ids, popup.id])}>
        <View className="flex-1 justify-end bg-black/40">
          {popup && (
            <SafeAreaView
              edges={['bottom']}
              className="gap-3 rounded-t-3xl bg-brand-cream px-6 pb-4 pt-5">
              <Text className="font-poppins text-xs uppercase tracking-wider text-brand-navy/50">
                New trip near you
              </Text>
              <OpenTripCard
                trip={popup}
                busy={busyId === popup.id}
                onAccept={() => act(popup.id, 'accept')}
                onDecline={() => act(popup.id, 'decline')}
              />
              <Pressable
                onPress={() => setSnoozed((ids) => [...ids, popup.id])}
                className="h-11 items-center justify-center">
                <Text className="font-poppins-medium text-sm text-brand-navy/60">Decide later</Text>
              </Pressable>
            </SafeAreaView>
          )}
        </View>
      </Modal>
    </>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Icon>['as'];
  text: string;
}) {
  return (
    <View className="items-center gap-3 rounded-3xl bg-white/70 px-6 py-10">
      <Icon as={icon} size={36} className="text-brand-navy/40" />
      <Text className="text-center font-poppins text-sm text-brand-navy/60">{text}</Text>
    </View>
  );
}

function ActiveTripCard({ trip }: { trip: DriverTrip }) {
  const left = trip.bookings.filter((b) => !b.droppedOff).length;
  return (
    <Pressable
      onPress={() => router.push('/trip')}
      className="gap-3 rounded-3xl bg-brand-navy p-5 active:opacity-90">
      <Text className="font-poppins text-xs uppercase tracking-wider text-brand-yellow/70">
        {trip.status === 'accepted' ? 'Picking up' : 'Out for delivery'}
      </Text>
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-poppins-bold text-2xl text-white">Current trip</Text>
          <Text className="font-poppins text-sm text-white/70">
            {left} deliver{left === 1 ? 'y' : 'ies'} left · ₱{trip.total}
          </Text>
        </View>
        <Icon as={ChevronRightIcon} size={28} className="text-brand-yellow" />
      </View>
    </Pressable>
  );
}

function OpenTripCard({
  trip,
  busy,
  onAccept,
  onDecline,
}: {
  trip: DriverTrip;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const cash = trip.bookings
    .filter((b) => b.payment === 'cod')
    .reduce((sum, b) => sum + b.fare + b.itemsTotal, 0);
  const storeCash = trip.bookings.reduce((sum, b) => sum + b.itemsTotal, 0);
  const first = trip.bookings[0];

  return (
    <View className="gap-4 rounded-3xl bg-white p-5">
      <View className="flex-row items-center justify-between">
        <View
          className={cn(
            'flex-row items-center gap-1.5 rounded-full px-3 py-1',
            trip.kind === 'special' ? 'bg-brand-navy' : 'bg-brand-yellow'
          )}>
          <Icon
            as={trip.kind === 'special' ? ZapIcon : UsersIcon}
            size={14}
            className={trip.kind === 'special' ? 'text-brand-yellow' : 'text-brand-navy'}
          />
          <Text
            className={cn(
              'font-poppins-semibold text-xs',
              trip.kind === 'special' ? 'text-brand-yellow' : 'text-brand-navy'
            )}>
            {trip.kind === 'special'
              ? 'Express'
              : `Regular · ${trip.bookings.length} parcel${trip.bookings.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        <Text className="font-poppins-bold text-2xl text-brand-navy">₱{trip.total}</Text>
      </View>

      <View className="gap-2">
        <StopSummary
          label={
            trip.distanceToPickupKm !== undefined
              ? `Pick up · ${formatDistance(trip.distanceToPickupKm)} away`
              : 'Pick up'
          }
          title={first.pickup.title}
          more={new Set(trip.bookings.map((b) => b.pickup.title)).size - 1}
        />
        <StopSummary
          label="Drop off"
          title={first.dropoff.title}
          more={
            new Set(
              trip.bookings.flatMap((b) => [
                b.dropoff.title,
                ...b.extraDropoffs.map((d) => d.place.title),
              ])
            ).size - 1
          }
        />
      </View>

      {trip.scheduledFor && (
        <Text className="font-poppins-semibold text-xs text-brand-navy">
          Scheduled pick-up · {formatSlot(trip.scheduledFor)}
        </Text>
      )}

      {storeCash > 0 && (
        <Text className="font-poppins-medium text-xs text-brand-navy">
          Store order: you pay ₱{storeCash} at pick-up and get it back on delivery
        </Text>
      )}
      {cash > 0 && (
        <Text className="font-poppins text-xs text-brand-navy/60">₱{cash} to collect in cash</Text>
      )}

      <View className="flex-row gap-3">
        <Pressable
          onPress={onDecline}
          disabled={busy}
          className="h-12 flex-1 items-center justify-center rounded-2xl border-2 border-brand-navy/20 active:bg-brand-cream">
          <Text className="font-poppins-semibold text-base text-brand-navy">Decline</Text>
        </Pressable>
        <Pressable
          onPress={onAccept}
          disabled={busy}
          className={cn(
            'h-12 flex-[2] items-center justify-center rounded-2xl bg-brand-navy active:opacity-90',
            busy && 'opacity-50'
          )}>
          {busy ? (
            <ActivityIndicator color="#FFE891" />
          ) : (
            <Text className="font-poppins-semibold text-base text-brand-yellow">Accept</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function StopSummary({ label, title, more }: { label: string; title: string; more: number }) {
  return (
    <View className="flex-row items-center gap-3">
      <Icon as={MapPinIcon} size={16} className="text-brand-navy/50" />
      <View className="flex-1">
        <Text className="font-poppins text-xs text-brand-navy/50">{label}</Text>
        <Text className="font-poppins-medium text-sm text-brand-navy" numberOfLines={1}>
          {title}
          {more > 0 && <Text className="text-brand-navy/50"> +{more} more</Text>}
        </Text>
      </View>
    </View>
  );
}

function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
