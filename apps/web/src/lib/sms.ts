import "server-only";

// Delivers a one-time code by SMS. In development the message is printed to the
// server console so you can sign in without an SMS provider. In production it sends
// through Semaphore's OTP route (https://semaphore.co), a Philippine SMS gateway
// that keeps OTP traffic on a dedicated route (2 credits per 160 characters).
// This is the only file to change if you pick a different provider.
export async function sendOtpSms(phoneNumber: string, code: string): Promise<void> {
  const message = "Your TrikeIt! code is {otp}. It expires in 5 minutes.";

  if (process.env.NODE_ENV !== "production") {
    console.log(`[sms:dev] to ${phoneNumber}: ${message.replace("{otp}", code)}`);
    return;
  }

  const apiKey = process.env.SEMAPHORE_API_KEY;
  if (!apiKey) throw new Error("SEMAPHORE_API_KEY is not set; cannot send SMS.");

  const res = await fetch("https://api.semaphore.co/api/v4/otp", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      apikey: apiKey,
      number: phoneNumber.replace(/^\+/, ""), // +639171234567 -> 639171234567
      message,
      code,
      ...(process.env.SEMAPHORE_SENDER_NAME && { sendername: process.env.SEMAPHORE_SENDER_NAME }),
    }),
  });
  if (!res.ok) throw new Error(`SMS provider returned ${res.status}`);
}
