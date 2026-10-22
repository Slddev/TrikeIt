import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { db } from "@trikeit/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  plugins: [expo()],
  trustedOrigins: [
    "trikeit://",
    "exp://",
  ],
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "customer", input: false },
    },
  },
});