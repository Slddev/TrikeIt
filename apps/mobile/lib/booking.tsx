import type { Place } from '@/lib/places';
import * as React from 'react';

export type Stop = 'pickup' | 'dropoff';

/** Who hands over the parcel at the pick-up, or receives it at the drop-off. */
export type Contact = { name: string; phone: string; isMe: boolean };

export type BookingStop = Place & { contact: Contact };

type Booking = {
  pickup: BookingStop | null;
  dropoff: BookingStop | null;
  parcelNotes: string;
  setStop: (stop: Stop, value: BookingStop) => void;
  setParcelNotes: (notes: string) => void;
};

const BookingContext = React.createContext<Booking | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [pickup, setPickup] = React.useState<BookingStop | null>(null);
  const [dropoff, setDropoff] = React.useState<BookingStop | null>(null);
  const [parcelNotes, setParcelNotes] = React.useState('');

  const value = React.useMemo<Booking>(
    () => ({
      pickup,
      dropoff,
      parcelNotes,
      setStop: (stop, next) => (stop === 'pickup' ? setPickup(next) : setDropoff(next)),
      setParcelNotes,
    }),
    [pickup, dropoff, parcelNotes]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const booking = React.useContext(BookingContext);
  if (!booking) throw new Error('useBooking must be used inside <BookingProvider>.');
  return booking;
}
