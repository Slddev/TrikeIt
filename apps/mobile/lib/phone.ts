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

// Display helpers for the sign-in screen (mobile only, not part of the shared validation).

/** The 10-digit national number (9XXXXXXXXX) from whatever the user typed or pasted. */
export function toNationalDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('63')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** 9171234567 -> "917 123 4567", formatted progressively while typing. */
export function formatNational(digits: string): string {
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join(' ');
}

export function formatE164(e164: string): string {
  return `+63 ${formatNational(e164.replace(/^\+63/, ''))}`;
}
