'use client';

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useRiskStore } from '@/app/store/riskStore';
import { setThreatAssigneeAction, type AssignmentChangedLogEntry } from '@/app/actions/threatActions';
import { triggerDeepTrace, executeTraceAction } from '@/app/actions/ironsightActions';
import { fetchActiveThreatsFromDb } from '@/app/actions/simulationActions';
import { mapActiveThreatFromDbToPipelineThreat } from '@/app/utils/mapActiveThreatFromDbToPipelineThreat';
import { useKimbotStore } from '@/app/store/kimbotStore';
import { useGrcBotStore } from '@/app/store/grcBotStore';
import { TENANT_UUIDS } from '@/app/utils/tenantIsolation';
import { appendAuditLog } from '@/app/utils/auditLogger';
import { formatAssignmentHistoryNarrative } from '@/app/utils/assignmentChainOfCustody';
import { useAgentStore } from '@/app/store/agentStore';

const STAKEHOLDER_EMAIL_RECIPIENT = 'blackwoodscoffee@gmail.com';

/** UI session operator id → display label (matches assignee dropdown naming). */
const SESSION_OPERATOR_LABEL: Record<string, string> = {
  dereck: 'Dereck',
  user_00: 'user_00',
  user_01: 'user_01',
  secops: 'SecOps Team',
  grc: 'GRC Team',
  netsec: 'NetSec',
};

function resolveTenantId(selectedTenantName: string | null): string {
  const n = (selectedTenantName ?? '').trim().toLowerCase();
  if (n === 'vaultbank') return TENANT_UUIDS.vaultbank;
  if (n === 'gridcore') return TENANT_UUIDS.gridcore;
  return TENANT_UUIDS.medshield;
}

type RiskRow = {
  id: string;
  title: string;
  source: string;
  /** Persisted ActiveRisk.assignee_id — drives assignee dropdown until user overrides locally. */
  assigneeId?: string;
  threatId?: string | null;
  score_cents: number;
  company: { name: string; sector: string };
  isSimulation?: boolean;
  /** Optional blast-radius labels when API / store supplies them. */
  impactedAssets?: string[];
  blastRadius?: { impactedAssets?: string[]; assets?: string[]; services?: string[] };
  /** Linked ThreatEvent ingestion JSON (Ironsight `aiTrace`). */
  ingestionDetails?: string | null;
  /** Linked ThreatEvent.ttlSeconds for SLA badge. */
  ttlSeconds?: number | null;
  /** Linked ThreatEvent.createdAt (ISO) for SLA expiry. */
  threatCreatedAt?: string | null;
  aiTrace?: {
    status: string;
    report?: string;
    actions?: Array<{ label: string; actionId: string }>;
    impactedAssets?: string[];
    complianceTags?: string[];
  };
};

/** Live ThreatEvent slice from GET /api/dashboard — assigneeId + ASSIGNMENT_CHANGED history. */
export type DashboardThreatEventRow = {
  id: string;
  title: string;
  sourceAgent: string;
  assigneeId: string | null;
  assignmentHistory?: AssignmentChangedLogEntry[];
};

type Props = {
  risks: RiskRow[];
  threatEvents?: DashboardThreatEventRow[];
  setSelectedThreatId?: (id: string | null) => void;
};

type ActionType = 'DISMISS' | 'REVERT' | 'CONFIRM';

const REVERT_REASONS = [
  { value: 'OPERATOR_ERROR', label: 'Operator Error' },
  { value: 'PREMATURE_ESCALATION', label: 'Premature Escalation' },
  { value: 'DATA_CORRECTION', label: 'Data Correction' },
] as const;

const DISMISS_REASONS = [
  { value: 'FALSE_POSITIVE', label: 'False Positive' },
  { value: 'RISK_ACCEPTED', label: 'Risk Accepted' },
  { value: 'MITIGATED', label: 'Mitigated' },
  { value: 'DUPLICATE', label: 'Duplicate' },
] as const;

const CONFIRM_REASONS = [
  { value: 'INCIDENT_DECLARED', label: 'Incident Declared' },
  { value: 'INVESTIGATION_OPENED', label: 'Investigation Opened' },
  { value: 'VULNERABILITY_CONFIRMED', label: 'Vulnerability Confirmed' },
] as const;

type LifecycleState = 'active' | 'confirmed' | 'resolved';

type WorkNote = { timestamp: string; text: string; user: string };

const BLAST_RADIUS_PENDING_COPY = 'Standard Blast Radius (Pending Deep Scan)';

function asNonEmptyStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const x of value) {
    if (typeof x === 'string' && x.trim().length > 0) out.push(x.trim());
  }
  return out;
}

function dedupeLabels(labels: string[]): string[] {
  return [...new Set(labels.map((s) => s.trim()).filter(Boolean))];
}

/**
 * Pipeline triage justification: `ingestionDetails.grcJustification` (merged on acknowledge),
 * else newest work note text (same string as acknowledge WorkNote), else client `justification`.
 */
function readPipelineGrcJustificationFromThreat(threat: {
  justification?: string;
  ingestionDetails?: string | null;
  workNotes?: { text: string }[];
}): string {
  const raw = threat.ingestionDetails;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const g = (parsed as Record<string, unknown>).grcJustification;
        if (typeof g === 'string' && g.trim().length > 0) {
          return g.trim();
        }
      }
    } catch {
      /* not JSON */
    }
  }
  const wn = threat.workNotes;
  if (Array.isArray(wn) && wn.length > 0) {
    const t0 = wn[0]?.text;
    if (typeof t0 === 'string' && t0.trim().length > 0) {
      return t0.trim();
    }
  }
  return (threat.justification ?? '').trim();
}

/**
 * Read-only recovery of impacted assets from threat-shaped payloads (no server changes).
 * Supports: impactedAssets, affectedSystems, blastRadius.*, ingestionDetails JSON (incl. nested aiTrace).
 */
function extractImpactedAssets(threatLike: unknown): string[] {
  if (threatLike == null || typeof threatLike !== 'object') return [];
  const o = threatLike as Record<string, unknown>;

  const direct = dedupeLabels(asNonEmptyStringList(o.impactedAssets));
  if (direct.length > 0) return direct;

  const affected = dedupeLabels(asNonEmptyStringList(o.affectedSystems));
  if (affected.length > 0) return affected;

  const br = o.blastRadius;
  if (br != null && typeof br === 'object') {
    const b = br as Record<string, unknown>;
    const fromBr = dedupeLabels([
      ...asNonEmptyStringList(b.impactedAssets),
      ...asNonEmptyStringList(b.assets),
      ...asNonEmptyStringList(b.services),
    ]);
    if (fromBr.length > 0) return fromBr;
  }

  const ingestion = o.ingestionDetails;
  if (typeof ingestion === 'string' && ingestion.trim().length > 0) {
    try {
      const parsed = JSON.parse(ingestion) as unknown;
      const nested = extractImpactedAssets(parsed);
      if (nested.length > 0) return nested;
    } catch {
      /* not JSON */
    }
  }

  return [];
}

function ImpactedBlastRadiusSection({
  threatLike,
  threatEventId,
  deepTraceRunning,
}: {
  threatLike: unknown;
  threatEventId?: string | null;
  deepTraceRunning?: boolean;
}) {
  const trace = extractIronsightAiTrace(threatLike);
  const phase = ironsightTraceUiPhase(trace);

  return (
    <div className="rounded border border-slate-700/80 bg-slate-900/50 p-2 threat-list-fade-in">
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
        IMPACTED ASSETS (BLAST RADIUS)
      </p>
      {phase === 'loading' && (
        <div
          className="flex items-start gap-2 rounded border border-blue-500/25 bg-slate-950/60 px-2 py-1.5 text-[10px] leading-snug text-slate-400"
          aria-busy={!!deepTraceRunning}
          title={
            !threatEventId
              ? 'Link this row to a ThreatEvent for Ironsight blast-radius mapping.'
              : undefined
          }
        >
          <Loader2
            className={`mt-0.5 size-3.5 shrink-0 text-blue-400 ${deepTraceRunning ? 'animate-spin' : ''}`}
            aria-hidden
          />
          <span>
            {deepTraceRunning
              ? 'Scanning infrastructure dependencies…'
              : !threatEventId
                ? BLAST_RADIUS_PENDING_COPY
                : 'Starting automatic Ironsight scan…'}
          </span>
        </div>
      )}
      {phase === 'failed' && trace != null && (
        <span
          className="inline-flex max-w-full rounded-full bg-rose-900/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-rose-100"
          title={trace.report?.trim() || undefined}
        >
          Trace Failed - Manual Mapping Required
        </span>
      )}
      {phase === 'completed' && trace != null && trace.impactedAssets.length > 0 && (
        <div className="max-h-[4.5rem] overflow-y-auto overflow-x-hidden pr-0.5 [scrollbar-width:thin]">
          <div className="flex flex-wrap gap-1.5">
            {trace.impactedAssets.map((label, i) => (
              <span
                key={`${label}-${i}`}
                className="inline-flex max-w-full shrink-0 cursor-default truncate rounded-full bg-blue-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm"
                title={label}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
      {phase === 'completed' && trace != null && trace.impactedAssets.length === 0 && (
        <span className="inline-flex max-w-full rounded-full bg-emerald-900/85 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-100">
          No Internal Dependencies Found
        </span>
      )}
    </div>
  );
}

type IronsightAiTraceNormalized = {
  status: string;
  report?: string;
  actions: Array<{ label: string; actionId: string }>;
  impactedAssets: string[];
  complianceTags: string[];
};

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeIronsightAiTrace(raw: Record<string, unknown>): IronsightAiTraceNormalized {
  const status = typeof raw.status === 'string' && raw.status.trim() ? raw.status.trim() : 'PENDING';
  const report = typeof raw.report === 'string' ? raw.report : undefined;
  const actions: Array<{ label: string; actionId: string }> = [];
  if (Array.isArray(raw.actions)) {
    for (const item of raw.actions) {
      if (item == null || typeof item !== 'object' || Array.isArray(item)) continue;
      const a = item as Record<string, unknown>;
      const label = typeof a.label === 'string' ? a.label.trim() : '';
      const actionIdRaw =
        typeof a.actionId === 'string'
          ? a.actionId.trim()
          : typeof a.id === 'string'
            ? (a.id as string).trim()
            : '';
      if (label) actions.push({ label, actionId: actionIdRaw || label });
    }
  }
  const impactedAssets = dedupeLabels(asNonEmptyStringList(raw.impactedAssets)).slice(0, 3);
  const complianceTags = dedupeLabels(asNonEmptyStringList(raw.complianceTags)).slice(0, 3);
  return { status, report, actions, impactedAssets, complianceTags };
}

/** Read-only: `aiTrace` on threat, or nested under `ingestionDetails` JSON (Ironsight persistence path). */
function extractIronsightAiTrace(threatLike: unknown): IronsightAiTraceNormalized | null {
  if (threatLike == null || typeof threatLike !== 'object') return null;
  const o = threatLike as Record<string, unknown>;
  const direct = o.aiTrace;
  if (direct != null && typeof direct === 'object' && !Array.isArray(direct)) {
    return normalizeIronsightAiTrace(direct as Record<string, unknown>);
  }
  const ing = parseJsonRecord(o.ingestionDetails);
  const fromIng = ing?.aiTrace;
  if (fromIng != null && typeof fromIng === 'object' && !Array.isArray(fromIng)) {
    return normalizeIronsightAiTrace(fromIng as Record<string, unknown>);
  }
  return null;
}

function ironsightTraceUiPhase(
  trace: IronsightAiTraceNormalized | null,
): 'loading' | 'completed' | 'failed' {
  if (trace == null) return 'loading';
  const s = trace.status.toUpperCase();
  if (s === 'FAILED' || s === 'ERROR') return 'failed';
  if (s === 'COMPLETED' || s === 'COMPLETE') return 'completed';
  return 'loading';
}

/** True when there is no completed/failed Ironsight trace yet (auto-ignite eligible). */
function threatNeedsIronsightAutoTrace(threatLike: unknown): boolean {
  return ironsightTraceUiPhase(extractIronsightAiTrace(threatLike)) === 'loading';
}

/** Ironsight / Irontally compliance tags — header only; hidden while trace pending or failed. */
function IronsightComplianceTagsBadges({ threatLike }: { threatLike: unknown }) {
  const trace = extractIronsightAiTrace(threatLike);
  const phase = ironsightTraceUiPhase(trace);
  if (phase !== 'completed' || trace == null || trace.complianceTags.length === 0) {
    return null;
  }
  return (
    <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Regulatory compliance tags">
      {trace.complianceTags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex max-w-full shrink-0 truncate rounded-full bg-purple-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-100 ring-1 ring-purple-700/60"
          title={tag}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

const SLA_TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function formatSlaRemaining(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalMins = Math.floor(clamped / 60_000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** ThreatEvent TTL vs createdAt — refreshes every 60s. */
function ActiveRiskSlaBadge({
  ttlSeconds,
  createdAtIso,
}: {
  ttlSeconds?: number | null;
  createdAtIso?: string | null;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { text, className } = useMemo(() => {
    void tick;
    if (ttlSeconds == null) {
      return { text: 'SLA: Standard', className: 'text-[9px] font-medium text-slate-500' };
    }
    if (createdAtIso == null || createdAtIso.trim() === '') {
      return { text: 'SLA: Standard', className: 'text-[9px] font-medium text-slate-500' };
    }
    const startMs = Date.parse(createdAtIso);
    if (Number.isNaN(startMs)) {
      return { text: 'SLA: Standard', className: 'text-[9px] font-medium text-slate-500' };
    }
    const expirationMs = startMs + ttlSeconds * 1000;
    const remainingMs = expirationMs - Date.now();
    if (remainingMs < 0) {
      return {
        text: 'SLA BREACHED',
        className: 'text-[9px] font-bold uppercase tracking-wide text-red-400',
      };
    }
    const label = `SLA: ${formatSlaRemaining(remainingMs)}`;
    if (remainingMs > SLA_TWO_HOURS_MS) {
      return { text: label, className: 'text-[9px] font-semibold text-emerald-400/90' };
    }
    return { text: label, className: 'text-[9px] font-semibold text-amber-400' };
  }, [ttlSeconds, createdAtIso, tick]);

  return (
    <span className={`mt-0.5 block text-right tabular-nums ${className}`} title="Triage SLA from ThreatEvent TTL">
      {text}
    </span>
  );
}

function IronsightDeepTraceSection({
  threatLike,
  contextId,
  threatEventId,
  deepTraceRunning,
  executingChipKey,
  onExecuteAction,
}: {
  threatLike: unknown;
  contextId: string;
  threatEventId: string | null;
  deepTraceRunning: boolean;
  executingChipKey: string | null;
  onExecuteAction: (label: string, actionId: string) => void;
}) {
  const trace = extractIronsightAiTrace(threatLike);
  const phase = ironsightTraceUiPhase(trace);
  const showActions =
    trace != null &&
    trace.actions.length > 0 &&
    (phase === 'completed' || phase === 'failed');

  return (
    <div className="rounded border border-slate-700/80 bg-slate-950/40 p-2 threat-list-fade-in">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
          IRONSIGHT DEEP TRACE
        </p>
        {trace != null && (
          <span className="rounded border border-slate-600/80 bg-slate-900 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wide text-slate-500">
            {trace.status}
          </span>
        )}
      </div>
      <p className="mb-2 text-[9px] leading-snug text-slate-500">
        Suggested by IRONSIGHT — execution only after you explicitly click an action chip (human-in-the-loop).
      </p>
      {phase === 'loading' && (
        <div
          className="flex items-center gap-2 rounded border border-blue-500/30 bg-slate-950/80 px-2 py-2 text-[10px] text-slate-400"
          aria-busy={deepTraceRunning}
        >
          <Loader2
            className={`size-3.5 shrink-0 text-blue-400 ${deepTraceRunning ? 'animate-spin' : ''}`}
            aria-hidden
          />
          <div>
            <span className="font-semibold text-blue-200/90">
              {deepTraceRunning
                ? 'Scanning infrastructure dependencies…'
                : threatEventId
                  ? 'Ironsight deep trace starting…'
                  : 'Awaiting ThreatEvent link for Ironsight'}
            </span>
            <span className="mt-0.5 block text-[9px] font-normal italic text-slate-500">
              Automatic GRC blast-radius mapping (suggested actions only; human-in-the-loop execution).
            </span>
          </div>
        </div>
      )}
      {phase === 'failed' && trace != null && (
        <div className="rounded border border-rose-500/40 bg-rose-950/25 px-2 py-2 text-[10px] leading-snug text-rose-100/90">
          {trace.report?.trim() || 'Deep trace did not complete. Retry or perform a manual dependency review.'}
        </div>
      )}
      {phase === 'completed' && trace != null && (
        <div
          className="max-h-32 overflow-y-auto rounded border border-blue-500/40 bg-slate-950/95 px-2 py-2 text-[10px] leading-relaxed text-slate-200 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)] [scrollbar-width:thin]"
          role="region"
          aria-label="Ironsight trace report (read-only)"
        >
          <p className="whitespace-pre-wrap break-words">{trace.report?.trim() || '—'}</p>
        </div>
      )}
      {showActions && trace != null && (
        <div className="mt-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto [scrollbar-width:thin]">
          {trace.actions.map((action, i) => {
            const warm = i % 2 === 0;
            const chipKey =
              threatEventId && threatEventId.length > 0
                ? `${threatEventId}::${action.actionId}`
                : `::${contextId}::${action.actionId}`;
            const isExecuting = executingChipKey === chipKey;
            return (
              <button
                key={`${contextId}-${action.actionId}-${i}`}
                type="button"
                disabled={!threatEventId || isExecuting}
                className={`shrink-0 rounded border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide transition-colors hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-50 ${
                  warm
                    ? 'border-red-500/55 text-red-300 hover:border-red-400/70'
                    : 'border-amber-500/55 text-amber-200 hover:border-amber-400/70'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!threatEventId) return;
                  onExecuteAction(action.label, action.actionId);
                }}
              >
                {isExecuting ? 'Executing…' : action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Supply Chain Impact (1–10) for vendor/third-party artifacts.
 * When liabilityInMillions is provided (e.g. from GRCBOT): >$5M → 9.0+, <$1M → 3.0, else linear scale.
 * Otherwise falls back to text-based heuristic (Patient Records / Core Infrastructure → 9.2).
 */
function computeSupplyChainImpact(input: {
  title?: string;
  name?: string;
  description?: string;
  source?: string;
  /** Liability in $M (e.g. threat.loss or threat.score from GRCBOT). Used for impact when present. */
  liabilityInMillions?: number;
}): number | null {
  const title = (input.title ?? input.name ?? "").toLowerCase();
  const desc = (input.description ?? "").toLowerCase();
  const src = (input.source ?? "").toLowerCase();

  const isSupplyChain =
    src.includes("vendor") ||
    src.includes("nth-party") ||
    src.includes("third") ||
    desc.includes("vendor artifact") ||
    desc.includes("nth-party") ||
    title.includes("vendor") ||
    title.includes("third-party") ||
    title.includes("third party") ||
    title.includes("artifact");

  if (!isSupplyChain) return null;

  const liabilityM = input.liabilityInMillions;
  if (liabilityM != null && typeof liabilityM === "number") {
    if (liabilityM > 5) return 9.2;
    if (liabilityM < 1) return 3.0;
    return 3 + (liabilityM - 1) * (9 - 3) / 4; // linear 3–9 for $1M–$5M
  }

  const hasCriticalAccess =
    title.includes("patient records") ||
    title.includes("core infrastructure") ||
    desc.includes("patient records") ||
    desc.includes("core infrastructure");

  return hasCriticalAccess ? 9.2 : 8.6;
}

function AssigneeHistorySection({ entries }: { entries: AssignmentChangedLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded border border-slate-700/80 bg-slate-950/50 p-2">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">ASSIGNEE HISTORY</p>
        <p className="mt-1 text-[10px] text-slate-500">No assignment changes recorded yet.</p>
      </div>
    );
  }
  return (
    <div className="rounded border border-slate-700/80 bg-slate-950/50 p-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">ASSIGNEE HISTORY</p>
      <ul className="mt-2 max-h-32 space-y-1.5 overflow-y-auto">
        {entries.map((entry) => (
          <li key={entry.id} className="text-[10px] leading-snug text-slate-300">
            {formatAssignmentHistoryNarrative(entry)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ActiveRisksClient({
  risks,
  threatEvents = [],
  setSelectedThreatId: setSelectedThreatIdProp,
}: Props) {
  const router = useRouter();
  const activeThreats = useRiskStore((state) => state.activeThreats);
  const replaceActiveThreats = useRiskStore((state) => state.replaceActiveThreats);
  const confirmThreat = useRiskStore((state) => state.confirmThreat);
  const resolveThreat = useRiskStore((state) => state.resolveThreat);
  const revertThreatToPipeline = useRiskStore((state) => state.revertThreatToPipeline);
  const deAcknowledgeThreat = useRiskStore((state) => state.deAcknowledgeThreat);
  const selectedTenantName = useRiskStore((state) => state.selectedTenantName);
  const updatePipelineThreat = useRiskStore((state) => state.updatePipelineThreat);
  const setThreatActionError = useRiskStore((state) => state.setThreatActionError);
  const storeSetSelectedThreatId = useRiskStore((state) => state.setSelectedThreatId);
  const setSelectedThreatId = setSelectedThreatIdProp ?? storeSetSelectedThreatId;

  const kimbotEnabled = useKimbotStore((s) => s.enabled);
  const grcBotEnabled = useGrcBotStore((s) => s.enabled);
  const enginesOn = kimbotEnabled || grcBotEnabled;

  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});
  const [workNotes, setWorkNotes] = useState<Record<string, WorkNote[]>>({});
  const [states, setStates] = useState<Record<string, LifecycleState>>({});
  const [successFlash, setSuccessFlash] = useState<Record<string, boolean>>({});
  const [riskSearchQuery, setRiskSearchQuery] = useState('');
  const [executionToast, setExecutionToast] = useState<string | null>(null);
  const [traceRunningThreatId, setTraceRunningThreatId] = useState<string | null>(null);
  const [executingActionKey, setExecutingActionKey] = useState<string | null>(null);
  /** Prevents duplicate client-side `triggerDeepTrace` calls per threat id for this mount. */
  const ironsightAutoIgnitedRef = useRef(new Set<string>());
  const [, startTraceTransition] = useTransition();
  const [, startExecTransition] = useTransition();

  useEffect(() => {
    if (executionToast == null) return;
    const id = window.setTimeout(() => setExecutionToast(null), 4800);
    return () => window.clearTimeout(id);
  }, [executionToast]);

  const refreshActiveThreatsFromDb = async () => {
    const rows = await fetchActiveThreatsFromDb();
    replaceActiveThreats(rows.map(mapActiveThreatFromDbToPipelineThreat));
  };

  const runDeepTrace = (threatEventId: string | null | undefined) => {
    const tid = typeof threatEventId === 'string' ? threatEventId.trim() : '';
    if (!tid) {
      setThreatActionError({
        active: true,
        message: 'Cannot run Ironsight: this row has no ThreatEvent id.',
      });
      return;
    }
    setTraceRunningThreatId(tid);
    startTraceTransition(() => {
      void triggerDeepTrace(tid)
        .then(async (res) => {
          await refreshActiveThreatsFromDb();
          router.refresh();
          if (!res.success) {
            setThreatActionError({ active: true, message: res.error });
          }
        })
        .finally(() => setTraceRunningThreatId(null));
    });
  };

  const handleExecuteTraceAction = (threatEventId: string, label: string, actionId: string) => {
    const chipKey = `${threatEventId}::${actionId}`;
    setExecutingActionKey(chipKey);
    startExecTransition(() => {
      void executeTraceAction(threatEventId, actionId, label, 'admin-user-01')
        .then(async (res) => {
          if (res.success) {
            setExecutionToast(`Remediation logged: ${label}`);
            await refreshActiveThreatsFromDb();
            router.refresh();
          } else {
            setThreatActionError({ active: true, message: res.error });
          }
        })
        .finally(() => setExecutingActionKey(null));
    });
  };

  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [activeActionCardId, setActiveActionCardId] = useState<string | null>(null);
  const [activeActionThreatId, setActiveActionThreatId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customJustification, setCustomJustification] = useState('');
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const currentUser = 'dereck';
  const actorDisplayLabel = SESSION_OPERATOR_LABEL[currentUser] ?? currentUser;

  const persistThreatAssignee = async (
    cardKey: string,
    threatEventId: string | null | undefined,
    value: string,
  ) => {
    setAssignments((prev) => ({ ...prev, [cardKey]: value }));
    if (!threatEventId) {
      appendAuditLog({
        action_type: 'SYSTEM_WARNING',
        log_type: 'GRC',
        description: 'Assignee not persisted: missing ThreatEvent id for this row.',
      });
      return;
    }
    const res = await setThreatAssigneeAction(
      threatEventId,
      value === 'unassigned' ? null : value,
      resolveTenantId(selectedTenantName),
      currentUser,
      SESSION_OPERATOR_LABEL[currentUser] ?? currentUser,
    );
    if (res && typeof res === 'object' && 'success' in res && res.success === false) {
      setThreatActionError({ active: true, message: res.error });
      return;
    }
    if (
      res &&
      typeof res === 'object' &&
      'success' in res &&
      res.success === true &&
      'newLog' in res
    ) {
      const prev = useRiskStore.getState().activeThreats.find((t) => t.id === threatEventId);
      updatePipelineThreat(threatEventId, {
        assignedTo: value === 'unassigned' ? undefined : value,
        ...(res.newLog
          ? { assignmentHistory: [...(prev?.assignmentHistory ?? []), res.newLog] }
          : {}),
      });
    }
    router.refresh();
  };

  // Only show DB risks that are non-simulation when engines are OFF + optional tenant filter
  const filteredRisks = risks.filter((r) => {
    if (!enginesOn && r.isSimulation === true) return false;
    if (selectedTenantName && r.company.name !== selectedTenantName) return false;
    return true;
  });
  // Only show activeThreats that are non-simulation (no grcbot-/kimbot- ids) when engines are OFF
  const filteredActiveThreats = activeThreats.filter(
    (t) => {
      if (!enginesOn && (t.id.startsWith("grcbot-") || t.id.startsWith("kimbot-"))) return false;
      if (selectedTenantName) {
        // Best-effort tenant filter: if threat has a target, match it; otherwise hide to avoid cross-tenant bleed.
        return (t.target ?? "") === selectedTenantName;
      }
      return true;
    }
  );

  const visibleRisks = filteredRisks.filter((r) => states[r.id] !== 'resolved');
  const visibleActiveThreats = filteredActiveThreats.filter(
    (t) => (states[t.id] ?? t.lifecycleState ?? 'active') !== 'resolved'
  );

  const searchLower = riskSearchQuery.trim().toLowerCase();

  const searchedActiveThreats = searchLower
    ? visibleActiveThreats.filter((t) => {
        const id = t.id?.toLowerCase() ?? '';
        const name = t.name?.toLowerCase() ?? '';
        const desc = t.description?.toLowerCase() ?? '';
        const source = t.source?.toLowerCase() ?? '';
        const target = (t.target as string | undefined)?.toLowerCase() ?? '';
        const industry = t.industry?.toLowerCase() ?? '';
        return (
          id.includes(searchLower) ||
          name.includes(searchLower) ||
          desc.includes(searchLower) ||
          source.includes(searchLower) ||
          target.includes(searchLower) ||
          industry.includes(searchLower)
        );
      })
    : visibleActiveThreats;

  const searchedRisks = searchLower
    ? visibleRisks.filter((r) => {
        const id = r.id?.toLowerCase() ?? '';
        const title = r.title?.toLowerCase() ?? '';
        const source = r.source?.toLowerCase() ?? '';
        const company = r.company.name?.toLowerCase() ?? '';
        const sector = r.company.sector?.toLowerCase() ?? '';
        return (
          id.includes(searchLower) ||
          title.includes(searchLower) ||
          source.includes(searchLower) ||
          company.includes(searchLower) ||
          sector.includes(searchLower)
        );
      })
    : visibleRisks;

  const sortedActiveThreats = [...searchedActiveThreats].sort(
    (a, b) =>
      (b.calculatedRiskScore ?? b.score ?? b.loss ?? 0) -
      (a.calculatedRiskScore ?? a.score ?? a.loss ?? 0),
  );
  const sortedRisks = [...searchedRisks].sort((a, b) => b.score_cents - a.score_cents);

  const ironsightAutoIgniteFingerprint = useMemo(() => {
    const parts: string[] = [];
    for (const t of sortedActiveThreats) {
      const life = (states[t.id] ?? t.lifecycleState ?? 'active') as LifecycleState;
      if (life !== 'active') continue;
      parts.push(`t:${t.id}:${t.ingestionDetails ?? ''}`);
    }
    for (const r of sortedRisks) {
      const life = (states[r.id] ?? 'active') as LifecycleState;
      if (life !== 'active') continue;
      const tid = r.threatId?.trim();
      if (!tid) continue;
      parts.push(`r:${tid}:${r.ingestionDetails ?? ''}`);
    }
    parts.sort();
    return parts.join('|');
  }, [sortedActiveThreats, sortedRisks, states]);

  const sortedActiveThreatsRef = useRef(sortedActiveThreats);
  const sortedRisksRef = useRef(sortedRisks);
  const statesRef = useRef(states);
  sortedActiveThreatsRef.current = sortedActiveThreats;
  sortedRisksRef.current = sortedRisks;
  statesRef.current = states;

  const runDeepTraceRef = useRef(runDeepTrace);
  runDeepTraceRef.current = runDeepTrace;

  useEffect(() => {
    if (traceRunningThreatId != null) return;
    const st = statesRef.current;
    const tryIgnite = (threatLike: unknown, tid: string): boolean => {
      const id = tid.trim();
      if (!id || ironsightAutoIgnitedRef.current.has(id)) return false;
      if (!threatNeedsIronsightAutoTrace(threatLike)) return false;
      ironsightAutoIgnitedRef.current.add(id);
      runDeepTraceRef.current(id);
      return true;
    };
    for (const t of sortedActiveThreatsRef.current) {
      const life = (st[t.id] ?? t.lifecycleState ?? 'active') as LifecycleState;
      if (life !== 'active') continue;
      if (tryIgnite(t, t.id)) return;
    }
    for (const r of sortedRisksRef.current) {
      const life = (statesRef.current[r.id] ?? 'active') as LifecycleState;
      if (life !== 'active') continue;
      const tid = r.threatId?.trim();
      if (!tid) continue;
      if (tryIgnite(r, tid)) return;
    }
  }, [ironsightAutoIgniteFingerprint, traceRunningThreatId]);

  const threatEventAssigneeById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of threatEvents) {
      const a = t.assigneeId?.trim();
      if (a) m.set(t.id, a);
    }
    return m;
  }, [threatEvents]);

  const threatEventHistoryById = useMemo(() => {
    const m = new Map<string, AssignmentChangedLogEntry[]>();
    for (const t of threatEvents) {
      if (t.assignmentHistory?.length) m.set(t.id, t.assignmentHistory);
    }
    return m;
  }, [threatEvents]);

  /**
   * Prefer local dropdown; else ActiveRisk / store assignee; else ThreatEvent.assigneeId from dashboard payload.
   * `teLookupId` is the ThreatEvent id (same as card id for active threats, or risk.threatId for ActiveRisk rows).
   */
  const assignedFor = (cardKey: string, serverAssignee?: string | null, teLookupId?: string | null) => {
    if (Object.prototype.hasOwnProperty.call(assignments, cardKey)) {
      return assignments[cardKey];
    }
    const direct = serverAssignee?.trim();
    const fromTe = teLookupId ? threatEventAssigneeById.get(teLookupId)?.trim() : undefined;
    const v = direct || fromTe;
    return v && v.length > 0 ? v : 'unassigned';
  };

  const isEmpty = sortedActiveThreats.length === 0 && sortedRisks.length === 0;

  const handleAddNote = (riskId: string) => {
    const draft = (noteDrafts[riskId] ?? '').trim();
    if (!draft) return;
    const note: WorkNote = {
      timestamp: new Date().toISOString(),
      text: draft,
      user: 'Dereck',
    };
    setWorkNotes((prev) => ({
      ...prev,
      [riskId]: [...(prev[riskId] ?? []), note],
    }));
    setNoteDrafts((prev) => ({ ...prev, [riskId]: '' }));
  };

  const handleConfirmThreat = async (risk: RiskRow) => {
    setStates((prev) => ({ ...prev, [risk.id]: 'confirmed' }));
    setSuccessFlash((prev) => ({ ...prev, [risk.id]: true }));
    setTimeout(() => {
      setSuccessFlash((prev) => ({ ...prev, [risk.id]: false }));
    }, 1500);

    const notesText = (workNotes[risk.id] ?? []).map((n) => n.text).join(' | ') || 'None';
    const template = `URGENT: GRC Event Registered. Threat: ${risk.title}, Liability: $0.0M, Acknowledged By: Dereck, Notes: ${notesText}.`;

    useAgentStore.getState().addStreamMessage(`> [SYSTEM] Stakeholder alert staged for ${STAKEHOLDER_EMAIL_RECIPIENT}.`);

    console.log('Mock sendStakeholderEmail (ActiveRisks)', {
      to: STAKEHOLDER_EMAIL_RECIPIENT,
      body: template,
    });

    appendAuditLog({
      action_type: 'EMAIL_SENT',
      log_type: 'GRC',
      description: template,
    });
    if (risk.threatId) {
      await confirmThreat(risk.threatId, 'admin-user-01');
    } else {
      appendAuditLog({
        action_type: 'SYSTEM_WARNING',
        log_type: 'GRC',
        description: `Confirm skipped: Missing mapped threatId for active risk ${risk.id}`,
        metadata_tag: `activeRiskId:${risk.id}|title:${risk.title}`,
      });
    }
  };

  const handleResolveThreat = async (risk: RiskRow) => {
    const tid = risk.threatId;
    const text = (resolutionDrafts[risk.id] ?? '').trim();
    if (!tid) {
      appendAuditLog({
        action_type: 'SYSTEM_WARNING',
        log_type: 'GRC',
        description: `Resolve skipped: Missing mapped threatId for active risk ${risk.id}`,
        metadata_tag: `activeRiskId:${risk.id}|title:${risk.title}`,
      });
      return;
    }
    if (text.length < 50) return;
    try {
      await resolveThreat(tid, 'admin-user-01', text, actorDisplayLabel);
      setStates((prev) => ({ ...prev, [risk.id]: 'resolved' }));
      setResolutionDrafts((prev) => {
        const next = { ...prev };
        delete next[risk.id];
        return next;
      });
    } catch {
      // threatActionError set in store
    }
  };

  const clearActionForm = () => {
    setActiveAction(null);
    setActiveActionCardId(null);
    setActiveActionThreatId(null);
    setSelectedReason('');
    setCustomJustification('');
  };

  const resolutionJustificationBlock = (cardKey: string) => {
    const resolutionText = resolutionDrafts[cardKey] ?? '';
    return (
      <div
        className="space-y-1 rounded-md border-2 border-amber-400/70 bg-amber-950/20 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200">
          RESOLUTION JUSTIFICATION (MIN 50 CHARACTERS)
        </p>
        <textarea
          rows={4}
          value={resolutionText}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setResolutionDrafts((prev) => ({ ...prev, [cardKey]: e.target.value }))
          }
          onClick={(e) => e.stopPropagation()}
          placeholder="Explain remediation outcome and closure rationale for the audit trail..."
          className="w-full min-h-[96px] resize-y rounded border border-amber-500/60 bg-slate-950 px-2 py-2 text-[11px] text-slate-100 placeholder:text-amber-200/40 outline-none focus:border-amber-400"
          aria-label="Resolution justification"
        />
        <div className="flex justify-between text-[10px] font-semibold text-amber-200/90">
          <span>50+ characters required to resolve.</span>
          <span>
            {resolutionText.length} / 50 min
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 font-sans" data-testid="active-risks-board">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-white font-sans">ACTIVE RISKS</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
          {sortedActiveThreats.length + sortedRisks.length} Live Findings
        </span>
      </div>

      <div className="mb-3">
        <input
          type="search"
          value={riskSearchQuery}
          onChange={(e) => setRiskSearchQuery(e.target.value)}
          placeholder="Search active risks by name or ID, target, sector, or source…"
          className="w-full rounded border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Search active risks"
        />
      </div>

      <div className="space-y-3">
        {isEmpty ? (
          <div className="rounded border border-slate-800 bg-slate-950/40 p-4 text-center font-sans text-sm text-slate-500">
            [ WAITING FOR RISK CONFIRMATION... ]
          </div>
        ) : (
          <>
        {sortedActiveThreats.map((threat) => {
          const lifecycle: LifecycleState =
            (states[threat.id] as LifecycleState | undefined) ??
            ((threat.lifecycleState as LifecycleState | undefined) ?? 'active');
          const isUnassigned = assignedFor(threat.id, threat.assignedTo, threat.id) === 'unassigned';
          const isActive = lifecycle === 'active';
          const shouldFlash = isUnassigned && isActive;
          const notes = workNotes[threat.id] ?? (threat.workNotes ?? []);
          const pipelineGrcJustification = readPipelineGrcJustificationFromThreat({
            justification: threat.justification,
            ingestionDetails: threat.ingestionDetails,
            workNotes: notes,
          });
          const assigneeHistoryForCard =
            threat.assignmentHistory && threat.assignmentHistory.length > 0
              ? threat.assignmentHistory
              : threatEventHistoryById.get(threat.id) ?? [];
          const isExpanded = true;
          const liabilityM = threat.score ?? threat.loss;
          const supplyChainImpact = computeSupplyChainImpact({
            name: threat.name,
            description: threat.description,
            source: threat.source,
            liabilityInMillions: typeof liabilityM === "number" ? liabilityM : undefined,
          });

          const resolutionText = resolutionDrafts[threat.id] ?? '';
          const resolutionLenOk = resolutionText.trim().length >= 50;

          const buttonLabel =
            lifecycle === 'active' ? 'CONFIRM THREAT' : lifecycle === 'confirmed' ? 'RESOLVE THREAT' : 'RESOLVED';

          const onPrimaryClick =
            lifecycle === 'active'
              ? async () => {
                  await confirmThreat(threat.id, 'admin-user-01');
                  setStates((prev) => ({ ...prev, [threat.id]: 'confirmed' }));
                  setSuccessFlash((prev) => ({ ...prev, [threat.id]: true }));
                  setTimeout(() => setSuccessFlash((prev) => ({ ...prev, [threat.id]: false })), 1500);
                }
              : lifecycle === 'confirmed'
              ? async () => {
                  try {
                    await resolveThreat(threat.id, 'admin-user-01', resolutionText.trim(), actorDisplayLabel);
                    setResolutionDrafts((prev) => {
                      const next = { ...prev };
                      delete next[threat.id];
                      return next;
                    });
                  } catch {
                    // threatActionError set in store
                  }
                }
              : undefined;

          return (
            <div
              key={`active-${threat.id}`}
              className={`group flex flex-col justify-between rounded-lg border transition-all duration-500 ${
                shouldFlash
                  ? 'animate-pulse border-red-500 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.5)] z-10 scale-[1.01]'
                  : 'border-emerald-700/40 bg-emerald-950/10 hover:border-emerald-500/60'
              } p-4`}
            >
              <div className="flex w-full items-start justify-between text-left">
                <div>
                  <h3 className="text-sm font-medium text-slate-200">
                    <Link
                      href={`/threats/${threat.id}`}
                      onClick={(e) => { e.preventDefault(); setSelectedThreatId(threat.id); }}
                      className="hover:text-blue-200 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-950 rounded"
                    >
                      {threat.name}
                    </Link>
                  </h3>
                  <IronsightComplianceTagsBadges threatLike={threat} />
                  <p className="mt-1 font-mono text-[10px] text-slate-500">{threat.id}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Target: <span className="text-slate-400">{threat.target ?? threat.industry ?? 'Healthcare'}</span>
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">{threat.description ?? 'No additional details provided.'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/threats/${threat.id}`}
                    onClick={(e) => { e.preventDefault(); setSelectedThreatId(threat.id); }}
                    className="inline-flex items-center gap-1 rounded border border-slate-600 bg-slate-800/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-200 transition-colors hover:border-blue-500/60 hover:bg-blue-500/10 hover:text-blue-200"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden />
                    Assess Risk
                  </Link>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => void persistThreatAssignee(threat.id, threat.id, currentUser)}
                      disabled={assignedFor(threat.id, threat.assignedTo, threat.id) === currentUser}
                      className={`px-2 py-1 border rounded transition-colors ${
                        assignedFor(threat.id, threat.assignedTo, threat.id) === currentUser
                          ? 'bg-ironcore-accent/20 border-ironcore-accent text-ironcore-accent cursor-default'
                          : 'bg-ironcore-bg border-ironcore-border text-ironcore-text hover:bg-ironcore-highlight'
                      }`}
                    >
                      {assignedFor(threat.id, threat.assignedTo, threat.id) === currentUser ? '✔️ Claimed' : '🖐️ Claim'}
                    </button>
                    <select
                      value={assignedFor(threat.id, threat.assignedTo, threat.id)}
                      onChange={(e) => void persistThreatAssignee(threat.id, threat.id, e.target.value)}
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
                  <span className={`text-xs font-bold ${(threat.calculatedRiskScore ?? 0) > 70 ? 'text-red-400' : 'text-amber-400'}`}>
                    Score: {threat.calculatedRiskScore ?? threat.score ?? threat.loss}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                    SRC: {threat.source ?? 'STRATEGIC_INTEL'}
                  </span>
                  {supplyChainImpact != null && (
                    <span
                      className={`mt-1 text-[9px] font-bold uppercase tracking-wide ${
                        supplyChainImpact >= 8.5 ? "text-rose-300" : "text-amber-300"
                      }`}
                      title="Supply Chain Impact (third-party/vendor risk, 1–10). Distinct from internal security alerts."
                    >
                      Supply Chain Impact: {supplyChainImpact.toFixed(1)}/10
                    </span>
                  )}
                  <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    {lifecycle === 'active' ? 'Just Acknowledged' : lifecycle === 'confirmed' ? 'Confirmed' : 'Resolved'}
                  </span>
                  <ActiveRiskSlaBadge ttlSeconds={threat.ttlSeconds ?? null} createdAtIso={threat.createdAt ?? null} />
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 space-y-3 rounded-md border border-slate-800 bg-slate-950/60 p-3">
                  <div className="space-y-1">
                    <AssigneeHistorySection entries={assigneeHistoryForCard} />
                    <div className="rounded border border-slate-700 bg-slate-900/70 p-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        GRC JUSTIFICATION (FROM PIPELINE TRIAGE)
                      </p>
                      <p
                        className="mt-1 whitespace-pre-wrap text-[10px] text-slate-200"
                        role="note"
                        aria-label="GRC justification from pipeline triage (read-only)"
                      >
                        {pipelineGrcJustification || '—'}
                      </p>
                    </div>

                    <ImpactedBlastRadiusSection
                      threatLike={threat}
                      threatEventId={threat.id}
                      deepTraceRunning={traceRunningThreatId === threat.id}
                    />

                    <IronsightDeepTraceSection
                      threatLike={threat}
                      contextId={threat.id}
                      threatEventId={threat.id}
                      deepTraceRunning={traceRunningThreatId === threat.id}
                      executingChipKey={executingActionKey}
                      onExecuteAction={(label, actionId) =>
                        handleExecuteTraceAction(threat.id, label, actionId)
                      }
                    />

                    <div className="max-h-28 space-y-1 overflow-y-auto rounded bg-slate-950/80 p-2">
                      {notes.length === 0 && (
                        <div className="text-[10px] text-slate-500">No work notes recorded yet.</div>
                      )}
                      {notes.map((note) => (
                        <div key={note.timestamp + note.text} className="text-[10px] text-slate-300">
                          <span className="font-mono text-slate-500">
                            {new Date(note.timestamp).toLocaleTimeString()} · {note.user}:
                          </span>{' '}
                          <span>{note.text}</span>
                        </div>
                      ))}
                    </div>

                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
                      Append Work Note
                    </label>
                    <textarea
                      rows={2}
                      value={noteDrafts[threat.id] ?? ''}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        setNoteDrafts((prev) => ({ ...prev, [threat.id]: e.target.value }))
                      }
                      placeholder="Log analyst progress, containment steps, or remediation status..."
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddNote(threat.id)}
                      className="mt-1 inline-flex items-center rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-200 hover:border-emerald-400 hover:text-emerald-200"
                    >
                      Add Note
                    </button>
                  </div>

                  {lifecycle === 'confirmed' && resolutionJustificationBlock(threat.id)}

                  <div className="flex items-center justify-between pt-1">
                    {successFlash[threat.id] && (
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                        Stakeholders Notified
                      </div>
                    )}
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      {activeActionCardId === threat.id && activeAction ? (
                        <div className="w-full space-y-2 rounded border border-slate-700 bg-slate-900/80 p-3">
                          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-300">
                            Reason
                          </label>
                          <select
                            value={selectedReason}
                            onChange={(e) => setSelectedReason(e.target.value)}
                            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-200 focus:border-blue-500 focus:outline-none"
                            aria-label="Select reason"
                          >
                            <option value="">Select reason…</option>
                            {(activeAction === 'DISMISS' ? DISMISS_REASONS : activeAction === 'REVERT' ? REVERT_REASONS : CONFIRM_REASONS).map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-300">
                            Justification
                          </label>
                          <textarea
                            rows={2}
                            value={customJustification}
                            onChange={(e) => setCustomJustification(e.target.value)}
                            placeholder="Enter detailed justification for audit log..."
                            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-[10px] text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
                            aria-label="Custom justification"
                          />
                          <div className="text-[10px] text-gray-500 text-right mt-1">
                            {customJustification.trim().length} / 50 min characters
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                const reason = selectedReason.trim();
                                const justification = customJustification.trim();
                                if (!reason || justification.length < 50) return;
                                const tenantId = resolveTenantId(selectedTenantName);
                                const operatorId = 'admin-user-01';
                                try {
                                  if (activeAction === 'DISMISS') {
                                    await deAcknowledgeThreat(threat.id, tenantId, reason, justification, operatorId);
                                    appendAuditLog({
                                      action_type: 'STATE_REGRESSION',
                                      log_type: 'GRC',
                                      description: `Risk dismissed (De-Acknowledged): ${threat.name}. Reason: ${reason}. ${justification}`,
                                      metadata_tag: `threatId:${threat.id}|tenant:${selectedTenantName ?? 'GLOBAL'}`,
                                      user_id: operatorId,
                                    });
                                  } else if (activeAction === 'REVERT') {
                                    await revertThreatToPipeline(threat.id, tenantId, operatorId);
                                    appendAuditLog({
                                      action_type: 'STATE_REGRESSION',
                                      log_type: 'GRC',
                                      description: `Reverted to pipeline: ${threat.name}. Reason: ${reason}. ${justification}`,
                                      metadata_tag: `threatId:${threat.id}|tenant:${selectedTenantName ?? 'GLOBAL'}`,
                                      user_id: operatorId,
                                    });
                                  } else {
                                    await confirmThreat(threat.id, operatorId);
                                    setStates((prev) => ({ ...prev, [threat.id]: 'confirmed' }));
                                    setSuccessFlash((prev) => ({ ...prev, [threat.id]: true }));
                                    setTimeout(() => setSuccessFlash((prev) => ({ ...prev, [threat.id]: false })), 1500);
                                    appendAuditLog({
                                      action_type: 'GRC_PROCESS_THREAT',
                                      log_type: 'GRC',
                                      description: `Threat confirmed: ${threat.name}. Reason: ${reason}. ${justification}`,
                                      metadata_tag: `threatId:${threat.id}|tenant:${selectedTenantName ?? 'GLOBAL'}`,
                                      user_id: operatorId,
                                    });
                                  }
                                  clearActionForm();
                                } catch (_e) {
                                  // Store logs; form stays open for retry
                                }
                              }}
                              disabled={!selectedReason.trim() || customJustification.trim().length < 50}
                              className={`rounded bg-emerald-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white shadow ${
                                customJustification.trim().length < 50
                                  ? 'opacity-50 cursor-not-allowed grayscale'
                                  : 'opacity-100 cursor-pointer hover:bg-opacity-80'
                              }`}
                            >
                              SUBMIT {activeAction}
                            </button>
                            <button
                              type="button"
                              onClick={clearActionForm}
                              className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:bg-slate-700"
                            >
                              CANCEL
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {lifecycle === 'active' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAction('DISMISS');
                                  setActiveActionCardId(threat.id);
                                  setActiveActionThreatId(threat.id);
                                  setSelectedReason('');
                                  setCustomJustification('');
                                }}
                                className="rounded border border-red-500/70 bg-red-950/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-red-300 shadow hover:border-red-400/70 hover:bg-red-500/10 hover:text-red-200"
                              >
                                De-Acknowledgment
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAction('REVERT');
                                  setActiveActionCardId(threat.id);
                                  setActiveActionThreatId(threat.id);
                                  setSelectedReason('');
                                  setCustomJustification('');
                                }}
                                className="rounded border border-amber-500/70 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 shadow hover:bg-amber-500/20"
                              >
                                REVERT TO PIPELINE
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAction('CONFIRM');
                                  setActiveActionCardId(threat.id);
                                  setActiveActionThreatId(threat.id);
                                  setSelectedReason('');
                                  setCustomJustification('');
                                }}
                                className="rounded border border-emerald-500/70 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300 shadow hover:bg-emerald-500/20"
                              >
                                CONFIRM THREAT
                              </button>
                            </>
                          )}
                          {lifecycle !== 'active' && (
                            <button
                              type="button"
                              disabled={!onPrimaryClick || (lifecycle === 'confirmed' && !resolutionLenOk)}
                              onClick={() => void onPrimaryClick?.()}
                              className={`rounded px-3 py-1.5 text-[10px] font-black uppercase tracking-wide shadow ${
                                lifecycle === 'confirmed'
                                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                              } disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                              {buttonLabel}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sortedRisks.map((risk) => {
          const lifecycle: LifecycleState = states[risk.id] ?? 'active';
          const isUnassigned = assignedFor(risk.id, risk.assigneeId, risk.threatId) === 'unassigned';
          const isActive = lifecycle === 'active';
          const shouldFlash = isUnassigned && isActive;
          const notes = workNotes[risk.id] ?? [];
          const riskAssigneeHistory =
            (risk.threatId ? threatEventHistoryById.get(risk.threatId) : undefined) ?? [];
          const isExpanded = true;
          const supplyChainImpact = computeSupplyChainImpact({
            title: risk.title,
            source: risk.source,
          });

          const resolutionText = resolutionDrafts[risk.id] ?? '';
          const resolutionLenOk = resolutionText.trim().length >= 50;

          const buttonLabel =
            lifecycle === 'active' ? 'CONFIRM THREAT' : lifecycle === 'confirmed' ? 'RESOLVE THREAT' : 'RESOLVED';

          const onPrimaryClick =
            lifecycle === 'active'
              ? () => handleConfirmThreat(risk)
              : lifecycle === 'confirmed'
              ? () => void handleResolveThreat(risk)
              : undefined;

          return (
            <div
              key={risk.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (risk.threatId) setSelectedThreatId(risk.threatId);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && risk.threatId) setSelectedThreatId(risk.threatId);
              }}
              className={`group flex cursor-pointer flex-col justify-between rounded-lg border transition-all duration-500 ${
                shouldFlash
                  ? 'animate-pulse border-red-500 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.5)] z-10 scale-[1.01]'
                  : 'border-slate-800 bg-slate-900/60 hover:border-blue-500/50'
              } p-4`}
            >
              <div className="flex w-full items-start justify-between text-left">
                <div>
                  <h3 className="text-sm font-medium text-slate-200 group-hover:text-blue-200 group-hover:underline">{risk.title}</h3>
                  <IronsightComplianceTagsBadges threatLike={risk} />
                  <p className="mt-1 font-mono text-[10px] text-slate-500">{risk.id}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Target: <span className="text-slate-400">{risk.company.name}</span> ({risk.company.sector})
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => void persistThreatAssignee(risk.id, risk.threatId, currentUser)}
                      disabled={assignedFor(risk.id, risk.assigneeId, risk.threatId) === currentUser}
                      className={`px-2 py-1 border rounded transition-colors ${
                        assignedFor(risk.id, risk.assigneeId, risk.threatId) === currentUser
                          ? 'bg-ironcore-accent/20 border-ironcore-accent text-ironcore-accent cursor-default'
                          : 'bg-ironcore-bg border-ironcore-border text-ironcore-text hover:bg-ironcore-highlight'
                      }`}
                    >
                      {assignedFor(risk.id, risk.assigneeId, risk.threatId) === currentUser ? '✔️ Claimed' : '🖐️ Claim'}
                    </button>
                    <select
                      value={assignedFor(risk.id, risk.assigneeId, risk.threatId)}
                      onChange={(e) => void persistThreatAssignee(risk.id, risk.threatId, e.target.value)}
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
                  <span className={`text-xs font-bold ${risk.score_cents > 80 ? 'text-red-400' : 'text-amber-400'}`}>
                    Score: {risk.score_cents}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                    SRC: {risk.source}
                  </span>
                  {supplyChainImpact != null && (
                    <span
                      className={`mt-1 text-[9px] font-bold uppercase tracking-wide ${
                        supplyChainImpact >= 8.5 ? "text-rose-300" : "text-amber-300"
                      }`}
                      title="Supply Chain Impact (third-party/vendor risk, 1–10). Distinct from internal security alerts."
                    >
                      Supply Chain Impact: {supplyChainImpact.toFixed(1)}/10
                    </span>
                  )}
                  <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    {lifecycle === 'active'
                      ? 'Just Acknowledged'
                      : lifecycle === 'confirmed'
                      ? 'Confirmed'
                      : 'Resolved'}
                  </span>
                  <ActiveRiskSlaBadge ttlSeconds={risk.ttlSeconds ?? null} createdAtIso={risk.threatCreatedAt ?? null} />
                </div>
              </div>

              {isExpanded && (
                <div
                  className="mt-3 space-y-3 rounded-md border border-slate-800 bg-slate-950/60 p-3"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <AssigneeHistorySection entries={riskAssigneeHistory} />
                  <ImpactedBlastRadiusSection
                    threatLike={risk}
                    threatEventId={risk.threatId ?? null}
                    deepTraceRunning={
                      risk.threatId != null && risk.threatId !== '' && traceRunningThreatId === risk.threatId
                    }
                  />
                  <IronsightDeepTraceSection
                    threatLike={risk}
                    contextId={risk.threatId ?? risk.id}
                    threatEventId={risk.threatId ?? null}
                    deepTraceRunning={
                      risk.threatId != null && risk.threatId !== '' && traceRunningThreatId === risk.threatId
                    }
                    executingChipKey={executingActionKey}
                    onExecuteAction={(label, actionId) => {
                      if (!risk.threatId) return;
                      handleExecuteTraceAction(risk.threatId, label, actionId);
                    }}
                  />
                  <div className="max-h-28 space-y-1 overflow-y-auto rounded bg-slate-950/80 p-2">
                    {notes.length === 0 && (
                      <div className="text-[10px] text-slate-500">No work notes recorded yet.</div>
                    )}
                    {notes.map((note) => {
                      return (
                        <div key={note.timestamp + note.text} className="text-[10px] text-slate-300">
                          <span className="font-mono text-slate-500">
                            {new Date(note.timestamp).toLocaleTimeString()} · {note.user}:
                          </span>{' '}
                          <span>{note.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
                      Append Work Note
                    </label>
                    <textarea
                      rows={2}
                      value={noteDrafts[risk.id] ?? ''}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        setNoteDrafts((prev) => ({ ...prev, [risk.id]: e.target.value }))
                      }
                      placeholder="Log analyst progress, containment steps, or remediation status..."
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddNote(risk.id)}
                      className="mt-1 inline-flex items-center rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-200 hover:border-emerald-400 hover:text-emerald-200"
                    >
                      Add Note
                    </button>
                  </div>

                  {lifecycle === 'confirmed' && resolutionJustificationBlock(risk.id)}

                  <div className="flex items-center justify-between pt-1">
                    {successFlash[risk.id] && (
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                        Stakeholders Notified
                      </div>
                    )}
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      {activeActionCardId === risk.id && activeAction === 'CONFIRM' ? (
                        <div className="w-full space-y-2 rounded border border-slate-700 bg-slate-900/80 p-3">
                          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-300">
                            Reason
                          </label>
                          <select
                            value={selectedReason}
                            onChange={(e) => setSelectedReason(e.target.value)}
                            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-200 focus:border-blue-500 focus:outline-none"
                            aria-label="Select reason"
                          >
                            <option value="">Select reason…</option>
                            {CONFIRM_REASONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-300">
                            Justification
                          </label>
                          <textarea
                            rows={2}
                            value={customJustification}
                            onChange={(e) => setCustomJustification(e.target.value)}
                            placeholder="Enter detailed justification for audit log..."
                            className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-[10px] text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
                            aria-label="Custom justification"
                          />
                          <div className="text-[10px] text-gray-500 text-right mt-1">
                            {customJustification.trim().length} / 50 min characters
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                const reason = selectedReason.trim();
                                const justification = customJustification.trim();
                                if (!reason || justification.length < 50) return;
                                const operatorId = 'admin-user-01';
                                const threatId = activeActionThreatId ?? risk.threatId ?? risk.id;
                                try {
                                  await confirmThreat(threatId, operatorId);
                                  setStates((prev) => ({ ...prev, [risk.id]: 'confirmed' }));
                                  setSuccessFlash((prev) => ({ ...prev, [risk.id]: true }));
                                  setTimeout(() => setSuccessFlash((prev) => ({ ...prev, [risk.id]: false })), 1500);
                                  appendAuditLog({
                                    action_type: 'GRC_PROCESS_THREAT',
                                    log_type: 'GRC',
                                    description: `Threat confirmed (risk card): ${risk.title}. Reason: ${reason}. ${justification}`,
                                    metadata_tag: `riskId:${risk.id}|threatId:${threatId}|tenant:${selectedTenantName ?? 'GLOBAL'}`,
                                    user_id: operatorId,
                                  });
                                  clearActionForm();
                                } catch (_e) {
                                  // Store logs; form stays open for retry
                                }
                              }}
                              disabled={!selectedReason.trim() || customJustification.trim().length < 50}
                              className={`rounded bg-emerald-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white shadow ${
                                customJustification.trim().length < 50
                                  ? 'opacity-50 cursor-not-allowed grayscale'
                                  : 'opacity-100 cursor-pointer hover:bg-opacity-80'
                              }`}
                            >
                              SUBMIT CONFIRM
                            </button>
                            <button
                              type="button"
                              onClick={clearActionForm}
                              className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:bg-slate-700"
                            >
                              CANCEL
                            </button>
                          </div>
                        </div>
                      ) : lifecycle === 'active' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAction('CONFIRM');
                            setActiveActionCardId(risk.id);
                            setActiveActionThreatId(risk.threatId ?? risk.id);
                            setSelectedReason('');
                            setCustomJustification('');
                          }}
                          className="rounded border border-emerald-500/70 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300 shadow hover:bg-emerald-500/20"
                        >
                          CONFIRM THREAT
                        </button>
                      ) : null}
                      {lifecycle !== 'active' && (
                        <button
                          type="button"
                          disabled={!onPrimaryClick || (lifecycle === 'confirmed' && !resolutionLenOk)}
                          onClick={(e) => {
                            e.stopPropagation();
                            void onPrimaryClick?.();
                          }}
                          className={`rounded px-3 py-1.5 text-[10px] font-black uppercase tracking-wide shadow ${
                            lifecycle === 'confirmed'
                              ? 'bg-amber-500 text-black hover:bg-amber-400'
                              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                          } disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          {buttonLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
          </>
        )}
      </div>

      {executionToast != null && (
        <div
          className="pointer-events-auto fixed bottom-6 right-6 z-[100] max-w-sm threat-list-fade-in rounded-lg border border-cyan-500/45 bg-slate-950/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs font-semibold tracking-wide text-cyan-100">{executionToast}</p>
          <button
            type="button"
            onClick={() => setExecutionToast(null)}
            className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-300"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
