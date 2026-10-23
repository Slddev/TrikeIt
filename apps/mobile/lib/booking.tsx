import type { Place } from '@/lib/places';
import * as React from 'react';

export type Stop = 'pickup' | 'dropoff';

type Booking = {
  pickup: Place | null;
  dropoff: Place | null;
  setStop: (stop: Stop, place: Place) => void;
};

const BookingContext = React.createContext<Booking | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [pickup, setPickup] = React.useState<Place | null>(null);
  const [dropoff, setDropoff] = React.useState<Place | null>(null);

  const value = React.useMemo<Booking>(
    () => ({
      pickup,
      dropoff,
      setStop: (stop, place) => (stop === 'pickup' ? setPickup(place) : setDropoff(place)),
    }),
    [pickup, dropoff]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const booking = React.useContext(BookingContext);
  if (!booking) throw new Error('useBooking must be used inside <BookingProvider>.');
  return booking;
}
