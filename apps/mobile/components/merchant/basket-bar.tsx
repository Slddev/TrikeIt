import { Text } from '@/components/ui/text';
import { useCart } from '@/lib/cart';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** "Basket | 2 items  ₱140" bar that opens the order summary. */
export function BasketBar({ merchantId }: { merchantId: string }) {
  const { merchant, count, subtotal } = useCart();
  if (merchant?.id !== merchantId || count === 0) return null;

  return (
    <SafeAreaView edges={['bottom']} className="px-6 pb-2 pt-3">
      <Pressable
        onPress={() => router.push('/checkout')}
        accessibilityLabel={`Basket, ${count} items, ₱${subtotal}`}
        className="h-14 flex-row items-center justify-between rounded-2xl bg-brand-gold px-5 active:opacity-90">
        <View className="flex-row items-center gap-2">
          <Text className="font-poppins-bold text-base text-brand-navy">Basket</Text>
          <Text className="font-poppins text-base text-brand-navy/60">|</Text>
          <Text className="font-poppins text-base text-brand-navy">
            {count} item{count === 1 ? '' : 's'}
          </Text>
        </View>
        <Text className="font-poppins-bold text-lg text-brand-navy">₱{subtotal}</Text>
      </Pressable>
    </SafeAreaView>
  );
}
