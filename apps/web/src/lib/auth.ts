import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { db } from "@trikeit/db";
import { isValidPhoneNumber } from "@/lib/phone";
import { PLACEHOLDER_EMAIL_DOMAIN } from "@/lib/profile";
import { sendOtpSms } from "@/lib/sms";

// Demo mode: no SMS is sent and every number signs in with this one code.
// Never set it on the real production deployment.
const demoOtpCode = process.env.DEMO_OTP_CODE;
if (demoOtpCode) {
  if (!/^\d{6}$/.test(demoOtpCode)) throw new Error("DEMO_OTP_CODE must be exactly 6 digits.");
  console.warn("[auth] Demo mode is on: SMS is disabled and every phone number accepts DEMO_OTP_CODE.");
}

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
        demoOtpCode
          ? console.log(`[sms:demo] skipped SMS to ${phoneNumber}`)
          : sendOtpSms(phoneNumber, code),
      ...(demoOtpCode && { verifyOTP: ({ code }) => code === demoOtpCode }),
      phoneNumberValidator: isValidPhoneNumber,
      // Verifying a code for a new number creates the account; an existing one signs in.
      signUpOnVerification: {
        // Name and email are collected right after the first sign-in (see lib/profile.ts).
        getTempEmail: (phone) => `${phone.replace("+", "")}${PLACEHOLDER_EMAIL_DOMAIN}`,
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
