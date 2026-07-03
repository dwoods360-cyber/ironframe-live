"use client";

import { FormEvent, useState, useTransition } from "react";
import { ShieldOff } from "lucide-react";

import { revokeOperatorAccessAction } from "@/app/actions/admin/revokeOperatorAccess";

export default function RevokeAccessControlPanel() {
  const [email, setEmail] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [feedback, setFeedback] = useState<{ status: "idle" | "success" | "error"; text: string }>({
    status: "idle",
    text: "",
  });
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !tenantSlug.trim() || isPending) return;

    const targetEmail = email.trim();
    const targetSlug = tenantSlug.trim().toLowerCase();
    const confirmed = window.confirm(
      `Revoke workspace access for ${targetEmail} on "${targetSlug}"? This removes the role assignment for that slug only.`,
    );
    if (!confirmed) return;

    setFeedback({ status: "idle", text: "" });
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await revokeOperatorAccessAction(formData);
      if (result.ok) {
        setFeedback({ status: "success", text: result.message });
        setEmail("");
        setTenantSlug("");
      } else {
        setFeedback({ status: "error", text: result.error });
      }
    });
  }

  return (
    <section className="mt-6 rounded border border-amber-800/50 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShieldOff className="h-4 w-4 text-amber-400" aria-hidden />
        <h2 className="text-[11px] font-black uppercase tracking-widest text-amber-200">
          Revoke operator workspace access
        </h2>
      </div>
      <p className="mb-4 max-w-3xl text-[10px] leading-relaxed text-slate-400">
        Removes the operator&apos;s <code className="text-slate-300">user_role_assignment</code> for a
        single workspace slug. Active invitations for that email and slug are revoked. If no
        assignments remain, the Supabase auth user is deleted. Other workspace assignments are
        preserved for consultant-style operators.
      </p>

      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[10px] text-slate-400">
          Operator email
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isPending}
            placeholder="operator@company.com"
            className="mt-1 h-11 w-full rounded border border-slate-700 bg-black/40 px-2 font-mono text-[11px] text-slate-100"
          />
        </label>
        <label className="block text-[10px] text-slate-400">
          Workspace slug
          <input
            name="tenantSlug"
            type="text"
            required
            value={tenantSlug}
            onChange={(event) => setTenantSlug(event.target.value)}
            disabled={isPending}
            pattern="[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
            placeholder="run4"
            className="mt-1 h-11 w-full rounded border border-slate-700 bg-black/40 px-2 font-mono text-[11px] text-slate-100"
          />
        </label>
        <button
          type="submit"
          disabled={isPending || !email.trim() || !tenantSlug.trim()}
          className="sm:col-span-2 inline-flex h-11 items-center justify-center rounded border border-amber-600/70 bg-amber-950/40 text-[10px] font-black uppercase text-amber-200 disabled:opacity-40"
        >
          {isPending ? "Revoking access…" : "Revoke workspace access"}
        </button>
      </form>

      {feedback.status !== "idle" ? (
        <p
          className={`mt-3 text-[10px] ${feedback.status === "success" ? "text-emerald-300" : "text-rose-300"}`}
          role={feedback.status === "error" ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      ) : null}
    </section>
  );
}
