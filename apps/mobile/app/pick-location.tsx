import { ContactForm, resolveContact, type ContactDraft } from '@/components/booking/contact-form';
import { StopDot } from '@/components/brand/stop-dot';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { useBooking, type BookingStop, type Stop } from '@/lib/booking';
import { useCart } from '@/lib/cart';
import { MAP_STYLE } from '@/lib/map';
import { reverseGeocode, searchPlaces, type Place } from '@/lib/places';
import { cn } from '@/lib/utils';
import {
  Camera,
  Map,
  NativeUserLocation,
  type CameraRef,
  type LngLat,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon, LocateFixedIcon, MapPinIcon, SearchIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const NAVY = '#0B0F3F';
const GOLD = '#EAD36F';
const MANILA: LngLat = [120.9842, 14.5995];
const STREET_ZOOM = 17;

const COPY: Record<Stop, { title: string; confirm: string; search: string }> = {
  pickup: { title: 'Pick-up point', confirm: 'Confirm pick-up', search: 'Search pick-up location' },
  dropoff: {
    title: 'Drop-off point',
    confirm: 'Confirm drop-off',
    search: 'Search drop-off location',
  },
};
const EXTRA_STOP_COPY = {
  title: 'Next drop-off',
  confirm: 'Confirm drop-off',
  search: 'Search drop-off location',
};
const ORDER_COPY = {
  title: 'Deliver my order to',
  confirm: 'Deliver here',
  search: 'Search your address',
};

export default function PickLocationScreen() {
  // `for=order` sets where merchant orders go instead of a parcel's stop. `extra` picks one of
  // the drop-offs after the first; an index past the end adds one.
  const params = useLocalSearchParams<{ stop?: Stop; for?: 'order'; extra?: string }>();
  const forOrder = params.for === 'order';
  const extra = params.extra !== undefined ? Number(params.extra) : null;
  const stop = forOrder || extra !== null ? 'dropoff' : (params.stop ?? 'pickup');
  const booking = useBooking();
  const cart = useCart();
  const existing = forOrder
    ? cart.address
    : extra !== null
      ? (booking.extraStops[extra] ?? null)
      : booking[stop];
  const other = forOrder
    ? null
    : extra !== null
      ? (booking.extraStops[extra - 1] ?? booking.dropoff)
      : booking[stop === 'pickup' ? 'dropoff' : 'pickup'];

  const cameraRef = React.useRef<CameraRef>(null);
  const [place, setPlace] = React.useState<Place | null>(existing);
  const [center, setCenter] = React.useState<LngLat>(existing?.coords ?? other?.coords ?? MANILA);
  const [moving, setMoving] = React.useState(false);
  const [resolving, setResolving] = React.useState(false);
  const [hasLocation, setHasLocation] = React.useState(false);
  const { data: session } = authClient.useSession();
  const me = { name: session?.user.name ?? '', phoneNumber: session?.user.phoneNumber };
  // You usually send from your own spot; default the recipient to someone else.
  const [contactDraft, setContactDraft] = React.useState<ContactDraft>(
    existing?.contact
      ? {
          isMe: existing.contact.isMe,
          name: existing.contact.isMe ? '' : existing.contact.name,
          phone: existing.contact.isMe ? '' : existing.contact.phone,
        }
      : { isMe: stop === 'pickup' || forOrder, name: '', phone: '' }
  );
  const contact = resolveContact(contactDraft, me);

  const pendingPlace = React.useRef<Place | null>(null);
  const reverseAbort = React.useRef<AbortController | null>(null);

  /** Moves the camera to the device; resolves to whether location permission is granted. */
  async function locateMe(): Promise<boolean> {
    let { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) ({ granted } = await Location.requestForegroundPermissionsAsync());
    if (!granted) return false;
    const position =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    cameraRef.current?.flyTo({
      center: [position.coords.longitude, position.coords.latitude],
      zoom: STREET_ZOOM,
      duration: 800,
    });
    return true;
  }

  const onOpen = React.useEffectEvent(() => {
    if (!existing && !other) locateMe().then(setHasLocation, () => {});
    else Location.getForegroundPermissionsAsync().then(({ granted }) => setHasLocation(granted));
  });

  React.useEffect(() => {
    onOpen();
    return () => reverseAbort.current?.abort();
  }, []);

  function onCameraSettled(coords: LngLat) {
    setMoving(false);
    setCenter(coords);
    reverseAbort.current?.abort();

    if (pendingPlace.current) {
      setPlace(pendingPlace.current);
      pendingPlace.current = null;
      return;
    }
    if (place && samePoint(place.coords, coords)) return;

    const controller = new AbortController();
    reverseAbort.current = controller;
    setPlace(null);
    setResolving(true);
    reverseGeocode(coords, controller.signal)
      .then(setPlace)
      .catch(() => {
        if (!controller.signal.aborted) {
          setPlace({ coords, title: 'Pinned location', subtitle: 'Address unavailable' });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setResolving(false);
      });
  }

  function onSelectResult(result: Place) {
    Keyboard.dismiss();
    pendingPlace.current = result;
    cameraRef.current?.flyTo({ center: result.coords, zoom: STREET_ZOOM, duration: 800 });
  }

  function onConfirm() {
    if (!place || !contact) return;
    const chosen: BookingStop = {
      coords: place.coords,
      title: place.title,
      subtitle: place.subtitle,
      contact,
    };
    if (forOrder) {
      cart.setAddress(chosen);
      router.back();
      return;
    }
    if (extra !== null) {
      booking.setExtraStop(extra, chosen);
      router.back();
      return;
    }
    booking.setStop(stop, chosen);
    if (stop === 'pickup' && !booking.dropoff) {
      router.replace({ pathname: '/pick-location', params: { stop: 'dropoff' } });
    } else {
      router.back();
    }
  }

  const copy = forOrder ? ORDER_COPY : extra !== null ? EXTRA_STOP_COPY : COPY[stop];
  const busy = moving || resolving || !place || !contact;

  return (
    <KeyboardAvoidingView className="flex-1 bg-brand-cream" behavior="padding">
      <View className="flex-1">
        <Map
          style={{ flex: 1 }}
          mapStyle={MAP_STYLE}
          logo={false}
          compass={false}
          onRegionIsChanging={(e) => e.nativeEvent.userInteraction && setMoving(true)}
          onRegionDidChange={(e) => onCameraSettled(e.nativeEvent.center)}>
          <Camera
            ref={cameraRef}
            initialViewState={{ center, zoom: STREET_ZOOM }}
            minZoom={5}
            maxZoom={19}
          />
          {hasLocation && <NativeUserLocation />}
        </Map>

        <CenterPin stop={stop} lifted={moving} />

        <SafeAreaView edges={['top']} className="absolute inset-x-0 top-0 px-4 pt-2">
          <SearchBar placeholder={copy.search} near={center} onSelect={onSelectResult} />
        </SafeAreaView>

        <Pressable
          onPress={() => locateMe().then(setHasLocation, () => {})}
          accessibilityLabel="Go to my location"
          className="absolute bottom-4 right-4 h-12 w-12 items-center justify-center rounded-full bg-white shadow-md shadow-black/20 active:opacity-80">
          <Icon as={LocateFixedIcon} size={22} className="text-brand-navy" />
        </Pressable>
      </View>

      <SafeAreaView edges={['bottom']} className="shrink rounded-t-3xl bg-white">
        <ScrollView
          contentContainerClassName="gap-4 px-6 pt-5"
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <View className="flex-row items-start gap-3">
            <StopDot stop={stop} className="mt-1" />
            <View className="flex-1 gap-0.5">
              <Text className="font-poppins text-xs uppercase tracking-wider text-brand-navy/50">
                {copy.title}
              </Text>
              {place && !moving ? (
                <>
                  <Text
                    className="font-poppins-semibold text-base text-brand-navy"
                    numberOfLines={1}>
                    {place.title}
                  </Text>
                  {!!place.subtitle && (
                    <Text className="font-poppins text-sm text-brand-navy/60" numberOfLines={2}>
                      {place.subtitle}
                    </Text>
                  )}
                </>
              ) : (
                <Text className="font-poppins text-base text-brand-navy/60">
                  {moving ? 'Move the map to place the pin' : 'Finding address…'}
                </Text>
              )}
            </View>
          </View>

          <ContactForm stop={stop} value={contactDraft} onChange={setContactDraft} me={me} />
          {stop === 'pickup' && (
            <TextInput
              value={booking.parcelNotes}
              onChangeText={booking.setParcelNotes}
              placeholder="What are you sending? Handling notes (optional)"
              placeholderTextColor="#0B0F3F80"
              maxLength={500}
              className="h-12 rounded-xl border-2 border-brand-navy/15 bg-white px-3 font-poppins text-base text-brand-navy"
            />
          )}

          <Pressable
            onPress={onConfirm}
            disabled={busy}
            className={cn(
              'mb-2 h-14 items-center justify-center rounded-2xl bg-brand-navy active:opacity-90',
              busy && 'opacity-40'
            )}>
            <Text className="font-poppins-semibold text-base text-brand-yellow">
              {copy.confirm}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function SearchBar({
  placeholder,
  near,
  onSelect,
}: {
  placeholder: string;
  near: LngLat;
  onSelect: (place: Place) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [found, setFound] = React.useState<{ query: string; places: Place[] } | null>(null);

  const q = query.trim();
  const active = q.length >= 3;
  const results = active && found?.query === q ? found.places : null;
  const searching = active && found?.query !== q;

  // Reads the latest map center without restarting the search every time the map moves.
  const search = React.useEffectEvent((text: string, signal: AbortSignal) =>
    searchPlaces(text, near, signal)
  );

  React.useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      search(q, controller.signal)
        .then((places) => setFound({ query: q, places }))
        .catch(() => !controller.signal.aborted && setFound({ query: q, places: [] }));
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, active]);

  return (
    <View className="gap-2">
      <View className="h-14 flex-row items-center gap-2 rounded-2xl bg-white pl-1 pr-3 shadow-md shadow-black/15">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel="Back"
          className="h-11 w-11 items-center justify-center rounded-full active:bg-brand-cream">
          <ArrowLeftIcon size={22} color={NAVY} />
        </Pressable>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor="#0B0F3F80"
          returnKeyType="search"
          className="h-full flex-1 font-poppins text-base text-brand-navy"
        />
        {searching ? (
          <ActivityIndicator color={NAVY} />
        ) : query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <XIcon size={20} color={NAVY} />
          </Pressable>
        ) : (
          <SearchIcon size={20} color="#0B0F3F80" />
        )}
      </View>

      {results && (
        <View className="max-h-80 overflow-hidden rounded-2xl bg-white shadow-md shadow-black/15">
          {results.length === 0 ? (
            <Text className="p-4 font-poppins text-sm text-brand-navy/60">No places found.</Text>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              {results.map((result, i) => (
                <Pressable
                  key={`${result.coords.join()}-${i}`}
                  onPress={() => {
                    setQuery('');
                    onSelect(result);
                  }}
                  className={cn(
                    'flex-row items-center gap-3 px-4 py-3 active:bg-brand-cream',
                    i > 0 && 'border-t border-brand-navy/5'
                  )}>
                  <Icon as={MapPinIcon} size={18} className="text-brand-navy/50" />
                  <View className="flex-1">
                    <Text className="font-poppins-medium text-sm text-brand-navy" numberOfLines={1}>
                      {result.title}
                    </Text>
                    {!!result.subtitle && (
                      <Text className="font-poppins text-xs text-brand-navy/60" numberOfLines={1}>
                        {result.subtitle}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

/** Fixed in the middle of the map; the pin's tip marks the chosen point. */
function CenterPin({ stop, lifted }: { stop: Stop; lifted: boolean }) {
  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      <View style={{ transform: [{ translateY: lifted ? -30 : -22 }] }}>
        <MapPinIcon
          size={44}
          color={stop === 'pickup' ? NAVY : '#FFFFFF'}
          fill={stop === 'pickup' ? GOLD : NAVY}
          strokeWidth={1.5}
        />
      </View>
      <View className="absolute h-1.5 w-3 rounded-full bg-black/30" />
    </View>
  );
}

function samePoint(a: LngLat, b: LngLat) {
  return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
}
