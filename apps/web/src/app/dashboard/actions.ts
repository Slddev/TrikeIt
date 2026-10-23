"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, driver, user } from "@trikeit/db";
import { ApiError } from "@/lib/api";
import { ensureMerchant } from "@/lib/merchants";
import { profileInput, updateProfile } from "@/lib/profile";
import { requireAdmin, requireUser } from "@/lib/session";

const roleChange = z.discriminatedUnion("role", [
  z.object({ userId: z.string().min(1), role: z.enum(["customer", "merchant", "admin"]) }),
  z.object({
    userId: z.string().min(1),
    role: z.literal("driver"),
    plateNumber: z.string().trim().min(2, "Plate number is required for riders.").max(20),
    bodyNumber: z.string().trim().max(20).optional(),
    todaName: z.string().trim().max(100).optional(),
  }),
]);

export type RoleChangeState = { error?: string; saved?: boolean };

/** Sets a user's role; riders also get their vehicle details saved, and merchants a store to set up. */
export async function changeRole(_prev: RoleChangeState, formData: FormData): Promise<RoleChangeState> {
  const admin = await requireAdmin();
  const parsed = roleChange.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const input = parsed.data;
  if (input.userId === admin.id) return { error: "You can't change your own role." };

  if (input.role === "driver") {
    const details = {
      plateNumber: input.plateNumber.toUpperCase(),
      bodyNumber: input.bodyNumber || null,
      todaName: input.todaName || null,
    };
    await db
      .insert(driver)
      .values({ userId: input.userId, ...details })
      .onConflictDoUpdate({ target: driver.userId, set: details });
  } else {
    await db.delete(driver).where(eq(driver.userId, input.userId));
  }
  if (input.role === "merchant") await ensureMerchant(input.userId);
  await db.update(user).set({ role: input.role }).where(eq(user.id, input.userId));

  refresh();
  return { saved: true };
}

export type ProfileState = { error?: string };

export async function saveProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const me = await requireUser();
  const parsed = profileInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  try {
    await updateProfile(me.id, parsed.data);
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
  refresh();
  return {};
}
