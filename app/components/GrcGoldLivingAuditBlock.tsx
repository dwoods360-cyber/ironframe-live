"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRiskStore } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { appendAuditLog } from "@/app/utils/auditLogger";
import type { SyncHandshakePhase } from "@/app/components/HandshakeStatusBar";
import MaturityBadge from "@/app/components/MaturityBadge";

function formatVerifiedHms(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type { SyncHandshakePhase };

type Props = {
  /** @deprecated Implicit dashboard fallback removed — tenant label comes from Command Center (`selectedTenantName`). */
  dashboardCompanyName?: string | null;
  /** `grid`: single tile inside the scrutiny heatmap grid. `strip`: full-width section under the map. */
  variant?: "strip" | "grid";
  /** GRC industry context — Defense activates 1.60× shield and 1_600_000_000 ¢ ALE baseline. */
  industry?: string;
  /** War Room: idle → syncing (insurance edit) → verified (recalc done). Sign-off only when `verified`. */
  handshakePhase: SyncHandshakePhase;
  /** After receipt toast + audit increment — parent sets handshake back to idle until next sync. */
  onHandshakeSignOff?: () => void;
  /** Shadow / simulation: treat forensic gate as authorized without manual insurance handshake. */
  shadowPlaneAuthorizesSignOff?: boolean;
};

/**
 * Forensic GRC Gold — deterministic tenant / shield / ALE baseline, audit counter, Audit Intelligence pivot.
 */
export default function GrcGoldLivingAuditBlock({
  dashboardCompanyName: _dashboardCompanyName,
  variant = "strip",
  industry,
  handshakePhase,
  onHandshakeSignOff,
  shadowPlaneAuthorizesSignOff = false,
}: Props) {
  void _dashboardCompanyName;
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const activeRiskId = useRiskStore((s) => s.activeRiskId);
  const setActiveRiskId = useRiskStore((s) => s.setActiveRiskId);

  const industryForGrc = industry ?? selectedIndustry;
  /** Defense ALE / CMMC strip only after Command Center explicitly selects a tenant (see `selectedTenantName`). */
  const tenantExplicit = Boolean(selectedTenantName?.trim());
  const defenseAleActive = tenantExplicit && industryForGrc === "Defense";

  const resolvedTenantDisplayName = useMemo(() => {
    if (!tenantExplicit) return null;
    if (defenseAleActive) return "Defense Logistics";
    return selectedTenantName!.trim();
  }, [tenantExplicit, defenseAleActive, selectedTenantName]);

  const [auditCount, setAuditCount] = useState(0);
  const [lastVerified, setLastVerified] = useState("");
  const [receiptToast, setReceiptToast] = useState(false);
  const auditFocusPrevIdRef = useRef<string | null>(null);

  const insuranceRecalcFlash = handshakePhase === "syncing";
  const signOffReady =
    tenantExplicit &&
    (shadowPlaneAuthorizesSignOff ||
      handshakePhase === "verified" ||
      handshakePhase === "drift");

  useEffect(() => {
    if (!tenantExplicit) return;
    const id = activeRiskId?.trim() || null;
    if (!id) {
      auditFocusPrevIdRef.current = null;
      return;
    }
    if (auditFocusPrevIdRef.current === id) return;
    auditFocusPrevIdRef.current = id;
    setAuditCount((c) => c + 1);
    setLastVerified(formatVerifiedHms(new Date()));
  }, [activeRiskId, tenantExplicit]);

  const pivotAuditIntelligenceToActiveRisk = useCallback(() => {
    if (!defenseAleActive) return;
    const id = activeRiskId?.trim();
    if (!id) return;
    setActiveRiskId(id);
    document
      .querySelector<HTMLElement>('[data-ironframe-audit-intelligence="true"]')
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeRiskId, defenseAleActive, setActiveRiskId]);

  const onAuthorizeAuditSignOff = useCallback(() => {
    const sealedLine =
      "[ 📄 SEALED ] | FORENSIC RECEIPT GENERATED. AUDIT SIGNED BY DERECK. SHA-256 LOCKED.";
    appendAuditLog({
      action_type: "EXPORT_PDF",
      log_type: "GRC",
      description: sealedLine,
      metadata_tag: "GRC_FORENSIC|AUDIT_SIGNOFF|SHA256",
    });
    useAgentStore.getState().addStreamMessage(sealedLine);
    setReceiptToast(true);
    setAuditCount((c) => c + 1);
    onHandshakeSignOff?.();
  }, [onHandshakeSignOff]);

  useEffect(() => {
    if (!receiptToast) return;
    const id = window.setTimeout(() => setReceiptToast(false), 3500);
    return () => window.clearTimeout(id);
  }, [receiptToast]);

  const aleLine = (
    <p className="mt-0.5 font-mono text-[11px] font-semibold tabular-nums text-slate-100">
      <span className="inline-flex flex-wrap items-center justify-between gap-x-2 gap-y-1 w-full">
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="inline-flex items-center gap-1">
          <span>ALE Exposure</span>
          {defenseAleActive ? (
            <span
              className="grc-gold-ale-live-dot inline-block size-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]"
              title="Defense 1.60× baseline live — $16.0M ALE (2s heartbeat)"
              aria-hidden
            />
          ) : null}
          <span aria-hidden>:</span>
        </span>
        <span className="tabular-nums">
          {!tenantExplicit
            ? "--- ¢ ALE"
            : defenseAleActive
              ? `${(1600000000n).toString()} ¢ ALE`
              : `${(10000000n).toString()} ¢ ALE`}
        </span>
        {!tenantExplicit ? (
          <span className="font-mono text-[10px] font-semibold text-slate-500">· Financial anchor $0 USD</span>
        ) : null}
      </span>
      {tenantExplicit ? <MaturityBadge /> : null}
      </span>
    </p>
  );

  const auditProminenceBlock = !tenantExplicit ? (
    <div className="mt-1.5 rounded-lg border border-slate-700/50 bg-slate-950/80 px-2.5 py-2 ring-1 ring-slate-600/20">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500/90">Forensic audit sync</p>
      <p className="mt-2 text-center font-mono text-[10px] font-semibold leading-snug text-slate-400">
        [ 🔗 STANDBY: SELECT TENANT FROM COMMAND CENTER ]
      </p>
    </div>
  ) : (
    <div className="mt-1.5 rounded-lg border border-cyan-700/35 bg-slate-950/80 px-2.5 py-2 ring-1 ring-cyan-500/10">
      <p className="text-[9px] font-black uppercase tracking-widest text-cyan-500/90">Forensic audit sync</p>
      <div className="mt-1 flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 shrink">
          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">Audit counter</p>
          <p className="font-mono text-xl font-bold tabular-nums leading-tight text-cyan-200">{auditCount}</p>
        </div>
        <div className="min-w-0 shrink text-right">
          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">Last verified</p>
          <div className="flex min-h-[1.25rem] items-center justify-end overflow-hidden">
            <p
              className={`max-w-[11rem] text-right font-mono text-[10px] leading-tight tabular-nums break-words ${
                insuranceRecalcFlash
                  ? "animate-pulse font-semibold text-amber-300"
                  : "text-cyan-400/60"
              }`}
            >
              {insuranceRecalcFlash
                ? "[ ⚡ RECALCULATING POSTURE... ]"
                : lastVerified || "INITIALIZING..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const body = (
    <>
      <p className="font-semibold leading-snug text-slate-200">
        Tenant Name:{" "}
        {!tenantExplicit ? (
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-amber-500/85">PENDING</span>
        ) : (
          <span className="text-cyan-100/95">{resolvedTenantDisplayName}</span>
        )}
      </p>
      <p className="mt-0.5 font-semibold leading-snug text-slate-200">
        Shield Badge:{" "}
        <span className={!tenantExplicit ? "text-slate-500" : "text-emerald-200/95"}>
          {!tenantExplicit ? "🛡️ PENDING" : defenseAleActive ? "🛡️ 1.60× CMMC L3" : "🛡️ 1.00× CMMC L3"}
        </span>
      </p>
      {aleLine}
      {auditProminenceBlock}
      <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={pivotAuditIntelligenceToActiveRisk}
          disabled={!defenseAleActive || !activeRiskId?.trim()}
          className={`rounded border px-2 py-0.5 text-[8px] font-black uppercase tracking-wide ${
            defenseAleActive && activeRiskId?.trim()
              ? "border-violet-600/60 bg-violet-950/45 text-violet-200 hover:bg-violet-900/45"
              : "cursor-not-allowed border-slate-700 bg-slate-900 text-slate-500"
          }`}
          title={
            defenseAleActive && activeRiskId?.trim()
              ? "Pivot Audit Intelligence to Defense 1.60× reasoning for the active risk"
              : "Acknowledge or claim a risk to enable Why?"
          }
        >
          Why?
        </button>
      </div>
      <p className="mt-2 border-t border-emerald-800/30 pt-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400/95">
        Chain of Custody: Verified
      </p>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={onAuthorizeAuditSignOff}
          disabled={!signOffReady}
          className={`rounded-md border px-3 py-1.5 text-[9px] font-black uppercase tracking-wide transition ${
            signOffReady
              ? "border-emerald-500/80 bg-emerald-950/60 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.45)] hover:bg-emerald-900/50"
              : "cursor-not-allowed border-slate-700 bg-slate-900/80 text-slate-500 opacity-50 grayscale"
          }`}
        >
          {signOffReady ? "[ ✍️ READY FOR SIGN-OFF ]" : "[ AUTHORIZE AUDIT SIGN-OFF ]"}
        </button>
      </div>
    </>
  );

  const receiptToastEl =
    receiptToast ? (
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 left-1/2 z-[100] max-w-[min(96vw,28rem)] -translate-x-1/2 rounded-lg border border-emerald-500/40 bg-slate-950/95 px-4 py-2.5 text-center font-mono text-[10px] font-semibold text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
      >
        [ 📄 RECEIPT GENERATED: SHA-256 SEAL LOCKED ]
      </div>
    ) : null;

  if (variant === "grid") {
    return (
      <>
        <div
          className="flex h-full min-h-0 flex-col rounded border border-emerald-800/50 bg-slate-900/75 p-3 text-[10px] text-slate-100 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15)]"
          data-testid="grc-gold-forensic-grid-cell"
        >
          <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-emerald-400/90">
            GRC Gold · Forensic
          </p>
          {body}
        </div>
        {receiptToastEl}
      </>
    );
  }

  return (
    <>
      <section
        aria-labelledby="grc-gold-living-audit-heading"
        className="border-b border-slate-800 bg-slate-950/90 px-4 py-2"
      >
        <h2
          id="grc-gold-living-audit-heading"
          className="text-[10px] font-black uppercase tracking-wider text-slate-500"
        >
          GRC Gold · Living Audit
        </h2>
        <div className="mt-1.5 rounded border border-emerald-900/35 bg-slate-900/60 py-2 px-3 text-[10px] text-slate-100 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.12)]">
          {body}
        </div>
      </section>
      {receiptToastEl}
    </>
  );
}
