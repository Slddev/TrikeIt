import "server-only";
import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { booking, db, driver, merchant, trip, user, type OrderItem } from "@trikeit/db";
import { ApiError } from "@/lib/api";
import { slotFare, TRIP_CAPACITY } from "@/lib/fare";
import { distanceKm, roadDistanceKm, type LngLat } from "@/lib/geo";
import { isValidPhoneNumber } from "@/lib/phone";

// A regular booking joins an open trip only if both stops are near that trip's first booking.
const POOL_PICKUP_RADIUS_KM = 1;
const POOL_DROPOFF_RADIUS_KM = 3;

const contact = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().refine(isValidPhoneNumber),
});

const place = z.object({
  lng: z.number().min(116).max(127),
  lat: z.number().min(4).max(22),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(300).default(""),
  // Who hands over the parcel at the pick-up, or receives it at the drop-off.
  contact,
});

export const createBookingInput = z.object({
  kind: z.enum(["regular", "special"]),
  pickup: place,
  dropoff: place,
  payment: z.enum(["cod", "online"]),
  payer: z.enum(["sender", "recipient"]),
  parcelNotes: z.string().trim().max(500).default(""),
});

export type BookingView = Awaited<ReturnType<typeof getBooking>>;

export async function getBooking(userId: string, bookingId: string) {
  const [row] = await db
    .select({ booking, trip, merchantName: merchant.name })
    .from(booking)
    .innerJoin(trip, eq(booking.tripId, trip.id))
    .leftJoin(merchant, eq(booking.merchantId, merchant.id))
    .where(and(eq(booking.id, bookingId), eq(booking.userId, userId)))
    .limit(1);
  if (!row) throw new ApiError(404, "Booking not found.");
  const { booking: b, trip: t, merchantName } = row;

  const [assigned] = t.driverId
    ? await db
        .select({
          name: user.name,
          phoneNumber: user.phoneNumber,
          plateNumber: driver.plateNumber,
          bodyNumber: driver.bodyNumber,
          todaName: driver.todaName,
        })
        .from(user)
        .leftJoin(driver, eq(driver.userId, user.id))
        .where(eq(user.id, t.driverId))
        .limit(1)
    : [];

  const openSlots = t.capacity - t.slotsFilled;
  const canBuy = b.status === "active" && t.kind === "regular" && t.status === "filling" && openSlots > 0;

  // When the latest booking joined; the app nudges harder the longer a trip sits without new ones.
  const [{ lastJoinAt }] = canBuy
    ? await db
        .select({ lastJoinAt: sql<Date>`max(${booking.createdAt})` })
        .from(booking)
        .where(and(eq(booking.tripId, t.id), eq(booking.status, "active")))
    : [{ lastJoinAt: null }];

  return {
    id: b.id,
    status: b.status,
    kind: t.kind,
    slots: b.slots,
    slotFare: b.slotFare,
    total: b.slotFare * b.slots,
    payment: b.payment,
    distanceKm: b.distanceKm,
    pickup: { lng: b.pickupLng, lat: b.pickupLat, title: b.pickupTitle, subtitle: b.pickupSubtitle },
    dropoff: { lng: b.dropoffLng, lat: b.dropoffLat, title: b.dropoffTitle, subtitle: b.dropoffSubtitle },
    sender: { name: b.senderName, phone: b.senderPhone },
    recipient: { name: b.recipientName, phone: b.recipientPhone },
    payer: b.payer,
    parcelNotes: b.parcelNotes,
    order: b.merchantId
      ? { merchantId: b.merchantId, merchantName: merchantName ?? b.senderName, items: b.items, itemsTotal: b.itemsTotal }
      : null,
    trip: { status: t.status, slotsFilled: t.slotsFilled, capacity: t.capacity },
    // A batched trip can be under way before this parcel is picked up.
    pickedUp: !!b.pickedUpAt,
    // Regular senders on a trip that's still filling can pay for 1 up to all of the empty slots.
    buyout: canBuy
      ? { maxSlots: openSlots, slotFare: b.slotFare, lastJoinAt: new Date(lastJoinAt ?? b.createdAt) }
      : null,
    driver: assigned ?? null,
    createdAt: b.createdAt,
  };
}

export async function getActiveBooking(userId: string) {
  const [active] = await db
    .select({ id: booking.id })
    .from(booking)
    .where(and(eq(booking.userId, userId), eq(booking.status, "active")))
    .limit(1);
  return active ? getBooking(userId, active.id) : null;
}

export type MerchantOrder = { merchantId: string; items: OrderItem[]; itemsTotal: number };

export async function createBooking(
  userId: string,
  input: z.infer<typeof createBookingInput>,
  order?: MerchantOrder,
) {
  if (await getActiveBooking(userId)) {
    throw new ApiError(409, "You already have a delivery in progress.");
  }

  const pickup: LngLat = [input.pickup.lng, input.pickup.lat];
  const dropoff: LngLat = [input.dropoff.lng, input.dropoff.lat];
  const km = await roadDistanceKm(pickup, dropoff);
  const slots = input.kind === "special" ? TRIP_CAPACITY : 1;

  const tripRow =
    input.kind === "special"
      ? await insertTrip("special", pickup, dropoff, TRIP_CAPACITY)
      : ((await joinOpenTrip(pickup, dropoff)) ?? (await insertTrip("regular", pickup, dropoff, 1)));

  let bookingId: string;
  try {
    [{ id: bookingId }] = await db
      .insert(booking)
      .values({
        userId,
        tripId: tripRow.id,
        slots,
        pickupLng: input.pickup.lng,
        pickupLat: input.pickup.lat,
        pickupTitle: input.pickup.title,
        pickupSubtitle: input.pickup.subtitle,
        dropoffLng: input.dropoff.lng,
        dropoffLat: input.dropoff.lat,
        dropoffTitle: input.dropoff.title,
        dropoffSubtitle: input.dropoff.subtitle,
        distanceKm: km,
        slotFare: slotFare(km),
        payment: input.payment,
        payer: input.payer,
        senderName: input.pickup.contact.name,
        senderPhone: input.pickup.contact.phone,
        recipientName: input.dropoff.contact.name,
        recipientPhone: input.dropoff.contact.phone,
        parcelNotes: input.parcelNotes,
        ...order,
      })
      .returning({ id: booking.id });
  } catch (error) {
    // Most likely a second active booking racing past the check above; give the slots back.
    await releaseSlots(tripRow.id, slots);
    throw error;
  }

  await markReadyIfFull(tripRow.id);
  return getBooking(userId, bookingId);
}

/** Pay for `slots` of the trip's empty slots; filling the last one sends the trip to drivers. */
export async function buySlots(userId: string, bookingId: string, slots: number) {
  // Retried because another booking may join between reading and updating the trip.
  for (let attempt = 0; attempt < 3; attempt++) {
    const view = await getBooking(userId, bookingId);
    if (!view.buyout) throw new ApiError(409, "This booking can't buy more slots.");
    if (!Number.isInteger(slots) || slots < 1 || slots > view.buyout.maxSlots) {
      throw new ApiError(400, `You can buy 1 to ${view.buyout.maxSlots} slots.`);
    }

    const [row] = await db.select({ tripId: booking.tripId }).from(booking).where(eq(booking.id, bookingId));
    const [taken] = await db
      .update(trip)
      .set({ slotsFilled: sql`${trip.slotsFilled} + ${slots}` })
      .where(
        and(
          eq(trip.id, row.tripId),
          eq(trip.status, "filling"),
          eq(trip.slotsFilled, view.trip.slotsFilled),
        ),
      )
      .returning({ id: trip.id });
    if (!taken) continue;

    await db
      .update(booking)
      .set({ slots: sql`${booking.slots} + ${slots}` })
      .where(eq(booking.id, bookingId));
    await markReadyIfFull(row.tripId);
    return getBooking(userId, bookingId);
  }
  throw new ApiError(409, "Your trip just changed. Please try again.");
}

export async function cancelBooking(userId: string, bookingId: string) {
  const view = await getBooking(userId, bookingId);
  if (view.status !== "active") throw new ApiError(409, "This booking is no longer active.");

  const [row] = await db.select({ tripId: booking.tripId }).from(booking).where(eq(booking.id, bookingId));
  const [released] = await db
    .update(trip)
    .set({
      slotsFilled: sql`${trip.slotsFilled} - ${view.slots}`,
      status: sql`case when ${trip.kind} = 'special' or ${trip.slotsFilled} - ${view.slots} <= 0 then 'cancelled' else 'filling' end`,
      readyAt: null,
    })
    .where(and(eq(trip.id, row.tripId), inArray(trip.status, ["filling", "ready"])))
    .returning({ id: trip.id });
  if (!released) {
    throw new ApiError(409, "A rider already accepted this delivery. Please contact them to cancel.");
  }

  await db.update(booking).set({ status: "cancelled" }).where(eq(booking.id, bookingId));
  return getBooking(userId, bookingId);
}

async function insertTrip(kind: "regular" | "special", pickup: LngLat, dropoff: LngLat, slotsFilled: number) {
  const [row] = await db
    .insert(trip)
    .values({
      kind,
      status: slotsFilled >= TRIP_CAPACITY ? "ready" : "filling",
      capacity: TRIP_CAPACITY,
      slotsFilled,
      anchorPickupLng: pickup[0],
      anchorPickupLat: pickup[1],
      anchorDropoffLng: dropoff[0],
      anchorDropoffLat: dropoff[1],
      readyAt: slotsFilled >= TRIP_CAPACITY ? new Date() : null,
    })
    .returning();
  return row;
}

/** Takes one slot on the oldest open regular trip going the same way, if there is one. */
async function joinOpenTrip(pickup: LngLat, dropoff: LngLat) {
  const open = await db
    .select()
    .from(trip)
    .where(and(eq(trip.kind, "regular"), eq(trip.status, "filling"), lt(trip.slotsFilled, trip.capacity)))
    .orderBy(asc(trip.createdAt))
    .limit(100);

  for (const candidate of open) {
    const near =
      distanceKm(pickup, [candidate.anchorPickupLng, candidate.anchorPickupLat]) <= POOL_PICKUP_RADIUS_KM &&
      distanceKm(dropoff, [candidate.anchorDropoffLng, candidate.anchorDropoffLat]) <= POOL_DROPOFF_RADIUS_KM;
    if (!near) continue;

    // Conditional so two bookings can't take the last slot at once.
    const [joined] = await db
      .update(trip)
      .set({ slotsFilled: sql`${trip.slotsFilled} + 1` })
      .where(and(eq(trip.id, candidate.id), eq(trip.status, "filling"), lt(trip.slotsFilled, trip.capacity)))
      .returning();
    if (joined) return joined;
  }
  return null;
}

async function markReadyIfFull(tripId: string) {
  await db
    .update(trip)
    .set({ status: "ready", readyAt: new Date() })
    .where(and(eq(trip.id, tripId), eq(trip.status, "filling"), sql`${trip.slotsFilled} >= ${trip.capacity}`));
}

async function releaseSlots(tripId: string, slots: number) {
  await db
    .update(trip)
    .set({
      slotsFilled: sql`${trip.slotsFilled} - ${slots}`,
      status: sql`case when ${trip.slotsFilled} - ${slots} <= 0 then 'cancelled' else 'filling' end`,
    })
    .where(eq(trip.id, tripId));
}
