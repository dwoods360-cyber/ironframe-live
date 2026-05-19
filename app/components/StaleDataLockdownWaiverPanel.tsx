"use client";

import { useCallback, useState } from "react";
import {
  useConstitutionalIntegrity,
  useSustainabilityStaleLockdownBlocking,
} from "@/app/context/ConstitutionalIntegrityProvider";
import {
  IRONTECH_STALE_LOCKDOWN_MESSAGE,
  LOCKDOWN_PROLONGED_OUTAGE_BANNER_TITLE,
} from "@/app/config/sustainabilityStaleLockdown";
import { IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS } from "@/app/lib/governanceMaturityState";
import { validateForensicJustification } from "@/app/utils/validateJustification";

/**
 * Settings → Nuclear posture: Tripartite seal waiver while sustainability live API is down ≥24h (Irontech lockdown).
 */
export default function StaleDataLockdownWaiverPanel() {
  const blocking = useSustainabilityStaleLockdownBlocking();
  const { refreshIntegrity } = useConstitutionalIntegrity();
  const [vault, setVault] = useState("");
  const [ciso, setCiso] = useState("");
  const [staff, setStaff] = useState("");
  const [secondaryMfaToken, setSecondaryMfaToken] = useState("");
  const [forensicJustification, setForensicJustification] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const filterHex = (max: number, setter: (v: string) => void) => (raw: string) => {
    setter(raw.replace(/[^a-fA-F0-9]/g, "").slice(0, max));
  };

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const fj = forensicJustification.trim();
      const payload =
        secondaryMfaToken.trim().length > 0
          ? {
              vault: vault.trim().toLowerCase(),
              ciso: ciso.trim().toLowerCase(),
              staff: staff.trim().toLowerCase(),
              forensicJustification: fj,
              secondaryMfaToken: secondaryMfaToken.trim(),
            }
          : {
              vault: vault.trim().toLowerCase(),
              ciso: ciso.trim().toLowerCase(),
              staff: staff.trim().toLowerCase(),
              forensicJustification: fj,
            };
      const res = await fetch("/api/grc/sustainability-stale-lockdown-waiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        witnessSha256?: string;
        requiresSecondaryMfa?: boolean;
      };
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Waiver rejected.");
        return;
      }
      setVault("");
      setCiso("");
      setStaff("");
      setForensicJustification("");
      setSecondaryMfaToken("");
      setMsg(
        body.witnessSha256
          ? `Stale-data waiver recorded. Witness SHA-256: ${body.witnessSha256.slice(0, 12)}…`
          : "Stale-data waiver recorded.",
      );
      await refreshIntegrity();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ironframe-operational-refresh"));
      }
    } catch {
      setError("Request failed.");
    } finally {
      setBusy(false);
    }
  }, [vault, ciso, staff, forensicJustification, secondaryMfaToken, refreshIntegrity]);

  const fjTrim = forensicJustification.trim();
  const forensicLenOk = fjTrim.length >= IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS;
  const forensicQualityOk = validateForensicJustification(fjTrim, IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS).ok;

  if (!blocking) return null;

  return (
    <div
      id="stale-data-waiver"
      className="mt-4 rounded border-2 border-red-600/80 bg-red-950/40 px-3 py-3 scroll-mt-24"
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-red-300">
        {LOCKDOWN_PROLONGED_OUTAGE_BANNER_TITLE}
      </p>
      <p className="text-[10px] font-black uppercase tracking-widest text-violet-200">
        Resume Operations (Stale-Data Waiver)
      </p>
      <p className="mt-1 text-[9px] leading-relaxed text-violet-100/90">{IRONTECH_STALE_LOCKDOWN_MESSAGE}</p>
      <p className="mt-2 text-[9px] text-violet-200/80">
        Requires Tripartite emergency seal segments (Vault 22 + CISO 21 + Staff 21 hex) — same ceremony as nuclear
        override collusion gate (witnessed CISO + Staff fingerprints). A mandatory{" "}
        {IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS}-character forensic justification (Ironlock quality gates) must
        accompany every stale-data waiver.
      </p>
      <div className="mt-3 grid gap-2 font-mono text-[10px]">
        <label className="block">
          <span className="text-violet-300/90">Vault (22)</span>
          <input
            value={vault}
            onChange={(e) => filterHex(22, setVault)(e.target.value)}
            className="mt-0.5 w-full rounded border border-violet-700/50 bg-slate-950 px-2 py-1 text-violet-50 outline-none focus:border-violet-400"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="text-violet-300/90">CISO (21)</span>
          <input
            value={ciso}
            onChange={(e) => filterHex(21, setCiso)(e.target.value)}
            className="mt-0.5 w-full rounded border border-violet-700/50 bg-slate-950 px-2 py-1 text-violet-50 outline-none focus:border-violet-400"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="text-violet-300/90">Staff (21)</span>
          <input
            value={staff}
            onChange={(e) => filterHex(21, setStaff)(e.target.value)}
            className="mt-0.5 w-full rounded border border-violet-700/50 bg-slate-950 px-2 py-1 text-violet-50 outline-none focus:border-violet-400"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="text-violet-300/90">Secondary MFA (if collusion gate demands)</span>
          <input
            value={secondaryMfaToken}
            onChange={(e) => setSecondaryMfaToken(e.target.value)}
            className="mt-0.5 w-full rounded border border-violet-700/50 bg-slate-950 px-2 py-1 text-violet-50 outline-none focus:border-violet-400"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="text-violet-300/90">
            Forensic justification (min {IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS} chars) —{" "}
            <span className={forensicLenOk ? "text-emerald-300/90" : "text-rose-300/90"}>{fjTrim.length}</span> /{" "}
            {IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS}
            {forensicLenOk && !forensicQualityOk ? " — quality gate failed" : null}
          </span>
          <textarea
            value={forensicJustification}
            onChange={(e) => setForensicJustification(e.target.value)}
            rows={4}
            className="mt-0.5 w-full resize-y rounded border border-violet-700/50 bg-slate-950 px-2 py-1 text-violet-50 outline-none focus:border-violet-400"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      </div>
      {error ? <p className="mt-2 text-[10px] text-rose-300">{error}</p> : null}
      {msg ? <p className="mt-2 text-[10px] text-emerald-300/95">{msg}</p> : null}
      <button
        type="button"
        disabled={
          busy ||
          vault.length !== 22 ||
          ciso.length !== 21 ||
          staff.length !== 21 ||
          !forensicLenOk ||
          !forensicQualityOk
        }
        onClick={() => void submit()}
        className="mt-3 rounded border border-violet-400/70 bg-violet-600/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Submitting…" : "Apply Tripartite Stale-Data Waiver"}
      </button>
    </div>
  );
}
