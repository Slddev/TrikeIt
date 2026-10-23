import "server-only";

// In development the message is printed to the server console so you can sign in
// without an SMS provider. In production it sends through SMS API PH
// (https://smsapiph.netlify.app/documentation), which only delivers to Philippine
// numbers and allows 1 SMS per 10 seconds per API key.
// This is the only file to change if you pick a different provider.
export async function sendOtpSms(phoneNumber: string, code: string): Promise<void> {
  const message = `Your TrikeIt! code is ${code}. It expires in 5 minutes.`;

  if (process.env.NODE_ENV !== "production") {
    console.log(`[sms:dev] to ${phoneNumber}: ${message}`);
    return;
  }

  const apiKey = process.env.SMSAPIPH_API_KEY;
  if (!apiKey) throw new Error("SMSAPIPH_API_KEY is not set; cannot send SMS.");

  const res = await fetch("https://smsapiph.onrender.com/api/v1/send/sms", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: phoneNumber, message }),
    // The API runs on Render and can take a while to wake from idle.
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) {
    throw new Error(`SMS provider returned ${res.status}: ${data?.message ?? "unknown error"}`);
  }
}
