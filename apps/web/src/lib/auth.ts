import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { db } from "@trikeit/db";
import { isValidPhoneNumber } from "@/lib/phone";
import { sendSms } from "@/lib/sms";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    phoneNumber({
      sendOTP: ({ phoneNumber, code }) =>
        sendSms(phoneNumber, `Your TrikeIt! code is ${code}. It expires in 5 minutes.`),
      phoneNumberValidator: isValidPhoneNumber,
      // Verifying a code for a new number creates the account; an existing one signs in.
      signUpOnVerification: {
        // The user table requires an email, so phone-only users get a placeholder.
        getTempEmail: (phone) => `${phone.replace("+", "")}@phone.trikeit.invalid`,
      },
    }),
    expo(),
  ],
  // Each code costs an SMS, so cap requests tighter than the plugin default.
  rateLimit: {
    customRules: { "/phone-number/send-otp": { window: 60, max: 3 } },
  },
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
