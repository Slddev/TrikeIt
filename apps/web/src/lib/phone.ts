// Philippine mobile numbers only, stored as E.164 (+639XXXXXXXXX).
// Restricting the country also limits SMS-pumping abuse of the OTP endpoint.
const PH_MOBILE_E164 = /^\+639\d{9}$/;

export function isValidPhoneNumber(phoneNumber: string): boolean {
  return PH_MOBILE_E164.test(phoneNumber);
}

/** Accepts 09171234567, 9171234567, 639171234567 or +639171234567. Returns null if invalid. */
export function normalizePhoneNumber(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "").replace(/^\+/, "");
  let e164: string;
  if (/^09\d{9}$/.test(digits)) e164 = `+63${digits.slice(1)}`;
  else if (/^9\d{9}$/.test(digits)) e164 = `+63${digits}`;
  else if (/^639\d{9}$/.test(digits)) e164 = `+${digits}`;
  else return null;
  return isValidPhoneNumber(e164) ? e164 : null;
}
