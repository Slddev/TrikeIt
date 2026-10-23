import type { Place } from '@/lib/places';
import * as React from 'react';

export type Stop = 'pickup' | 'dropoff';

/** Who hands over the parcel at the pick-up, or receives it at the drop-off. */
export type Contact = { name: string; phone: string; isMe: boolean };

export type BookingStop = Place & { contact: Contact };

export const MAX_EXTRA_STOPS = 3;

type Booking = {
  pickup: BookingStop | null;
  dropoff: BookingStop | null;
  extraStops: BookingStop[];
  parcelNotes: string;
  setStop: (stop: Stop, value: BookingStop) => void;
  /** Replaces extra stop `index`, or adds one when `index` is past the end. */
  setExtraStop: (index: number, value: BookingStop) => void;
  removeExtraStop: (index: number) => void;
  setParcelNotes: (notes: string) => void;
};

const BookingContext = React.createContext<Booking | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [pickup, setPickup] = React.useState<BookingStop | null>(null);
  const [dropoff, setDropoff] = React.useState<BookingStop | null>(null);
  const [extraStops, setExtraStops] = React.useState<BookingStop[]>([]);
  const [parcelNotes, setParcelNotes] = React.useState('');

  const value = React.useMemo<Booking>(
    () => ({
      pickup,
      dropoff,
      extraStops,
      parcelNotes,
      setStop: (stop, next) => (stop === 'pickup' ? setPickup(next) : setDropoff(next)),
      setExtraStop: (index, next) =>
        setExtraStops((current) =>
          index < current.length
            ? current.map((s, i) => (i === index ? next : s))
            : [...current, next].slice(0, MAX_EXTRA_STOPS)
        ),
      removeExtraStop: (index) => setExtraStops((current) => current.filter((_, i) => i !== index)),
      setParcelNotes,
    }),
    [pickup, dropoff, extraStops, parcelNotes]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const booking = React.useContext(BookingContext);
  if (!booking) throw new Error('useBooking must be used inside <BookingProvider>.');
  return booking;
}
