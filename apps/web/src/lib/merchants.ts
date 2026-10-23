import "server-only";
import { del } from "@vercel/blob";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { booking, db, menuItem, merchant, trip, user } from "@trikeit/db";
import { ApiError } from "@/lib/api";
import { createBooking, createBookingInput } from "@/lib/bookings";
import { distanceKm, type LngLat } from "@/lib/geo";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/lib/phone";

// Stores farther than this from the delivery address aren't listed.
const MERCHANT_RADIUS_KM = 10;

const listed = and(eq(merchant.open, true), isNotNull(merchant.lng), isNotNull(merchant.lat), eq(user.role, "merchant"));

export async function listMerchants(near: LngLat | null) {
  const rows = await db
    .select({
      id: merchant.id,
      name: merchant.name,
      description: merchant.description,
      addressTitle: merchant.addressTitle,
      addressSubtitle: merchant.addressSubtitle,
      coverUrl: merchant.coverUrl,
      logoUrl: merchant.logoUrl,
      lng: merchant.lng,
      lat: merchant.lat,
    })
    .from(merchant)
    .innerJoin(user, eq(user.id, merchant.ownerId))
    .where(listed)
    .limit(200);

  return rows
    .map((m) => ({ ...m, distanceKm: near ? distanceKm(near, [m.lng!, m.lat!]) : null }))
    .filter((m) => m.distanceKm === null || m.distanceKm <= MERCHANT_RADIUS_KM)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || a.name.localeCompare(b.name));
}

export async function getMerchant(id: string) {
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Store not found.");
  const [store] = await db
    .select({ merchant })
    .from(merchant)
    .innerJoin(user, eq(user.id, merchant.ownerId))
    .where(and(eq(merchant.id, id), listed))
    .limit(1);
  if (!store) throw new ApiError(404, "This store isn't taking orders right now.");
  const m = store.merchant;

  const items = await db
    .select({
      id: menuItem.id,
      name: menuItem.name,
      description: menuItem.description,
      price: menuItem.price,
      imageUrl: menuItem.imageUrl,
      featured: menuItem.featured,
    })
    .from(menuItem)
    .where(and(eq(menuItem.merchantId, id), eq(menuItem.available, true)))
    .orderBy(menuItem.createdAt);

  return {
    id: m.id,
    name: m.name,
    description: m.description,
    addressTitle: m.addressTitle,
    addressSubtitle: m.addressSubtitle,
    coverUrl: m.coverUrl,
    logoUrl: m.logoUrl,
    lng: m.lng!,
    lat: m.lat!,
    items,
  };
}

export const placeOrderInput = z.object({
  merchantId: z.uuid(),
  kind: z.enum(["regular", "special"]),
  items: z
    .array(
      z.object({
        itemId: z.uuid(),
        qty: z.number().int().min(1).max(50),
        note: z.string().trim().max(200).default(""),
      }),
    )
    .min(1)
    .max(30),
  dropoff: createBookingInput.shape.dropoff,
});

/** Books a delivery from the store to the customer; the customer pays for everything in cash on delivery. */
export async function placeOrder(userId: string, input: z.infer<typeof placeOrderInput>) {
  const store = await getMerchant(input.merchantId);
  const [owner] = await db
    .select({ phone: merchant.phone, ownerPhone: user.phoneNumber })
    .from(merchant)
    .innerJoin(user, eq(user.id, merchant.ownerId))
    .where(eq(merchant.id, store.id));
  const storePhone = owner.phone || owner.ownerPhone || "";
  if (!isValidPhoneNumber(storePhone)) {
    throw new ApiError(409, "This store can't take orders yet. Please try another one.");
  }

  const items = input.items.map((line) => {
    const item = store.items.find((i) => i.id === line.itemId);
    if (!item) throw new ApiError(409, "Something in your basket is no longer available.");
    return { itemId: item.id, name: item.name, price: item.price, qty: line.qty, note: line.note };
  });
  const itemsTotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return createBooking(
    userId,
    {
      kind: input.kind,
      pickup: {
        lng: store.lng,
        lat: store.lat,
        title: store.name,
        subtitle: [store.addressTitle, store.addressSubtitle].filter(Boolean).join(", "),
        contact: { name: store.name, phone: storePhone },
      },
      dropoff: input.dropoff,
      payment: "cod",
      payer: "recipient",
      parcelNotes: "",
    },
    { merchantId: store.id, items, itemsTotal },
  );
}

// ---- Merchant side (web dashboard) ----

export async function getOwnMerchant(ownerId: string) {
  const [row] = await db.select().from(merchant).where(eq(merchant.ownerId, ownerId)).limit(1);
  return row ?? null;
}

/** Gives a user who was just made a merchant a (closed) store to set up. */
export async function ensureMerchant(ownerId: string) {
  const [owner] = await db
    .select({ name: user.name, phoneNumber: user.phoneNumber })
    .from(user)
    .where(eq(user.id, ownerId));
  if (!owner) throw new ApiError(404, "User not found.");
  await db
    .insert(merchant)
    .values({ ownerId, name: `${owner.name}'s store`, phone: owner.phoneNumber ?? "" })
    .onConflictDoNothing({ target: merchant.ownerId });
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Deletes photos the store uploaded to Vercel Blob once nothing uses them. Links to other sites,
 * or to another store's uploads, are left alone.
 */
async function deleteUploads(merchantId: string, urls: (string | null | undefined)[]) {
  const ours = urls.filter((url): url is string => {
    if (!url) return false;
    const { hostname, pathname } = new URL(url);
    return hostname.endsWith(".blob.vercel-storage.com") && pathname.startsWith(`/merchants/${merchantId}/`);
  });
  if (!ours.length) return;
  try {
    await del(ours);
  } catch (error) {
    console.error("Couldn't delete replaced photos", error);
  }
}

const imageUrl = z.union([z.literal(""), z.url({ protocol: /^https$/, error: "Image links must start with https://" })]);

// Hidden form fields submit "" when unset, which z.coerce would turn into 0.
const blankAsUndefined = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema);

export const storeInput = z
  .object({
    name: z.string().trim().min(2, "Enter the store name.").max(80),
    description: z.string().trim().max(300).default(""),
    phone: z
      .string()
      .trim()
      .transform((p) => normalizePhoneNumber(p))
      .refine((p) => p !== null, "Enter a valid Philippine mobile number."),
    addressTitle: z.string().trim().max(200).default(""),
    addressSubtitle: z.string().trim().max(300).default(""),
    lng: blankAsUndefined(z.coerce.number().min(116).max(127).optional()),
    lat: blankAsUndefined(z.coerce.number().min(4).max(22).optional()),
    coverUrl: imageUrl.default(""),
    logoUrl: imageUrl.default(""),
    open: z.preprocess((v) => v === "on" || v === true, z.boolean()),
  })
  .refine((s) => !s.open || (s.lng !== undefined && s.lat !== undefined && s.addressTitle), {
    message: "Set the store's location before opening it.",
  });

export async function updateStore(ownerId: string, input: z.infer<typeof storeInput>) {
  const before = await getOwnMerchant(ownerId);
  await db
    .update(merchant)
    .set({ ...input, phone: input.phone!, lng: input.lng ?? null, lat: input.lat ?? null })
    .where(eq(merchant.ownerId, ownerId));
  if (before) {
    await deleteUploads(before.id, [
      before.coverUrl !== input.coverUrl ? before.coverUrl : null,
      before.logoUrl !== input.logoUrl ? before.logoUrl : null,
    ]);
  }
}

export const itemInput = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(1, "Enter the item name.").max(80),
  description: z.string().trim().max(300).default(""),
  price: z.coerce.number().int("Prices are in whole pesos.").min(1, "Enter a price.").max(100_000),
  imageUrl: imageUrl.default(""),
  featured: z.preprocess((v) => v === "on" || v === true, z.boolean()),
  available: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export async function saveItem(ownerId: string, input: z.infer<typeof itemInput>) {
  const store = await getOwnMerchant(ownerId);
  if (!store) throw new ApiError(403, "You don't have a store.");
  const { id, ...values } = input;
  if (id) {
    const [before] = await db
      .select({ imageUrl: menuItem.imageUrl })
      .from(menuItem)
      .where(and(eq(menuItem.id, id), eq(menuItem.merchantId, store.id)));
    await db
      .update(menuItem)
      .set(values)
      .where(and(eq(menuItem.id, id), eq(menuItem.merchantId, store.id)));
    if (before && before.imageUrl !== values.imageUrl) await deleteUploads(store.id, [before.imageUrl]);
  } else {
    await db.insert(menuItem).values({ ...values, merchantId: store.id });
  }
}

export async function deleteItem(ownerId: string, itemId: string) {
  const store = await getOwnMerchant(ownerId);
  if (!store) throw new ApiError(403, "You don't have a store.");
  const removed = await db
    .delete(menuItem)
    .where(and(eq(menuItem.id, itemId), eq(menuItem.merchantId, store.id)))
    .returning({ imageUrl: menuItem.imageUrl });
  await deleteUploads(store.id, removed.map((r) => r.imageUrl));
}

export function listItems(merchantId: string) {
  return db.select().from(menuItem).where(eq(menuItem.merchantId, merchantId)).orderBy(menuItem.createdAt);
}

/** Recent orders for the store, newest first. */
export async function listStoreOrders(merchantId: string) {
  return db
    .select({
      id: booking.id,
      status: booking.status,
      items: booking.items,
      itemsTotal: booking.itemsTotal,
      recipientName: booking.recipientName,
      kind: trip.kind,
      tripStatus: trip.status,
      pickedUpAt: booking.pickedUpAt,
      createdAt: booking.createdAt,
    })
    .from(booking)
    .innerJoin(trip, eq(trip.id, booking.tripId))
    .where(eq(booking.merchantId, merchantId))
    .orderBy(desc(booking.createdAt))
    .limit(30);
}
