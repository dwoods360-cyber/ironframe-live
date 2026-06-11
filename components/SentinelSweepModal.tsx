"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useActionState } from "@/lib/react/useActionState";
import { X } from "lucide-react";
import {
  ingestGovernedRiskFormAction,
  previewSentinelGovernanceScan,
  type IngestGovernedRiskFormState,
  type SentinelRegulatoryFramework,
} from "@/app/actions/sentinelActions";
import { syncThreatBoardsClient } from "@/app/utils/syncThreatBoardsClient";
import { useRiskStore } from "@/app/store/riskStore";
import { useAgenticComputeStore } from "@/app/store/agenticComputeStore";
import { useAgentStore, type SentinelSweepSession } from "@/app/store/agentStore";
import type { SentinelSweepCheckItem } from "@/app/actions/sentinelSweepActions";
import { LeftPanelFeatureTitle } from "@/app/components/leftPanel/LeftPanelFeatureIndex";
import { LP_FEATURE } from "@/app/config/leftPanelFeatureIndex";
import { appendAuditLog } from "@/app/utils/auditLogger";
import { useUser } from "@/app/hooks/useUser";
import {
  IRONWATCH_LOW_CONFIDENCE_SEMANTIC_DRIFT,
  IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL,
  IRONWATCH_SHADOW_DISSENT_LABEL,
  IRONWATCH_SEMANTIC_DRIFT_THRESHOLD,
  normalizeGrcProfileName,
} from "@/lib/constants/grcGovernance";
import { SENTINEL_FRAMEWORK_OPTIONS } from "@/lib/constants/sentinelFramework";
import {
  GRC_GOLD_SENTINEL_MODAL_TITLE,
  GRC_GOLD_SENTINEL_MODAL_SUBTITLE,
  GRC_GOLD_SENTINEL_SIGNATURE_LABEL,
  GRC_GOLD_SENTINEL_SIGNATURE_PLACEHOLDER,
  GRC_GOLD_SENTINEL_PREVIEW_STATUS,
} from "@/lib/constants/grcGold";

const INITIAL_FORM_STATE: IngestGovernedRiskFormState = { status: "idle" };

type Props = {
  open: boolean;
  onClose: () => void;
  initialAgentInstruction?: string;
  onGovernanceIntelAlert?: (message: string | null) => void;
  onCompleted?: () => void;
};

export default function SentinelSweepModal({
  open,
  onClose,
  initialAgentInstruction = "",
  onGovernanceIntelAlert,
  onCompleted,
}: Props) {
  const [sessionKey, setSessionKey] = useState(0);
  useEffect(() => {
    if (open) setSessionKey((k) => k + 1);
  }, [open]);

  if (!open) return null;

  return (
    <SentinelSweepModalSession
      key={sessionKey}
      onClose={onClose}
      initialAgentInstruction={initialAgentInstruction}
      onGovernanceIntelAlert={onGovernanceIntelAlert}
      onCompleted={onCompleted}
    />
  );
}

function SentinelSweepModalSession({
  onClose,
  initialAgentInstruction = "",
  onGovernanceIntelAlert,
  onCompleted,
}: Omit<Props, "open">) {
  const { displayName: profileDisplayName, loading: profileLoading } = useUser();
  const replacePipelineThreats = useRiskStore((s) => s.replacePipelineThreats);
  const replaceActiveThreats = useRiskStore((s) => s.replaceActiveThreats);
  const setSentinelGovernanceModeActive = useRiskStore((s) => s.setSentinelGovernanceModeActive);
  const addStreamMessage = useAgentStore((s) => s.addStreamMessage);
  const runSentinelSweep = useAgentStore((s) => s.runSentinelSweep);
  const sentinelSweepSession = useAgentStore((s) => s.sentinelSweepSession);

  const [formState, formAction] = useActionState(ingestGovernedRiskFormAction, INITIAL_FORM_STATE);

  const [regulatoryFramework, setRegulatoryFramework] =
    useState<SentinelRegulatoryFramework>("CMMC_L3");
  const [controlId, setControlId] = useState("");
  const [systemOwner, setSystemOwner] = useState("");
  const [impactJustification, setImpactJustification] = useState("");
  const [digitalSignature, setDigitalSignature] = useState("");
  const [sourceDocumentHashSha256, setSourceDocumentHashSha256] = useState("");
  const [pageReference, setPageReference] = useState("");
  const [shadowDissent, setShadowDissent] = useState(false);
  const [shadowDissentAudit, setShadowDissentAudit] = useState(false);
  const [shadowDissentSummary, setShadowDissentSummary] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [lowConfidenceSemanticDrift, setLowConfidenceSemanticDrift] = useState(false);
  const [semanticDistancePreview, setSemanticDistancePreview] = useState(0);

  useEffect(() => {
    setDigitalSignature("");
    setSourceDocumentHashSha256("");
    setPageReference("");
    setShadowDissent(false);
    setShadowDissentAudit(false);
    setShadowDissentSummary("");
    setLowConfidenceSemanticDrift(false);
    setSemanticDistancePreview(0);
    if (initialAgentInstruction.trim()) {
      setImpactJustification(initialAgentInstruction.trim());
    }
  }, [initialAgentInstruction]);

  useEffect(() => {
    const instr = initialAgentInstruction.trim();
    if (!instr) return;
    runSentinelSweep(instr);
  }, [initialAgentInstruction, runSentinelSweep]);

  const successHandledRef = useRef<string | null>(null);
  useEffect(() => {
    if (formState.status !== "success") return;
    const s = formState;
    if (successHandledRef.current === s.threatId) return;
    successHandledRef.current = s.threatId;
    setSentinelGovernanceModeActive(true);
    onGovernanceIntelAlert?.(s.ironwatchSidebarAlert ?? null);
    addStreamMessage(
      `> [SENTINEL] GRC interview ingested · ${s.threatId} · ${s.regulatoryShieldBadge ? "shield applied" : "governed"}${s.shadowDissent ? " · SHADOW DISSENT OVERRIDDEN" : ""}`,
    );
    appendAuditLog({
      action_type: "GRC_SENTINEL_SWEEP",
      log_type: "GRC",
      description: `Sentinel GRC interview finalized — threat ${s.threatId}${s.shadowDissent ? " · dissent sealed" : ""}`,
    });
    void (async () => {
      try {
        await syncThreatBoardsClient(replacePipelineThreats, replaceActiveThreats);
      } catch {
        /* non-fatal */
      }
      onCompleted?.();
      onClose();
    })();
  }, [
    formState,
    addStreamMessage,
    onClose,
    onCompleted,
    onGovernanceIntelAlert,
    replaceActiveThreats,
    replacePipelineThreats,
    setSentinelGovernanceModeActive,
  ]);

  useEffect(() => {
    const cid = controlId.trim();
    const ij = impactJustification.trim();
    if (cid.length < 2 || ij.length < 12) {
      setShadowDissent(false);
      setShadowDissentAudit(false);
      setShadowDissentSummary("");
      setLowConfidenceSemanticDrift(false);
      setSemanticDistancePreview(0);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setPreviewBusy(true);
        try {
          const r = await previewSentinelGovernanceScan({
            regulatoryFramework,
            controlId: cid,
            impactJustification: ij,
          });
          if (!r.ok) return;
          setShadowDissent(r.shadowDissent);
          setShadowDissentAudit(r.shadowDissentAuditInconsistency);
          setShadowDissentSummary(r.shadowDissent ? r.shadowDissentSummary : "");
          setLowConfidenceSemanticDrift(r.lowConfidenceSemanticDrift);
          setSemanticDistancePreview(r.semanticDistance);
          useAgenticComputeStore.getState().recordSample({
            tenantLabel: useRiskStore.getState().selectedTenantName ?? "My Organization",
            durationMs: r.agenticComputeMs,
            tokensEstimate: Math.max(1, Math.round(ij.length / 4)),
          });
        } finally {
          setPreviewBusy(false);
        }
      })();
    }, 480);
    return () => window.clearTimeout(t);
  }, [regulatoryFramework, controlId, impactJustification]);

  const hashTrim = sourceDocumentHashSha256.trim();
  const pageTrim = pageReference.trim();
  const hashValid = /^[a-fA-F0-9]{64}$/.test(hashTrim);
  const citationGateOk = hashValid && pageTrim.length > 0;

  const profileName = profileDisplayName ?? "";
  const signatureValid =
    !profileLoading &&
    digitalSignature.trim().length > 0 &&
    normalizeGrcProfileName(digitalSignature) === normalizeGrcProfileName(profileName);

  const formError = formState.status === "error" ? formState.error : null;

  const authorizeDisabled =
    !signatureValid ||
    !citationGateOk ||
    !controlId.trim() ||
    !systemOwner.trim() ||
    !impactJustification.trim();

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sentinel-sweep-modal-title"
      data-testid="sentinel-sweep-modal"
    >
      <div className="relative w-full max-w-md rounded-lg border border-amber-800/50 bg-[#0a0a0f] p-4 shadow-2xl shadow-amber-900/20">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <LeftPanelFeatureTitle
          index={LP_FEATURE.SENTINEL_MODAL}
          as="h2"
          id="sentinel-sweep-modal-title"
          className="pr-8 text-sm font-black uppercase tracking-widest text-amber-300"
        >
          {GRC_GOLD_SENTINEL_MODAL_TITLE}
        </LeftPanelFeatureTitle>
        <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
          {GRC_GOLD_SENTINEL_MODAL_SUBTITLE}{" "}
          <code className="text-zinc-400">useActionState</code> server action hook.
        </p>

        <SentinelSweepChecklist session={sentinelSweepSession} />

        {shadowDissent ? (
          <div
            className="mt-3 rounded border-2 border-red-600 bg-red-950/40 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.35)]"
            role="alert"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-red-300">
              Dissenting agent alert —{" "}
              {shadowDissentAudit ? IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL : IRONWATCH_SHADOW_DISSENT_LABEL}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-red-100/90">{shadowDissentSummary}</p>
            <p className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-red-200/85">
              Enter your full name below to attest (Product Owner or designated CISO). AUTHORIZE commits the
              forensic transaction and overrides Agent 13 dissent when the server verifies your profile.
            </p>
          </div>
        ) : null}

        {lowConfidenceSemanticDrift ? (
          <div
            className="mt-3 rounded border border-amber-700/60 bg-amber-950/35 px-3 py-2"
            role="status"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-200/95">
              {IRONWATCH_LOW_CONFIDENCE_SEMANTIC_DRIFT}
            </p>
            <p className="mt-1 text-[9px] leading-relaxed text-amber-100/85">
              Hybrid retrieval semantic distance {semanticDistancePreview.toFixed(3)} exceeds{" "}
              {IRONWATCH_SEMANTIC_DRIFT_THRESHOLD}. Evidence alignment is weak — review justification and citations
              before authorizing.
            </p>
          </div>
        ) : null}

        {previewBusy ? (
          <p className="mt-2 text-[9px] text-zinc-500">
            Ironwatch Flemming scan (Evidence Vault + reasoning logs, vector + BM25)…
          </p>
        ) : null}

        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="agentInstruction" value={initialAgentInstruction.trim()} />

          <label className="block text-[10px] text-zinc-300">
            <span className="font-semibold text-zinc-200">Framework mapping</span>
            <span className="mb-0.5 block text-zinc-500">Which regulatory framework does this impact?</span>
            <select
              name="regulatoryFramework"
              value={regulatoryFramework}
              onChange={(e) => setRegulatoryFramework(e.target.value as SentinelRegulatoryFramework)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-[12px] text-zinc-100"
            >
              {SENTINEL_FRAMEWORK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[10px] text-zinc-300">
            <span className="font-semibold text-zinc-200">Control identifier</span>
            <span className="mb-0.5 block text-zinc-500">Specify the control ID (e.g., AC-1, PE-3).</span>
            <input
              name="controlId"
              value={controlId}
              onChange={(e) => setControlId(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-[12px] text-zinc-100"
              placeholder="AC-1"
            />
          </label>

          <label className="block text-[10px] text-zinc-300">
            <span className="font-semibold text-zinc-200">System owner</span>
            <span className="mb-0.5 block text-zinc-500">Assigned personnel (assignee id).</span>
            <input
              name="systemOwner"
              value={systemOwner}
              onChange={(e) => setSystemOwner(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-[12px] text-zinc-100"
              placeholder="Owner / assignee id"
            />
          </label>

          <label className="block text-[10px] text-zinc-300">
            <span className="font-semibold text-zinc-200">Source document hash (SHA-256)</span>
            <span className="mb-0.5 block text-zinc-500">
              Agent 5 (Ironscribe) — 64-character hex digest of the regulatory source document.
            </span>
            <input
              name="sourceDocumentHashSha256"
              value={sourceDocumentHashSha256}
              onChange={(e) => setSourceDocumentHashSha256(e.target.value.replace(/\s+/g, ""))}
              className={`mt-1 w-full rounded border bg-zinc-950 px-2 py-2 font-mono text-[11px] text-zinc-100 ${
                hashTrim.length > 0 && !hashValid ? "border-red-600 ring-1 ring-red-500/30" : "border-zinc-700"
              }`}
              placeholder="64 hex characters"
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <label className="block text-[10px] text-zinc-300">
            <span className="font-semibold text-zinc-200">Page reference</span>
            <span className="mb-0.5 block text-zinc-500">Printed page, PDF page #, or paragraph locator.</span>
            <input
              name="pageReference"
              value={pageReference}
              onChange={(e) => setPageReference(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-[12px] text-zinc-100"
              placeholder="e.g., PDF p. 14, section 2.3.1"
            />
          </label>

          <label className="block text-[10px] text-zinc-300">
            <span className="font-semibold text-zinc-200">Impact justification</span>
            <span className="mb-0.5 block text-zinc-500">Why is this a risk to the mission?</span>
            <textarea
              name="impactJustification"
              value={impactJustification}
              onChange={(e) => setImpactJustification(e.target.value)}
              rows={4}
              className="mt-1 w-full resize-y rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-[12px] text-zinc-100"
              placeholder="Operational impact, blast radius, regulatory exposure…"
            />
          </label>

          <label className="block text-[10px] text-zinc-300">
            <span className="font-semibold text-zinc-200">{GRC_GOLD_SENTINEL_SIGNATURE_LABEL}</span>
            <span className="mb-0.5 block text-zinc-500">
              Must match Security Profile: {profileLoading ? "loading…" : profileDisplayName}. Authorize commits a
              SHA-256 forensic seal over your attestation name, server timestamp, and issued risk id (governance hash
              column — not a name-only ledger field).
            </span>
            <input
              name="digitalSignature"
              value={digitalSignature}
              onChange={(e) => setDigitalSignature(e.target.value)}
              className={`mt-1 w-full rounded border bg-zinc-950 px-2 py-2 text-[12px] text-zinc-100 ${
                shadowDissent ||
                (digitalSignature.trim().length > 0 && !profileLoading && !signatureValid)
                  ? "border-red-600 ring-1 ring-red-500/40"
                  : "border-zinc-700"
              }`}
              placeholder={GRC_GOLD_SENTINEL_SIGNATURE_PLACEHOLDER}
              autoComplete="name"
            />
          </label>

          {formError ? <p className="text-[11px] text-red-400">{formError}</p> : null}

          <div className="mt-4 flex gap-2">
            <SubmitAuthorizeButton disabled={authorizeDisabled} />
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-zinc-600 px-3 py-2 text-[10px] font-bold uppercase text-zinc-400 hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SentinelSweepChecklist({ session }: { session: SentinelSweepSession | null }) {
  if (!session) return null;

  const { phase, items, error } = session;

  return (
    <div
      className="mt-3 rounded border border-zinc-700/80 bg-zinc-950/60 px-3 py-2"
      role="status"
      aria-live="polite"
      aria-busy={phase === "running"}
      data-testid="sentinel-sweep-checklist"
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-amber-200/90">
        Sentinel sweep readiness (read-only)
      </p>
      {phase === "running" ? (
        <p className="mt-1 text-[9px] text-zinc-500">Verifying spotlight agents against tenant session…</p>
      ) : null}
      {phase === "error" && error ? (
        <p className="mt-1 text-[10px] text-red-400">{error}</p>
      ) : null}
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <SentinelSweepChecklistRow key={item.agentIndex} item={item} />
          ))}
        </ul>
      ) : null}
      {phase === "complete" ? (
        <p className="mt-2 text-[9px] text-zinc-500">
          GRC preview below remains debounced; authorize is the only write path.
        </p>
      ) : null}
    </div>
  );
}

function SentinelSweepChecklistRow({ item }: { item: SentinelSweepCheckItem }) {
  const statusStyles =
    item.status === "PASS"
      ? "text-emerald-400 border-emerald-800/50"
      : item.status === "WARN"
        ? "text-amber-300 border-amber-800/50"
        : "text-red-400 border-red-800/50";

  return (
    <li className={`flex gap-2 rounded border px-2 py-1.5 text-[9px] ${statusStyles}`}>
      <span className="shrink-0 font-mono font-bold">
        {String(item.agentIndex).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold uppercase tracking-wide">
          {item.agentName}{" "}
          <span className="opacity-80">· {item.status}</span>
        </p>
        <p className="mt-0.5 leading-relaxed opacity-90">{item.detail}</p>
      </div>
    </li>
  );
}

function SubmitAuthorizeButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="flex-1 rounded bg-amber-500 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-black hover:bg-amber-400 disabled:opacity-50"
    >
      {pending ? "Authorizing…" : "AUTHORIZE AGENT ACTION"}
    </button>
  );
}
