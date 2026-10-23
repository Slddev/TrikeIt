import type { TripStatus } from "@trikeit/db";
import { getOwnMerchant, listItems, listStoreOrders } from "@/lib/merchants";
import { MenuEditor } from "./menu-editor";
import { StoreForm } from "./store-form";

export async function MerchantConsole({ ownerId }: { ownerId: string }) {
  const store = await getOwnMerchant(ownerId);
  if (!store) {
    return (
      <section className="rounded-3xl bg-white p-6 sm:p-8">
        <h2 className="text-xl font-semibold">No store yet</h2>
        <p className="text-brand-navy/70">Ask an admin to set your role to Merchant again.</p>
      </section>
    );
  }
  const [items, orders] = await Promise.all([listItems(store.id), listStoreOrders(store.id)]);

  return (
    <>
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Orders</h2>
          <p className="text-sm text-brand-navy/60">
            Have each order ready for the rider. They pay you for it at pick-up.
          </p>
        </div>
        {orders.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-sm text-brand-navy/60">No orders yet.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.recipientName}</p>
                    <p className="text-xs text-brand-navy/60">
                      {formatTime(o.createdAt)} · {o.kind === "special" ? "Express" : "Regular"}
                    </p>
                  </div>
                  <OrderBadge status={o.status} tripStatus={o.tripStatus} pickedUp={!!o.pickedUpAt} />
                </div>
                <ul className="flex flex-col gap-1 text-sm">
                  {o.items.map((item) => (
                    <li key={item.itemId} className="flex justify-between gap-3">
                      <span>
                        {item.qty}× {item.name}
                        {item.note && <span className="block text-xs text-brand-navy/60">“{item.note}”</span>}
                      </span>
                      <span className="whitespace-nowrap">₱{item.price * item.qty}</span>
                    </li>
                  ))}
                </ul>
                <p className="flex justify-between border-t border-brand-navy/10 pt-2 font-semibold">
                  <span>Total</span>
                  <span>₱{o.itemsTotal}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Menu</h2>
          <p className="text-sm text-brand-navy/60">
            Featured items get their own list in the app; the rest show under “For You”.
          </p>
        </div>
        <MenuEditor items={items} />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Store</h2>
          <p className="text-sm text-brand-navy/60">
            Customers only see your store while it&apos;s open and has a location.
          </p>
        </div>
        <StoreForm
          // Remount after a save so the form starts from the stored values.
          key={store.updatedAt.toISOString()}
          store={{
            name: store.name,
            description: store.description,
            phone: store.phone,
            addressTitle: store.addressTitle,
            addressSubtitle: store.addressSubtitle,
            lng: store.lng,
            lat: store.lat,
            coverUrl: store.coverUrl,
            logoUrl: store.logoUrl,
            open: store.open,
          }}
        />
      </section>
    </>
  );
}

function OrderBadge({ status, tripStatus, pickedUp }: { status: string; tripStatus: TripStatus; pickedUp: boolean }) {
  const [label, style] =
    status === "cancelled"
      ? ["Cancelled", "bg-brand-navy/10 text-brand-navy/60"]
      : status === "completed"
        ? ["Delivered", "bg-green-100 text-green-800"]
        : pickedUp
          ? ["Picked up", "bg-brand-gold text-brand-navy"]
          : tripStatus === "accepted" || tripStatus === "in_progress"
            ? ["Rider coming", "bg-brand-navy text-brand-yellow"]
            : ["Waiting for a rider", "bg-brand-yellow text-brand-navy"];
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${style}`}>{label}</span>;
}

function formatTime(date: Date) {
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
