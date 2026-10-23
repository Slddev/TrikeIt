import { BasketBar } from '@/components/merchant/basket-bar';
import { RemoteImage } from '@/components/merchant/remote-image';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Merchant, MenuItem } from '@/lib/api';
import { useAddToCart, useMerchant } from '@/lib/merchant';
import { cn } from '@/lib/utils';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon, MapPinIcon, PlusIcon, UtensilsIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MerchantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { merchant, error } = useMerchant(id);
  const addToCart = useAddToCart();

  if (!merchant) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <BackButton />
        <View className="flex-1 items-center justify-center px-10">
          {error ? (
            <Text className="text-center font-poppins text-base text-brand-navy/70">{error}</Text>
          ) : (
            <ActivityIndicator color="#0B0F3F" />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const forYou = merchant.items.filter((i) => !i.featured);
  const featured = merchant.items.filter((i) => i.featured);
  const open = (item: MenuItem) =>
    router.push({
      pathname: '/merchant/item',
      params: { merchantId: merchant.id, itemId: item.id },
    });
  const quickAdd = (item: MenuItem) =>
    addToCart(merchant, {
      itemId: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      qty: 1,
      note: '',
    });

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerClassName="pb-8">
        <RemoteImage url={merchant.coverUrl} className="h-56 w-full" />
        <SafeAreaView edges={['top']} className="absolute left-0 top-0">
          <BackButton />
        </SafeAreaView>

        <StoreCard merchant={merchant} />

        {merchant.items.length === 0 && (
          <Text className="px-6 pt-10 text-center font-poppins text-sm text-brand-navy/60">
            This store hasn&apos;t added anything to its menu yet.
          </Text>
        )}

        {forYou.length > 0 && (
          <View className="gap-3 px-6 pt-6">
            <Text className="font-poppins-bold text-lg text-brand-navy">For You</Text>
            <View className="flex-row flex-wrap justify-between gap-y-4">
              {forYou.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => open(item)}
                  className="w-[48%] gap-2 active:opacity-90">
                  <View>
                    <RemoteImage
                      url={item.imageUrl}
                      fallbackIcon={UtensilsIcon}
                      className="aspect-square w-full rounded-2xl"
                    />
                    <AddButton
                      onPress={() => quickAdd(item)}
                      className="absolute bottom-2 right-2"
                    />
                  </View>
                  <View>
                    <Text className="font-poppins-medium text-sm text-brand-navy" numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text className="font-poppins-bold text-sm text-brand-navy">₱{item.price}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {featured.length > 0 && (
          <View className="gap-3 px-6 pt-6">
            <Text className="font-poppins-bold text-lg text-brand-navy">Featured</Text>
            {featured.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => open(item)}
                className="flex-row items-center gap-4 active:opacity-90">
                <RemoteImage
                  url={item.imageUrl}
                  fallbackIcon={UtensilsIcon}
                  className="h-20 w-20 rounded-2xl"
                />
                <View className="flex-1">
                  <Text className="font-poppins-medium text-sm text-brand-navy" numberOfLines={2}>
                    {item.name}
                  </Text>
                  {!!item.description && (
                    <Text className="font-poppins text-xs text-brand-navy/60" numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <Text className="font-poppins-bold text-sm text-brand-navy">₱{item.price}</Text>
                </View>
                <AddButton onPress={() => quickAdd(item)} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <BasketBar merchantId={merchant.id} />
    </View>
  );
}

function StoreCard({ merchant }: { merchant: Merchant }) {
  return (
    <View className="mx-6 -mt-12 flex-row gap-4 rounded-3xl bg-white p-4 shadow-md shadow-black/15">
      <RemoteImage url={merchant.logoUrl} className="h-20 w-20 rounded-2xl" />
      <View className="flex-1 justify-center gap-1">
        <Text className="font-poppins-bold text-xl leading-7 text-brand-navy" numberOfLines={2}>
          {merchant.name}
        </Text>
        {!!merchant.description && (
          <Text className="font-poppins text-xs text-brand-navy/70" numberOfLines={2}>
            {merchant.description}
          </Text>
        )}
        <View className="flex-row items-center gap-1">
          <Icon as={MapPinIcon} size={12} className="text-brand-navy/50" />
          <Text className="flex-1 font-poppins text-xs text-brand-navy/50" numberOfLines={1}>
            {merchant.addressTitle}
          </Text>
        </View>
      </View>
    </View>
  );
}

function AddButton({ onPress, className }: { onPress: () => void; className?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Add to basket"
      hitSlop={8}
      className={cn(
        'h-9 w-9 items-center justify-center rounded-full bg-brand-navy active:opacity-80',
        className
      )}>
      <Icon as={PlusIcon} size={18} className="text-brand-yellow" />
    </Pressable>
  );
}

function BackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityLabel="Back"
      className="m-4 h-11 w-11 items-center justify-center rounded-full bg-brand-navy active:opacity-80">
      <ArrowLeftIcon size={22} color="#FFE891" />
    </Pressable>
  );
}
