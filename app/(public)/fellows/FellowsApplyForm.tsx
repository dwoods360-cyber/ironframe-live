"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ApplyState = {
  fullName: string;
  email: string;
  linkedInUrl: string;
  academicTrack: string;
  labFocus: string;
  employerType: string;
  employmentContext: string;
  requestArchitectureBrief: boolean;
};

const INITIAL: ApplyState = {
  fullName: "",
  email: "",
  linkedInUrl: "",
  academicTrack: "MSCSIA_COURSEWORK",
  labFocus: "MULTI_TENANT_EVIDENCE",
  employerType: "",
  employmentContext: "",
  requestArchitectureBrief: false,
};

export default function FellowsApplyForm() {
  const router = useRouter();
  const [form, setForm] = useState<ApplyState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.employerType) {
      setError("Select your employment context");
      return;
    }
    if (form.employerType === "OTHER" && form.employmentContext.trim().length < 2) {
      setError("Enter your current employment when selecting Other");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/fellows/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...form,
            employmentContext:
              form.employerType === "OTHER" ? form.employmentContext.trim() : undefined,
            requestArchitectureBrief: form.requestArchitectureBrief,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Application failed");
          return;
        }
        router.push("/fellows/lab");
      } catch {
        setError("Network error — try again");
      }
    });
  };

  const field =
    "mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-teal-500/40 focus:ring-2";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-black/30"
    >
      <h2 className="font-mono text-xs font-bold tracking-[0.12em] text-teal-400">
        IRONFRAMEGRC // FELLOWS — REQUEST ACCESS
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Independent Ironframe lab — not a WGU-operated site.
      </p>

      <label className="mt-4 block text-xs text-slate-400">
        Full name
        <input
          required
          className={field}
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
        />
      </label>

      <label className="mt-3 block text-xs text-slate-400">
        Email
        <input
          required
          type="email"
          className={field}
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </label>

      <label className="mt-3 block text-xs text-slate-400">
        LinkedIn profile URL
        <input
          required
          type="url"
          className={field}
          placeholder="https://www.linkedin.com/in/…"
          value={form.linkedInUrl}
          onChange={(e) => setForm((f) => ({ ...f, linkedInUrl: e.target.value }))}
        />
      </label>

      <label className="mt-3 block text-xs text-slate-400">
        Academic track
        <select
          required
          className={field}
          value={form.academicTrack}
          onChange={(e) => setForm((f) => ({ ...f, academicTrack: e.target.value }))}
        >
          <option value="MSCSIA_CAPSTONE">WGU MSCSIA (capstone)</option>
          <option value="MSCSIA_COURSEWORK">WGU MSCSIA (coursework)</option>
          <option value="BS_CYBERSECURITY">WGU Cybersecurity BS</option>
          <option value="ALUMNI_PRACTITIONER">Alumni / industry practitioner</option>
        </select>
        <span className="mt-1 block text-[10px] leading-relaxed text-slate-600">
          Same lab for all tracks. MSCSIA / capstone: deeper methodology write-up on the same
          missions.
        </span>
      </label>

      <label className="mt-3 block text-xs text-slate-400">
        Lab focus
        <select
          required
          className={field}
          value={form.labFocus}
          onChange={(e) => setForm((f) => ({ ...f, labFocus: e.target.value }))}
        >
          <option value="MULTI_TENANT_EVIDENCE">Multi-tenant evidence boundaries</option>
          <option value="EXPOSURE_MATH">Estimated exposure math</option>
          <option value="TPRM_INGEST">TPRM / untrusted ingest</option>
          <option value="CAPSTONE_DATASET">Capstone dataset generation</option>
        </select>
      </label>

      <label className="mt-3 block text-xs text-slate-400">
        Employment context
        <select
          required
          className={field}
          value={form.employerType}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              employerType: e.target.value,
              employmentContext: e.target.value === "OTHER" ? f.employmentContext : "",
            }))
          }
        >
          <option value="" disabled>
            Select employment context…
          </option>
          <option value="NON_COMMERCIAL_STUDENT">Full-time student / non-commercial</option>
          <option value="MSP_MSSP">MSP / MSSP</option>
          <option value="REGIONAL_BANKING">Regional bank / FI</option>
          <option value="HEALTHCARE">Healthcare</option>
          <option value="DEFENSE_CONTRACTOR">Defense / DIB</option>
          <option value="ENTERPRISE_IT">Enterprise IT / security</option>
          <option value="OTHER">Other</option>
        </select>
      </label>

      {form.employerType === "OTHER" && (
        <label className="mt-3 block text-xs text-slate-400">
          Current employment
          <input
            required
            className={field}
            maxLength={120}
            placeholder="Role and organization (e.g. SOC analyst at Acme)"
            value={form.employmentContext}
            onChange={(e) => setForm((f) => ({ ...f, employmentContext: e.target.value }))}
          />
          <span className="mt-1 block text-[10px] text-slate-600">
            {form.employmentContext.length}/120
          </span>
        </label>
      )}

      <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-slate-400">
        <input
          type="checkbox"
          className="mt-0.5 rounded border-slate-600 bg-slate-950 text-teal-600 focus:ring-teal-500/40"
          checked={form.requestArchitectureBrief}
          onChange={(e) =>
            setForm((f) => ({ ...f, requestArchitectureBrief: e.target.checked }))
          }
        />
        <span>
          (Optional) Send me the 1-page &ldquo;Multi-Tenant Evidence Isolation &amp; Deterministic
          Risk&rdquo; architecture brief to share with my security / IT team.
        </span>
      </label>

      {error && (
        <p className="mt-3 rounded border border-rose-900 bg-rose-950/40 px-2 py-1.5 text-xs text-rose-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-md bg-teal-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:bg-slate-700"
      >
        {pending ? "Provisioning…" : "Request sandbox enclave"}
      </button>

      <ul className="mt-4 space-y-1.5 text-[11px] leading-relaxed text-slate-500">
        <li>[✓] Instant browser access — zero software installation</li>
        <li>
          [✓] ~1 hour learning missions · 60-day access window for capstone writing (extends on
          activity)
        </li>
        <li>[✓] 100% synthetic enterprise estates — no real company or client data required</li>
      </ul>
    </form>
  );
}
