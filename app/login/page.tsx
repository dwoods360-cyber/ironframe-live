"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message || "Sign-in failed. Verify your credentials.");
      setSubmitting(false);
      return;
    }

    router.replace("/integrity");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
      <section className="w-full rounded-xl border border-white/10 bg-black/40 p-6 shadow-lg">
        <h1 className="text-xl font-semibold text-white">Sign in</h1>
        <p className="mt-1 text-sm text-white/70">Use your Supabase account to access the hub.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm text-white/80" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white outline-none ring-cyan-400 transition focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/80" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white outline-none ring-cyan-400 transition focus:ring-2"
            />
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
