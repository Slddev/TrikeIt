import { Gradient } from '@/components/brand/gradient';
import { Logo } from '@/components/brand/logo';
import { RouteMap } from '@/components/brand/route-map';
import { StopDot } from '@/components/brand/stop-dot';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { useBooking, type Stop } from '@/lib/booking';
import { distanceKm, type Place } from '@/lib/places';
import { getRoute, type Route } from '@/lib/routing';
import { cn } from '@/lib/utils';
import { router } from 'expo-router';
import {
  BanknoteIcon,
  ChevronDownIcon,
  ClockIcon,
  PackageIcon,
  PlusIcon,
  SmartphoneIcon,
  StoreIcon,
  UserIcon,
  ZapIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'delivery' | 'merchants';
type Service = 'express' | 'regular';
type Payment = 'cod' | 'online';

const SERVICES: Record<Service, { title: string; blurb: string; eta: string }> = {
  express: { title: 'Express', blurb: 'Straight to drop-off', eta: '15–25 min' },
  regular: { title: 'Regular', blurb: 'May share the trike', eta: '30–60 min' },
};

// Regular fare: ₱12 for the first km, then ₱12 for each succeeding km or fraction of one.
// Express is 4x the regular fare. Distance is by road (see useTrip).
const REGULAR_FIRST_KM = 12;
const REGULAR_PER_SUCCEEDING_KM = 12;
const EXPRESS_MULTIPLIER = 4;

function fareFor(service: Service, km: number) {
  const succeedingKm = Math.max(0, Math.ceil(km - 1));
  const regular = REGULAR_FIRST_KM + REGULAR_PER_SUCCEEDING_KM * succeedingKm;
  return service === 'express' ? regular * EXPRESS_MULTIPLIER : regular;
}

export default function HomeScreen() {
  const [tab, setTab] = React.useState<Tab>('delivery');

  return (
    <Gradient colors={['#F3D873', '#FFF3C4', '#FFFFFF']} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" edges={['top']}>
        <Header />
        <TabSwitcher value={tab} onChange={setTab} />
        {tab === 'delivery' ? <DeliveryTab /> : <MerchantsTab />}
      </SafeAreaView>
    </Gradient>
  );
}

function Header() {
  const { data: session } = authClient.useSession();

  function onProfile() {
    Alert.alert(
      session?.user.name || 'Your account',
      session?.user.phoneNumber ?? session?.user.email,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => authClient.signOut() },
      ]
    );
  }

  return (
    <View className="flex-row items-center justify-between px-6 pt-2">
      <View className="flex-row items-center gap-2">
        <Logo size={36} />
        <Text className="font-poppins-bold text-xl text-brand-navy">TrikeIt!</Text>
      </View>
      <Pressable
        onPress={onProfile}
        accessibilityLabel="Account"
        className="h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80">
        <Icon as={UserIcon} size={22} className="text-brand-navy" />
      </Pressable>
    </View>
  );
}

function TabSwitcher({ value, onChange }: { value: Tab; onChange: (tab: Tab) => void }) {
  const tabs = [
    { key: 'delivery', label: 'Delivery', icon: PackageIcon },
    { key: 'merchants', label: 'Merchants', icon: StoreIcon },
  ] as const;

  return (
    <View className="mx-6 mt-6 flex-row gap-3">
      {tabs.map(({ key, label, icon }) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={cn(
              'flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3.5',
              active ? 'bg-brand-navy' : 'bg-brand-cream'
            )}>
            <Icon
              as={icon}
              size={20}
              className={active ? 'text-brand-yellow' : 'text-brand-navy'}
            />
            <Text
              className={cn(
                'font-poppins-semibold text-base',
                active ? 'text-brand-yellow' : 'text-brand-navy'
              )}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type Trip =
  | { status: 'incomplete' }
  | { status: 'routing' }
  | { status: 'ready'; km: number; route: Route | null };

/** Road distance between the stops; falls back to straight-line if routing fails (route is null). */
function useTrip(pickup: Place | null, dropoff: Place | null): Trip {
  const [found, setFound] = React.useState<{ key: string; route: Route | null } | null>(null);
  const key = pickup && dropoff ? `${pickup.coords}|${dropoff.coords}` : null;

  React.useEffect(() => {
    if (!pickup || !dropoff) return;
    const tripKey = `${pickup.coords}|${dropoff.coords}`;
    const controller = new AbortController();
    getRoute(pickup.coords, dropoff.coords, controller.signal)
      .then((route) => setFound({ key: tripKey, route }))
      .catch(() => !controller.signal.aborted && setFound({ key: tripKey, route: null }));
    return () => controller.abort();
  }, [pickup, dropoff]);

  if (!pickup || !dropoff) return { status: 'incomplete' };
  if (found?.key !== key) return { status: 'routing' };
  return {
    status: 'ready',
    route: found.route,
    km: found.route?.km ?? distanceKm(pickup.coords, dropoff.coords),
  };
}

function DeliveryTab() {
  const { pickup, dropoff } = useBooking();
  const [service, setService] = React.useState<Service | null>(null);
  const [payment, setPayment] = React.useState<Payment>('cod');

  const trip = useTrip(pickup, dropoff);
  const km = trip.status === 'ready' ? trip.km : null;

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-6 px-6 pb-6 pt-4">
        <RouteCard pickup={pickup} dropoff={dropoff} trip={trip} />
        {trip.status === 'ready' && trip.route && <RouteMap route={trip.route} />}

        <View className="gap-3">
          <Text className="font-poppins-semibold text-base text-brand-navy">Choose a service</Text>
          {(Object.keys(SERVICES) as Service[]).map((key) => (
            <ServiceOption
              key={key}
              service={key}
              fare={km === null ? null : fareFor(key, km)}
              selected={service === key}
              onPress={() => setService(key)}
            />
          ))}
        </View>
      </ScrollView>

      {km !== null && service && (
        <CheckoutPanel
          service={service}
          fare={fareFor(service, km)}
          payment={payment}
          onPayment={setPayment}
        />
      )}
    </View>
  );
}

function RouteCard({
  pickup,
  dropoff,
  trip,
}: {
  pickup: Place | null;
  dropoff: Place | null;
  trip: Trip;
}) {
  return (
    <View className="gap-3 rounded-3xl bg-brand-navy p-4">
      <View className="rounded-2xl bg-white px-4">
        <RouteField stop="pickup" place={pickup} placeholder="Set pick-up location" />
        <View className="ml-[7px] h-3 w-0.5 bg-brand-navy/20" />
        <RouteField stop="dropoff" place={dropoff} placeholder="Set drop-off location" />
      </View>

      <View className="flex-row items-center justify-between">
        <Pressable className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 active:bg-white/20">
          <Icon as={PlusIcon} size={16} className="text-brand-yellow" />
          <Text className="font-poppins-medium text-sm text-brand-yellow">Add stop</Text>
        </Pressable>
        <TripSummary trip={trip} />
        <Pressable className="flex-row items-center gap-1.5 rounded-full bg-brand-yellow px-3 py-2 active:opacity-80">
          <Icon as={ClockIcon} size={16} className="text-brand-navy" />
          <Text className="font-poppins-medium text-sm text-brand-navy">Deliver now</Text>
          <Icon as={ChevronDownIcon} size={16} className="text-brand-navy" />
        </Pressable>
      </View>
    </View>
  );
}

function TripSummary({ trip }: { trip: Trip }) {
  if (trip.status === 'incomplete') return null;
  if (trip.status === 'routing') return <ActivityIndicator color="#FFE891" />;
  return (
    <Text className="font-poppins-medium text-sm text-brand-yellow">
      {trip.route
        ? `${trip.km.toFixed(1)} km · ${trip.route.minutes} min`
        : `≈ ${trip.km.toFixed(1)} km (est.)`}
    </Text>
  );
}

function RouteField({
  stop,
  place,
  placeholder,
}: {
  stop: Stop;
  place: Place | null;
  placeholder: string;
}) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/pick-location', params: { stop } })}
      accessibilityRole="button"
      accessibilityLabel={place ? `${placeholder}: ${place.title}` : placeholder}
      className="min-h-14 flex-row items-center gap-3 py-2 active:opacity-70">
      <StopDot stop={stop} />
      <View className="flex-1">
        {place ? (
          <>
            <Text className="font-poppins-medium text-base text-brand-navy" numberOfLines={1}>
              {place.title}
            </Text>
            {!!place.subtitle && (
              <Text className="font-poppins text-xs text-brand-navy/60" numberOfLines={1}>
                {place.subtitle}
              </Text>
            )}
          </>
        ) : (
          <Text className="font-poppins text-base text-brand-navy/50">{placeholder}</Text>
        )}
      </View>
    </Pressable>
  );
}

function ServiceOption({
  service,
  fare,
  selected,
  onPress,
}: {
  service: Service;
  fare: number | null;
  selected: boolean;
  onPress: () => void;
}) {
  const { title, blurb, eta } = SERVICES[service];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className={cn(
        'flex-row items-center gap-4 rounded-2xl border-2 p-4',
        selected ? 'border-brand-navy bg-brand-gold' : 'border-transparent bg-brand-cream'
      )}>
      <View
        className={cn(
          'h-12 w-12 items-center justify-center rounded-xl',
          selected ? 'bg-brand-navy' : 'bg-brand-yellow'
        )}>
        <Icon
          as={service === 'express' ? ZapIcon : PackageIcon}
          size={22}
          className={selected ? 'text-brand-yellow' : 'text-brand-navy'}
        />
      </View>
      <View className="flex-1">
        <Text className="font-poppins-semibold text-base text-brand-navy">{title}</Text>
        <Text className="font-poppins text-sm text-brand-navy/70">
          {blurb} · {eta}
        </Text>
      </View>
      <Text className="font-poppins-bold text-base text-brand-navy">
        {fare === null ? '₱ —' : `₱${fare}`}
      </Text>
    </Pressable>
  );
}

function CheckoutPanel({
  service,
  fare,
  payment,
  onPayment,
}: {
  service: Service;
  fare: number;
  payment: Payment;
  onPayment: (p: Payment) => void;
}) {
  const options = [
    { key: 'cod', label: 'Cash', icon: BanknoteIcon },
    { key: 'online', label: 'Online', icon: SmartphoneIcon },
  ] as const;

  return (
    <SafeAreaView
      edges={['bottom']}
      className="gap-4 rounded-t-3xl bg-white px-6 pt-5 shadow-lg shadow-black/10">
      <View className="flex-row gap-3">
        {options.map(({ key, label, icon }) => {
          const active = payment === key;
          return (
            <Pressable
              key={key}
              onPress={() => onPayment(key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              className={cn(
                'flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 py-3',
                active ? 'border-brand-navy bg-brand-cream' : 'border-brand-gold/50'
              )}>
              <Icon as={icon} size={18} className="text-brand-navy" />
              <Text className="font-poppins-medium text-sm text-brand-navy">{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row items-center justify-between">
        <View>
          <Text className="font-poppins text-sm text-brand-navy/60">
            {SERVICES[service].title} delivery
          </Text>
          <Text className="font-poppins-bold text-2xl text-brand-navy">₱{fare}</Text>
        </View>
        <Pressable className="h-14 items-center justify-center rounded-2xl bg-brand-navy px-10 active:opacity-90">
          <Text className="font-poppins-semibold text-base text-brand-yellow">Book</Text>
        </Pressable>
      </View>
      <View className="h-2" />
    </SafeAreaView>
  );
}

function MerchantsTab() {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-10">
      <Icon as={StoreIcon} size={40} className="text-brand-navy/40" />
      <Text className="text-center font-poppins-semibold text-lg text-brand-navy">
        Merchants are coming soon
      </Text>
      <Text className="text-center font-poppins text-sm text-brand-navy/60">
        Order from stores near you and have a trike bring it over.
      </Text>
    </View>
  );
}
