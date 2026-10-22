import { Gradient } from '@/components/brand/gradient';
import { Logo } from '@/components/brand/logo';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
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
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'delivery' | 'merchants';
type Service = 'express' | 'regular';
type Payment = 'cod' | 'online';

// Placeholder fares until pricing comes from the API.
const SERVICES: Record<Service, { title: string; blurb: string; eta: string; fare: number }> = {
  express: { title: 'Express', blurb: 'Straight to drop-off', eta: '15–25 min', fare: 100 },
  regular: { title: 'Regular', blurb: 'May share the trike', eta: '30–60 min', fare: 70 },
};

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
    Alert.alert(session?.user.name || 'Your account', session?.user.phoneNumber ?? session?.user.email, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => authClient.signOut() },
    ]);
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
            <Icon as={icon} size={20} className={active ? 'text-brand-yellow' : 'text-brand-navy'} />
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
  const [pickup, setPickup] = React.useState('');
  const [dropoff, setDropoff] = React.useState('');
  const [service, setService] = React.useState<Service | null>(null);
  const [payment, setPayment] = React.useState<Payment>('cod');

  const ready = pickup.trim() && dropoff.trim() && service;

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-6 px-6 pb-6 pt-4" keyboardShouldPersistTaps="handled">
        <RouteCard pickup={pickup} dropoff={dropoff} onPickup={setPickup} onDropoff={setDropoff} />

        <View className="gap-3">
          <Text className="font-poppins-semibold text-base text-brand-navy">Choose a service</Text>
          {(Object.keys(SERVICES) as Service[]).map((key) => (
            <ServiceOption
              key={key}
              service={key}
              selected={service === key}
              onPress={() => setService(key)}
            />
          ))}
        </View>
      </ScrollView>

      {ready && <CheckoutPanel service={service} payment={payment} onPayment={setPayment} />}
    </View>
  );
}

function RouteCard({
  pickup,
  dropoff,
  onPickup,
  onDropoff,
}: {
  pickup: string;
  dropoff: string;
  onPickup: (v: string) => void;
  onDropoff: (v: string) => void;
}) {
  return (
    <View className="gap-3 rounded-3xl bg-brand-navy p-4">
      <View className="rounded-2xl bg-white px-4">
        <RouteField dot="pickup" placeholder="Pick-up location" value={pickup} onChangeText={onPickup} />
        <View className="ml-[7px] h-3 w-0.5 bg-brand-navy/20" />
        <RouteField dot="dropoff" placeholder="Drop-off location" value={dropoff} onChangeText={onDropoff} />
      </View>

      <View className="flex-row items-center justify-between">
        <Pressable className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 active:bg-white/20">
          <Icon as={PlusIcon} size={16} className="text-brand-yellow" />
          <Text className="font-poppins-medium text-sm text-brand-yellow">Add stop</Text>
        </Pressable>
        <Pressable className="flex-row items-center gap-1.5 rounded-full bg-brand-yellow px-3 py-2 active:opacity-80">
          <Icon as={ClockIcon} size={16} className="text-brand-navy" />
          <Text className="font-poppins-medium text-sm text-brand-navy">Deliver now</Text>
          <Icon as={ChevronDownIcon} size={16} className="text-brand-navy" />
        </Pressable>
      </View>
    </View>
  );
}

function RouteField({
  dot,
  ...props
}: { dot: 'pickup' | 'dropoff' } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="h-14 flex-row items-center gap-3">
      <View
        className={cn(
          'h-4 w-4 rounded-full border-4',
          dot === 'pickup' ? 'border-brand-gold bg-white' : 'border-brand-navy bg-brand-navy'
        )}
      />
      <TextInput
        placeholderTextColor="#0B0F3F80"
        className="h-full flex-1 font-poppins text-base text-brand-navy"
        {...props}
      />
    </View>
  );
}

function ServiceOption({
  service,
  selected,
  onPress,
}: {
  service: Service;
  selected: boolean;
  onPress: () => void;
}) {
  const { title, blurb, eta, fare } = SERVICES[service];
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
      <Text className="font-poppins-bold text-base text-brand-navy">₱{fare}</Text>
    </Pressable>
  );
}

function CheckoutPanel({
  service,
  payment,
  onPayment,
}: {
  service: Service;
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
          <Text className="font-poppins-bold text-2xl text-brand-navy">₱{SERVICES[service].fare}</Text>
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
