"use client";

import { useState } from "react";

/**
 * Manual Ops path — mark a prospect reply so receipt + founder alert fire once.
 */
export default function OutreachReplyReceiptPanel() {
  const [fromEmail, setFromEmail] = useState("");
  const [companyHint, setCompanyHint] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/approvals/outreach-reply-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail: fromEmail.trim(),
          companyHint: companyHint.trim() || undefined,
          subject: subject.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        receiptSent?: boolean;
        alertSent?: boolean;
        skipped?: boolean;
        reason?: string;
      };
      if (!res.ok) throw new Error(data.error || "Request failed.");
      setMessage(
        [
          data.skipped ? "Already registered (idempotent)." : "Registered.",
          data.receiptSent ? "Receipt sent." : "Receipt skipped.",
          data.alertSent ? "Founder alert sent." : "Alert skipped.",
          data.reason ? `(${data.reason})` : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      if (data.ok && !data.skipped) {
        setFromEmail("");
        setCompanyHint("");
        setSubject("");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="mt-6 space-y-3 rounded-xl border border-cyan-900/40 bg-cyan-950/10 p-4 sm:p-5"
      aria-label="Outreach reply receipt"
    >
      <div>
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-cyan-300">
          Prospect replied · receipt + alert
        </h2>
        <p className="mt-1 max-w-3xl font-sans text-xs text-slate-400">
          Manual path when Zoho shows a reply. Sends a light receipt from{" "}
          <span className="font-mono text-slate-300">dereck@ironframegrc.com</span> (never Gmail)
          and alerts Ops / Dereck. YES/SOFT/PRICE scheduling reply stays HITL.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block text-[10px] uppercase tracking-wide text-slate-500">
          Prospect email
          <input
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="buyer@mssp.com"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100"
          />
        </label>
        <label className="block text-[10px] uppercase tracking-wide text-slate-500">
          Company (optional)
          <input
            value={companyHint}
            onChange={(e) => setCompanyHint(e.target.value)}
            placeholder="AT-NET"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-sans text-xs text-slate-100"
          />
        </label>
        <label className="block text-[10px] uppercase tracking-wide text-slate-500">
          Subject (optional)
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Re: …"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-sans text-xs text-slate-100"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={busy || !fromEmail.includes("@")}
        onClick={() => void submit()}
        className="rounded-lg border border-cyan-700/60 bg-cyan-950/50 px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-cyan-100 hover:bg-cyan-900/40 disabled:opacity-40"
      >
        {busy ? "Sending…" : "Mark replied · send receipt + alert"}
      </button>
      {message ? (
        <p className="font-mono text-[11px] text-slate-300" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
