import { QtyStepper } from '@/components/merchant/qty-stepper';
import { RemoteImage } from '@/components/merchant/remote-image';
import { Text } from '@/components/ui/text';
import { useAddToCart, useMerchant } from '@/lib/merchant';
import { router, useLocalSearchParams } from 'expo-router';
import { UtensilsIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MenuItemScreen() {
  const { merchantId, itemId } = useLocalSearchParams<{ merchantId: string; itemId: string }>();
  const { merchant, error } = useMerchant(merchantId);
  const item = merchant?.items.find((i) => i.id === itemId);
  const addToCart = useAddToCart();
  const [qty, setQty] = React.useState(1);
  const [note, setNote] = React.useState('');

  if (!merchant || !item) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-10">
        {error || merchant ? (
          <Text className="text-center font-poppins text-base text-brand-navy/70">
            {error ?? 'This item is no longer available.'}
          </Text>
        ) : (
          <ActivityIndicator color="#0B0F3F" />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior="padding">
      <ScrollView contentContainerClassName="pb-6" keyboardShouldPersistTaps="handled">
        <RemoteImage url={item.imageUrl} fallbackIcon={UtensilsIcon} className="h-72 w-full" />
        <SafeAreaView edges={['top']} className="absolute right-0 top-0">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Close"
            className="m-4 h-11 w-11 items-center justify-center rounded-full bg-brand-navy active:opacity-80">
            <XIcon size={22} color="#FFE891" />
          </Pressable>
        </SafeAreaView>

        <View className="gap-5 px-6 pt-5">
          <View className="gap-1">
            <View className="flex-row items-start justify-between gap-4">
              <Text className="flex-1 font-poppins-bold text-2xl leading-8 text-brand-navy">
                {item.name}
              </Text>
              <Text className="font-poppins-bold text-xl text-brand-navy">₱{item.price}</Text>
            </View>
            {!!item.description && (
              <Text className="font-poppins text-sm text-brand-navy/70">{item.description}</Text>
            )}
          </View>

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="font-poppins-semibold text-base text-brand-navy">
                Note to the store
              </Text>
              <Text className="rounded-full bg-brand-cream px-2 py-0.5 font-poppins text-xs text-brand-navy/60">
                Optional
              </Text>
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Less sugar, no onions"
              placeholderTextColor="#0B0F3F80"
              multiline
              maxLength={200}
              textAlignVertical="top"
              className="min-h-24 rounded-2xl border-2 border-brand-navy/15 p-3 font-poppins text-base text-brand-navy"
            />
          </View>

          <View className="items-center pt-2">
            <QtyStepper value={qty} onChange={setQty} />
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} className="px-6 pb-2 pt-3">
        <Pressable
          onPress={() =>
            addToCart(
              merchant,
              {
                itemId: item.id,
                name: item.name,
                price: item.price,
                imageUrl: item.imageUrl,
                qty,
                note: note.trim(),
              },
              () => router.back()
            )
          }
          className="h-14 items-center justify-center rounded-2xl bg-brand-gold active:opacity-90">
          <Text className="font-poppins-semibold text-base text-brand-navy">
            Add to Basket · ₱{item.price * qty}
          </Text>
        </Pressable>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
