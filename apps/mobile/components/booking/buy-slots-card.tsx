import { Text } from '@/components/ui/text';
import type { Booking } from '@/lib/api';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Animated, Pressable, View } from 'react-native';

// Minutes without a new booking joining before the card starts pulsing, and how fast it pulses.
const PULSE_LEVELS = [
  { afterMinutes: 10, durationMs: 450 },
  { afterMinutes: 5, durationMs: 800 },
  { afterMinutes: 2, durationMs: 1400 },
];

/** Lets a regular sender pay for some or all of the empty slots; pulses harder the longer the batch stalls. */
export function BuySlotsCard({
  buyout,
  busy,
  onBuy,
}: {
  buyout: NonNullable<Booking['buyout']>;
  busy: boolean;
  onBuy: (slots: number) => void;
}) {
  const [picked, setPicked] = React.useState(buyout.maxSlots);
  // Others may join meanwhile, which lowers how many slots are left to buy.
  const slots = Math.min(picked, buyout.maxSlots);
  const fillsTrike = slots === buyout.maxSlots;

  const now = useNow(15_000);
  const waited = Math.max(0, Math.floor((now - new Date(buyout.lastJoinAt).getTime()) / 60_000));
  const pulseMs = PULSE_LEVELS.find((level) => waited >= level.afterMinutes)?.durationMs ?? null;

  const [pulse] = React.useState(() => new Animated.Value(0));
  React.useEffect(() => {
    if (!pulseMs) {
      pulse.setValue(0);
      return;
    }
    const step = (toValue: number) =>
      Animated.timing(pulse, { toValue, duration: pulseMs, useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([step(1), step(0)]));
    loop.start();
    return () => loop.stop();
  }, [pulseMs, pulse]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }],
      }}
      className="overflow-hidden rounded-2xl bg-brand-gold">
      <Animated.View
        pointerEvents="none"
        style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }}
        className="absolute inset-0 bg-white"
      />
      <View className="gap-3 p-4">
        <View>
          <Text className="font-poppins-semibold text-base text-brand-navy">
            {waited >= 2 ? `No one has joined in ${waited} min` : "Don't want to wait?"}
          </Text>
          <Text className="font-poppins text-sm text-brand-navy/80">
            Pay for empty slots so your parcel goes out sooner.
          </Text>
        </View>

        <View className="flex-row gap-2">
          {Array.from({ length: buyout.maxSlots }, (_, i) => i + 1).map((n) => (
            <Pressable
              key={n}
              onPress={() => setPicked(n)}
              accessibilityRole="radio"
              accessibilityState={{ checked: n === slots }}
              className={cn(
                'flex-1 items-center rounded-xl border-2 py-2',
                n === slots ? 'border-brand-navy bg-white' : 'border-brand-navy/15 bg-white/50'
              )}>
              <Text className="font-poppins-semibold text-sm text-brand-navy">
                {n} slot{n > 1 ? 's' : ''}
              </Text>
              <Text className="font-poppins text-xs text-brand-navy/70">
                ₱{n * buyout.slotFare}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => onBuy(slots)}
          disabled={busy}
          className={cn(
            'h-12 items-center justify-center rounded-xl bg-brand-navy active:opacity-90',
            busy && 'opacity-50'
          )}>
          <Text className="font-poppins-semibold text-sm text-brand-yellow">
            Pay ₱{slots * buyout.slotFare}{' '}
            {fillsTrike ? 'and leave now' : `for ${slots} slot${slots > 1 ? 's' : ''}`}
          </Text>
        </Pressable>
        {!fillsTrike && (
          <Text className="text-center font-poppins text-xs text-brand-navy/70">
            The trike still needs {buyout.maxSlots - slots} more before it goes out.
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

function useNow(intervalMs: number) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
