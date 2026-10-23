import { Suspense } from "react";
import Link from "next/link";
import { desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, driver, trip, user, type TripStatus } from "@trikeit/db";
import { Wordmark } from "@/components/logo";
import { requireUser } from "@/lib/session";
import { accountGaps, PLACEHOLDER_EMAIL_DOMAIN } from "@/lib/profile";
import { AccountSetup } from "./account-setup";
import { RoleEditor } from "./role-editor";
import { SignOutButton } from "./sign-out-button";

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <div className="flex flex-1 flex-col bg-brand-cream/50">
      <header className="border-b border-brand-navy/5 bg-brand-yellow">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" aria-label="TrikeIt! home">
            <Wordmark />
          </Link>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            Dashboard
          </span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        {/* The session is read at request time, so it streams in behind Suspense. */}
        <Suspense fallback={<p className="text-brand-navy/60">Loading…</p>}>
          <Dashboard searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const me = await requireUser();
  const { q } = await searchParams;
  const gaps = accountGaps(me);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hi, {me.name}</h1>
          <p className="text-sm text-brand-navy/60">
            {[me.phoneNumber, gaps.needsDetails ? null : me.email].filter(Boolean).join(" · ")} ·{" "}
            {ROLE_LABEL[me.role ?? "customer"] ?? me.role}
          </p>
        </div>
        <SignOutButton />
      </div>
      {gaps.needsPhone || gaps.needsDetails ? (
        <AccountSetup needsPhone={gaps.needsPhone} needsDetails={gaps.needsDetails} name={me.name} />
      ) : me.role === "admin" ? (
        <AdminConsole adminId={me.id} query={typeof q === "string" ? q.trim() : ""} />
      ) : (
        <MemberHome role={me.role ?? "customer"} />
      )}
    </>
  );
}

const ROLE_LABEL: Record<string, string> = { customer: "Customer", driver: "Rider", admin: "Admin" };

function MemberHome({ role }: { role: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-white p-6 sm:p-8">
      <h2 className="text-xl font-semibold">
        {role === "driver" ? "You're an approved rider" : "Send in the app"}
      </h2>
      <p className="max-w-xl text-brand-navy/70">
        {role === "driver"
          ? "Open the TrikeIt! app, switch to Delivering, and turn on Accepting bookings to see trips near you."
          : "Deliveries are booked in the TrikeIt! mobile app. Sign in there with the same phone number or Google account."}
      </p>
    </section>
  );
}

async function AdminConsole({ adminId, query }: { adminId: string; query: string }) {
  const [stats, users, trips] = await Promise.all([getStats(), searchUsers(query), recentTrips()]);

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Customers" value={stats.customers} />
        <Stat label="Riders" value={stats.riders} />
        <Stat label="Batching" value={stats.filling} />
        <Stat label="Waiting for rider" value={stats.ready} />
        <Stat label="Out for delivery" value={stats.active} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Users</h2>
            <p className="text-sm text-brand-navy/60">Change roles. Riders need a plate number.</p>
          </div>
          <form className="flex w-full gap-2 sm:w-auto">
            <input
              name="q"
              defaultValue={query}
              placeholder="Name, phone or email"
              aria-label="Search users"
              className="h-11 min-w-0 flex-1 rounded-xl border-2 border-brand-navy/20 bg-white px-3 text-sm outline-none focus:border-brand-navy sm:w-72"
            />
            <button className="h-11 rounded-xl bg-brand-navy px-4 text-sm font-semibold text-brand-yellow">
              Search
            </button>
          </form>
        </div>

        {users.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-sm text-brand-navy/60">No users match “{query}”.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {users.map((u) => (
              <UserRow key={u.id} user={u} isSelf={u.id === adminId} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Recent trips</h2>
        {trips.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-sm text-brand-navy/60">No trips yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white">
            <table className="w-full min-w-xl text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-brand-navy/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Slots</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Rider</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id} className="border-t border-brand-navy/5">
                    <td className="px-4 py-3 whitespace-nowrap">{formatTime(t.createdAt)}</td>
                    <td className="px-4 py-3 capitalize">{t.kind}</td>
                    <td className="px-4 py-3">
                      {t.slotsFilled}/{t.capacity}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3">{t.driverName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

type UserRowData = Awaited<ReturnType<typeof searchUsers>>[number];

function UserRow({ user: u, isSelf }: { user: UserRowData; isSelf: boolean }) {
  const role = (u.role ?? "customer") as "customer" | "driver" | "admin";

  return (
    <li className="flex flex-col gap-4 rounded-2xl bg-white p-4 sm:p-5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {u.name}
          <RoleBadge role={role} />
          {isSelf && <span className="text-xs font-normal text-brand-navy/50">(you)</span>}
        </p>
        <p className="truncate text-sm text-brand-navy/60">
          {[u.phoneNumber ?? "No phone yet", u.email.endsWith(PLACEHOLDER_EMAIL_DOMAIN) ? "No email yet" : u.email].join(" · ")}
        </p>
        {u.plateNumber && (
          <p className="mt-1 text-sm">
            Plate <b>{u.plateNumber}</b>
            {u.bodyNumber && <> · Body no. <b>{u.bodyNumber}</b></>}
            {u.todaName && <> · {u.todaName}</>}
          </p>
        )}
      </div>
      {!isSelf && (
        <RoleEditor
          // Remount after a save so the form starts from the stored role.
          key={`${role}-${u.plateNumber}-${u.bodyNumber}-${u.todaName}`}
          userId={u.id}
          role={role}
          vehicle={{ plateNumber: u.plateNumber, bodyNumber: u.bodyNumber, todaName: u.todaName }}
        />
      )}
    </li>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-brand-navy/50">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const style =
    role === "admin"
      ? "bg-brand-navy text-brand-yellow"
      : role === "driver"
        ? "bg-brand-gold text-brand-navy"
        : "bg-brand-navy/10 text-brand-navy";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style}`}>
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

const STATUS_LABEL: Record<TripStatus, string> = {
  filling: "Batching",
  ready: "Waiting for rider",
  accepted: "Rider picking up",
  in_progress: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

function StatusBadge({ status }: { status: TripStatus }) {
  const style =
    status === "completed"
      ? "bg-green-100 text-green-800"
      : status === "cancelled"
        ? "bg-brand-navy/10 text-brand-navy/60"
        : "bg-brand-yellow text-brand-navy";
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${style}`}>
      {STATUS_LABEL[status]}
    </span>
  );
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

async function getStats() {
  const count = sql<number>`count(*)::int`;
  const [[customers], [riders], tripCounts] = await Promise.all([
    db.select({ n: count }).from(user).where(or(eq(user.role, "customer"), sql`${user.role} is null`)),
    db.select({ n: count }).from(user).where(eq(user.role, "driver")),
    db
      .select({ status: trip.status, n: count })
      .from(trip)
      .where(inArray(trip.status, ["filling", "ready", "accepted", "in_progress"]))
      .groupBy(trip.status),
  ]);
  const byStatus = (s: TripStatus) => tripCounts.find((t) => t.status === s)?.n ?? 0;
  return {
    customers: customers.n,
    riders: riders.n,
    filling: byStatus("filling"),
    ready: byStatus("ready"),
    active: byStatus("accepted") + byStatus("in_progress"),
  };
}

function searchUsers(query: string) {
  const pattern = `%${query}%`;
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      plateNumber: driver.plateNumber,
      bodyNumber: driver.bodyNumber,
      todaName: driver.todaName,
    })
    .from(user)
    .leftJoin(driver, eq(driver.userId, user.id))
    .where(
      query
        ? or(ilike(user.name, pattern), ilike(user.email, pattern), ilike(user.phoneNumber, pattern))
        : undefined,
    )
    .orderBy(desc(user.createdAt))
    .limit(50);
}

function recentTrips() {
  return db
    .select({
      id: trip.id,
      kind: trip.kind,
      status: trip.status,
      slotsFilled: trip.slotsFilled,
      capacity: trip.capacity,
      createdAt: trip.createdAt,
      driverName: user.name,
    })
    .from(trip)
    .leftJoin(user, eq(user.id, trip.driverId))
    .orderBy(desc(trip.createdAt))
    .limit(15);
}
