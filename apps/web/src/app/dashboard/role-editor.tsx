"use client";

import { useActionState, useState } from "react";
import { changeRole, type RoleChangeState } from "./actions";

type Role = "customer" | "driver" | "admin";

const ROLES: { value: Role; label: string }[] = [
  { value: "customer", label: "Customer" },
  { value: "driver", label: "Rider" },
  { value: "admin", label: "Admin" },
];

const field =
  "h-11 w-full rounded-xl border-2 border-brand-navy/20 bg-white px-3 text-sm outline-none focus:border-brand-navy";

export function RoleEditor({
  userId,
  role: currentRole,
  vehicle,
}: {
  userId: string;
  role: Role;
  vehicle: { plateNumber: string | null; bodyNumber: string | null; todaName: string | null };
}) {
  const [role, setRole] = useState<Role>(currentRole);
  const [state, action, pending] = useActionState<RoleChangeState, FormData>(changeRole, {});
  const changed = role !== currentRole || role === "driver";

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl bg-brand-cream/60 p-3 sm:p-4">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-xs font-medium sm:w-40">
          Role
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={field}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        {role === "driver" && (
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-medium">
              Plate number
              <input name="plateNumber" required defaultValue={vehicle.plateNumber ?? ""} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              Body number
              <input name="bodyNumber" defaultValue={vehicle.bodyNumber ?? ""} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              TODA
              <input name="todaName" defaultValue={vehicle.todaName ?? ""} className={field} />
            </label>
          </div>
        )}

        <button
          disabled={pending || !changed}
          className="h-11 rounded-xl bg-brand-navy px-5 text-sm font-semibold text-brand-yellow disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.saved && !pending && <p className="text-sm text-green-800">Saved.</p>}
    </form>
  );
}
