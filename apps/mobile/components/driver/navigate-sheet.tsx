import { Text } from '@/components/ui/text';
import type { ApiPlace } from '@/lib/api';
import { openInGoogleMaps, openInWaze } from '@/lib/navigation';
import { router } from 'expo-router';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function NavigateSheet({ place, onClose }: { place: ApiPlace | null; onClose: () => void }) {
  function choose(open: () => unknown) {
    onClose();
    open();
  }

  return (
    <Modal visible={!!place} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40" accessibilityLabel="Close" />
      {place && (
        <SafeAreaView edges={['bottom']} className="gap-3 rounded-t-3xl bg-white px-6 pb-4 pt-5">
          <View className="mb-1">
            <Text className="font-poppins text-xs uppercase tracking-wider text-brand-navy/50">
              Navigate to
            </Text>
            <Text className="font-poppins-semibold text-lg text-brand-navy" numberOfLines={1}>
              {place.title}
            </Text>
          </View>
          <Option label="TrikeIt! map" onPress={() => choose(() => router.push('/trip-map'))} />
          <Option label="Waze" onPress={() => choose(() => openInWaze(place.lng, place.lat))} />
          <Option
            label="Google Maps"
            onPress={() => choose(() => openInGoogleMaps(place.lng, place.lat))}
          />
          <Pressable onPress={onClose} className="h-12 items-center justify-center">
            <Text className="font-poppins-medium text-base text-brand-navy/60">Cancel</Text>
          </Pressable>
        </SafeAreaView>
      )}
    </Modal>
  );
}

function Option({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-14 items-center justify-center rounded-2xl bg-brand-cream active:bg-brand-yellow">
      <Text className="font-poppins-semibold text-base text-brand-navy">{label}</Text>
    </Pressable>
  );
}
