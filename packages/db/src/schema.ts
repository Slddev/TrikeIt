import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  uuid,
  doublePrecision,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const todaZones = pgTable("toda_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  barangay: text("barangay").notNull(),
  city: text("city").notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  zoneId: uuid("zone_id").references(() => todaZones.id).notNull(),
  status: text("status").notNull().default("pending"),
  feeCentavos: integer("fee_centavos").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserRole = "customer" | "driver" | "admin";

// Vehicle details for users an admin has approved as drivers (user.role = "driver").
export const driver = pgTable("driver", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  plateNumber: text("plate_number").notNull(),
  bodyNumber: text("body_number"),
  todaName: text("toda_name"),
  // Set by the driver's "Accepting bookings" switch; trips are only offered while it's on.
  online: boolean("online").notNull().default(false),
  lastLng: doublePrecision("last_lng"),
  lastLat: doublePrecision("last_lat"),
  locationAt: timestamp("location_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type TripKind = "regular" | "special";
// filling: regular trip waiting for slots · ready: full, shown to riders ·
// accepted: rider heading to pick-ups · in_progress: out for delivery · completed / cancelled.
export type TripStatus = "filling" | "ready" | "accepted" | "in_progress" | "completed" | "cancelled";

// One trike run. Regular trips pool up to `capacity` bookings; special trips are booked whole.
export const trip = pgTable(
  "trip",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").$type<TripKind>().notNull(),
    status: text("status").$type<TripStatus>().notNull().default("filling"),
    capacity: integer("capacity").notNull().default(4),
    slotsFilled: integer("slots_filled").notNull().default(0),
    // The first booking's stops; later regular bookings pool only if they're close to these.
    anchorPickupLng: doublePrecision("anchor_pickup_lng").notNull(),
    anchorPickupLat: doublePrecision("anchor_pickup_lat").notNull(),
    anchorDropoffLng: doublePrecision("anchor_dropoff_lng").notNull(),
    anchorDropoffLat: doublePrecision("anchor_dropoff_lat").notNull(),
    driverId: text("driver_id").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    readyAt: timestamp("ready_at"),
    acceptedAt: timestamp("accepted_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (t) => [index("trip_status_idx").on(t.status), index("trip_driver_idx").on(t.driverId)],
);

export type BookingStatus = "active" | "completed" | "cancelled";
export type PaymentMethod = "cod" | "online";
export type Payer = "sender" | "recipient";

export const booking = pgTable(
  "booking",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trip.id),
    status: text("status").$type<BookingStatus>().notNull().default("active"),
    // Slots this booking holds: 1 for regular, the whole trike for special or after paying for the rest.
    slots: integer("slots").notNull(),
    pickupLng: doublePrecision("pickup_lng").notNull(),
    pickupLat: doublePrecision("pickup_lat").notNull(),
    pickupTitle: text("pickup_title").notNull(),
    pickupSubtitle: text("pickup_subtitle").notNull().default(""),
    dropoffLng: doublePrecision("dropoff_lng").notNull(),
    dropoffLat: doublePrecision("dropoff_lat").notNull(),
    dropoffTitle: text("dropoff_title").notNull(),
    dropoffSubtitle: text("dropoff_subtitle").notNull().default(""),
    // Contacts at each end. The person booking can be either one, so neither is implied by userId.
    senderName: text("sender_name").notNull().default(""),
    senderPhone: text("sender_phone").notNull().default(""),
    recipientName: text("recipient_name").notNull().default(""),
    recipientPhone: text("recipient_phone").notNull().default(""),
    parcelNotes: text("parcel_notes").notNull().default(""),
    distanceKm: doublePrecision("distance_km").notNull(),
    // Pesos for one slot; the booking pays slotFare * slots.
    slotFare: integer("slot_fare").notNull(),
    payment: text("payment").$type<PaymentMethod>().notNull(),
    // Cash from the sender is collected at the pick-up; from the recipient, at the drop-off.
    payer: text("payer").$type<Payer>().notNull().default("sender"),
    // Confirmed by the driver from within reach of each point.
    pickedUpAt: timestamp("picked_up_at"),
    droppedOffAt: timestamp("dropped_off_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("booking_user_idx").on(t.userId),
    index("booking_trip_idx").on(t.tripId),
    // A user can only have one booking in progress at a time.
    uniqueIndex("booking_one_active_per_user").on(t.userId).where(sql`${t.status} = 'active'`),
  ],
);

// Drivers who passed on a trip, so it stops showing in their list.
export const tripDecline = pgTable(
  "trip_decline",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trip.id, { onDelete: "cascade" }),
    driverId: text("driver_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.tripId, t.driverId] })],
);
