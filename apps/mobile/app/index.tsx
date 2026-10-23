import { SlotMeter } from '@/components/booking/slot-meter';
import { Gradient } from '@/components/brand/gradient';
import { Logo } from '@/components/brand/logo';
import { RouteMap } from '@/components/brand/route-map';
import { StopDot } from '@/components/brand/stop-dot';
import { DriverHome } from '@/components/driver/driver-home';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api, type Booking, type BookingKind, type Payer, type PaymentMethod } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { useBooking, type BookingStop, type Stop } from '@/lib/booking';
import { slotFare, TRIP_CAPACITY } from '@/lib/fare';
import { formatE164 } from '@/lib/phone';
import { distanceKm } from '@/lib/places';
import { usePoll } from '@/lib/use-poll';
import { useRoute, type RouteState } from '@/lib/use-route';
import { cn } from '@/lib/utils';
import { router } from 'expo-router';
import {
  BanknoteIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  PackageIcon,
  PlusIcon,
  SmartphoneIcon,
  StoreIcon,
  UserIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'delivery' | 'merchants';
type Mode = 'send' | 'deliver';

const SERVICES: Record<BookingKind, { title: string; blurb: string }> = {
  regular: {
    title: 'Regular',
    blurb: `Batched · goes out when ${TRIP_CAPACITY} parcels fill the trike`,
  },
  special: { title: 'Special', blurb: 'Dedicated trike · goes out right away' },
};

function fareFor(kind: BookingKind, km: number) {
  return slotFare(km) * (kind === 'special' ? TRIP_CAPACITY : 1);
}

export default function HomeScreen() {
  const { data: session } = authClient.useSession();
  const isDriver = session?.user.role === 'driver';
  const [mode, setMode] = React.useState<Mode>('deliver');
  const [tab, setTab] = React.useState<Tab>('delivery');
  const delivering = isDriver && mode === 'deliver';

  return (
    <Gradient colors={['#F3D873', '#FFF3C4', '#FFFFFF']} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" edges={['top']}>
        <Header />
        {isDriver && <ModeSwitch value={mode} onChange={setMode} />}
        {delivering ? (
          <DriverHome />
        ) : (
          <>
            <TabSwitcher value={tab} onChange={setTab} />
            {tab === 'delivery' ? <DeliveryTab /> : <MerchantsTab />}
          </>
        )}
      </SafeAreaView>
    </Gradient>
  );
}

function Header() {
  const { data: session } = authClient.useSession();

  function onProfile() {
    Alert.alert(
      session?.user.name || 'Your account',
      [session?.user.phoneNumber, session?.user.email].filter(Boolean).join('\n'),
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

function ModeSwitch({ value, onChange }: { value: Mode; onChange: (mode: Mode) => void }) {
  const modes = [
    { key: 'deliver', label: 'Delivering' },
    { key: 'send', label: 'Sending' },
  ] as const;

  return (
    <View className="mx-6 mt-4 flex-row rounded-full bg-white/70 p-1">
      {modes.map(({ key, label }) => (
        <Pressable
          key={key}
          onPress={() => onChange(key)}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === key }}
          className={cn('flex-1 items-center rounded-full py-2', value === key && 'bg-brand-navy')}>
          <Text
            className={cn(
              'font-poppins-semibold text-sm',
              value === key ? 'text-brand-yellow' : 'text-brand-navy'
            )}>
            {label}
          </Text>
        </Pressable>
      ))}
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

function DeliveryTab() {
  const { pickup, dropoff, parcelNotes } = useBooking();
  const [kind, setKind] = React.useState<BookingKind | null>(null);
  const [payment, setPayment] = React.useState<PaymentMethod>('cod');
  const [payer, setPayer] = React.useState<Payer>('sender');
  const { data: active } = usePoll(
    'active-booking',
    () => api<{ booking: Booking | null }>('/api/bookings/active'),
    { intervalMs: 8000 }
  );

  const route = useRoute(pickup && dropoff ? [pickup.coords, dropoff.coords] : null);
  // Falls back to straight-line distance if routing failed; the server re-measures either way.
  const km =
    route.status === 'done' && pickup && dropoff
      ? (route.route?.km ?? distanceKm(pickup.coords, dropoff.coords))
      : null;

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerClassName="gap-6 px-6 pb-6 pt-4"
        keyboardShouldPersistTaps="handled">
        {active?.booking && <ActiveBookingBanner booking={active.booking} />}
        <RouteCard pickup={pickup} dropoff={dropoff} route={route} km={km} />
        {route.status === 'done' && route.route && <RouteMap route={route.route} />}

        <View className="gap-3">
          <Text className="font-poppins-semibold text-base text-brand-navy">Choose a service</Text>
          {(Object.keys(SERVICES) as BookingKind[]).map((key) => (
            <ServiceOption
              key={key}
              kind={key}
              fare={km === null ? null : fareFor(key, km)}
              selected={kind === key}
              onPress={() => setKind(key)}
            />
          ))}
        </View>
      </ScrollView>

      {km !== null && kind && pickup && dropoff && !active?.booking && (
        <CheckoutPanel
          kind={kind}
          fare={fareFor(kind, km)}
          payment={payment}
          onPayment={setPayment}
          payer={payer}
          onPayer={setPayer}
          pickup={pickup}
          dropoff={dropoff}
          parcelNotes={parcelNotes}
        />
      )}
    </View>
  );
}

function ActiveBookingBanner({ booking }: { booking: Booking }) {
  const { trip } = booking;
  const label =
    trip.status === 'filling'
      ? 'Batching your parcel'
      : trip.status === 'ready'
        ? 'Finding a rider'
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
            Delivery in progress
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

function RouteCard({
  pickup,
  dropoff,
  route,
  km,
}: {
  pickup: BookingStop | null;
  dropoff: BookingStop | null;
  route: RouteState;
  km: number | null;
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
        {route.status === 'loading' && <ActivityIndicator color="#FFE891" />}
        {route.status === 'done' && km !== null && (
          <Text className="font-poppins-medium text-sm text-brand-yellow">
            {route.route
              ? `${km.toFixed(1)} km · ${route.route.minutes} min`
              : `≈ ${km.toFixed(1)} km (est.)`}
          </Text>
        )}
        <Pressable className="flex-row items-center gap-1.5 rounded-full bg-brand-yellow px-3 py-2 active:opacity-80">
          <Icon as={ClockIcon} size={16} className="text-brand-navy" />
          <Text className="font-poppins-medium text-sm text-brand-navy">Now</Text>
          <Icon as={ChevronDownIcon} size={16} className="text-brand-navy" />
        </Pressable>
      </View>
    </View>
  );
}

function RouteField({
  stop,
  place,
  placeholder,
}: {
  stop: Stop;
  place: BookingStop | null;
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
            <Text className="font-poppins text-xs text-brand-navy/60" numberOfLines={1}>
              {stop === 'pickup' ? 'From' : 'To'}{' '}
              {place.contact.isMe
                ? 'you'
                : `${place.contact.name} · ${formatE164(place.contact.phone)}`}
            </Text>
          </>
        ) : (
          <Text className="font-poppins text-base text-brand-navy/50">{placeholder}</Text>
        )}
      </View>
    </Pressable>
  );
}

function ServiceOption({
  kind,
  fare,
  selected,
  onPress,
}: {
  kind: BookingKind;
  fare: number | null;
  selected: boolean;
  onPress: () => void;
}) {
  const { title, blurb } = SERVICES[kind];
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
          as={kind === 'special' ? ZapIcon : UsersIcon}
          size={22}
          className={selected ? 'text-brand-yellow' : 'text-brand-navy'}
        />
      </View>
      <View className="flex-1">
        <Text className="font-poppins-semibold text-base text-brand-navy">{title}</Text>
        <Text className="font-poppins text-sm text-brand-navy/70">{blurb}</Text>
      </View>
      <Text className="font-poppins-bold text-base text-brand-navy">
        {fare === null ? '₱ —' : `₱${fare}`}
      </Text>
    </Pressable>
  );
}

function CheckoutPanel({
  kind,
  fare,
  payment,
  onPayment,
  payer,
  onPayer,
  pickup,
  dropoff,
  parcelNotes,
}: {
  kind: BookingKind;
  fare: number;
  payment: PaymentMethod;
  onPayment: (p: PaymentMethod) => void;
  payer: Payer;
  onPayer: (p: Payer) => void;
  pickup: BookingStop;
  dropoff: BookingStop;
  parcelNotes: string;
}) {
  const [booking, setBooking] = React.useState(false);
  // A recipient can only pay in cash when the parcel arrives.
  const method = payer === 'recipient' ? 'cod' : payment;

  async function onBook() {
    setBooking(true);
    try {
      const toApi = (s: BookingStop) => ({
        lng: s.coords[0],
        lat: s.coords[1],
        title: s.title,
        subtitle: s.subtitle,
        contact: { name: s.contact.name, phone: s.contact.phone },
      });
      const created = await api<Booking>('/api/bookings', {
        method: 'POST',
        body: {
          kind,
          payment: method,
          payer,
          pickup: toApi(pickup),
          dropoff: toApi(dropoff),
          parcelNotes: parcelNotes.trim(),
        },
      });
      router.push({ pathname: '/booking/[id]', params: { id: created.id } });
    } catch (e) {
      Alert.alert("Couldn't book", (e as Error).message);
    } finally {
      setBooking(false);
    }
  }

  return (
    <SafeAreaView
      edges={['bottom']}
      className="gap-4 rounded-t-3xl bg-white px-6 pt-5 shadow-lg shadow-black/10">
      <View className="gap-2">
        <Text className="font-poppins text-xs uppercase tracking-wider text-brand-navy/50">
          Who pays?
        </Text>
        <Choices
          value={payer}
          onChange={onPayer}
          options={[
            { key: 'sender', label: pickup.contact.isMe ? 'Sender (you)' : 'Sender' },
            { key: 'recipient', label: dropoff.contact.isMe ? 'Recipient (you)' : 'Recipient' },
          ]}
        />
      </View>
      {payer === 'sender' ? (
        <Choices
          value={payment}
          onChange={onPayment}
          options={[
            { key: 'cod', label: 'Cash', icon: BanknoteIcon },
            { key: 'online', label: 'Online', icon: SmartphoneIcon },
          ]}
        />
      ) : (
        <Text className="font-poppins text-sm text-brand-navy/70">
          {dropoff.contact.isMe ? 'You pay' : `${dropoff.contact.name} pays`} the rider in cash when
          the parcel arrives.
        </Text>
      )}

      <View className="flex-row items-center justify-between">
        <View>
          <Text className="font-poppins text-sm text-brand-navy/60">
            {SERVICES[kind].title} delivery
          </Text>
          <Text className="font-poppins-bold text-2xl text-brand-navy">₱{fare}</Text>
        </View>
        <Pressable
          onPress={onBook}
          disabled={booking}
          className={cn(
            'h-14 min-w-32 items-center justify-center rounded-2xl bg-brand-navy px-10 active:opacity-90',
            booking && 'opacity-40'
          )}>
          {booking ? (
            <ActivityIndicator color="#FFE891" />
          ) : (
            <Text className="font-poppins-semibold text-base text-brand-yellow">Book</Text>
          )}
        </Pressable>
      </View>
      <View className="h-2" />
    </SafeAreaView>
  );
}

function Choices<K extends string>({
  value,
  onChange,
  options,
}: {
  value: K;
  onChange: (key: K) => void;
  options: { key: K; label: string; icon?: React.ComponentProps<typeof Icon>['as'] }[];
}) {
  return (
    <View className="flex-row gap-3">
      {options.map(({ key, label, icon }) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            className={cn(
              'flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 py-3',
              active ? 'border-brand-navy bg-brand-cream' : 'border-brand-gold/50'
            )}>
            {icon && <Icon as={icon} size={18} className="text-brand-navy" />}
            <Text className="font-poppins-medium text-sm text-brand-navy">{label}</Text>
          </Pressable>
        );
      })}
    </View>
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
