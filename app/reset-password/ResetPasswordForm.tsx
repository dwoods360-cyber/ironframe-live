"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { updateUserPasswordAction } from "@/app/actions/auth/updateUserPassword";

export function ResetPasswordForm() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("newPassword", newPassword);
    formData.set("confirmPassword", confirmPassword);

    const result = await updateUserPasswordAction(formData);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace("/integrity");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
      <section className="w-full rounded-xl border border-white/10 bg-black/40 p-6 shadow-lg">
        <h1 className="text-xl font-semibold text-white">Choose a new password</h1>
        <p className="mt-1 text-sm text-white/70">
          Your recovery session is active. Set a new password to continue into the Command Center.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm text-white/80" htmlFor="newPassword">
              New password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white outline-none ring-cyan-400 transition focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/80" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white outline-none ring-cyan-400 transition focus:ring-2"
            />
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Updating…" : "Update password"}
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
