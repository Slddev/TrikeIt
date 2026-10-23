import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, user as userTable } from "@trikeit/db";
import { auth } from "@/lib/auth";

// Reads request headers, so with cacheComponents the caller must render
// inside a <Suspense> boundary (see app/dashboard/page.tsx).
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { user } = session;

  if (user.role !== "admin" && isListedAdmin(user.email, user.phoneNumber)) {
    await db.update(userTable).set({ role: "admin" }).where(eq(userTable.id, user.id));
    return { ...user, role: "admin" };
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

// ADMIN_ACCOUNTS lists phone numbers (+639…) or emails that are always admins, so the first
// admin can sign in and manage everyone else from the dashboard. Read per call so .env edits
// apply without restarting the server.
function isListedAdmin(email: string, phoneNumber: string | null | undefined) {
  const listed = (process.env.ADMIN_ACCOUNTS ?? "")
    .split(",")
    .map((account) => account.trim().toLowerCase())
    .filter(Boolean);
  return listed.includes(email.toLowerCase()) || (!!phoneNumber && listed.includes(phoneNumber));
}
