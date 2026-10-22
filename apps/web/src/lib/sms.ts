import "server-only";

// Delivers an SMS. In development the message is printed to the server console
// so you can sign in without an SMS provider. In production it sends through
// Semaphore (https://semaphore.co), a Philippine SMS gateway.
// This is the only file to change if you pick a different provider.
export async function sendSms(phoneNumber: string, message: string): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[sms:dev] to ${phoneNumber}: ${message}`);
    return;
  }

  const apiKey = process.env.SEMAPHORE_API_KEY;
  if (!apiKey) throw new Error("SEMAPHORE_API_KEY is not set; cannot send SMS.");

  const res = await fetch("https://api.semaphore.co/api/v4/messages", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      apikey: apiKey,
      number: phoneNumber.replace(/^\+/, ""), // +639171234567 -> 639171234567
      message,
      ...(process.env.SEMAPHORE_SENDER_NAME && { sendername: process.env.SEMAPHORE_SENDER_NAME }),
    }),
  });
  if (!res.ok) throw new Error(`SMS provider returned ${res.status}`);
}
