"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { normalizePhoneNumber } from "@/lib/phone";

type Step = "phone" | "code";

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
      setError("Enter a valid Philippine mobile number, e.g. 0917 123 4567.");
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

  const input =
    "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";
  const primary =
    "rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black";

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold">Sign in to TrikeIt!</h1>

      {step === "phone" ? (
        <>
          <button
            type="button"
            onClick={onGoogle}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Continue with Google
          </button>

          <p className="text-center text-xs text-zinc-500">or use your mobile number</p>

          <form onSubmit={onSendCode} className="flex flex-col gap-4">
            <input
              name="phone"
              type="tel"
              placeholder="0917 123 4567"
              required
              autoComplete="tel"
              className={input}
            />
            <button type="submit" disabled={pending} className={primary}>
              {pending ? "Sending…" : "Send code"}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={onVerify} className="flex flex-col gap-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            We sent a 6-digit code to {phone}.
          </p>
          <input
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            required
            autoComplete="one-time-code"
            className={input}
          />
          <button type="submit" disabled={pending} className={primary}>
            {pending ? "Verifying…" : "Verify and continue"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep("phone");
            }}
            className="text-sm text-zinc-600 underline dark:text-zinc-400"
          >
            Use a different number
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
