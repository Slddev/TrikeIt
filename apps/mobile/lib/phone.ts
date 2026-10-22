// Keep in sync with apps/web/src/lib/phone.ts.
// Philippine mobile numbers only, as E.164 (+639XXXXXXXXX).

/** Accepts 09171234567, 9171234567, 639171234567 or +639171234567. Returns null if invalid. */
export function normalizePhoneNumber(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, '').replace(/^\+/, '');
  let e164: string;
  if (/^09\d{9}$/.test(digits)) e164 = `+63${digits.slice(1)}`;
  else if (/^9\d{9}$/.test(digits)) e164 = `+63${digits}`;
  else if (/^639\d{9}$/.test(digits)) e164 = `+${digits}`;
  else return null;
  return /^\+639\d{9}$/.test(e164) ? e164 : null;
}
