import { DRIVER_TRIPS_KEY } from '@/components/driver/driver-home';
import { RouteMap } from '@/components/brand/route-map';
import { Text } from '@/components/ui/text';
import { api, type DriverTrips } from '@/lib/api';
import { openInWaze, openRouteInGoogleMaps } from '@/lib/navigation';
import { isActionable, isDone, orderStops } from '@/lib/trip-stops';
import { usePoll } from '@/lib/use-poll';
import { useRoute } from '@/lib/use-route';
import type { LngLat } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { ArrowLeftIcon } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TripMapScreen() {
  const { data } = usePoll(DRIVER_TRIPS_KEY, () => api<DriverTrips>('/api/driver/trips'), {
    intervalMs: 10000,
  });
  const trip = data?.active ?? null;

  const stops = React.useMemo(() => {
    if (!trip) return [];
    return orderStops(trip).filter((s) => !isDone(s));
  }, [trip]);
  const coords = React.useMemo<LngLat[]>(
    () => stops.map((s) => [s.place.lng, s.place.lat]),
    [stops]
  );
  // A single stop still needs two points for a route; repeat it.
  const route = useRoute(coords.length === 1 ? [coords[0], coords[0]] : coords);
  const next = stops.find(isActionable);

  return (
    <View className="flex-1 bg-brand-cream">
      {route.status === 'done' && route.route ? (
        <RouteMap
          route={route.route}
          stops={stops.map((s) => ({ coords: [s.place.lng, s.place.lat], stop: s.stop }))}
          interactive
          showUser
          className="flex-1"
        />
      ) : (
        <View className="flex-1 items-center justify-center px-10">
          {route.status === 'done' ? (
            <Text className="text-center font-poppins text-base text-brand-navy/70">
              Couldn't load the route. Use Waze or Google Maps below.
            </Text>
          ) : (
            <ActivityIndicator color="#0B0F3F" />
          )}
        </View>
      )}

      <SafeAreaView edges={['top']} className="absolute left-0 top-0 px-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-md shadow-black/20 active:opacity-80">
          <ArrowLeftIcon size={22} color="#0B0F3F" />
        </Pressable>
      </SafeAreaView>

      {next && (
        <SafeAreaView edges={['bottom']} className="gap-3 rounded-t-3xl bg-white px-6 pb-2 pt-5">
          <View>
            <Text className="font-poppins text-xs uppercase tracking-wider text-brand-navy/50">
              Next:{' '}
              {next.stop === 'pickup'
                ? `pick up from ${next.booking.senderName}`
                : `deliver to ${next.booking.recipientName}`}
            </Text>
            <Text className="font-poppins-semibold text-lg text-brand-navy" numberOfLines={1}>
              {next.place.title}
            </Text>
          </View>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => openInWaze(next.place.lng, next.place.lat)}
              className="h-12 flex-1 items-center justify-center rounded-2xl bg-brand-cream active:bg-brand-yellow">
              <Text className="font-poppins-semibold text-sm text-brand-navy">
                Waze (next stop)
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openRouteInGoogleMaps(stops.map((s) => s.place))}
              className="h-12 flex-1 items-center justify-center rounded-2xl bg-brand-navy active:opacity-90">
              <Text className="font-poppins-semibold text-sm text-brand-yellow">
                Google Maps (all)
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}
