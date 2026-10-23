"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { normalizePhoneNumber } from "@/lib/phone";

type Step = "phone" | "code";

const input =
  "h-14 w-full rounded-2xl border-2 border-brand-navy bg-white px-4 text-lg font-medium text-brand-navy outline-none placeholder:text-brand-navy/40 focus:ring-4 focus:ring-brand-navy/15";
const primary =
  "h-14 w-full rounded-2xl bg-brand-navy font-semibold text-brand-yellow hover:opacity-90 disabled:opacity-40";

export function AuthForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState<string | null>(null); // E.164, set once a code is sent
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onGoogle() {
    setError(null);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
    if (error) setError(error.message ?? "Could not start Google sign-in.");
  }

  async function onSendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const normalized = normalizePhoneNumber(String(new FormData(e.currentTarget).get("phone")));
    if (!normalized) {
      setError("Enter a valid Philippine mobile number, e.g. 917 123 4567.");
      return;
    }

    setPending(true);
    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: normalized });
    setPending(false);
    if (error) {
      setError(error.message ?? "Could not send the code. Please try again.");
      return;
    }
    setPhone(normalized);
    setStep("code");
  }

  async function onVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!phone) return;
    setError(null);
    setPending(true);

    const { error } = await authClient.phoneNumber.verify({
      phoneNumber: phone,
      code: String(new FormData(e.currentTarget).get("code")).trim(),
    });

    setPending(false);
    if (error) {
      setError(error.message ?? "That code didn't work. Please try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl bg-white/80 p-6 shadow-xl shadow-brand-navy/5 sm:p-8">
      {step === "phone" ? (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
            <p className="text-brand-navy/70">We&apos;ll text you a 6-digit code. No password needed.</p>
          </div>

          <form onSubmit={onSendCode} className="flex flex-col gap-4">
            <label className="flex h-14 items-center rounded-2xl border-2 border-brand-navy bg-white px-4 focus-within:ring-4 focus-within:ring-brand-navy/15">
              <span className="text-lg font-semibold">🇵🇭 +63</span>
              <span className="mx-3 h-7 w-px bg-brand-navy/20" />
              <input
                name="phone"
                type="tel"
                placeholder="917 123 4567"
                required
                autoComplete="tel"
                aria-label="Mobile number"
                className="h-full min-w-0 flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-brand-navy/40"
              />
            </label>
            <button type="submit" disabled={pending} className={primary}>
              {pending ? "Sending…" : "Send code"}
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs text-brand-navy/50">
            <span className="h-px flex-1 bg-brand-navy/15" />
            or
            <span className="h-px flex-1 bg-brand-navy/15" />
          </div>

          <button
            type="button"
            onClick={onGoogle}
            className="flex h-14 items-center justify-center gap-3 rounded-2xl border-2 border-brand-navy bg-brand-cream font-semibold hover:bg-white"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </>
      ) : (
        <form onSubmit={onVerify} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Enter your code</h1>
            <p className="text-brand-navy/70">
              Sent to <b className="text-brand-navy">{phone}</b>{" "}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep("phone");
                }}
                className="font-semibold text-brand-navy underline"
              >
                Change
              </button>
            </p>
          </div>
          <input
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="••••••"
            required
            autoFocus
            autoComplete="one-time-code"
            aria-label="6-digit code"
            className={`${input} text-center text-2xl tracking-[0.6em]`}
          />
          <button type="submit" disabled={pending} className={primary}>
            {pending ? "Verifying…" : "Verify and continue"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
