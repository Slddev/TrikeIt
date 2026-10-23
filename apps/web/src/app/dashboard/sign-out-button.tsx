"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="rounded-xl border-2 border-brand-navy px-4 py-2 text-sm font-semibold hover:bg-brand-cream"
    >
      Sign out
    </button>
  );
}
