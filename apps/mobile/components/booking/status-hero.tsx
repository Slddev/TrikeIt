import { Text } from '@/components/ui/text';
import { Image, View } from 'react-native';

// Each caption sits in a blank part of its drawing: beside the waiting trike, or inside the
// speech bubble. Positions are fractions of the image, so they hold at any width.
const ART = {
  waiting: {
    source: require('@/assets/rider-waiting.png'),
    aspectRatio: 900 / 1142,
    caption: { left: '47%', top: '71%', width: '50%' },
  },
  found: {
    source: require('@/assets/rider-found.png'),
    aspectRatio: 900 / 1269,
    caption: { left: '20%', top: '6%', width: '47%' },
  },
} as const;

/** The big illustration shown while a booking waits for a rider, and once one accepts. */
export function StatusHero({ variant, label }: { variant: keyof typeof ART; label: string }) {
  const art = ART[variant];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      className="w-4/5 self-center"
      style={{ aspectRatio: art.aspectRatio }}>
      <Image source={art.source} resizeMode="contain" className="h-full w-full" />
      <Text
        className="absolute text-center font-poppins-bold text-lg leading-6 text-brand-navy"
        style={art.caption}>
        {label}
      </Text>
    </View>
  );
}
