"use client";

import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { Bot, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRiskStore, type PipelineThreat } from "@/app/store/riskStore";
import type { StreamAlert } from "@/app/hooks/useAlerts";
import type { TenantKey } from "@/app/utils/tenantIsolation";
import { appendAuditLog } from "@/app/utils/auditLogger";
import { rejectThreatAction } from "@/app/actions/threatActions";
import { useKimbotStore } from "@/app/store/kimbotStore";
import { useGrcBotStore } from "@/app/store/grcBotStore";
import { useAgentStore } from "@/app/store/agentStore";
import IngestionPanel from "@/app/components/IngestionPanel";
import { fetchActiveThreatsFromDb, fetchPipelineThreatsFromDb } from "@/app/actions/simulationActions";

type SupplyChainThreat = {
  vendorName: string;
  impact: string;
  severity: "CRITICAL";
  source: "Nth-Party Map";
  liabilityUsd: number;
};

type ThreatPipelineProps = {
  supplyChainThreat: SupplyChainThreat | null;
  showSocStream: boolean;
  onRemediateSupplyChainThreat?: (vendorName: string) => void;
  incomingAgentAlerts?: StreamAlert[];
  /** When provided, the page owns drawer state and passes the setter */
  setSelectedThreatId?: (id: string | null) => void;
};

const INDUSTRY_TO_ENTITY: Record<string, { entityKey: TenantKey; entityLabel: string }> = {
  Healthcare: { entityKey: "medshield", entityLabel: "MEDSHIELD" },
  Finance: { entityKey: "vaultbank", entityLabel: "VAULTBANK" },
  Energy: { entityKey: "gridcore", entityLabel: "GRIDCORE" },
  Technology: { entityKey: "medshield", entityLabel: "MEDSHIELD" },
  Defense: { entityKey: "gridcore", entityLabel: "GRIDCORE" },
};

const CURRENT_USER_ID = "Dereck";

const STAKEHOLDER_EMAIL_RECIPIENT = "blackwoodscoffee@gmail.com";

function sendStakeholderEmail(threat: PipelineThreat, notes: string[], liabilityM: number) {
  const notesText = notes.length > 0 ? notes.join(" | ") : "None";
  const template = `URGENT: GRC Event Registered. Threat: ${threat.name}, Liability: $${liabilityM.toFixed(
    1,
  )}M, Acknowledged By: ${CURRENT_USER_ID}, Notes: ${notesText}.`;

  // Hard-coded recipient; stage alert and log to Coreintel stream
  useAgentStore.getState().addStreamMessage(`> [SYSTEM] Stakeholder alert staged for ${STAKEHOLDER_EMAIL_RECIPIENT}.`);

  console.log("Mock sendStakeholderEmail", {
    to: STAKEHOLDER_EMAIL_RECIPIENT,
    body: template,
  });

  appendAuditLog({
    action_type: "EMAIL_SENT",
    log_type: "GRC",
    description: template,
  });
}

function PipelineThreatCard({
  threat,
  onActionSuccess,
  setSelectedThreatId: setSelectedThreatIdProp,
}: {
  threat: PipelineThreat;
  onActionSuccess?: () => void;
  setSelectedThreatId?: (id: string | null) => void;
}) {
  const storeSet = useRiskStore((s) => s.setSelectedThreatId);
  const setSelectedThreatId = setSelectedThreatIdProp ?? storeSet;
  const [justification, setJustification] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [deackReason, setDeackReason] = useState<string>("");
  const [likelihood, setLikelihood] = useState(threat.likelihood ?? 8);
  const [impact, setImpact] = useState(threat.impact ?? 9);

  const acknowledgeThreat = useRiskStore((s) => s.acknowledgeThreat);
  const deAcknowledgeThreat = useRiskStore((s) => s.deAcknowledgeThreat);
  const removeThreatFromPipeline = useRiskStore((s) => s.removeThreatFromPipeline);
  const updatePipelineThreat = useRiskStore((s) => s.updatePipelineThreat);
  const setThreatActionError = useRiskStore((s) => s.setThreatActionError);
  const activeIndustry = useRiskStore((s) => s.selectedIndustry);
  const activeTenant = useRiskStore((s) => s.selectedTenantName);

  useEffect(() => {
    setLikelihood(threat.likelihood ?? 8);
    setImpact(threat.impact ?? 9);
  }, [threat.likelihood, threat.impact]);

  const scoreM = threat.score ?? threat.loss;
  const entityKey = threat.industry ? (INDUSTRY_TO_ENTITY[threat.industry]?.entityKey ?? "medshield") : "medshield";
  const existingNotes = threat.notes ?? [];
  const scopeTag = `industry:${threat.industry ?? activeIndustry}|tenant:${activeTenant ?? "GLOBAL"}|threatId:${threat.id}`;

  const INHERENT_LIKELIHOOD = 8;
  const INHERENT_IMPACT = 9;
  const inherentScore = INHERENT_LIKELIHOOD * INHERENT_IMPACT;
  const residualScore = likelihood * impact;
  const hasResidualChange = residualScore !== inherentScore;

  let residualColorClass = "text-emerald-400";
  if (residualScore >= 30 && residualScore <= 70) {
    residualColorClass = "text-amber-400";
  } else if (residualScore > 70) {
    residualColorClass = "text-rose-500";
  }

  let severityLabelText: "MEDIUM" | "HIGH" | "CRITICAL";
  if (residualScore < 30) {
    severityLabelText = "MEDIUM";
  } else if (residualScore <= 70) {
    severityLabelText = "HIGH";
  } else {
    severityLabelText = "CRITICAL";
  }

  const handleScoreChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!Number.isNaN(v) && v >= 0) updatePipelineThreat(threat.id, { score: v });
  };

  const handleTargetChange = (e: ChangeEvent<HTMLInputElement>) => {
    updatePipelineThreat(threat.id, { target: e.target.value || undefined });
  };

  const handleLikelihoodChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number.parseInt(e.target.value || "0", 10);
    if (Number.isNaN(v)) return;
    const clamped = Math.min(10, Math.max(1, v));
    setLikelihood(clamped);
    updatePipelineThreat(threat.id, { likelihood: clamped });
  };

  const handleImpactChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number.parseInt(e.target.value || "0", 10);
    if (Number.isNaN(v)) return;
    const clamped = Math.min(10, Math.max(1, v));
    setImpact(clamped);
    updatePipelineThreat(threat.id, { impact: clamped });
  };

  const userNotesLen = noteDraft.trim().length;
  const justificationLen = justification.trim().length;

  const ackEnabled = userNotesLen >= 50;
  const deackEnabled =
    deackReason &&
    deackReason !== "Select Reason..." &&
    justificationLen >= 50;

  const handleAcknowledgeClick = async () => {
    if (!ackEnabled) return;

    setThreatActionError({ active: false, message: "" });

    const trimmedNote = noteDraft.trim();
    const newNotes = [...existingNotes];
    if (trimmedNote) newNotes.push(trimmedNote);

    updatePipelineThreat(threat.id, {
      notes: newNotes,
      userNotes: trimmedNote || undefined,
      lastTriageAction: "ACKNOWLEDGE",
      lifecycleState: "active",
      likelihood,
      impact,
      calculatedRiskScore: residualScore,
    });

    try {
      await acknowledgeThreat(threat.id, "admin-user-01");
      sendStakeholderEmail(threat, newNotes, scoreM);
      setJustification("");
      setNoteDraft("");
      setDeackReason("");
      onActionSuccess?.();
    } catch {
      updatePipelineThreat(threat.id, {
        lifecycleState: "pipeline",
        lastTriageAction: undefined,
      });
      appendAuditLog({
        action_type: "SYSTEM_WARNING",
        log_type: "GRC",
        description: `Acknowledge failed for threat: ${threat.name}`,
        metadata_tag: scopeTag,
        user_id: "admin-user-01",
      });
    }
  };

  const handleDeAcknowledgeClick = async () => {
    if (!deackEnabled) return;

    setThreatActionError({ active: false, message: "" });

    const trimmedNote = noteDraft.trim();
    const trimmedJustification = justification.trim();

    const newNotes = [...existingNotes];
    if (trimmedNote) newNotes.push(trimmedNote);
    newNotes.push(`Justification: ${trimmedJustification}`);
    newNotes.push(`Reason: ${deackReason}`);

    appendAuditLog({
      action_type: "GRC_DEACKNOWLEDGE_CLICK",
      log_type: "GRC",
      description: `De-acknowledged threat: ${threat.name}`,
      metadata_tag: [scopeTag, deackReason, trimmedJustification].filter(Boolean).join(" | "),
    });

    const prevLifecycle = threat.lifecycleState;
    const prevLastTriage = threat.lastTriageAction;

    updatePipelineThreat(threat.id, {
      notes: newNotes,
      lastTriageAction: "DEACKNOWLEDGE",
      deackReason,
    });

    const toast = {
      error: (message: string) => {
        setThreatActionError({ active: true, message });
      },
    };
    const onClose = () => {
      setSelectedThreatId(null);
    };
    const clearActiveThreat = () => {
      setSelectedThreatId(null);
    };

    // # GRC_ACTION_CHIPS — De-Ack: on success sync to audit store; on ghost/purged log SYSTEM_WARNING, close drawer
    try {
      const result = await deAcknowledgeThreat(threat.id, deackReason, trimmedJustification, "admin-user-01");
      if (!result.success) {
        updatePipelineThreat(threat.id, {
          lifecycleState: prevLifecycle ?? "pipeline",
          lastTriageAction: prevLastTriage,
        });
        toast.error("Action failed: Record no longer exists.");
        onClose();
        clearActiveThreat();
        return;
      }
      appendAuditLog({
        action_type: "STATE_REGRESSION",
        log_type: "GRC",
        description: "User reversed acknowledgment of risk.",
        metadata_tag: scopeTag,
        user_id: "admin-user-01",
      });
      setJustification("");
      setNoteDraft("");
      setDeackReason("");
      onActionSuccess?.();
    } catch {
      updatePipelineThreat(threat.id, {
        lifecycleState: prevLifecycle ?? "pipeline",
        lastTriageAction: prevLastTriage,
      });
      toast.error("Action failed: Record no longer exists.");
      appendAuditLog({
        action_type: "SYSTEM_WARNING",
        log_type: "GRC",
        description: "Attempted to modify a purged or non-existent record.",
        metadata_tag: scopeTag,
      });
      onClose();
      clearActiveThreat();
    }
  };

  // # GRC_ACTION_CHIPS — Reject: log RISK_REJECTED, remove from pipeline, sync to audit store
  const handleRejectClick = async () => {
    setThreatActionError({ active: false, message: "" });
    appendAuditLog({
      action_type: "RISK_REJECTED",
      log_type: "GRC",
      description: "User rejected risk ingestion/registration.",
      metadata_tag: scopeTag,
      user_id: "admin-user-01",
    });
    try {
      await rejectThreatAction(threat.id, "admin-user-01");
    } catch {
      // Server audit may fail (e.g. no DB); client log already appended
    }
    removeThreatFromPipeline(threat.id);
    setSelectedThreatId(null);
    onActionSuccess?.();
  };

  return (
    <div className="rounded border border-slate-700 bg-slate-900/60 overflow-hidden font-sans">
      <div className="p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                severityLabelText === "MEDIUM"
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                  : severityLabelText === "HIGH"
                  ? "bg-orange-500/10 border-orange-500/50 text-orange-300"
                  : "bg-red-500/10 border-red-500/60 text-red-300"
              }`}>
                {severityLabelText}
              </span>
              <Link
                href={`/threats/${threat.id}`}
                onClick={(e) => { e.preventDefault(); setSelectedThreatId(threat.id); }}
                className="text-base font-medium text-white hover:text-blue-200 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-900 rounded"
              >
                {threat.name}
              </Link>
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-slate-500">{threat.id}</p>
            <p className="mt-0.5 text-sm leading-tight text-slate-400">
              Source: {threat.source ?? "Strategic Intel"} · Sector: {threat.industry ?? "Healthcare"} · Target: {threat.target ?? "Core services"}
            </p>
            <p className="mt-1 text-sm leading-tight text-slate-400">
              {threat.description ?? `Inherent exposure of $${scoreM.toFixed(1)}M to the ${threat.industry ?? "Healthcare"} sector.`}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
              <span className="text-slate-400">Liability ($M)</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={scoreM}
                onChange={handleScoreChange}
                className="w-14 rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-right text-sm text-slate-200 outline-none focus:border-blue-500"
              />
              <span className="text-slate-400">Target</span>
              <input
                type="text"
                value={threat.target ?? ""}
                onChange={handleTargetChange}
                placeholder={threat.industry ?? "Target"}
                className="min-w-[80px] max-w-[140px] rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500"
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
              <span className="text-slate-400">Likelihood (1-10)</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLikelihood((prev) => Math.max(1, prev - 1))}
                  className="px-1 text-[10px] font-bold text-blue-500 hover:text-blue-400 active:text-white"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={likelihood}
                  onChange={handleLikelihoodChange}
                  className="w-10 appearance-none rounded border border-slate-600 bg-slate-800 px-1 py-0.5 text-center text-slate-200 outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setLikelihood((prev) => Math.min(10, prev + 1))}
                  className="px-1 text-[10px] font-bold text-blue-500 hover:text-blue-400 active:text-white"
                >
                  +
                </button>
              </div>
              <span className="text-slate-400">Impact (1-10)</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setImpact((prev) => Math.max(1, prev - 1))}
                  className="px-1 text-[10px] font-bold text-blue-500 hover:text-blue-400 active:text-white"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={impact}
                  onChange={handleImpactChange}
                  className="w-10 appearance-none rounded border border-slate-600 bg-slate-800 px-1 py-0.5 text-center text-slate-200 outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setImpact((prev) => Math.min(10, prev + 1))}
                  className="px-1 text-[10px] font-bold text-blue-500 hover:text-blue-400 active:text-white"
                >
                  +
                </button>
              </div>
              <span className="text-slate-400">Risk Score</span>
              {hasResidualChange ? (
                <span className="flex items-center gap-1 font-mono">
                  <span className="text-slate-500 line-through">{inherentScore}</span>
                  <span className={residualColorClass}>{residualScore}</span>
                </span>
              ) : (
                <span className="font-mono text-slate-300">{inherentScore}</span>
              )}
            </div>
          </div>
          <Link
            href={`/threats/${threat.id}`}
            onClick={(e) => { e.preventDefault(); setSelectedThreatId(threat.id); }}
            className="shrink-0 inline-flex items-center gap-1.5 rounded border border-slate-600 bg-slate-800/80 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-200 transition-colors hover:border-blue-500/60 hover:bg-blue-500/10 hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-900"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            View Details
          </Link>
        </div>

        {/* Triage title (top) */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
          <span className="text-slate-400 uppercase font-bold">Triage</span>
        </div>

        {/* User Notes (top of interaction zone) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-300">User Notes</label>
          <textarea
            rows={4}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Capture operator notes before acknowledging the threat..."
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[14px] text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
          />
          <div className="flex justify-between text-[9px] text-slate-500">
            <span>Minimum 50 characters required to Acknowledge.</span>
            <span>{userNotesLen}/50 min</span>
          </div>
        </div>

        {/* ACK chip */}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
          <button
            type="button"
            disabled={!ackEnabled}
            onClick={handleAcknowledgeClick}
            className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wide border ${
              ackEnabled
                ? "border-emerald-500/70 bg-slate-900 text-emerald-400 hover:bg-emerald-500/10"
                : "border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed"
            }`}
          >
            Acknowledged
          </button>
        </div>

        {/* Justification + Reason */}
        <div className="mt-1.5 flex flex-row items-center gap-4 text-[10px]">
          <select
            value={deackReason || "Select Reason..."}
            onChange={(e) => setDeackReason(e.target.value)}
            className="h-7 rounded border border-rose-500/60 bg-slate-950/80 px-2 text-[9px] text-rose-200 focus:border-rose-300 focus:outline-none"
          >
            <option value="Select Reason..." disabled>
              Select Reason...
            </option>
            <option value="False Positive">False Positive</option>
            <option value="Compensating Control">Compensating Control</option>
            <option value="Acceptable Risk">Acceptable Risk</option>
          </select>
          <input
            type="text"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Provide mandatory justification to de-acknowledge..."
            className="min-w-[140px] flex-1 rounded border border-rose-500/70 bg-slate-950 px-2 py-1 text-[10px] text-slate-100 placeholder:text-slate-500 outline-none focus:border-rose-400"
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500">
          <span>Reason + 50 characters required to De-acknowledge.</span>
          <span>{justificationLen}/50 min</span>
        </div>

        {/* DE-ACK chip below justification */}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
          <button
            type="button"
            disabled={!deackEnabled}
            onClick={handleDeAcknowledgeClick}
            className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wide border ${
              deackEnabled
                ? "border-rose-500/70 bg-slate-900 text-rose-300 hover:bg-rose-500/10"
                : "border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed"
            }`}
          >
            De-Acknowledged
          </button>
          {/* # GRC_ACTION_CHIPS — Reject risk ingestion/registration */}
          <button
            type="button"
            onClick={handleRejectClick}
            className="rounded-full px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wide border border-slate-500/70 bg-slate-900 text-slate-300 hover:bg-slate-500/10"
          >
            Reject
          </button>
        </div>

        <div className="mt-1 flex items-center justify-between pt-1">
          <div className="text-[9px] text-slate-500">
            {existingNotes.length > 0 && <span>{existingNotes.length} note{existingNotes.length > 1 ? "s" : ""} on file</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThreatPipeline({
  supplyChainThreat,
  showSocStream,
  onRemediateSupplyChainThreat,
  incomingAgentAlerts = [],
  setSelectedThreatId: setSelectedThreatIdProp,
}: ThreatPipelineProps) {
  const router = useRouter();
  const storeSetSelectedThreatId = useRiskStore((s) => s.setSelectedThreatId);
  const setSelectedThreatId = setSelectedThreatIdProp ?? storeSetSelectedThreatId;
  const pipelineThreats = useRiskStore((s) => s.pipelineThreats);
  const activeThreats = useRiskStore((s) => s.activeThreats);
  const upsertPipelineThreat = useRiskStore((s) => s.upsertPipelineThreat);
  const replacePipelineThreats = useRiskStore((s) => s.replacePipelineThreats);
  const replaceActiveThreats = useRiskStore((s) => s.replaceActiveThreats);
  const removeGhostThreats = useRiskStore((s) => s.removeGhostThreats);
  const setRecordExpiredToast = useRiskStore((s) => s.setRecordExpiredToast);
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const setLiabilityAlert = useRiskStore((s) => s.setLiabilityAlert);
  const liabilityAlert = useRiskStore((s) => s.liabilityAlert);
  const setLiveMonitoringCount = useRiskStore((s) => s.setLiveMonitoringCount);
  const highLiabilityFirstSeenRef = useRef<Map<string, number>>(new Map());
  const injectedSignals = useKimbotStore((s) => s.injectedSignals);
  const removeInjectedSignal = useKimbotStore((s) => s.removeInjectedSignal);
  const kimbotEnabled = useKimbotStore((s) => s.enabled);
  const grcBotEnabled = useGrcBotStore((s) => s.enabled);
  const enginesOn = kimbotEnabled || grcBotEnabled;
  const [showManualRiskForm, setShowManualRiskForm] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualSource, setManualSource] = useState("");
  const [manualTarget, setManualTarget] = useState("Healthcare");
  const [manualLoss, setManualLoss] = useState("4.0");
  const [manualDescription, setManualDescription] = useState("");
  const [riskSearchQuery, setRiskSearchQuery] = useState("");
  const [ingestionSearchQuery, setIngestionSearchQuery] = useState("");

  type RawSignalSeverity = "MEDIUM" | "HIGH" | "CRITICAL";

  type RawSignal = {
    id: string;
    title: string;
    source: "SOC_EMAIL" | "AGENT_NOTICE";
    severity: RawSignalSeverity;
    severityScore: number;
    liability: number;
    agentScore?: number;
    description: string;
    targetSector?: string;
  };

  const [rawSignals, setRawSignals] = useState<RawSignal[]>([]);

  const [removedSignalIds, setRemovedSignalIds] = useState<Set<string>>(new Set());

  const severityChipClasses: Record<RawSignalSeverity, string> = {
    MEDIUM: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    HIGH: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    CRITICAL: "bg-red-500/15 text-red-300 border-red-500/60",
  };

  const severityLabel: Record<RawSignalSeverity, string> = {
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
  };

  // # DATA_PERSISTENCE_FILTER — derive per-industry/tenant pipeline view from master pipelineThreats (store arrays stay untouched)
  const riskSearchLower = riskSearchQuery.trim().toLowerCase();
  const filteredRisks = pipelineThreats.filter((t) => {
    const isSimulationThreat = (t.source?.toUpperCase().includes("SIMULATION") ?? false);
    const matchesIndustry =
      isSimulationThreat || !selectedIndustry || !t.industry || t.industry === selectedIndustry;
    const matchesTenant =
      !selectedTenantName || (t.target ?? "") === selectedTenantName;
    return matchesIndustry && matchesTenant;
  });
  const visiblePipelineThreats = riskSearchLower
    ? filteredRisks.filter((t) => {
        const id = t.id?.toLowerCase() ?? "";
        const name = t.name?.toLowerCase() ?? "";
        const desc = t.description?.toLowerCase() ?? "";
        const industry = t.industry?.toLowerCase() ?? "";
        const source = t.source?.toLowerCase() ?? "";
        const target = (t.target as string | undefined)?.toLowerCase() ?? "";
        return (
          id.includes(riskSearchLower) ||
          name.includes(riskSearchLower) ||
          desc.includes(riskSearchLower) ||
          industry.includes(riskSearchLower) ||
          source.includes(riskSearchLower) ||
          target.includes(riskSearchLower)
        );
      })
    : filteredRisks;

  const handleIngestSignal = (signal: RawSignal) => {
    const pipelineThreat: PipelineThreat = {
      id: signal.id,
      name: signal.title,
      loss: signal.liability,
      score: signal.liability,
      industry: signal.targetSector ?? "Healthcare",
      source: signal.source === "SOC_EMAIL" ? "SOC Email Intel" : "Agent Notice",
      calculatedRiskScore: signal.agentScore ?? signal.severityScore,
      description: `${signal.description} · Liability: $${signal.liability.toFixed(1)}M${
        signal.agentScore !== undefined ? ` · Agent Score: ${signal.agentScore}` : ` · Severity Score: ${signal.severityScore}`
      }`,
    };

    upsertPipelineThreat(pipelineThreat);

    const sector = signal.targetSector ?? "Healthcare";
    appendAuditLog({
      action_type: "GRC_PROCESS_THREAT",
      log_type: "GRC",
      description: `INGEST raw signal into RISK INGESTION: ${signal.title} (${signal.source})`,
      metadata_tag: `sector:${sector} | liability:$${signal.liability.toFixed(1)}M | severity:${signal.severity}(${signal.severityScore})${
        signal.agentScore !== undefined ? ` | agentScore:${signal.agentScore}` : ""
      }`,
    });

    highLiabilityFirstSeenRef.current.delete(signal.id);
    if (liabilityAlert.signalId === signal.id) setLiabilityAlert({ active: false });
    setRemovedSignalIds((prev) => new Set(prev).add(signal.id));
    setRawSignals((prev) => prev.filter((s) => s.id !== signal.id));
    if (signal.id.startsWith("kimbot-")) removeInjectedSignal(signal.id);
  };

  const handleDismissSignal = (signal: RawSignal) => {
    const justification = window.prompt(
      `Provide justification to dismiss raw signal:\n\n"${signal.title}"`,
    );
    const trimmed = (justification ?? "").trim();
    if (!trimmed) return;

    const sector = signal.targetSector ?? "Healthcare";
    appendAuditLog({
      action_type: "GRC_DEACKNOWLEDGE_CLICK",
      log_type: "GRC",
      description: `DISMISS raw signal from ingestion queue: ${signal.title} (${signal.source})`,
      metadata_tag: `sector:${sector} | ${trimmed}`,
    });

    highLiabilityFirstSeenRef.current.delete(signal.id);
    if (liabilityAlert.signalId === signal.id) setLiabilityAlert({ active: false });
    setRemovedSignalIds((prev) => new Set(prev).add(signal.id));
    setRawSignals((prev) => prev.filter((s) => s.id !== signal.id));
    if (signal.id.startsWith("kimbot-")) removeInjectedSignal(signal.id);
  };

  const handleManualRiskRegister = () => {
    const title = manualTitle.trim();
    if (!title) return;
    const parsedLoss = Number.parseFloat(manualLoss);
    const loss = Number.isFinite(parsedLoss) && parsedLoss > 0 ? parsedLoss : 1.0;

    upsertPipelineThreat({
      id: `manual-${Date.now()}`,
      name: title,
      loss,
      score: loss,
      industry: manualTarget || "Healthcare",
      target: manualTarget || undefined,
      source: manualSource || "Manual Analyst Entry",
      description: manualDescription.trim()
        ? `Source: ${manualSource || "Manual Analyst Entry"} · ${manualDescription.trim()}`
        : `Source: ${manualSource || "Manual Analyst Entry"}`,
    });

    appendAuditLog({
      action_type: "GRC_PROCESS_THREAT",
      log_type: "GRC",
      description: `MANUAL RISK REGISTRATION: ${title}`,
    });

    setManualTitle("");
    setManualSource("");
    setManualTarget("Healthcare");
    setManualLoss("4.0");
    setManualDescription("");
    setShowManualRiskForm(false);
  };

  const agentSignalsFromSidebar: RawSignal[] = incomingAgentAlerts
    .filter((alert) => alert.status === "OPEN")
    .map((alert) => ({
      id: `center-${alert.id}`,
      title: alert.title,
      source: "AGENT_NOTICE",
      severity:
        alert.severityScore >= 80
          ? "CRITICAL"
          : alert.severityScore >= 40
          ? "HIGH"
          : "MEDIUM",
      severityScore: alert.severityScore,
      liability: alert.liabilityUsd / 1_000_000,
      agentScore: alert.severityScore,
      description: alert.impact,
      targetSector: alert.sector,
    }));

  // When engines (KIMBOT/GRCBOT) are off, exclude injected signals so RAW SIGNAL INGESTION stays a clean slate
  const mergedSignals = [
    ...agentSignalsFromSidebar,
    ...rawSignals,
    ...(enginesOn ? injectedSignals : []),
  ].filter(
    (s) => !removedSignalIds.has(s.id),
  );

  // Sync LIVE MONITORING pulse: rawSignals + injectedSignals + active high-priority pipeline alerts
  const highPriorityPipelineCount = pipelineThreats.filter(
    (t) => (t.score ?? t.loss) >= 7,
  ).length;
  const displayInjectedCount = enginesOn ? injectedSignals.length : 0;
  useEffect(() => {
    const total = rawSignals.length + displayInjectedCount + highPriorityPipelineCount;
    setLiveMonitoringCount(total);
  }, [rawSignals.length, displayInjectedCount, highPriorityPipelineCount, setLiveMonitoringCount]);

  const industryFilteredSignals = mergedSignals.filter(
    (s) => !s.targetSector || s.targetSector === selectedIndustry,
  );

  const ingestionSearchLower = ingestionSearchQuery.trim().toLowerCase();
  const ingestionFilteredSignals = ingestionSearchLower
    ? industryFilteredSignals.filter((signal) => {
        const id = signal.id.toLowerCase();
        const title = signal.title.toLowerCase();
        const description = signal.description.toLowerCase();
        return (
          id.includes(ingestionSearchLower) ||
          title.includes(ingestionSearchLower) ||
          description.includes(ingestionSearchLower)
        );
      })
    : industryFilteredSignals;

  const sortedAlerts = [...ingestionFilteredSignals].sort(
    (a, b) => b.liability - a.liability || b.severityScore - a.severityScore,
  );
  const agentAlerts = [...sortedAlerts]
    .filter((alert) => alert.source === "AGENT_NOTICE")
    .sort((a, b) => b.liability - a.liability || b.severityScore - a.severityScore);
  const socAlerts = sortedAlerts.filter((alert) => alert.source === "SOC_EMAIL");

  const FIFTEEN_MIN_MS = 15 * 60 * 1000;
  useEffect(() => {
    const now = Date.now();
    const map = highLiabilityFirstSeenRef.current;
    for (const signal of agentAlerts) {
      if (signal.liability <= 10) continue;
      const key = signal.id;
      if (!map.has(key)) map.set(key, now);
      else if (now - map.get(key)! >= FIFTEEN_MIN_MS) {
        setLiabilityAlert({
          active: true,
          message: `High-liability agent signal ($${signal.liability.toFixed(1)}M) has been un-ingested for over 15 minutes. Triage required.`,
          signalId: key,
        });
        break;
      }
    }
  }, [agentAlerts, setLiabilityAlert]);

  // UI refresh: load pipeline from DB on mount and when grcbot stops so every card is real and actionable
  const prevGrcBotEnabled = useRef(grcBotEnabled);
  useEffect(() => {
    let cancelled = false;
    const syncFromDb = () =>
      fetchPipelineThreatsFromDb()
        .then((rows) => {
          if (!cancelled) {
            const asPipeline: PipelineThreat[] = rows.map((r) => ({
              id: r.id,
              name: r.name,
              loss: r.loss,
              score: r.score,
              industry: r.industry,
              source: r.source,
              description: r.description,
            }));
            replacePipelineThreats(asPipeline);
          }
        })
        .catch(() => {});
    const syncActiveFromDb = () =>
      fetchActiveThreatsFromDb()
        .then((rows) => {
          if (!cancelled) {
            const asActive: PipelineThreat[] = rows.map((r) => ({
              id: r.id,
              name: r.name,
              loss: r.loss,
              score: r.score,
              industry: r.industry,
              source: r.source,
              description: r.description,
              lifecycleState: "active",
            }));
            replaceActiveThreats(asActive);
          }
        })
        .catch(() => {});
    syncFromDb();
    syncActiveFromDb();
    return () => { cancelled = true; };
  }, [replacePipelineThreats, replaceActiveThreats]);

  useEffect(() => {
    if (prevGrcBotEnabled.current && !grcBotEnabled) {
      fetchPipelineThreatsFromDb()
        .then((rows) => {
          const asPipeline: PipelineThreat[] = rows.map((r) => ({
            id: r.id,
            name: r.name,
            loss: r.loss,
            score: r.score,
            industry: r.industry,
            source: r.source,
            description: r.description,
          }));
          replacePipelineThreats(asPipeline);
        })
        .catch(() => {});
      fetchActiveThreatsFromDb()
        .then((rows) => {
          const asActive: PipelineThreat[] = rows.map((r) => ({
            id: r.id,
            name: r.name,
            loss: r.loss,
            score: r.score,
            industry: r.industry,
            source: r.source,
            description: r.description,
            lifecycleState: "active",
          }));
          replaceActiveThreats(asActive);
        })
        .catch(() => {});
    }
    prevGrcBotEnabled.current = grcBotEnabled;
  }, [grcBotEnabled, replacePipelineThreats, replaceActiveThreats]);

  // Sync & Reconcile: periodically validate card IDs against DB and remove ghosts
  const SYNC_RECONCILE_INTERVAL_MS = 60 * 1000;
  useEffect(() => {
    function isDbBackedId(id: string): boolean {
      if (/^\d+$/.test(id) || /^(?:center-)?risk-\d+$/.test(id)) return true;
      if (id.length >= 20 && id.length <= 30 && /^c[a-z0-9]+$/i.test(id)) return true;
      return false;
    }

    async function runSync() {
      const allIds = [
        ...pipelineThreats.map((t) => t.id),
        ...activeThreats.map((t) => t.id),
      ];
      const toValidate = [...new Set(allIds)].filter(isDbBackedId);
      if (toValidate.length === 0) return;

      try {
        const res = await fetch("/api/threats/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: toValidate }),
        });
        const data = (await res.json()) as { validIds?: string[] };
        const validSet = new Set(data.validIds ?? []);
        const ghostIds = toValidate.filter((id) => !validSet.has(id));
        if (ghostIds.length > 0) {
          removeGhostThreats(ghostIds);
          setRecordExpiredToast({ active: true, count: ghostIds.length });
        }
      } catch (_) {
        // Network or server error; skip this cycle
      }
    }

    runSync();
    const interval = setInterval(runSync, SYNC_RECONCILE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pipelineThreats, activeThreats, removeGhostThreats, setRecordExpiredToast]);

  return (
    <section className="border-b border-slate-800 bg-slate-900/50 px-4 py-6 font-sans">
      <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-white font-sans">RISK INGESTION</h2>
      </div>
      <IngestionPanel>
      {/* Three ingestion paths: (1) RISK INGESTION = AGENT STREAM + SOC EMAIL here; (2) Top Sector Threats = Strategic Intel sidebar; (3) RISK REGISTRATION = manual entry + cards for review (moved from 1 and 2). */}
      <div className="space-y-3">
        {/* RISK INGESTION: raw signals / agent stream / SOC */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">RAW SIGNAL INGESTION</p>
          <input
            type="search"
            value={ingestionSearchQuery}
            onChange={(e) => setIngestionSearchQuery(e.target.value)}
            placeholder="Search ingestion by name or ID..."
            className="w-full rounded border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Search ingestion"
          />
          {sortedAlerts.length === 0 ? (
            <div className="rounded border border-slate-800 bg-slate-950/40 p-4 text-center font-sans text-sm text-slate-500">
              [ WAITING FOR INGESTION STREAM... ]
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">AGENT STREAM</p>
                  <span className="rounded border border-slate-700 bg-slate-900/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-300">
                    {agentAlerts.length} cards
                  </span>
                </div>
                {agentAlerts.length === 0 ? (
                  <div className="rounded border border-slate-800 bg-slate-950/40 p-4 text-center font-sans text-sm text-slate-500">
                    [ WAITING FOR INGESTION STREAM... ]
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {agentAlerts.slice(0, 1).map((signal) => (
                    <div
                      key={signal.id}
                      className={`rounded border bg-slate-950/70 p-3 font-sans text-[10px] text-slate-200 ${
                        signal.liability > 10
                          ? "animate-pulse border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                          : "border-slate-800"
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-row items-center gap-3">
                            <p className="text-base font-medium text-white">{signal.title}</p>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${severityChipClasses[signal.severity]}`}
                            >
                              {severityLabel[signal.severity]}
                            </span>
                          </div>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-500">{signal.id}</p>
                          <p className="mt-0.5 text-sm leading-tight text-slate-400">
                            Source: <span className="font-medium text-slate-200">Agent Notice</span>
                          </p>
                          <p className="mt-1 text-sm leading-tight text-slate-400">{signal.description}</p>
                          <p className="mt-1 text-[10px] leading-tight text-slate-400">
                            Liability: <span className="text-slate-200">${signal.liability.toFixed(1)}M</span>
                            {" · "}
                            Severity Score: <span className="text-slate-200">{signal.severityScore}</span>
                            {signal.agentScore !== undefined && (
                              <>
                                {" · "}Agent Score: <span className="text-slate-200">{signal.agentScore}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-row flex-wrap items-center justify-end gap-2 border-t border-slate-800 pt-2">
                          <button
                            type="button"
                            onClick={() => handleIngestSignal(signal)}
                            className="rounded-full border border-emerald-500/70 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/25"
                          >
                            Ingest
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDismissSignal(signal)}
                            className="rounded-full border border-rose-500/70 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-200 hover:bg-rose-500/20"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">SOC EMAIL</p>
                  <span className="rounded border border-slate-700 bg-slate-900/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-300">
                    {socAlerts.length} cards
                  </span>
                </div>
                {socAlerts.length === 0 ? (
                  <div className="rounded border border-slate-800 bg-slate-950/40 p-4 text-center font-sans text-sm text-slate-500">
                    [ WAITING FOR INGESTION STREAM... ]
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {socAlerts.map((signal) => (
                    <div
                      key={signal.id}
                      className={`rounded border bg-slate-950/70 p-3 font-sans text-[10px] text-slate-200 ${
                        signal.liability > 10
                          ? "animate-pulse border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                          : "border-slate-800"
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-row items-center gap-3">
                            <p className="text-base font-medium text-white">{signal.title}</p>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${severityChipClasses[signal.severity]}`}
                            >
                              {severityLabel[signal.severity]}
                            </span>
                          </div>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-500">{signal.id}</p>
                          <p className="mt-0.5 text-sm leading-tight text-slate-400">
                            Source: <span className="font-medium text-slate-200">SOC Email Intel</span>
                          </p>
                          <p className="mt-1 text-sm leading-tight text-slate-400">{signal.description}</p>
                          <p className="mt-1 text-[10px] leading-tight text-slate-400">
                            Liability: <span className="text-slate-200">${signal.liability.toFixed(1)}M</span>
                            {" · "}
                            Severity Score: <span className="text-slate-200">{signal.severityScore}</span>
                          </p>
                        </div>
                        <div className="flex flex-row flex-wrap items-center justify-end gap-2 border-t border-slate-800 pt-2">
                          <button
                            type="button"
                            onClick={() => handleIngestSignal(signal)}
                            className="rounded-full border border-emerald-500/70 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/25"
                          >
                            Ingest
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDismissSignal(signal)}
                            className="rounded-full border border-rose-500/70 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-200 hover:bg-rose-500/20"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RISK REGISTRATION: manual entry */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white font-sans">RISK REGISTRATION</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="search"
              value={riskSearchQuery}
              onChange={(e) => setRiskSearchQuery(e.target.value)}
              placeholder="Search registered risks by title, sector, source, or notes…"
              className="w-full rounded border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Search registered risks"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowManualRiskForm((v) => !v)}
                className="rounded-full border border-blue-500/70 bg-blue-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-200 hover:bg-blue-500/25"
              >
                Manual Risk REGISTRATION
              </button>
            </div>
          </div>
          {showManualRiskForm ? (
            <div className="rounded border border-slate-800 bg-slate-950/70 p-3 text-[10px]">
              <p className="mb-2 font-bold uppercase tracking-wide text-slate-300">Manual Risk Entry</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Risk title"
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value)}
                  placeholder="Source agent / analyst"
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={manualTarget}
                  onChange={(e) => setManualTarget(e.target.value)}
                  placeholder="Target sector/entity"
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={manualLoss}
                  onChange={(e) => setManualLoss(e.target.value)}
                  placeholder="Inherent risk ($M)"
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
              <textarea
                rows={3}
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="Risk details / context"
                className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-blue-500"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualRiskForm(false)}
                  className="rounded border border-slate-600 bg-slate-900 px-3 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManualRiskRegister}
                  className="rounded border border-emerald-500/70 bg-emerald-500/15 px-3 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-200"
                >
                  Register
                </button>
              </div>
            </div>
          ) : pipelineThreats.length === 0 ? (
            <div className="rounded border border-slate-800 bg-slate-950/40 p-4 text-center font-sans text-sm text-slate-500">
              [ WAITING FOR TRIAGE SELECTIONS... ]
            </div>
          ) : null}
          {pipelineThreats.length > 0 && visiblePipelineThreats.length === 0 ? (
            <div className="rounded border border-slate-800 bg-slate-950/40 p-4 text-center font-sans text-sm text-slate-500">
              [ NO MATCHING RISKS FOR SEARCH… ]
            </div>
          ) : null}
          {visiblePipelineThreats.length > 0 ? (
            <div className="space-y-2">
              {visiblePipelineThreats.map((threat) => (
                <PipelineThreatCard
                  key={threat.id}
                  threat={threat}
                  onActionSuccess={() => router.refresh()}
                  setSelectedThreatId={setSelectedThreatId}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      </IngestionPanel>

        {supplyChainThreat && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">SUPPLY CHAIN ALERT</p>
              <button
                type="button"
                onClick={() => {
                  onRemediateSupplyChainThreat?.(supplyChainThreat.vendorName);
                  router.push("/medshield/playbooks");
                }}
                className="rounded border border-blue-500/70 bg-blue-500/15 px-3 py-1 text-[10px] font-bold uppercase text-blue-200"
              >
                REMEDIATE
              </button>
            </div>

            <div className="rounded border border-slate-800 border-l-2 border-l-red-500 bg-slate-950/70 p-2 font-sans">
              <div className="flex items-start gap-2">
                <Bot className="mt-0.5 h-4 w-4 text-slate-300" />
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-white">Nth-Party Breach Detected: {supplyChainThreat.vendorName}</span>
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">SUPPLY CHAIN</span>
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">CRITICAL ENTITY</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{supplyChainThreat.impact}</p>
                  <p className="mt-1 text-[10px] text-slate-400">Source: {supplyChainThreat.source} | Liability: ${supplyChainThreat.liabilityUsd.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
    </section>
  );
}