import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, user } from "@trikeit/db";
import { ApiError } from "@/lib/api";

// Phone sign-up creates the account before we know the person's email, so it starts with a
// placeholder on this domain (see lib/auth.ts) until they finish their profile.
export const PLACEHOLDER_EMAIL_DOMAIN = "@phone.trikeit.invalid";

/**
 * What an account still needs before it can book or deliver. Every account needs a verified
 * phone (Google sign-ups add one); phone sign-ups still need a real name and email.
 * Keep in sync with apps/mobile/lib/account.ts.
 */
export function accountGaps(account: {
  email: string;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean | null;
}) {
  return {
    needsPhone: !account.phoneNumber || !account.phoneNumberVerified,
    needsDetails: account.email.endsWith(PLACEHOLDER_EMAIL_DOMAIN),
  };
}

export const profileInput = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
});

export async function updateProfile(userId: string, input: z.infer<typeof profileInput>) {
  const [taken] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.email, input.email), ne(user.id, userId)))
    .limit(1);
  if (taken) throw new ApiError(409, "That email is already used by another account.");

  await db
    .update(user)
    .set({ name: input.name, email: input.email, emailVerified: false })
    .where(eq(user.id, userId));
}
