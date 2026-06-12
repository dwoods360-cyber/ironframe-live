"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { requestResetPasswordAction } from "@/app/actions/auth/requestResetPassword";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("email", email.trim());

    const result = await requestResetPasswordAction(formData);
    setSubmitting(false);

    if (result.ok) {
      setMessage(result.message);
      return;
    }

    setError(result.error);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
      <section className="w-full rounded-xl border border-white/10 bg-black/40 p-6 shadow-lg">
        <h1 className="text-xl font-semibold text-white">Reset password</h1>
        <p className="mt-1 text-sm text-white/70">
          Enter your corporate email. We will send a secure reset link if the account exists.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm text-white/80" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white outline-none ring-cyan-400 transition focus:ring-2"
            />
          </div>

          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending link…" : "Send reset link"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-white/60">
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
            Back to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
