"use client";

import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { Bot, ExternalLink, Skull } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRiskStore, type PipelineThreat } from "@/app/store/riskStore";
import type { StreamAlert } from "@/app/hooks/useAlerts";
import type { TenantKey } from "@/app/utils/tenantIsolation";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { appendAuditLog } from "@/app/utils/auditLogger";
import { useAgentStore } from "@/app/store/agentStore";
import { useKimbotStore } from "@/app/store/kimbotStore";
import { useGrcBotStore } from "@/app/store/grcBotStore";
import IngestionPanel from "@/app/components/IngestionPanel";
import { fetchActiveThreatsFromDb, fetchPipelineThreatsFromDb } from "@/app/actions/simulationActions";
import { mapActiveThreatFromDbToPipelineThreat } from "@/app/utils/mapActiveThreatFromDbToPipelineThreat";

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

/** Resolve selectedTenantName (UI) to tenant UUID for Irongate. Default: medshield. */
function resolveTenantId(selectedTenantName: string | null): string {
  const n = (selectedTenantName ?? '').trim().toLowerCase();
  if (n === 'vaultbank') return TENANT_UUIDS.vaultbank;
  if (n === 'gridcore') return TENANT_UUIDS.gridcore;
  return TENANT_UUIDS.medshield;
}

function centsStringToMillionsInput(centsString: string): string {
  const trimmed = centsString.trim();
  if (!/^-?\d+$/.test(trimmed)) return "0.0";
  const cents = BigInt(trimmed);
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const wholeMillions = abs / 100_000_000n;
  const remainder = abs % 100_000_000n;
  const tenths = (remainder * 10n) / 100_000_000n;
  return `${negative ? "-" : ""}${wholeMillions.toString()}.${tenths.toString()}`;
}

const CURRENT_USER_ID = "Dereck";

const STAKEHOLDER_EMAIL_RECIPIENT = "blackwoodscoffee@gmail.com";

/** Strategic Intel "Top Sector Threats" — pipeline `source` / DB `sourceAgent`; GRC box pre-filled with this text. */
const TOP_SECTOR_SOURCE_LABEL = "Top Sector Threats";
const TOP_SECTOR_JUSTIFICATION_TEXT = "Top Sector Threat";

function isTopSectorPipelineThreat(threat: PipelineThreat): boolean {
  const src = (threat.source ?? "").trim();
  if (src === TOP_SECTOR_SOURCE_LABEL) return true;
  const agent = (threat as { sourceAgent?: string }).sourceAgent?.trim() ?? "";
  return agent === TOP_SECTOR_SOURCE_LABEL;
}

/** Manual Risk Entry source field — matches Strategic Intel sidebar profiles. */
const STRATEGIC_INTEL_PROFILE_SOURCE = "Strategic Intel Profile";

function isManualTopSectorIntelSource(source: string): boolean {
  const s = source.trim();
  return s === TOP_SECTOR_SOURCE_LABEL || s === STRATEGIC_INTEL_PROFILE_SOURCE;
}

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
  /** Singular pipeline intake field — submitted to acknowledgeThreat / workNoteSchema. */
  const isTopSectorThreat = isTopSectorPipelineThreat(threat);
  const [grcJustification, setGrcJustification] = useState(() =>
    isTopSectorThreat ? TOP_SECTOR_JUSTIFICATION_TEXT : "",
  );
  const [ackPending, setAckPending] = useState(false);
  const [assignedTo, setAssignedTo] = useState("unassigned");
  const [likelihood, setLikelihood] = useState(threat.likelihood ?? 8);
  const [impact, setImpact] = useState(threat.impact ?? 9);
  const currentUser = "dereck";

  // Time-to-Triage: starts when card mounts, stops on Acknowledge
  const startedAtRef = useRef<number>(Date.now());
  const [tttSeconds, setTttSeconds] = useState(0);
  const [tttStopped, setTttStopped] = useState(false);

  useEffect(() => {
    if (tttStopped) return;
    const tick = () => setTttSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tttStopped]);

  const acknowledgeThreat = useRiskStore((s) => s.acknowledgeThreat);
  const updatePipelineThreat = useRiskStore((s) => s.updatePipelineThreat);
  const setThreatActionError = useRiskStore((s) => s.setThreatActionError);
  const activeIndustry = useRiskStore((s) => s.selectedIndustry);
  const activeTenant = useRiskStore((s) => s.selectedTenantName);
  const kimbotAttackQueueCount = useKimbotStore((s) => s.injectedSignals.length);

  useEffect(() => {
    setLikelihood(threat.likelihood ?? 8);
    setImpact(threat.impact ?? 9);
  }, [threat.likelihood, threat.impact]);

  const scoreM = threat.score ?? threat.loss;
  const isKimbotThreat =
    (threat.source ?? "").toUpperCase() === "KIMBOT" || (threat.name ?? "").startsWith("[KIMBOT]");
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

  const tttDisplay = (() => {
    const m = Math.floor(tttSeconds / 60);
    const s = tttSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}s`;
  })();

  let severityLabelText: "MEDIUM" | "HIGH" | "CRITICAL";
  if (residualScore < 30) {
    severityLabelText = "MEDIUM";
  } else if (residualScore <= 70) {
    severityLabelText = "HIGH";
  } else {
    severityLabelText = "CRITICAL";
  }

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

  const adjustLikelihood = (delta: number) => {
    const next = Math.min(10, Math.max(1, (likelihood ?? 8) + delta));
    setLikelihood(next);
    updatePipelineThreat(threat.id, { likelihood: next });
  };

  const adjustImpact = (delta: number) => {
    const next = Math.min(10, Math.max(1, (impact ?? 9) + delta));
    setImpact(next);
    updatePipelineThreat(threat.id, { impact: next });
  };

  const grcTrimmed = grcJustification.trim();
  const grcAckLen = grcTrimmed.length;
  const ackRequirementsMet =
    grcAckLen >= 50 ||
    (isTopSectorThreat && grcTrimmed === TOP_SECTOR_JUSTIFICATION_TEXT);

  const ackEnabled = true;

  const handleAcknowledgeClick = async () => {
    if (!ackEnabled || ackPending) return;

    setAckPending(true);
    setThreatActionError({ active: false, message: "" });
    setTttStopped(true);
    const timeToTriageSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const operatorId = "admin-user-01";

    updatePipelineThreat(threat.id, {
      lastTriageAction: "ACKNOWLEDGE",
      lifecycleState: "active",
      likelihood,
      impact,
      calculatedRiskScore: residualScore,
    });

    try {
      const workNotePayload = grcTrimmed;

      await acknowledgeThreat(
        threat.id,
        operatorId,
        workNotePayload,
        resolveTenantId(activeTenant)
      );
      const err = useRiskStore.getState().threatActionError;
      if (err.active && err.message) {
        updatePipelineThreat(threat.id, {
          lifecycleState: "pipeline",
          lastTriageAction: undefined,
        });
        appendAuditLog({
          action_type: "SYSTEM_WARNING",
          log_type: "GRC",
          description: `Acknowledge failed for threat: ${threat.name}`,
          metadata_tag: scopeTag,
          user_id: operatorId,
        });
        return;
      }
      sendStakeholderEmail(threat, existingNotes, scoreM);
      appendAuditLog({
        action_type: "TIME_TO_TRIAGE",
        log_type: "GRC",
        description: `Threat ${threat.id} (${threat.name}) acknowledged. Time-to-Triage: ${timeToTriageSeconds}s`,
        metadata_tag: `${scopeTag}|TTT:${timeToTriageSeconds}s`,
        user_id: operatorId,
      });
      setGrcJustification("");
      onActionSuccess?.();
    } catch (error) {
      updatePipelineThreat(threat.id, {
        lifecycleState: "pipeline",
        lastTriageAction: undefined,
      });
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Acknowledge failed. Please check GRC requirements and try again.";
      setThreatActionError({ active: true, message });
      appendAuditLog({
        action_type: "SYSTEM_WARNING",
        log_type: "GRC",
        description: `Acknowledge failed for threat: ${threat.name}`,
        metadata_tag: scopeTag,
        user_id: "admin-user-01",
      });
    } finally {
      setAckPending(false);
    }
  };

  const liabilityMillions = threat.loss ?? threat.score ?? 0;
  const sectorKeys = Object.keys(INDUSTRY_TO_ENTITY) as Array<keyof typeof INDUSTRY_TO_ENTITY>;
  const selectedSector = (threat.industry && sectorKeys.includes(threat.industry as keyof typeof INDUSTRY_TO_ENTITY)
    ? threat.industry
    : "Healthcare") as keyof typeof INDUSTRY_TO_ENTITY;

  return (
    <div
      className={
        isKimbotThreat
          ? "rounded border-2 border-red-500 bg-red-950/30 overflow-hidden font-sans animate-pulse"
          : "rounded border border-slate-700 bg-slate-900/60 overflow-hidden font-sans"
      }
    >
      <div className="p-4 space-y-4">
        {/* Header — legacy Kimbot layout */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {isKimbotThreat && <Skull className="h-4 w-4 shrink-0 text-red-500" aria-hidden />}
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  severityLabelText === "MEDIUM"
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                    : severityLabelText === "HIGH"
                      ? "bg-orange-500/10 border-orange-500/50 text-orange-300"
                      : "bg-red-500/10 border-red-500/60 text-red-300"
                }`}
              >
                {severityLabelText}
              </span>
              <Link
                href={`/threats/${threat.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedThreatId(threat.id);
                }}
                className="min-w-0 truncate text-sm font-semibold text-white hover:text-blue-200 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-950 rounded"
              >
                {threat.name}
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="rounded-full border border-emerald-500/50 bg-emerald-950/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                ${scoreM.toFixed(2)}M Liability
              </span>
              {isKimbotThreat && (
                <span className="rounded-full border border-amber-500/50 bg-amber-950/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">
                  {kimbotAttackQueueCount} ATTACKS IN QUEUE
                </span>
              )}
              <Link
                href={`/threats/${threat.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedThreatId(threat.id);
                }}
                className="inline-flex items-center gap-1 rounded border border-slate-600 bg-slate-800/90 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-200 hover:border-blue-500/60 hover:text-blue-200"
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
                VIEW DETAILS
              </Link>
            </div>
          </div>
          <p className="font-mono text-[10px] text-slate-500 break-all">{threat.id}</p>
          <p className="text-[10px] text-slate-400">
            Source: {threat.source ?? "—"} · Sector: {threat.industry ?? "—"} · Target:{" "}
            {threat.target ?? threat.industry ?? "—"}
          </p>
          <p className="text-[10px] text-slate-500">
            Liability: ${scoreM.toFixed(1)}M · {threat.source ?? "—"}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
            <span className="font-mono" title="Time since detection">
              Triage clock {tttDisplay}
            </span>
          </div>
        </div>

        {/* TRIAGE — liability, target, L / I, risk score */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Triage</p>
          <div className="flex flex-wrap items-end gap-3 text-[10px]">
            <label className="flex flex-col gap-1 text-slate-400">
              <span>Liability ($M)</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={Number(liabilityMillions.toFixed(1))}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isNaN(v)) return;
                  updatePipelineThreat(threat.id, { score: v, loss: v } as Parameters<
                    typeof updatePipelineThreat
                  >[1] & { loss: number; industry?: string });
                }}
                className="w-20 rounded border border-slate-600 bg-slate-950 px-2 py-1 font-mono text-slate-100 outline-none focus:border-blue-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-slate-400">
              <span>Target</span>
              <select
                value={selectedSector}
                onChange={(e) => {
                  const sector = e.target.value as keyof typeof INDUSTRY_TO_ENTITY;
                  const meta = INDUSTRY_TO_ENTITY[sector];
                  updatePipelineThreat(threat.id, {
                    industry: sector,
                    target: meta?.entityLabel ?? sector,
                  } as Parameters<typeof updatePipelineThreat>[1] & { industry?: string });
                }}
                className="min-w-[8rem] rounded border border-slate-600 bg-slate-950 px-2 py-1 text-slate-100 outline-none focus:border-blue-500"
              >
                {sectorKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center rounded-full border border-slate-700 bg-slate-900/80 font-mono text-slate-200">
              <span className="pl-1.5 pr-0.5 text-slate-400">L:</span>
              <button
                type="button"
                onClick={() => adjustLikelihood(-1)}
                disabled={likelihood <= 1}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-l text-slate-400 hover:bg-slate-700/80 hover:text-slate-200 disabled:opacity-40"
                aria-label="Decrease likelihood"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={10}
                value={likelihood}
                onChange={handleLikelihoodChange}
                className="w-8 border-0 bg-transparent py-0 text-center text-slate-200 [-moz-appearance:textfield] focus:outline-none focus:ring-1 focus:ring-slate-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                aria-label="Likelihood 1-10"
              />
              <button
                type="button"
                onClick={() => adjustLikelihood(1)}
                disabled={likelihood >= 10}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-r text-slate-400 hover:bg-slate-700/80 hover:text-slate-200 disabled:opacity-40"
                aria-label="Increase likelihood"
              >
                +
              </button>
            </div>
            <div className="flex items-center rounded-full border border-slate-700 bg-slate-900/80 font-mono text-slate-200">
              <span className="pl-1.5 pr-0.5 text-slate-400">I:</span>
              <button
                type="button"
                onClick={() => adjustImpact(-1)}
                disabled={impact <= 1}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-l text-slate-400 hover:bg-slate-700/80 hover:text-slate-200 disabled:opacity-40"
                aria-label="Decrease impact"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={10}
                value={impact}
                onChange={handleImpactChange}
                className="w-8 border-0 bg-transparent py-0 text-center text-slate-200 [-moz-appearance:textfield] focus:outline-none focus:ring-1 focus:ring-slate-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                aria-label="Impact 1-10"
              />
              <button
                type="button"
                onClick={() => adjustImpact(1)}
                disabled={impact >= 10}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-r text-slate-400 hover:bg-slate-700/80 hover:text-slate-200 disabled:opacity-40"
                aria-label="Increase impact"
              >
                +
              </button>
            </div>
            <div className="ml-auto text-right">
              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Risk Score</span>
              <p className="text-lg font-bold text-white">
                {hasResidualChange ? (
                  <>
                    <span className="text-slate-500 line-through">{inherentScore}</span>{" "}
                    <span className={residualColorClass}>{residualScore}</span>
                  </>
                ) : (
                  <span className="text-slate-200">{residualScore}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Claim row */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setAssignedTo(currentUser)}
            disabled={assignedTo === currentUser}
            className={`px-2 py-1 border rounded transition-colors ${
              assignedTo === currentUser
                ? "bg-ironcore-accent/20 border-ironcore-accent text-ironcore-accent cursor-default"
                : "bg-ironcore-bg border-ironcore-border text-ironcore-text hover:bg-ironcore-highlight"
            }`}
          >
            {assignedTo === currentUser ? "✔️ Claimed" : "🖐️ Claim"}
          </button>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="px-2 py-1 bg-black border border-ironcore-border text-ironcore-text rounded focus:outline-none focus:border-ironcore-accent"
          >
            <option value="unassigned">Unassigned</option>
            <option value="dereck">Dereck</option>
            <option value="user_00">user_00</option>
            <option value="user_01">user_01</option>
            <option value="secops">SecOps Team</option>
            <option value="grc">GRC Team</option>
            <option value="netsec">NetSec</option>
          </select>
        </div>

        {/* GRC JUSTIFICATION — min 50 chars unless Top Sector verified intel (see ackRequirementsMet). */}
        <div className="space-y-1 rounded-md border-2 border-amber-400/70 bg-amber-950/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200">
              GRC justification required (min 50 characters)
            </p>
            {isTopSectorThreat && (
              <span className="rounded-full border border-emerald-500/60 bg-emerald-950/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-200">
                Verified Intel Source
              </span>
            )}
          </div>
          <textarea
            rows={4}
            value={grcJustification}
            readOnly={isTopSectorThreat}
            onChange={(e) => setGrcJustification(e.target.value)}
            placeholder="Provide justification for acknowledging this threat..."
            className={`w-full min-h-[96px] resize-y rounded border border-amber-500/60 bg-slate-950 px-2 py-2 text-[11px] text-slate-100 placeholder:text-amber-200/40 outline-none focus:border-amber-400 ${
              isTopSectorThreat ? "cursor-default opacity-95" : ""
            }`}
            aria-label="GRC justification"
          />
          <div className="flex justify-between text-[10px] font-semibold text-amber-200/90">
            <span>
              {isTopSectorThreat
                ? "Top Sector Threats: fixed audit string — length waived by source authority."
                : "50+ characters required to Acknowledge."}
            </span>
            <span>
              {isTopSectorThreat
                ? `Verified · ${TOP_SECTOR_JUSTIFICATION_TEXT.length}/${TOP_SECTOR_JUSTIFICATION_TEXT.length}`
                : `${grcJustification.length} / 50 min`}
            </span>
          </div>
        </div>

        {/* Primary ACK */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!ackEnabled || !ackRequirementsMet || ackPending}
            onClick={handleAcknowledgeClick}
            className={`rounded-md px-4 py-2 text-[11px] font-bold uppercase tracking-wide border transition-colors ${
              ackEnabled && ackRequirementsMet && !ackPending
                ? "border-slate-500 bg-slate-700 text-white hover:bg-slate-600 cursor-pointer"
                : "border-slate-700 bg-slate-800/80 text-slate-500 opacity-60 cursor-not-allowed grayscale"
            }`}
          >
            {ackPending ? "Acknowledging…" : "Acknowledge"}
          </button>
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
  const isManualFormOpen = useRiskStore((s) => s.isManualFormOpen);
  const setManualFormOpen = useRiskStore((s) => s.setManualFormOpen);
  const draftTemplate = useRiskStore((s) => s.draftTemplate);
  const clearDraftTemplate = useRiskStore((s) => s.clearDraftTemplate);
  const registerThreatViaApi = useRiskStore((s) => s.registerThreatViaApi);
  const threatActionError = useRiskStore((s) => s.threatActionError);
  const setThreatActionError = useRiskStore((s) => s.setThreatActionError);
  const highLiabilityFirstSeenRef = useRef<Map<string, number>>(new Map());
  const injectedSignals = useKimbotStore((s) => s.injectedSignals);
  const removeInjectedSignal = useKimbotStore((s) => s.removeInjectedSignal);
  const kimbotEnabled = useKimbotStore((s) => s.enabled);
  const grcBotEnabled = useGrcBotStore((s) => s.enabled);
  const enginesOn = kimbotEnabled || grcBotEnabled;
  const riskIngestionTerminalLines = useAgentStore((s) => s.riskIngestionTerminalLines);
  const [manualTitle, setManualTitle] = useState("");
  const [manualSource, setManualSource] = useState("");
  const [manualTarget, setManualTarget] = useState("Healthcare");
  const [manualLoss, setManualLoss] = useState("4.0");
  const [manualDescription, setManualDescription] = useState("");
  const [riskSearchQuery, setRiskSearchQuery] = useState("");
  const [ingestionSearchQuery, setIngestionSearchQuery] = useState("");
  const [stackExpanded, setStackExpanded] = useState(false);
  const [attackVelocitySeries, setAttackVelocitySeries] = useState<number[]>([]);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const registerTextLen = manualDescription.trim().length;
  const manualIntelSource = isManualTopSectorIntelSource(manualSource);
  const manualRegisterJustificationMet =
    registerTextLen >= 50 ||
    (manualIntelSource && manualDescription.trim() === TOP_SECTOR_JUSTIFICATION_TEXT);

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
  const visiblePipelineThreatsBase = riskSearchLower
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

  /** Newest-first for Attack Velocity stack (DB `createdAt` when present). */
  const visiblePipelineThreats = [...visiblePipelineThreatsBase].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });

  const totalThreats = visiblePipelineThreats.length;

  // Aggregate liability across threats in the current stack (in $M, derived from loss/score)
  const totalLiabilityMillions = visiblePipelineThreats.reduce((sum, t) => {
    const base = t.loss ?? t.score ?? 0;
    return sum + Number(base);
  }, 0);

  const formattedLiability = (() => {
    if (totalLiabilityMillions <= 0) return "$0 Liability";
    const totalDollars = totalLiabilityMillions * 1_000_000;
    if (totalDollars >= 1_000_000_000) {
      return `$${(totalDollars / 1_000_000_000).toFixed(2)}B Liability`;
    }
    return `$${(totalDollars / 1_000_000).toFixed(2)}M Liability`;
  })();

  // Attack Velocity sparkline: track recent pipeline depth to visualize ingestion rate.
  useEffect(() => {
    setAttackVelocitySeries((prev) => {
      const next = [...prev, totalThreats];
      // Keep last 24 samples (~small window)
      return next.slice(-24);
    });
  }, [totalThreats]);

  useEffect(() => {
    if (!draftTemplate) return;
    setManualTitle(draftTemplate.title);
    setManualSource(draftTemplate.source);
    setManualTarget(draftTemplate.target);
    setManualLoss(centsStringToMillionsInput(draftTemplate.loss));
    setManualDescription(
      isManualTopSectorIntelSource(draftTemplate.source) ? TOP_SECTOR_JUSTIFICATION_TEXT : "",
    );
  }, [draftTemplate]);

  useEffect(() => {
    if (isManualTopSectorIntelSource(manualSource)) {
      setManualDescription(TOP_SECTOR_JUSTIFICATION_TEXT);
    }
  }, [manualSource]);

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

  const handleManualRiskRegister = async () => {
    setRegisterError(null);
    const title = manualTitle.trim();
    if (!title) return;
    if (!manualRegisterJustificationMet) {
      setRegisterError(
        isManualTopSectorIntelSource(manualSource)
          ? "Use the verified Top Sector justification or switch to another source and enter 50+ characters."
          : "Justification must be at least 50 characters.",
      );
      return;
    }
    const parsedLoss = Number.parseFloat(manualLoss);
    const lossM = Number.isFinite(parsedLoss) && parsedLoss > 0 ? parsedLoss : 1.0;
    const lossCents = Math.round(lossM * 100_000_000);
    const loss = String(lossCents);

    const newThreatPayload = {
      title,
      source: manualSource.trim() || undefined,
      target: manualTarget.trim() || undefined,
      loss,
      description: manualDescription.trim() || undefined,
      tenantId: resolveTenantId(selectedTenantName),
      destination: "active" as const,
      ...(isManualTopSectorIntelSource(manualSource)
        ? { grcJustification: TOP_SECTOR_JUSTIFICATION_TEXT }
        : {}),
    };

    try {
      setRegisterError(null);
      await useRiskStore.getState().registerThreatViaApi(newThreatPayload);

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
      setRegisterError(null);
      setManualFormOpen(false);
      clearDraftTemplate();
    } catch (error: any) {
      // Intercept the crash and send it to the UI toast
      const errorMessage = error instanceof Error ? error.message : "Registration failed.";
      setRegisterError(errorMessage);
      useRiskStore.getState().setThreatActionError?.({
        active: true,
        message: errorMessage,
      });
    }
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

  const agentAlertsRef = useRef(agentAlerts);
  agentAlertsRef.current = agentAlerts;

  /** Stable identity for effect deps — avoids re-running every render on a new `agentAlerts` array reference. */
  const highLiabilityAgentWatchKey = agentAlerts
    .filter((s) => s.liability > 10)
    .map((s) => `${s.id}:${s.liability.toFixed(4)}`)
    .sort()
    .join('|');

  const FIFTEEN_MIN_MS = 15 * 60 * 1000;
  const LIABILITY_ALERT_POLL_MS = 30_000;

  useEffect(() => {
    const map = highLiabilityFirstSeenRef.current;

    const checkHighLiabilityTimers = () => {
      const now = Date.now();
      for (const signal of agentAlertsRef.current) {
        if (signal.liability <= 10) continue;
        const key = signal.id;
        const message = `High-liability agent signal ($${signal.liability.toFixed(1)}M) has been un-ingested for over 15 minutes. Triage required.`;
        if (!map.has(key)) map.set(key, now);
        else if (now - map.get(key)! >= FIFTEEN_MIN_MS) {
          const prev = useRiskStore.getState().liabilityAlert;
          if (prev.active && prev.signalId === key && prev.message === message) {
            break;
          }
          setLiabilityAlert({
            active: true,
            message,
            signalId: key,
          });
          break;
        }
      }
    };

    checkHighLiabilityTimers();
    const intervalId = setInterval(checkHighLiabilityTimers, LIABILITY_ALERT_POLL_MS);
    return () => clearInterval(intervalId);
  }, [highLiabilityAgentWatchKey, setLiabilityAlert]);

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
              createdAt: r.createdAt,
            }));
            replacePipelineThreats(asPipeline);
          }
        })
        .catch(() => {});
    const syncActiveFromDb = () =>
      fetchActiveThreatsFromDb()
        .then((rows) => {
          if (!cancelled) {
            const asActive: PipelineThreat[] = rows.map(mapActiveThreatFromDbToPipelineThreat);
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
            createdAt: r.createdAt,
          }));
          replacePipelineThreats(asPipeline);
        })
        .catch(() => {});
      fetchActiveThreatsFromDb()
        .then((rows) => {
          const asActive: PipelineThreat[] = rows.map(mapActiveThreatFromDbToPipelineThreat);
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
      {riskIngestionTerminalLines.length > 0 ? (
        <div
          className="mb-3 max-h-28 overflow-y-auto rounded border border-slate-800 bg-black/50 p-2 font-mono text-[9px] leading-relaxed text-slate-200"
          role="log"
          aria-label="DMZ telemetry terminal"
        >
          <p className="mb-1 text-[8px] font-bold uppercase tracking-wider text-slate-500">
            IRONWAVE / DMZ terminal
          </p>
          {riskIngestionTerminalLines.map((line, idx) => (
            <div
              key={`${idx}-${line.slice(0, 48)}`}
              className={
                line.includes("IRONLOCK INTERRUPT")
                  ? "text-rose-300"
                  : "text-emerald-200/90"
              }
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}
      {threatActionError.active && threatActionError.message && (
        <div
          role="alert"
          className="mb-3 flex items-start justify-between gap-3 rounded border border-red-500/70 bg-red-950/90 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-red-300">GRC / Acknowledge error</p>
            <p className="mt-1 text-sm text-red-100">{threatActionError.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setThreatActionError({ active: false, message: "" })}
            className="shrink-0 rounded border border-red-500/70 bg-red-500/20 px-2 py-1 text-[10px] font-bold uppercase text-red-200 hover:bg-red-500/30"
          >
            Dismiss
          </button>
        </div>
      )}
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
                onClick={() => {
                  if (isManualFormOpen) clearDraftTemplate();
                  else setManualFormOpen(true);
                }}
                className="rounded-full border border-blue-500/70 bg-blue-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-200 hover:bg-blue-500/25"
              >
                Manual Risk REGISTRATION
              </button>
            </div>
          </div>
          {isManualFormOpen ? (
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
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {manualIntelSource && (
                  <span className="rounded-full border border-emerald-500/60 bg-emerald-950/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-200">
                    Verified Intel Source
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={manualDescription}
                readOnly={manualIntelSource}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="Justification Required (Min 50 characters)"
                className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-blue-500 ${
                  manualIntelSource ? "cursor-default opacity-95" : ""
                }`}
              />
              <div className="mt-1 text-[10px] text-gray-500 text-right">
                {manualIntelSource && manualDescription.trim() === TOP_SECTOR_JUSTIFICATION_TEXT
                  ? `Verified · ${TOP_SECTOR_JUSTIFICATION_TEXT.length}/${TOP_SECTOR_JUSTIFICATION_TEXT.length}`
                  : `${registerTextLen} / 50 min characters`}
              </div>
              {registerError && (
                <div
                  className="mt-2 rounded border border-red-500/70 bg-red-950/80 px-3 py-2 text-xs font-bold text-red-200"
                  role="alert"
                >
                  {registerError}
                </div>
              )}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManualTitle("");
                    setManualSource("");
                    setManualTarget("Healthcare");
                    setManualLoss("4.0");
                    setManualDescription("");
                    setRegisterError(null);
                    clearDraftTemplate();
                  }}
                  className="rounded border border-slate-600 bg-slate-900 px-3 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManualRiskRegister}
                  disabled={
                    !manualTitle.trim().length ||
                    !manualSource.trim().length ||
                    !manualTarget.trim().length ||
                    !manualLoss.toString().trim().length ||
                    !manualRegisterJustificationMet
                  }
                  className={`rounded border border-emerald-500/70 bg-emerald-500/15 px-3 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-200 ${
                    !manualRegisterJustificationMet
                      ? 'opacity-50 cursor-not-allowed grayscale'
                      : 'opacity-100 cursor-pointer hover:bg-opacity-80'
                  }`}
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

          {visiblePipelineThreats.length > 0 && (
            <div className="mt-2 space-y-3">
              {/* Attack Velocity Sparkline (ingestion rate) */}
              <div className="flex items-center justify-between text-[10px]" data-testid="pipeline-attack-velocity">
                <span className="font-bold uppercase tracking-wide text-slate-400">
                  Attack Velocity
                </span>
                <div className="flex h-6 items-end gap-[2px]">
                  {attackVelocitySeries.length === 0 ? (
                    <span className="text-[9px] text-slate-500">Idle</span>
                  ) : (
                    attackVelocitySeries.map((v, idx) => {
                      const normalized = Math.min(6, Math.max(1, v));
                      return (
                        <div
                          key={idx}
                          className="w-1 rounded-t bg-emerald-500"
                          style={{
                            height: `${4 + normalized * 3}px`,
                            opacity: idx === attackVelocitySeries.length - 1 ? 1 : 0.4,
                          }}
                        />
                      );
                    })
                  )}
                </div>
              </div>

              {/* Condensed Stack: no gray overlay layers — newest-first ordering via `visiblePipelineThreats` */}
              <div>
                <div
                  className={`relative transition-all duration-200 ${
                    totalThreats > 1
                      ? "shadow-[4px_4px_0px_0px_rgba(220,38,38,0.2),8px_8px_0px_0px_rgba(220,38,38,0.1)]"
                      : ""
                  }`}
                  data-testid="pipeline-threat-card"
                  onClick={() => {
                    if (totalThreats > 1) setStackExpanded((prev) => !prev);
                  }}
                >
                  {/* When collapsed: only first card is rendered; stack badge shows total count */}
                  <PipelineThreatCard
                    key={visiblePipelineThreats[0].id}
                    threat={visiblePipelineThreats[0]}
                    onActionSuccess={() => router.refresh()}
                    setSelectedThreatId={setSelectedThreatId}
                  />
                  {totalThreats > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <span className="rounded-full border border-emerald-400/70 bg-slate-900/95 px-2 py-0.5 text-[9px] font-mono font-semibold tracking-wide text-emerald-300 shadow">
                        {formattedLiability}
                      </span>
                      {totalThreats > 1 && (
                        <button
                          type="button"
                          className="rounded-full border border-amber-400/70 bg-slate-900/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300 shadow-md hover:bg-amber-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStackExpanded((prev) => !prev);
                          }}
                        >
                          {totalThreats} Attacks in Queue
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Full list only when expanded — no slice(1) cards in DOM when collapsed */}
                {totalThreats > 1 && (
                  <div
                    className="overflow-hidden transition-all duration-200 ease-out"
                    style={{
                      maxHeight: stackExpanded ? "288px" : "0",
                      opacity: stackExpanded ? 1 : 0,
                    }}
                  >
                    {stackExpanded && (
                      <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded border border-slate-800 bg-transparent p-2">
                        {visiblePipelineThreats.slice(1).map((threat) => (
                          <PipelineThreatCard
                            key={threat.id}
                            threat={threat}
                            onActionSuccess={() => router.refresh()}
                            setSelectedThreatId={setSelectedThreatId}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
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