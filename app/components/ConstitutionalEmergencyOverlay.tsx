"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  useConstitutionalIntegrity,
  useConstitutionalLockFlags,
  useSustainabilityStaleLockdownBlocking,
} from "@/app/context/ConstitutionalIntegrityProvider";
import { SYSTEM_OWNER_ID } from "@/app/config/constitutionalAuthority";
import {
  SECURITY_POSTURE_DUAL_LOCK,
  SECURITY_POSTURE_TRIPARTITE_LOCK,
  type SecurityPosture,
} from "@/app/config/securityPosture";
import { useRiskStore } from "@/app/store/riskStore";
import {
  IRONTECH_STALE_LOCKDOWN_MESSAGE,
  LOCKDOWN_PROLONGED_OUTAGE_BANNER_TITLE,
} from "@/app/config/sustainabilityStaleLockdown";
import ConstitutionalVoid from "@/src/components/errors/ConstitutionalVoid";

/** Full-screen breach shell: not gated by Command Post UI lock (`useLayoutStore.isUiLocked`). */
type SealDescriptor = {
  posture: SecurityPosture;
  segmentLengths: Record<string, number>;
  labels: { vault: string; second?: string; third?: string };
};

export default function ConstitutionalEmergencyOverlay() {
  const { isConstitutionalEmergency, constitutionalDegradedMode, isOverrideSpent } =
    useConstitutionalLockFlags();
  const staleLockdownBlocking = useSustainabilityStaleLockdownBlocking();
  const failureMessage = useRiskStore((s) => s.constitutionalFailureMessage);
  const failureReason = useRiskStore((s) => s.constitutionalFailureReason);
  const { refreshIntegrity } = useConstitutionalIntegrity();

  const [descriptor, setDescriptor] = useState<SealDescriptor | null>(null);
  const [vaultKey, setVaultKey] = useState("");
  const [secondKey, setSecondKey] = useState("");
  const [thirdKey, setThirdKey] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [secondaryMfaToken, setSecondaryMfaToken] = useState("");
  const [collusionGate, setCollusionGate] = useState(false);

  useEffect(() => {
    void fetch("/api/grc/security-posture", { cache: "no-store" })
      .then((r) => r.json())
      .then((body) => {
        if (body?.posture) setDescriptor(body as SealDescriptor);
      })
      .catch(() => {
        setDescriptor({
          posture: SECURITY_POSTURE_DUAL_LOCK,
          segmentLengths: { vault: 32, human: 32 },
          labels: { vault: "Vault / Secret Store", second: "Human (SYSTEM_OWNER)" },
        });
      });
  }, []);

  const tryGoldRestoration = useCallback(async () => {
    setRestoreBusy(true);
    setRestoreMessage(null);
    try {
      const res = await fetch("/api/grc/constitutional-restoration", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      setRestoreMessage(body.message ?? (res.ok ? "Restoration initiated." : "Restoration failed."));
      await refreshIntegrity();
    } catch {
      setRestoreMessage("Irontech restoration request failed.");
    } finally {
      setRestoreBusy(false);
    }
  }, [refreshIntegrity]);

  const submitOverride = useCallback(async () => {
    if (!descriptor) return;
    setSubmitBusy(true);
    setSubmitError(null);
    const payload =
      descriptor.posture === SECURITY_POSTURE_TRIPARTITE_LOCK
        ? {
            vault: vaultKey.trim().toLowerCase(),
            ciso: secondKey.trim().toLowerCase(),
            staff: thirdKey.trim().toLowerCase(),
          }
        : { vault: vaultKey.trim().toLowerCase(), human: secondKey.trim().toLowerCase() };

    const tripartite =
      descriptor.posture === SECURITY_POSTURE_TRIPARTITE_LOCK;
    const bodyPayload =
      tripartite && secondaryMfaToken.trim()
        ? { ...payload, secondaryMfaToken: secondaryMfaToken.trim() }
        : payload;

    try {
      const res = await fetch("/api/grc/constitutional-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        constitutionalHash?: string;
        collusionDetected?: boolean;
        requiresSecondaryMfa?: boolean;
      };
      if (!res.ok || !body.ok) {
        if (body.collusionDetected && body.requiresSecondaryMfa) {
          setCollusionGate(true);
        }
        setSubmitError(body.error ?? "Override rejected.");
        return;
      }
      setCollusionGate(false);
      setSecondaryMfaToken("");
      setVaultKey("");
      setSecondKey("");
      setThirdKey("");
      setRestoreMessage(
        body.constitutionalHash
          ? `SYSTEM_REBIRTH complete. New fingerprint: ${body.constitutionalHash.slice(0, 8)}…${body.constitutionalHash.slice(-6)}`
          : "SYSTEM_REBIRTH complete.",
      );
      await refreshIntegrity();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ironframe-operational-refresh"));
      }
    } catch {
      setSubmitError("Override request failed.");
    } finally {
      setSubmitBusy(false);
    }
  }, [descriptor, vaultKey, secondKey, thirdKey, secondaryMfaToken, refreshIntegrity]);

  if (!isConstitutionalEmergency || constitutionalDegradedMode) {
    return null;
  }

  const detail =
    failureMessage?.trim() ||
    (failureReason ? `Integrity failure: ${failureReason}` : "Unknown constitutional integrity failure.");

  const vaultLen = descriptor?.segmentLengths.vault ?? 32;
  const isTripartite = descriptor?.posture === SECURITY_POSTURE_TRIPARTITE_LOCK;
  const secondLen = isTripartite
    ? (descriptor?.segmentLengths.ciso ?? 21)
    : (descriptor?.segmentLengths.human ?? 32);
  const thirdLen = descriptor?.segmentLengths.staff ?? 21;
  const keysComplete = isTripartite
    ? vaultKey.length === vaultLen && secondKey.length === secondLen && thirdKey.length === thirdLen
    : vaultKey.length === vaultLen && secondKey.length === secondLen;

  const vaultLabel = descriptor?.labels.vault ?? "Vault / Secret Store";
  const secondLabel =
    descriptor?.labels.second ?? (isTripartite ? "CISO" : "Human (SYSTEM_OWNER)");
  const thirdLabel = descriptor?.labels.third ?? "Staff";
  const postureLabel = isTripartite ? "TRIPARTITE_LOCK" : "DUAL_LOCK";

  const filterHex = (max: number, setter: (v: string) => void) => (raw: string) => {
    setter(raw.replace(/[^a-fA-F0-9]/g, "").slice(0, max));
  };

  return (
    <ConstitutionalVoid
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="constitutional-emergency-title"
      aria-describedby="constitutional-emergency-body"
    >
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto border-2 border-rose-600/90 bg-rose-950/95 px-4 py-6 font-mono text-rose-50 shadow-[0_0_48px_rgba(225,29,72,0.35)] animate-[pulse_2.5s_ease-in-out_infinite] sm:px-8 sm:py-10">
        <p
          id="constitutional-emergency-title"
          className="text-sm font-black uppercase tracking-[0.2em] text-rose-200"
        >
          Critical system failure: constitutional void detected
        </p>
        {staleLockdownBlocking ? (
          <div className="mt-4 rounded border-2 border-red-600 bg-red-950/95 px-4 py-3 text-red-50 shadow-[0_0_20px_rgba(220,38,38,0.35)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-200">
              {LOCKDOWN_PROLONGED_OUTAGE_BANNER_TITLE}
            </p>
            <p className="mt-2 text-[10px] leading-relaxed text-red-100/95">{IRONTECH_STALE_LOCKDOWN_MESSAGE}</p>
            <p className="mt-2 text-[10px] font-semibold text-red-200">
              While the live sustainability feed remains unhealthy: resume POST/PUT/DELETE only via Tripartite
              split-keys (Vault + CISO + Staff) — not the nuclear dual-key path below.
            </p>
            <Link
              href="/settings/config#stale-data-waiver"
              className="mt-2 inline-block text-[10px] font-black uppercase tracking-wide text-red-100 underline underline-offset-2"
            >
              Emergency: 3-key stale-data waiver
            </Link>
          </div>
        ) : null}
        <div id="constitutional-emergency-body" className="mt-4 space-y-3 text-xs leading-relaxed text-rose-100/95">
          <p>{">"} CRITICAL SYSTEM FAILURE: CONSTITUTIONAL VOID DETECTED</p>
          <p>
            {">"} The governing framework (<code className="text-rose-200">/docs/TAS.md</code>) is missing or
            corrupted.
          </p>
          <p>
            {">"} Ironlock (Agent 6) has frozen all active assets to prevent unauthorized state changes.
          </p>
          <p className="text-rose-300/90">{">"} {detail}</p>
          <p className="border-t border-rose-800/60 pt-3 font-semibold text-rose-200">
            Action required: Restore the Constitutional baseline to resume operations.
          </p>
          <p className="text-[10px] uppercase tracking-widest text-rose-400/80">
            No resolution without authorization.
          </p>

          <div className="mt-4 space-y-3 border-t border-rose-800/50 pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-200/90">
              Irontech (Agent 11) — restorationFromGoldImage
            </p>
            <p className="text-[10px] text-rose-200/80">
              Sole permitted automated job during void: restore TAS.md from LKG gold image.
            </p>
            <button
              type="button"
              disabled={restoreBusy}
              onClick={() => void tryGoldRestoration()}
              className="w-full rounded border border-amber-600/70 bg-amber-950/50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-amber-100 hover:bg-amber-900/50 disabled:opacity-50"
            >
              {restoreBusy ? "Restoring…" : "Run Gold Image Restoration"}
            </button>
            {restoreMessage ? <p className="text-[10px] text-amber-200/90">{restoreMessage}</p> : null}

            <p className="pt-2 text-[10px] font-black uppercase tracking-widest text-rose-200/90">
              Nuclear override — {SYSTEM_OWNER_ID} ({postureLabel}, one-time)
            </p>
            <p className="text-[10px] text-rose-200/75">
              Enter all seal segments for the active security posture. Key is spent on first success. User_00 cannot
              submit segments.
            </p>
            {isOverrideSpent ? (
              <p className="text-[10px] font-semibold text-rose-300">
                CRITICAL: Emergency Key Exhausted. Regenerate seal via System Configuration.
              </p>
            ) : null}

            <div>
              <label className="block text-[10px] uppercase tracking-wide text-rose-300/90" htmlFor="override-vault">
                {vaultLabel} ({vaultLen} hex)
              </label>
              <input
                id="override-vault"
                type="password"
                autoComplete="off"
                spellCheck={false}
                maxLength={vaultLen}
                value={vaultKey}
                onChange={(e) => filterHex(vaultLen, setVaultKey)(e.target.value)}
                className="mt-1 w-full rounded border border-rose-700/80 bg-black/60 px-3 py-2 font-mono text-[11px] text-rose-50 tracking-widest outline-none focus:border-rose-400"
              />
              <p className="mt-0.5 text-[9px] text-rose-400/70">
                {vaultKey.length} / {vaultLen}
              </p>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-rose-300/90" htmlFor="override-second">
                {secondLabel} ({secondLen} hex)
              </label>
              <input
                id="override-second"
                type="password"
                autoComplete="off"
                spellCheck={false}
                maxLength={secondLen}
                value={secondKey}
                onChange={(e) => filterHex(secondLen, setSecondKey)(e.target.value)}
                className="mt-1 w-full rounded border border-rose-700/80 bg-black/60 px-3 py-2 font-mono text-[11px] text-rose-50 tracking-widest outline-none focus:border-rose-400"
              />
              <p className="mt-0.5 text-[9px] text-rose-400/70">
                {secondKey.length} / {secondLen}
              </p>
            </div>
            {isTripartite ? (
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-rose-300/90" htmlFor="override-third">
                  {thirdLabel} ({thirdLen} hex)
                </label>
                <input
                  id="override-third"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={thirdLen}
                  value={thirdKey}
                  onChange={(e) => filterHex(thirdLen, setThirdKey)(e.target.value)}
                  className="mt-1 w-full rounded border border-rose-700/80 bg-black/60 px-3 py-2 font-mono text-[11px] text-rose-50 tracking-widest outline-none focus:border-rose-400"
                />
                <p className="mt-0.5 text-[9px] text-rose-400/70">
                  {thirdKey.length} / {thirdLen}
                </p>
              </div>
            ) : null}
            {submitError ? <p className="text-[10px] text-rose-300">{submitError}</p> : null}
            {collusionGate && isTripartite ? (
              <div className="rounded border border-rose-500/60 bg-rose-950/40 p-3">
                <p className="text-[10px] font-black uppercase text-rose-200">Collusion gate — secondary MFA</p>
                <p className="mt-1 text-[9px] text-rose-200/80">
                  CISO and Staff share the same client fingerprint. Enter secondary biometric/MFA token to proceed.
                </p>
                <input
                  type="password"
                  value={secondaryMfaToken}
                  onChange={(e) => setSecondaryMfaToken(e.target.value)}
                  className="mt-2 w-full rounded border border-rose-600/70 bg-black/60 px-3 py-2 text-[11px] text-rose-50"
                  placeholder="SECONDARY_BIOMETRIC_MFA_TOKEN"
                />
              </div>
            ) : null}
            <button
              type="button"
              disabled={submitBusy || isOverrideSpent || !keysComplete || !descriptor}
              onClick={() => void submitOverride()}
              className="w-full rounded border border-rose-500 bg-rose-900/60 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-rose-50 hover:bg-rose-800/70 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {submitBusy ? "Rebirthing…" : "Execute Nuclear Override & Rebirth"}
            </button>
            <p className="text-[9px] leading-snug text-rose-400/70">
              Triggers gold-image redeploy, RE-BASELINE, workforce hash broadcast, and [SYSTEM_REBIRTH] audit. While void
              persists without rebirth, all work-notes require 100+ characters.
            </p>
          </div>
        </div>
      </div>
    </ConstitutionalVoid>
  );
}
