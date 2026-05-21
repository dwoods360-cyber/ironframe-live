"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Download, Lock, Megaphone, Share2, Shield, ShieldCheck } from "lucide-react";
import { listIntegritySyntheticTargetsAction } from "@/app/actions/integritySyntheticTargetsActions";
import { hardenVIPTarget } from "@/app/actions/vipHardeningActions";
import {
  listPendingThreatResolutions,
  requestThreatResolution,
} from "@/app/actions/threatActions";
import {
  finalizeArtifactUpload,
  listEvidenceForThreatEntity,
  type EvidenceAttachmentListItem,
} from "@/app/actions/evidenceActions";
import { restoreSystemIntegrityAction } from "@/lib/actions/remediate";
import type { RemediationImpactReport } from "@/app/types/remediationReceipt";
import type { IntegrityHubSyntheticTarget } from "@/app/types/integrityVault";
import { useSimulationConfigStore } from "@/app/store/simulationConfigStore";
import {
  buildRemediationStakeholderBrief,
  isSecureLabRecovery,
} from "@/app/utils/remediationStakeholderBrief";
import { formatSyntheticLastAttacked, formatUsdFromCentsString } from "@/app/utils/syntheticPersonaDisplay";
import ResolutionAttestationModal from "@/app/components/ResolutionAttestationModal";
import { useUser } from "@/app/hooks/useUser";

/** Blue-team pulse duration after the receipt modal paints (aligned with remediation “report” beat). */
const PULSE_AFTER_MODAL_MS = 2600;

/** Clipboard “Copied!” feedback — short so it feels snappy inside the pulse window. */
const COPY_FEEDBACK_MS = 1800;

function formatReceiptTitleTimestamp(iso: string): string {
  try {
    return (
      new Date(iso).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }) + " UTC"
    );
  } catch {
    return iso;
  }
}

function buildReceiptFilename(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `remediation-receipt-${y}${m}${day}-${hh}${mm}.txt`;
}

function simulatedValidationHash(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const lo = (h >>> 0).toString(16).padStart(8, "0");
  const hi = (Math.imul(h, 1103515245) >>> 0).toString(16).padStart(8, "0");
  return `SIM-VAL-${hi}${lo}`;
}

function buildReceiptFileBody(report: RemediationImpactReport, operatorDisplayName: string): string {
  const hash = simulatedValidationHash(
    `${report.timestamp}|${report.totalRecoveredCents}|${report.affectedCount}|${report.highestValueTarget ?? ""}|IRONFRAME-LAB-RECEIPT`,
  );
  const usd = formatUsdFromCentsString(report.totalRecoveredCents);
  const secure = isSecureLabRecovery(report);
  const hvt = secure ? "N/A (lab secure — no capital lost)" : report.highestValueTarget ?? "N/A";
  return [
    "IRONFRAME — REMEDIATION RECEIPT (LAB)",
    "========================================",
    `Attested GRC officer: ${operatorDisplayName}`,
    `Issued (UTC): ${report.timestamp}`,
    `Validation Hash (simulated): ${hash}`,
    "",
    `Capital Recovered (USD): ${usd}`,
    `Capital Recovered (cents): ${report.totalRecoveredCents}`,
    `High-Value Target Protected: ${hvt}`,
    `Personas Remediated: ${report.affectedCount}`,
    "INTEGRITY: 100% PRISTINE",
    "========================================",
  ].join("\n");
}

function downloadRemediationReceipt(report: RemediationImpactReport, operatorDisplayName: string) {
  const body = buildReceiptFileBody(report, operatorDisplayName);
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildReceiptFilename(report.timestamp);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type Props = {
  syntheticRows: IntegrityHubSyntheticTarget[];
  syntheticLoadError: string | null;
  onSyntheticRowsChange: (rows: IntegrityHubSyntheticTarget[]) => void;
  onRemediationVisualChange: (active: boolean) => void;
};

/**
 * Tier 3 shadow-plane roster: synthetic employee grid + lab integrity RESTORE (Medshield ALE + counters).
 */
export default function ShadowPlaneRegistry({
  syntheticRows,
  syntheticLoadError,
  onSyntheticRowsChange,
  onRemediationVisualChange,
}: Props) {
  const { displayName: operatorDisplayName } = useUser();
  const automatedUpdatesEnabled = useSimulationConfigStore((s) => s.automatedUpdatesEnabled);
  const hydrateSimulationConfig = useSimulationConfigStore((s) => s.hydrate);

  const router = useRouter();
  const [, startTransition] = useTransition();
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [targetRestoreError, setTargetRestoreError] = useState<string | null>(null);
  const [requestingTargetId, setRequestingTargetId] = useState<string | null>(null);
  const [verifyIntegrity, setVerifyIntegrity] = useState(false);
  const [attestationTarget, setAttestationTarget] = useState<IntegrityHubSyntheticTarget | null>(null);
  const [pendingTargetEmails, setPendingTargetEmails] = useState<Set<string>>(new Set());
  const [locallyRequestedIds, setLocallyRequestedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"targets" | "evidence">("targets");
  const [evidenceItems, setEvidenceItems] = useState<EvidenceAttachmentListItem[]>([]);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [hardenError, setHardenError] = useState<string | null>(null);
  const [hardeningId, setHardeningId] = useState<string | null>(null);
  const [impactReport, setImpactReport] = useState<RemediationImpactReport | null>(null);
  const [mounted, setMounted] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const pulseEndTimerRef = useRef<number | null>(null);
  const copyFeedbackTimerRef = useRef<number | null>(null);
  const dialogTitleId = useId();

  useEffect(() => {
    setMounted(true);
    return () => {
      if (pulseEndTimerRef.current != null) window.clearTimeout(pulseEndTimerRef.current);
      if (copyFeedbackTimerRef.current != null) window.clearTimeout(copyFeedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadEvidence = async () => {
      setEvidenceError(null);
      const all: EvidenceAttachmentListItem[] = [];
      for (const row of syntheticRows) {
        if (!(row.isBreached || row.status === "BREACHED")) continue;
        const res = await listEvidenceForThreatEntity(row.id);
        if (!res.ok) {
          if (!cancelled) setEvidenceError(res.error);
          continue;
        }
        all.push(...res.items);
      }
      if (!cancelled) {
        const dedup = new Map<string, EvidenceAttachmentListItem>();
        for (const item of all) dedup.set(item.attachmentId, item);
        setEvidenceItems(
          Array.from(dedup.values()).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
        );
      }
    };
    void loadEvidence();
    return () => {
      cancelled = true;
    };
  }, [syntheticRows]);

  useEffect(() => {
    void hydrateSimulationConfig();
  }, [hydrateSimulationConfig]);

  useEffect(() => {
    let cancelled = false;
    void listPendingThreatResolutions().then((res) => {
      if (cancelled || !res.ok) return;
      const emails = res.items
        .map((item) => (typeof item.targetEntity === "string" ? item.targetEntity.trim() : ""))
        .filter((v): v is string => v.length > 0);
      setPendingTargetEmails(new Set(emails));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function dismissImpactModal() {
    setImpactReport(null);
    setSummaryCopied(false);
    if (copyFeedbackTimerRef.current != null) {
      window.clearTimeout(copyFeedbackTimerRef.current);
      copyFeedbackTimerRef.current = null;
    }
  }

  async function handleCopySummary(report: RemediationImpactReport) {
    const text = buildRemediationStakeholderBrief(report);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      } catch {
        return;
      }
    }
    setSummaryCopied(true);
    if (copyFeedbackTimerRef.current != null) window.clearTimeout(copyFeedbackTimerRef.current);
    copyFeedbackTimerRef.current = window.setTimeout(() => {
      setSummaryCopied(false);
      copyFeedbackTimerRef.current = null;
    }, COPY_FEEDBACK_MS);
  }

  async function handleHardenTarget(id: string) {
    setHardenError(null);
    setHardeningId(id);
    try {
      const res = await hardenVIPTarget(id);
      if (!res.ok) {
        setHardenError(res.error);
        return;
      }
      const listed = await listIntegritySyntheticTargetsAction();
      if (listed.ok) onSyntheticRowsChange(listed.targets);
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      setHardenError(e instanceof Error ? e.message : "Harden failed");
    } finally {
      setHardeningId(null);
    }
  }

  async function handleRestoreIntegrity() {
    setRestoreError(null);
    setRestoreBusy(true);
    onRemediationVisualChange(true);
    if (pulseEndTimerRef.current != null) {
      window.clearTimeout(pulseEndTimerRef.current);
      pulseEndTimerRef.current = null;
    }
    try {
      const res = await restoreSystemIntegrityAction();
      if (!res.ok) {
        setRestoreError(res.error);
        onRemediationVisualChange(false);
        return;
      }

      setImpactReport(res.impactReport);

      const listed = await listIntegritySyntheticTargetsAction();
      if (listed.ok) onSyntheticRowsChange(listed.targets);
      startTransition(() => {
        router.refresh();
      });

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          pulseEndTimerRef.current = window.setTimeout(() => {
            onRemediationVisualChange(false);
            pulseEndTimerRef.current = null;
          }, PULSE_AFTER_MODAL_MS);
        });
      });
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : "Restore failed");
      onRemediationVisualChange(false);
    } finally {
      setRestoreBusy(false);
    }
  }

  async function handleSubmitResolutionRequest(
    id: string,
    notes: string,
    evidenceFile: File | null,
  ) {
    setTargetRestoreError(null);
    setRequestingTargetId(id);
    try {
      let artifactId: string | undefined;
      if (evidenceFile) {
        setVerifyIntegrity(true);
        const upload = await finalizeArtifactUpload({
          fileData: await evidenceFile.arrayBuffer(),
          fileName: evidenceFile.name,
          mimeType: evidenceFile.type || "application/octet-stream",
        });
        if (!upload.success) {
          setTargetRestoreError(upload.error);
          return;
        }
        artifactId = upload.artifactId;
      }

      const res = await requestThreatResolution(id, notes, artifactId);
      if (!res.success) {
        setTargetRestoreError(res.error);
      } else {
        const row = syntheticRows.find((r) => r.id === id);
        if (row?.email?.trim()) {
          setPendingTargetEmails((prev) => new Set(prev).add(row.email.trim()));
        }
        setLocallyRequestedIds((prev) => new Set(prev).add(id));
        setAttestationTarget(null);
      }
    } catch (e) {
      setTargetRestoreError(e instanceof Error ? e.message : "Resolution request failed");
    } finally {
      setVerifyIntegrity(false);
      setRequestingTargetId(null);
      startTransition(() => {
        router.refresh();
      });
    }
  }

  const receiptTitleSuffix = impactReport ? formatReceiptTitleTimestamp(impactReport.timestamp) : "";
  const secureLab = impactReport ? isSecureLabRecovery(impactReport) : false;

  const modal =
    impactReport && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
            role="presentation"
            onClick={dismissImpactModal}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={dialogTitleId}
              className="w-full max-w-md rounded-lg border border-emerald-500/60 bg-slate-950/92 p-5 shadow-[0_0_40px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/25"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-950/50">
                  <Shield className="h-5 w-5 text-emerald-400" strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    id={dialogTitleId}
                    className="text-[11px] font-black uppercase leading-snug tracking-[0.12em] text-emerald-400 sm:text-xs"
                  >
                    REMEDIATION RECEIPT - {receiptTitleSuffix}
                  </h2>
                  <div className="mt-4 space-y-2.5 text-[11px] leading-relaxed">
                    {secureLab ? (
                      <>
                        <p className="font-semibold text-emerald-400">
                          Capital Recovered: {formatUsdFromCentsString(impactReport.totalRecoveredCents)}
                        </p>
                        <p className="rounded border border-slate-700/80 bg-slate-900/60 px-2 py-1.5 text-slate-300">
                          System remained secure; no capital lost.
                        </p>
                        <p className="font-mono text-[10px] font-black uppercase tracking-wider text-emerald-300/95 transition-opacity duration-150">
                          INTEGRITY: 100% PRISTINE
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-emerald-400 transition-opacity duration-150">
                          Capital Recovered: {formatUsdFromCentsString(impactReport.totalRecoveredCents)}
                        </p>
                        <p className="font-semibold text-amber-400/95 transition-opacity duration-150">
                          High-Value Target Protected: {impactReport.highestValueTarget ?? "N/A"}
                        </p>
                        <p className="text-slate-200 transition-opacity duration-150">
                          Personas Remediated: {impactReport.affectedCount}
                        </p>
                        <p className="font-mono text-[10px] font-black uppercase tracking-wider text-emerald-300/95 transition-opacity duration-150">
                          INTEGRITY: 100% PRISTINE
                        </p>
                      </>
                    )}
                  </div>
                  <div className="mt-5 flex flex-col gap-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => downloadRemediationReceipt(impactReport, operatorDisplayName)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-md border border-amber-600/50 bg-amber-950/30 py-2 text-[10px] font-black uppercase tracking-widest text-amber-200 transition-all duration-150 hover:border-amber-400/60 hover:bg-amber-950/50"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        DOWNLOAD RECEIPT
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopySummary(impactReport)}
                        aria-label="Copy internal brief to clipboard"
                        className={`flex flex-1 items-center justify-center gap-2 rounded-md border py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-150 ${
                          summaryCopied
                            ? "border-blue-400/70 bg-blue-950/45 text-blue-100 shadow-[0_0_14px_rgba(59,130,246,0.2)]"
                            : "border-blue-500/50 bg-blue-950/25 text-blue-400 hover:border-blue-400/60 hover:bg-blue-950/40"
                        }`}
                      >
                        <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {summaryCopied ? "Copied!" : "COPY INTERNAL BRIEF"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={dismissImpactModal}
                      className="w-full rounded-md border border-emerald-600/50 bg-emerald-950/40 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-200 transition-colors duration-150 hover:border-emerald-400 hover:bg-emerald-900/50"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const attestationModal = (
    <ResolutionAttestationModal
      open={attestationTarget != null}
      targetLabel={attestationTarget?.name ?? "Selected target"}
      verifyInProgress={verifyIntegrity}
      busy={requestingTargetId != null}
      error={targetRestoreError}
      onClose={() => {
        if (requestingTargetId == null) {
          setAttestationTarget(null);
          setTargetRestoreError(null);
        }
      }}
      onSubmit={async (notes, file) => {
        if (!attestationTarget) return;
        await handleSubmitResolutionRequest(attestationTarget.id, notes, file);
      }}
    />
  );

  return (
    <div className="mt-6 border-t border-slate-800/90 pt-5">
      {modal}
      {attestationModal}

      <div className="mb-4 flex max-w-xl flex-wrap items-stretch gap-2 sm:flex-nowrap">
        <span
          className="inline-flex shrink-0 items-center justify-center self-center rounded-lg border border-slate-700/80 bg-slate-950/60 px-2.5 py-2"
          title={automatedUpdatesEnabled ? "Broadcast Active" : "Updates Muted"}
          aria-label={automatedUpdatesEnabled ? "Broadcast Active" : "Updates Muted"}
        >
          {automatedUpdatesEnabled ? (
            <Megaphone
              className="h-4 w-4 shrink-0 text-emerald-400 motion-safe:animate-pulse"
              strokeWidth={2.25}
              aria-hidden
            />
          ) : (
            <Lock className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2.25} aria-hidden />
          )}
        </span>
        <button
          type="button"
          disabled={restoreBusy}
          onClick={() => void handleRestoreIntegrity()}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-950/20 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500 shadow-[inset_0_1px_0_0_rgba(16,185,129,0.08)] transition-colors hover:border-emerald-400/60 hover:bg-emerald-950/35 hover:text-emerald-400 disabled:opacity-50 sm:flex-initial sm:justify-center"
          title="Restore lab integrity (Phase 1.5). Copy Internal Brief in the receipt modal is always available."
        >
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500/90" strokeWidth={2.25} aria-hidden />
          <span>[ RESTORE SYSTEM INTEGRITY ]</span>
        </button>
      </div>

      <div className="min-w-0">
        <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">
          Synthetic target population
        </h3>
        <p className="mt-1 text-[10px] text-slate-500">
          Shadow-directory personas only — not the production user directory.
        </p>
      </div>

      {restoreError ? (
        <p className="mt-2 text-[10px] text-rose-300/90">
          Restore failed: <span className="font-mono text-rose-200/90">{restoreError}</span>
        </p>
      ) : null}
      {hardenError ? (
        <p className="mt-2 text-[10px] text-rose-300/90">
          Harden: <span className="font-mono text-rose-200/90">{hardenError}</span>
        </p>
      ) : null}
      {targetRestoreError ? (
        <p className="mt-2 text-[10px] text-rose-300/90">
          Target restore: <span className="font-mono text-rose-200/90">{targetRestoreError}</span>
        </p>
      ) : null}

      <div className="mt-4 flex gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("targets")}
          className={`rounded border px-2 py-1 text-[8px] font-black uppercase tracking-wide ${
            activeTab === "targets"
              ? "border-cyan-500/70 bg-cyan-950/35 text-cyan-100"
              : "border-slate-700 bg-slate-900/50 text-slate-400"
          }`}
        >
          Targets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("evidence")}
          className={`rounded border px-2 py-1 text-[8px] font-black uppercase tracking-wide ${
            activeTab === "evidence"
              ? "border-cyan-500/70 bg-cyan-950/35 text-cyan-100"
              : "border-slate-700 bg-slate-900/50 text-slate-400"
          }`}
        >
          Evidence
        </button>
      </div>

      {syntheticLoadError && syntheticRows.length === 0 ? (
        <p className="mt-3 text-[10px] text-amber-200/90">
          Could not load synthetic roster: <span className="font-mono text-amber-100/80">{syntheticLoadError}</span>
        </p>
      ) : null}
      {syntheticRows.length === 0 && !syntheticLoadError ? (
        <p className="mt-3 text-[10px] text-slate-600">
          No synthetic employees in the database yet. Run{" "}
          <span className="font-mono text-slate-400">npm run db:seed</span> or{" "}
          <span className="font-mono text-slate-400">npm run db:seed:synthetic</span>.
        </p>
      ) : syntheticRows.length > 0 && activeTab === "targets" ? (
        <div className="mt-3 overflow-x-auto rounded-md border border-slate-800/90 bg-slate-900/40">
          <table className="w-full min-w-[820px] border-collapse text-left text-[10px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-[8px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2 text-center">Clearance</th>
                <th className="px-3 py-2 text-right">Access value</th>
                <th className="px-3 py-2 text-right">Total loss</th>
                <th className="px-3 py-2">Last attacked</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2 text-right">Vulnerability</th>
                <th className="px-3 py-2 text-right">Lab</th>
              </tr>
            </thead>
            <tbody>
              {syntheticRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-800/60 last:border-0 odd:bg-slate-950/30 even:bg-slate-900/20"
                >
                  <td className="px-3 py-2 font-semibold text-slate-200">
                    <span className="inline-flex items-center gap-1.5">
                      {row.clearanceLevel === 5 && row.isHardened ? (
                        <span
                          className="inline-flex shrink-0"
                          title="VIP hardened — PhishBot uses halved vulnerability on hook rolls"
                        >
                          <Shield
                            className="h-3.5 w-3.5 text-cyan-400"
                            strokeWidth={2.25}
                            aria-label="VIP hardened"
                          />
                        </span>
                      ) : null}
                      {row.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-400">{row.role}</td>
                  <td className="px-3 py-2 text-center font-mono tabular-nums text-slate-300">{row.clearanceLevel}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-300">
                    {formatUsdFromCentsString(row.monetaryValueCents)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-amber-200/90">
                    {formatUsdFromCentsString(row.totalLossIncurredCents)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[9px] text-slate-500">
                    {formatSyntheticLastAttacked(row.lastAttackedAt)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[9px] text-slate-500">{row.email}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-400">
                    {row.vulnerabilityScore.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.isBreached || row.status === "BREACHED" ? (
                      locallyRequestedIds.has(row.id) || pendingTargetEmails.has(row.email.trim()) ? (
                        <span className="rounded border border-amber-700/60 bg-amber-950/25 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-amber-200/90">
                          Pending Review
                        </span>
                      ) : (
                      <button
                        type="button"
                        disabled={requestingTargetId === row.id}
                        onClick={() => {
                          setTargetRestoreError(null);
                          setAttestationTarget(row);
                        }}
                        className="rounded border border-emerald-700/60 bg-emerald-950/30 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-emerald-200/95 hover:border-emerald-500/70 hover:bg-emerald-950/50 disabled:opacity-50"
                        title="Request manager-approved restoration for this breached synthetic persona"
                      >
                        {requestingTargetId === row.id ? "…" : "Restore"}
                      </button>
                      )
                    ) : row.clearanceLevel === 5 && !row.isHardened ? (
                      <button
                        type="button"
                        disabled={hardeningId === row.id}
                        onClick={() => void handleHardenTarget(row.id)}
                        className="rounded border border-cyan-700/60 bg-cyan-950/30 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-cyan-200/95 hover:border-cyan-500/70 hover:bg-cyan-950/50 disabled:opacity-50"
                        title="Debit $50,000 from Medshield ALE baseline; halve PhishBot vulnerability on success rolls (+2 readiness per hardened VIP)"
                      >
                        {hardeningId === row.id ? "…" : "Harden"}
                      </button>
                    ) : row.clearanceLevel === 5 && row.isHardened ? (
                      <span className="text-[8px] font-mono uppercase text-slate-600">Hardened</span>
                    ) : (
                      <span className="text-[8px] text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === "evidence" ? (
        <div className="mt-3 rounded-md border border-slate-800/90 bg-slate-900/40 p-3">
          <h4 className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-200">
            Evidence Locker
          </h4>
          <p className="mt-1 text-[9px] text-slate-500">
            Seal of Authenticity (SHA-256) for all attached artifacts.
          </p>
          {evidenceError ? (
            <p className="mt-2 text-[9px] text-rose-300">{evidenceError}</p>
          ) : null}
          {evidenceItems.length < 1 ? (
            <p className="mt-2 text-[9px] text-slate-600">No evidence attached yet.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {evidenceItems.map((item) => (
                <div
                  key={item.attachmentId}
                  className="rounded border border-slate-800/80 bg-slate-950/35 px-2 py-1.5"
                >
                  <p className="text-[9px] text-slate-300">
                    Artifact: <span className="font-mono text-slate-200">{item.artifactId}</span>
                  </p>
                  <p className="text-[8px] text-emerald-300/95">
                    Seal of Authenticity: <span className="font-mono">{item.sha256}</span>
                  </p>
                  <p className="text-[8px] text-slate-500">
                    {item.mimeType} • {new Date(item.createdAt).toLocaleString()}
                  </p>
                  {item.attachmentNote ? (
                    <p className="mt-0.5 text-[8px] text-slate-400">{item.attachmentNote}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
