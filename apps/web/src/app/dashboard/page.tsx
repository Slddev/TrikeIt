import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      {/* Session read happens at request time, so it streams in behind Suspense. */}
      <Suspense fallback={<p>Loading…</p>}>
        <Welcome />
      </Suspense>
    </main>
  );
}

async function Welcome() {
  const user = await requireUser();

  return (
    <>
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {user.phoneNumber ?? user.email} · role: {user.role}
      </p>
      <SignOutButton />
    </>
  );
}
