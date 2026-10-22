import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";

// Same-origin by default; the Better Auth route lives at /api/auth/[...all].
export const authClient = createAuthClient({
  plugins: [phoneNumberClient()],
});
