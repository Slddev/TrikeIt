import { api, type Merchant } from '@/lib/api';
import { useCart, type CartLine } from '@/lib/cart';
import { usePoll } from '@/lib/use-poll';
import { Alert } from 'react-native';

// The store page, item sheet and checkout share one copy so moving between them doesn't reload.
const cache = new Map<string, Merchant>();

export function useMerchant(id: string | undefined) {
  const { data, error } = usePoll(
    id ? `merchant-${id}` : null,
    async () => {
      const merchant = await api<Merchant>(`/api/merchants/${id}`);
      cache.set(merchant.id, merchant);
      return merchant;
    },
    { intervalMs: 60_000 }
  );
  return { merchant: data ?? (id ? cache.get(id) : undefined), error };
}

/** Adds to the basket, first asking before it drops another store's items. */
export function useAddToCart() {
  const cart = useCart();
  return (merchant: { id: string; name: string }, line: CartLine, then?: () => void) => {
    const add = () => {
      cart.add(merchant, line);
      then?.();
    };
    if (!cart.merchant || cart.merchant.id === merchant.id || !cart.lines.length) return add();
    Alert.alert(
      'Start a new basket?',
      `Your basket has items from ${cart.merchant.name}. Adding this clears them.`,
      [
        { text: 'Keep basket', style: 'cancel' },
        { text: 'Start new', style: 'destructive', onPress: add },
      ]
    );
  };
}
