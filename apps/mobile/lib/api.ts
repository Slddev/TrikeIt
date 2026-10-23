import { authClient } from '@/lib/auth-client';

export type BookingKind = 'regular' | 'special';
export type PaymentMethod = 'cod' | 'online';
export type Payer = 'sender' | 'recipient';
export type TripStatus =
  'filling' | 'ready' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
export type ApiPlace = { lng: number; lat: number; title: string; subtitle: string };
export type OrderItem = { itemId: string; name: string; price: number; qty: number; note: string };

// Mirrors listMerchants() and getMerchant() in apps/web/src/lib/merchants.ts.
export type MerchantSummary = {
  id: string;
  name: string;
  description: string;
  addressTitle: string;
  addressSubtitle: string;
  coverUrl: string;
  logoUrl: string;
  lng: number;
  lat: number;
  distanceKm: number | null;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  featured: boolean;
};

export type Merchant = Omit<MerchantSummary, 'distanceKm'> & { items: MenuItem[] };

// Mirrors getBooking() in apps/web/src/lib/bookings.ts.
export type Booking = {
  id: string;
  status: 'active' | 'completed' | 'cancelled';
  kind: BookingKind;
  slots: number;
  slotFare: number;
  total: number;
  payment: PaymentMethod;
  distanceKm: number;
  pickup: ApiPlace;
  dropoff: ApiPlace;
  extraDropoffs: {
    place: ApiPlace;
    recipient: { name: string; phone: string };
    droppedOff: boolean;
  }[];
  // Pick-up slot for scheduled deliveries; null means now.
  scheduledFor: string | null;
  // True until riders can see a scheduled trip (30 minutes before its pick-up).
  awaitingDispatch: boolean;
  sender: { name: string; phone: string };
  recipient: { name: string; phone: string };
  payer: Payer;
  parcelNotes: string;
  // Set for merchant orders; the recipient pays itemsTotal + total in cash on delivery.
  order: {
    merchantId: string;
    merchantName: string;
    items: OrderItem[];
    itemsTotal: number;
  } | null;
  trip: { status: TripStatus; slotsFilled: number; capacity: number };
  pickedUp: boolean;
  // Empty slots the sender may pay for, and when someone last joined the trip.
  buyout: { maxSlots: number; slotFare: number; lastJoinAt: string } | null;
  driver: {
    name: string;
    phoneNumber: string | null;
    plateNumber: string | null;
    bodyNumber: string | null;
    todaName: string | null;
  } | null;
};

// Mirrors toDriverTrips() in apps/web/src/lib/trips.ts.
export type DriverTrip = {
  id: string;
  kind: BookingKind;
  status: TripStatus;
  capacity: number;
  slotsFilled: number;
  total: number;
  bookings: {
    id: string;
    senderName: string;
    // Phone numbers are only included once the rider has accepted the trip.
    senderPhone: string | null;
    recipientName: string;
    recipientPhone: string | null;
    parcelNotes: string;
    // Merchant orders: the rider pays the store itemsTotal at pick-up and collects it on delivery.
    items: OrderItem[];
    itemsTotal: number;
    slots: number;
    fare: number;
    payment: PaymentMethod;
    payer: Payer;
    distanceKm: number;
    pickedUp: boolean;
    droppedOff: boolean;
    pickup: ApiPlace;
    dropoff: ApiPlace;
    extraDropoffs: {
      place: ApiPlace;
      recipientName: string;
      recipientPhone: string | null;
      droppedOff: boolean;
    }[];
  }[];
  scheduledFor: string | null;
  /** Open trips only: how far the closest pick-up is from the driver. */
  distanceToPickupKm?: number;
};

export type DriverTrips = { online: boolean; active: DriverTrip | null; open: DriverTrip[] };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Calls the web app's API with the signed-in session (stored by the Expo auth client). */
export async function api<T>(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown }) {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Cookie: await authClient.getCookie(),
      ...(init?.body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    credentials: 'omit',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok)
    throw new ApiError(res.status, data?.message ?? 'Something went wrong. Please try again.');
  return data as T;
}
