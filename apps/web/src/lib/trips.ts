import "server-only";
import { and, asc, eq, inArray, isNull, notExists } from "drizzle-orm";
import { z } from "zod";
import { booking, db, driver, trip, tripDecline, user } from "@trikeit/db";
import { ApiError } from "@/lib/api";
import { distanceKm, type LngLat } from "@/lib/geo";

// Stand-in for a TODA zone until real zone boundaries exist: a driver is only offered trips
// whose every pick-up and drop-off is within this distance of where they are.
const SERVICE_RADIUS_KM = 3;
// How close the driver must be to confirm a pick-up or drop-off. Allows for GPS drift.
const ARRIVAL_RADIUS_KM = 0.15;

const OUTSIDE_PH =
  "Your phone reports a location outside the Philippines. On an emulator, set its location to somewhere in the Philippines.";
export const driverLocation = z.object({
  lng: z.number().min(116, OUTSIDE_PH).max(127, OUTSIDE_PH),
  lat: z.number().min(4, OUTSIDE_PH).max(22, OUTSIDE_PH),
});
export type DriverLocation = z.infer<typeof driverLocation>;

type TripRow = typeof trip.$inferSelect;
type DriverTrip = Awaited<ReturnType<typeof toDriverTrips>>[number];

async function getDriverRow(driverId: string) {
  const [row] = await db.select().from(driver).where(eq(driver.userId, driverId)).limit(1);
  if (!row) throw new ApiError(409, "Your vehicle details are missing. Ask an admin to add them.");
  return row;
}

/** Turns "Accepting bookings" on or off and records where the driver is. */
export async function setDriverStatus(driverId: string, online: boolean, at?: DriverLocation) {
  await getDriverRow(driverId);
  await db
    .update(driver)
    .set({ online, ...(at && { lastLng: at.lng, lastLat: at.lat, locationAt: new Date() }) })
    .where(eq(driver.userId, driverId));
  return listDriverTrips(driverId, at);
}

/**
 * The driver's trip in progress, or (while accepting bookings) the full trips within reach.
 * Passing a location also records it as the driver's latest.
 */
export async function listDriverTrips(driverId: string, at?: DriverLocation) {
  const me = await getDriverRow(driverId);
  if (at) {
    await db
      .update(driver)
      .set({ lastLng: at.lng, lastLat: at.lat, locationAt: new Date() })
      .where(eq(driver.userId, driverId));
  }

  const [active] = await db
    .select()
    .from(trip)
    .where(and(eq(trip.driverId, driverId), inArray(trip.status, ["accepted", "in_progress"])))
    .limit(1);
  if (active) {
    const [activeTrip] = await toDriverTrips([active], { withContact: true });
    return { online: me.online, active: activeTrip ?? null, open: [] };
  }
  if (!me.online || !at) return { online: me.online, active: null, open: [] };

  const ready = await db
    .select()
    .from(trip)
    .where(
      and(
        eq(trip.status, "ready"),
        notExists(
          db
            .select()
            .from(tripDecline)
            .where(and(eq(tripDecline.tripId, trip.id), eq(tripDecline.driverId, driverId))),
        ),
      ),
    )
    .orderBy(asc(trip.readyAt))
    .limit(50);

  const open = (await toDriverTrips(ready, { withContact: false }))
    .map((t) => ({ ...t, distanceToPickupKm: nearestPickupKm(t, at) }))
    .filter((t) => withinReach(t, at))
    .sort((a, b) => a.distanceToPickupKm - b.distanceToPickupKm);
  return { online: me.online, active: null, open };
}

export async function acceptTrip(driverId: string, tripId: string, at: DriverLocation) {
  const me = await getDriverRow(driverId);
  if (!me.online) throw new ApiError(409, "Turn on Accepting bookings first.");

  const [active] = await db
    .select({ id: trip.id })
    .from(trip)
    .where(and(eq(trip.driverId, driverId), inArray(trip.status, ["accepted", "in_progress"])))
    .limit(1);
  if (active) throw new ApiError(409, "Finish your current trip first.");

  const [candidate] = await db.select().from(trip).where(eq(trip.id, tripId)).limit(1);
  const [view] = candidate ? await toDriverTrips([candidate], { withContact: false }) : [];
  if (!view || !withinReach(view, at)) {
    throw new ApiError(409, "This trip is outside your area.");
  }

  const [accepted] = await db
    .update(trip)
    .set({ status: "accepted", driverId, acceptedAt: new Date() })
    .where(and(eq(trip.id, tripId), eq(trip.status, "ready")))
    .returning({ id: trip.id });
  if (!accepted) throw new ApiError(409, "Another rider already took this trip, or it was cancelled.");
  return listDriverTrips(driverId, at);
}

export async function declineTrip(driverId: string, tripId: string, at?: DriverLocation) {
  await db.insert(tripDecline).values({ tripId, driverId }).onConflictDoNothing();
  return listDriverTrips(driverId, at);
}

/** Confirms a parcel was picked up; the rider must be at its pick-up point. */
export async function confirmPickup(driverId: string, tripId: string, bookingId: string, at: DriverLocation) {
  const { stop } = await getStop(driverId, tripId, bookingId);
  if (stop.pickedUpAt) throw new ApiError(409, "Already picked up.");
  assertArrived(at, [stop.pickupLng, stop.pickupLat], "pick-up");

  await db.update(booking).set({ pickedUpAt: new Date() }).where(eq(booking.id, bookingId));
  await db
    .update(trip)
    .set({ status: "in_progress", startedAt: new Date() })
    .where(and(eq(trip.id, tripId), eq(trip.status, "accepted")));
  return listDriverTrips(driverId, at);
}

/** Confirms a parcel was delivered; the rider must be at its drop-off point. */
export async function confirmDropoff(driverId: string, tripId: string, bookingId: string, at: DriverLocation) {
  const { stop } = await getStop(driverId, tripId, bookingId);
  if (!stop.pickedUpAt) throw new ApiError(409, "Pick up this parcel first.");
  if (stop.droppedOffAt) throw new ApiError(409, "Already delivered.");
  assertArrived(at, [stop.dropoffLng, stop.dropoffLat], "drop-off");

  await db
    .update(booking)
    .set({ droppedOffAt: new Date(), status: "completed" })
    .where(eq(booking.id, bookingId));

  const [remaining] = await db
    .select({ id: booking.id })
    .from(booking)
    .where(and(eq(booking.tripId, tripId), eq(booking.status, "active"), isNull(booking.droppedOffAt)))
    .limit(1);
  if (!remaining) {
    await db
      .update(trip)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(trip.id, tripId));
  }
  return listDriverTrips(driverId, at);
}

async function getStop(driverId: string, tripId: string, bookingId: string) {
  const [row] = await db
    .select({ stop: booking, trip })
    .from(booking)
    .innerJoin(trip, eq(trip.id, booking.tripId))
    .where(and(eq(booking.id, bookingId), eq(booking.tripId, tripId)))
    .limit(1);
  if (!row || row.trip.driverId !== driverId || !["accepted", "in_progress"].includes(row.trip.status)) {
    throw new ApiError(404, "That stop isn't part of your current trip.");
  }
  if (row.stop.status === "cancelled") throw new ApiError(409, "The sender cancelled this delivery.");
  return row;
}

function assertArrived(at: DriverLocation, point: LngLat, label: string) {
  const km = distanceKm([at.lng, at.lat], point);
  if (km > ARRIVAL_RADIUS_KM) {
    const away = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
    throw new ApiError(409, `You're ${away} from the ${label} point. Get closer to confirm.`);
  }
}

function withinReach(t: DriverTrip, at: DriverLocation) {
  const here: LngLat = [at.lng, at.lat];
  return t.bookings.every(
    (b) =>
      distanceKm(here, [b.pickup.lng, b.pickup.lat]) <= SERVICE_RADIUS_KM &&
      distanceKm(here, [b.dropoff.lng, b.dropoff.lat]) <= SERVICE_RADIUS_KM,
  );
}

function nearestPickupKm(t: DriverTrip, at: DriverLocation) {
  return Math.min(...t.bookings.map((b) => distanceKm([at.lng, at.lat], [b.pickup.lng, b.pickup.lat])));
}

/** Senders' and recipients' phone numbers are only shared once the rider has accepted the trip. */
async function toDriverTrips(trips: TripRow[], { withContact }: { withContact: boolean }) {
  if (!trips.length) return [];
  const rows = await db
    .select({ booking, bookerName: user.name, bookerPhone: user.phoneNumber })
    .from(booking)
    .innerJoin(user, eq(user.id, booking.userId))
    .where(
      and(
        inArray(
          booking.tripId,
          trips.map((t) => t.id),
        ),
        // Delivered parcels stay listed (as done) until the whole trip is finished.
        inArray(booking.status, ["active", "completed"]),
      ),
    )
    .orderBy(asc(booking.createdAt));

  return trips
    .map((t) => {
      const bookings = rows
        .filter((r) => r.booking.tripId === t.id)
        .map(({ booking: b, bookerName, bookerPhone }) => ({
          id: b.id,
          // Bookings made before per-stop contacts existed fall back to the account that booked.
          senderName: b.senderName || bookerName,
          senderPhone: withContact ? b.senderPhone || bookerPhone : null,
          recipientName: b.recipientName,
          recipientPhone: withContact ? b.recipientPhone : null,
          parcelNotes: b.parcelNotes,
          slots: b.slots,
          fare: b.slotFare * b.slots,
          payment: b.payment,
          payer: b.payer,
          distanceKm: b.distanceKm,
          pickedUp: !!b.pickedUpAt,
          droppedOff: !!b.droppedOffAt,
          pickup: { lng: b.pickupLng, lat: b.pickupLat, title: b.pickupTitle, subtitle: b.pickupSubtitle },
          dropoff: {
            lng: b.dropoffLng,
            lat: b.dropoffLat,
            title: b.dropoffTitle,
            subtitle: b.dropoffSubtitle,
          },
        }));
      return {
        id: t.id,
        kind: t.kind,
        status: t.status,
        capacity: t.capacity,
        slotsFilled: t.slotsFilled,
        total: bookings.reduce((sum, b) => sum + b.fare, 0),
        bookings,
      };
    })
    .filter((t) => t.bookings.length > 0);
}
