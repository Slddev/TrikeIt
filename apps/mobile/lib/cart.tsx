import type { BookingStop } from '@/lib/booking';
import * as React from 'react';

export type CartLine = {
  itemId: string;
  name: string;
  price: number;
  imageUrl: string;
  qty: number;
  note: string;
};

type Cart = {
  merchant: { id: string; name: string } | null;
  lines: CartLine[];
  /** Where orders are delivered; also used to list stores nearby. */
  address: BookingStop | null;
  count: number;
  subtotal: number;
  /** Adds to the basket, replacing it if it holds another store's items. */
  add: (merchant: { id: string; name: string }, line: CartLine) => void;
  setQty: (itemId: string, qty: number) => void;
  clear: () => void;
  setAddress: (address: BookingStop) => void;
};

const CartContext = React.createContext<Cart | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [merchant, setMerchant] = React.useState<Cart['merchant']>(null);
  const [lines, setLines] = React.useState<CartLine[]>([]);
  const [address, setAddress] = React.useState<BookingStop | null>(null);

  const value = React.useMemo<Cart>(() => {
    const add: Cart['add'] = (store, line) => {
      const sameStore = merchant?.id === store.id;
      setMerchant(store);
      setLines((current) => {
        const kept = sameStore ? current : [];
        const existing = kept.find((l) => l.itemId === line.itemId);
        return existing
          ? kept.map((l) =>
              l === existing ? { ...l, qty: l.qty + line.qty, note: line.note || l.note } : l
            )
          : [...kept, line];
      });
    };
    return {
      merchant,
      lines,
      address,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((sum, l) => sum + l.price * l.qty, 0),
      add,
      setQty: (itemId, qty) =>
        setLines((current) =>
          qty > 0
            ? current.map((l) => (l.itemId === itemId ? { ...l, qty } : l))
            : current.filter((l) => l.itemId !== itemId)
        ),
      clear: () => {
        setMerchant(null);
        setLines([]);
      },
      setAddress,
    };
  }, [merchant, lines, address]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = React.useContext(CartContext);
  if (!cart) throw new Error('useCart must be used inside <CartProvider>.');
  return cart;
}
