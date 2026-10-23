"use client";

import { useActionState, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { normalizePhoneNumber } from "@/lib/phone";
import { saveProfile, type ProfileState } from "./actions";

const field =
  "h-12 w-full rounded-xl border-2 border-brand-navy/20 bg-white px-3 outline-none focus:border-brand-navy";
const primary =
  "h-12 rounded-xl bg-brand-navy px-6 font-semibold text-brand-yellow hover:opacity-90 disabled:opacity-40";

export function AccountSetup({
  needsPhone,
  needsDetails,
  name,
}: {
  needsPhone: boolean;
  needsDetails: boolean;
  name: string;
}) {
  return (
    <section className="flex flex-col gap-6 rounded-3xl bg-white p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-semibold">Finish setting up your account</h2>
        <p className="text-sm text-brand-navy/60">
          Every TrikeIt! account needs a verified mobile number, a name and an email.
        </p>
      </div>
      {needsPhone ? <PhoneStep /> : needsDetails && <DetailsStep name={name} />}
    </section>
  );
}

function PhoneStep() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const normalized = normalizePhoneNumber(String(new FormData(e.currentTarget).get("phone")));
    if (!normalized) return setError("Enter a valid Philippine mobile number, e.g. 917 123 4567.");
    setPending(true);
    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: normalized });
    setPending(false);
    if (error) return setError(error.message ?? "Could not send the code.");
    setPhone(normalized);
  }

  async function onVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!phone) return;
    setError(null);
    setPending(true);
    const { error } = await authClient.phoneNumber.verify({
      phoneNumber: phone,
      code: String(new FormData(e.currentTarget).get("code")).trim(),
      // Attach the number to this signed-in account instead of signing in as it.
      updatePhoneNumber: true,
    });
    setPending(false);
    if (error) return setError(error.message ?? "That code didn't work.");
    router.refresh();
  }

  return (
    <div className="flex max-w-md flex-col gap-3">
      {!phone ? (
        <form onSubmit={onSend} className="flex flex-col gap-3">
          <label className="text-sm font-medium">Mobile number</label>
          <div className="flex h-12 items-center rounded-xl border-2 border-brand-navy/20 bg-white px-3 focus-within:border-brand-navy">
            <span className="font-semibold">🇵🇭 +63</span>
            <span className="mx-3 h-6 w-px bg-brand-navy/20" />
            <input
              name="phone"
              type="tel"
              required
              placeholder="917 123 4567"
              aria-label="Mobile number"
              className="h-full min-w-0 flex-1 bg-transparent outline-none"
            />
          </div>
          <button disabled={pending} className={primary}>
            {pending ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerify} className="flex flex-col gap-3">
          <p className="text-sm text-brand-navy/70">
            Enter the 6-digit code sent to <b>{phone}</b>.{" "}
            <button type="button" onClick={() => setPhone(null)} className="font-semibold underline">
              Change
            </button>
          </p>
          <input
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            autoComplete="one-time-code"
            aria-label="6-digit code"
            className={`${field} text-center text-xl tracking-[0.5em]`}
          />
          <button disabled={pending} className={primary}>
            {pending ? "Verifying…" : "Verify number"}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function DetailsStep({ name }: { name: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  // New phone accounts are named after their number until the person sets a real name.
  const defaultName = /^\+?\d+$/.test(name) ? "" : name;

  return (
    <form action={action} className="flex max-w-md flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Full name
        <input name="name" required defaultValue={defaultName} autoComplete="name" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <button disabled={pending} className={primary}>
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
