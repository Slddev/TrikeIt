import type { ApiPlace, DriverTrip } from '@/lib/api';
import type { Stop } from '@/lib/booking';
import { distanceKm } from '@/lib/places';

export type TripStop = { stop: Stop; booking: DriverTrip['bookings'][number]; place: ApiPlace };

/** Every pick-up first, then every drop-off, each time going to the nearest remaining stop. */
export function orderStops(trip: DriverTrip): TripStop[] {
  const pickups = nearestFirst(
    trip.bookings.map((booking) => ({ stop: 'pickup' as const, booking, place: booking.pickup })),
    trip.bookings[0]?.pickup
  );
  const dropoffs = nearestFirst(
    trip.bookings.map((booking) => ({ stop: 'dropoff' as const, booking, place: booking.dropoff })),
    pickups.at(-1)?.place
  );
  return [...pickups, ...dropoffs];
}

function nearestFirst(stops: TripStop[], start: ApiPlace | undefined): TripStop[] {
  const remaining = [...stops];
  const ordered: TripStop[] = [];
  let from = start;
  while (remaining.length) {
    let best = 0;
    if (from) {
      const origin = from;
      const dist = (s: TripStop) =>
        distanceKm([origin.lng, origin.lat], [s.place.lng, s.place.lat]);
      remaining.forEach((s, i) => {
        if (dist(s) < dist(remaining[best])) best = i;
      });
    }
    const [next] = remaining.splice(best, 1);
    ordered.push(next);
    from = next.place;
  }
  return ordered;
}

export function isDone({ stop, booking }: TripStop) {
  return stop === 'pickup' ? booking.pickedUp : booking.droppedOff;
}

/** A stop the rider can confirm now: any pick-up, or the drop-off of a parcel already collected. */
export function isActionable(s: TripStop) {
  return !isDone(s) && (s.stop === 'pickup' || s.booking.pickedUp);
}

/** Who the rider deals with at a stop: the sender at the pick-up, the recipient at the drop-off. */
export function contactAt({ stop, booking }: TripStop) {
  return stop === 'pickup'
    ? { name: booking.senderName, phone: booking.senderPhone }
    : { name: booking.recipientName, phone: booking.recipientPhone };
}

/** Cash the rider collects at this stop: from the sender at the pick-up, or the recipient on delivery. */
export function cashAt({ stop, booking }: TripStop) {
  if (booking.payment !== 'cod') return 0;
  const collectHere = booking.payer === 'recipient' ? stop === 'dropoff' : stop === 'pickup';
  if (!collectHere) return 0;
  // Merchant orders: the rider bought the items at the store, so the customer pays those back too.
  return booking.fare + (stop === 'dropoff' ? booking.itemsTotal : 0);
}

/** Cash the rider hands the store for a merchant order at its pick-up. */
export function payAt({ stop, booking }: TripStop) {
  return stop === 'pickup' ? booking.itemsTotal : 0;
}
