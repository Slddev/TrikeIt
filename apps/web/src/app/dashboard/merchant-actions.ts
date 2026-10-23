"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { deleteItem, itemInput, saveItem, storeInput, updateStore } from "@/lib/merchants";
import { requireUser } from "@/lib/session";

export type FormState = { error?: string; saved?: boolean };

async function requireMerchant() {
  const me = await requireUser();
  if (me.role !== "merchant") redirect("/dashboard");
  return me;
}

export async function saveStore(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireMerchant();
  const parsed = storeInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the store details." };
  await updateStore(me.id, parsed.data);
  refresh();
  return { saved: true };
}

export async function saveMenuItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireMerchant();
  const parsed = itemInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the item details." };
  await saveItem(me.id, parsed.data);
  refresh();
  return { saved: true };
}

export async function removeMenuItem(itemId: string) {
  const me = await requireMerchant();
  await deleteItem(me.id, itemId);
  refresh();
}
