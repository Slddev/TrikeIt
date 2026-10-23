// Keep in sync with accountGaps() in apps/web/src/lib/profile.ts.
const PLACEHOLDER_EMAIL_DOMAIN = '@phone.trikeit.invalid';

/** What an account still needs: a verified phone (Google sign-ups), or a name and email (phone sign-ups). */
export function accountGaps(user: {
  email: string;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean | null;
}) {
  return {
    needsPhone: !user.phoneNumber || !user.phoneNumberVerified,
    needsDetails: user.email.endsWith(PLACEHOLDER_EMAIL_DOMAIN),
  };
}
