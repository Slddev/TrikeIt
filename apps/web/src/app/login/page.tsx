import Link from "next/link";
import { Wordmark } from "@/components/logo";
import { AuthForm } from "./auth-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col bg-linear-to-b from-brand-yellow via-brand-cream to-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
        <Link href="/" aria-label="TrikeIt! home">
          <Wordmark />
        </Link>
      </div>
      <div className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <AuthForm />
      </div>
    </main>
  );
}
