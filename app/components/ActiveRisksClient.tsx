'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { flushSync } from 'react-dom';
import type { ChangeEvent, MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ClipboardList, ExternalLink, Loader2, ShieldCheck, Radar } from 'lucide-react';
import { useRiskStore } from '@/app/store/riskStore';
import { useTenantContext } from '@/app/context/TenantProvider';
import { useHasMounted } from '@/app/hooks/useHasMounted';
import {
  FORENSIC_CUSTODY_PRODUCT_OWNER_AGENT_ID,
  parseForensicCustodyFromIngestion,
} from '@/app/utils/forensicPathCustody';
import { DEFENSE_REGULATORY_SHIELD_BADGE_LABEL } from '@/lib/constants/grcGovernance';
import {
  setThreatAssigneeAction,
  getRemoteAccessAdminEligibility,
  toggleRemoteAccessAuthorization,
  generateSimulationApproval,
  deprioritizeAllAgentsPanicAction,
  triggerInfiltrationDrill,
  type AssignmentChangedLogEntry,
} from '@/app/actions/threatActions';
import { triggerDeepTrace, executeTraceAction } from '@/app/actions/ironsightActions';
import type { PipelineThreat } from '@/app/store/riskStore';
import { useKimbotStore } from '@/app/store/kimbotStore';
import { useShadowHandshakeRoleStore } from '@/app/store/shadowHandshakeRoleStore';
import { useGrcBotStore } from '@/app/store/grcBotStore';
import { useSystemConfigStore } from '@/app/store/systemConfigStore';
import { resolveEffectiveTenantUuidForActions } from "@/app/utils/resolveEffectiveTenantUuidForActions";
import { appendAuditLog } from '@/app/utils/auditLogger';
import {
  formatAssignmentHistoryNarrative,
  mergeAssignmentHistoryEntries,
} from '@/app/utils/assignmentChainOfCustody';
import { parseIrontechLiveFromIngestion } from '@/app/utils/irontechLiveStream';
import { joinErrorProbeParts } from '@/app/utils/grcInfrastructureLimit';
import { useAgentStore } from '@/app/store/agentStore';
import { ThreatCard } from '@/app/components/ThreatCard';
import PostMortemReportSection from '@/app/components/PostMortemReportSection';
import { PipelineSelfTestBar } from '@/app/components/ui/PipelineSelfTestBar';
import ManualRecoveryOverlay from '@/app/components/ManualRecoveryOverlay';
import InlineManualRecoveryBlock from '@/app/components/InlineManualRecoveryBlock';
import GovernanceHeartbeat from '@/components/GovernanceHeartbeat';
import { grantRemoteAccessAction } from '@/app/actions/chaosActions';
import ChaosShadowAuditFeed from '@/app/components/chaos/ChaosShadowAuditFeed';
import { fetchChaosLedgerClientAttribution } from '@/app/utils/chaosClientAttribution';
import {
  chaosComplianceCoverageLabel,
  frameworkBadgesForChaosScenario,
} from '@/app/utils/grcComplianceUi';
import { useComplianceOverlayStore } from '@/app/store/complianceOverlayStore';
import { hasResolutionApprovalIdOnThreat } from '@/app/utils/cisoBreachSignal';
import {
  dispatchWorkforceSimulationProcessing,
  workforceAgentsForDualKeyBot,
} from '@/app/utils/workforceInventoryActive';
import { createClient } from '@/lib/supabase/client';
import { mutate } from 'swr';
import {
  ACTIVE_THREAT_VICTORY_LAP_MS,
  registerActiveThreatVictoryLapHandler,
  requestVictoryLapFromNeutralize,
} from '@/app/utils/activeThreatLifecycleBridge';
import { isChaosThreatIdentifiedPipelineRow } from '@/app/utils/chaosDiscoveryHold';
import {
  FORENSIC_ATTESTATION_MIN,
  chaosDrillOperatorConcurrenceSatisfied,
  chaosRemoteSupportHandshakeSatisfied,
  chaosVictoryLapPurgeBlocked,
  hasUser00ForensicConcurrence,
  isRemoteSupportAwaitingJitGrant,
} from '@/app/utils/forensicAttestation';
import {
  markRegistryResolvedForThreatEvent,
  runRiskRegistryResolvedPurgeNow,
} from '@/app/utils/riskRegistryResolvedPurge';
import { appendForensicScoreToMetadataTag } from '@/app/utils/grcLexicon';
import { allThreatDraftsPassJustificationQuality } from '@/app/utils/validateJustification';

const STAKEHOLDER_EMAIL_RECIPIENT = 'blackwoodscoffee@gmail.com';

type WorkNote = { timestamp: string; text: string; user: string };

/** Active Risks lifecycle registry: 4s IDENTIFIED chaos ingestion shell, 4s RESOLVED victory lap (any operator). */
const ACTIVE_THREAT_LIFECYCLE_MS = ACTIVE_THREAT_VICTORY_LAP_MS;
/** Full-opacity victory lap ends at 4s; content ghost + motion exit run the final 500ms. */
const VICTORY_LAP_GHOST_MS = ACTIVE_THREAT_VICTORY_LAP_MS;
const THREAT_EXIT_FADE_MS = 500;

function isTerminalBoardThreatStatus(status: string): boolean {
  const s = status.trim().toUpperCase();
  return s === "RESOLVED" || s === "CLOSED_ARCHIVED";
}

function armVictoryLapRegistryEntry(
  threat: PipelineThreat,
): LifecycleRegistryEntry {
  const purgeBlockedForHumanConcurrence = chaosVictoryLapPurgeBlocked(
    threat.ingestionDetails,
    { isRemoteAccessAuthorized: threat.isRemoteAccessAuthorized },
  );
  return {
    kind: "victory",
    startedAt: Date.now(),
    isVictoryLap: true,
    purgeBlockedForHumanConcurrence,
  };
}

type LifecycleRegistryEntry =
  | {
      kind: 'ingestion';
      startedAt: number;
    }
  | {
      kind: 'victory';
      startedAt: number;
      /** Registry handoff: 4s victory lap arm (neutralize submit + RESOLVED conductor). */
      isVictoryLap: true;
      /** Agent-led RESOLVED: board purge waits for User_00 work note ≥50 chars. */
      purgeBlockedForHumanConcurrence?: boolean;
    };

function mergedWorkNotesForThreat(
  threatId: string,
  threat: PipelineThreat,
  localWorkNotes: Record<string, WorkNote[]>,
): WorkNote[] {
  const fromDb = threat.workNotes ?? [];
  const local = localWorkNotes[threatId] ?? [];
  return [...fromDb, ...local];
}

function readIngestionDiscoveryHoldMarkers(ingestionDetails?: string | null): boolean {
  const raw = (ingestionDetails ?? '').trim();
  if (!raw) return false;
  try {
    const j = JSON.parse(raw) as {
      riskVelocityDiscoveryHold?: unknown;
      discoveryIngestHoldStartedAt?: unknown;
    };
    return j.riskVelocityDiscoveryHold === true || j.discoveryIngestHoldStartedAt != null;
  } catch {
    return false;
  }
}

/**
 * GRC identity for Integrity Hub: Chaos Scenarios 1–5 are triggered from `ControlRoom.tsx`, which calls
 * `fetchChaosLedgerClientAttribution()` then `injectChaosThreatAction` with the operator’s Supabase id/email.
 * This board passes the same attribution into `grantRemoteAccessAction` (Scenario 4 JIT). We hydrate the
 * browser session on mount so `getUser` / `getSession` resolve after login redirects.
 */

/** UI session operator id → display label (matches assignee dropdown naming). */
const SESSION_OPERATOR_LABEL: Record<string, string> = {
  dereck: 'Dereck',
  User_00: 'User_00',
  user_00: 'User_00',
  user_01: 'user_01',
  secops: 'SecOps Team',
  grc: 'GRC Team',
  netsec: 'NetSec',
};

/** Chaos flight-recorder step 3: auto-ack handoff line (client-only). */
function ChaosFlightSelfHealedBanner({ threatId }: { threatId: string }) {
  const line = useRiskStore((s) => s.chaosSelfHealedLineByThreatId[threatId]);
  if (!line) return null;
  return (
    <div className="mb-3 w-full rounded-md border border-emerald-500/45 bg-emerald-950/25 px-2 py-2">
      <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-emerald-200">{line}</p>
    </div>
  );
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

/** Live risk-event slice from GET /api/dashboard — assigneeId + ASSIGNMENT_CHANGED history + Epic 11 GRC fields. */
export type DashboardThreatEventRow = {
  id: string;
  title: string;
  sourceAgent: string;
  /** ThreatEvent.status (e.g. ESCALATED after Phone Home). */
  status?: string;
  assigneeId: string | null;
  complianceFramework?: string;
  mappedControls?: string[];
  remediationStatus?: string;
  financialRiskCents?: string;
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

/** Primary CTA copy: simulation = drill lexicon; production = forensic lifecycle lexicon. */
function displayPrimaryCtaLabel(simulationMode: boolean, raw: string): string {
  if (simulationMode) return raw;
  switch (raw) {
    case 'CONFIRM THREAT':
      return 'ACKNOWLEDGE';
    case 'CLAIM & ASSIGN THREAT':
      return 'CLAIM & ASSIGN';
    case 'RESOLVE THREAT':
    case 'EXECUTE RESOLUTION':
      return 'VERIFY EVIDENCE';
    case 'RESOLVED':
      return '✅ AUDITED';
    default:
      return raw;
  }
}

function chaosBoardStatusPillText(
  simulationMode: boolean,
  lower: 'assigned' | 'processing' | 'corrected' | null,
  chaos: 'active' | 'processing' | 'resolved' | null,
): string {
  if (simulationMode) {
    if (lower === 'corrected') return 'CORRECTED';
    if (lower === 'processing') return 'PROCESSING';
    if (lower === 'assigned') return 'CLAIM DRILL';
    if (chaos === 'resolved') return 'RESOLVED';
    if (chaos === 'processing') return 'PROCESSING';
    return 'ACTIVE';
  }
  if (lower === 'corrected') return '✅ AUDITED';
  if (lower === 'processing') return 'VERIFY EVIDENCE';
  if (lower === 'assigned') return 'CLAIM & ASSIGN';
  if (chaos === 'resolved') return '✅ AUDITED';
  if (chaos === 'processing') return 'VERIFY EVIDENCE';
  if (chaos === 'active') return 'ACKNOWLEDGE';
  return 'ACKNOWLEDGE';
}

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

const STRATEGIC_INTEL_GRC_FALLBACK =
  'Ingested directly via the Top Sector Threats section (Strategic Intel)';

/**
 * GRC line for Active cards: persisted pipeline/JSON/work-note text, else Strategic Intel / Top Sector registration copy.
 */
function displayGrcJustificationForActiveThreat(threat: {
  justification?: string;
  ingestionDetails?: string | null;
  workNotes?: { text: string }[];
  source?: string;
}): string {
  const fromPipeline = readPipelineGrcJustificationFromThreat(threat);
  if (fromPipeline.length > 0) return fromPipeline;
  const src = (threat.source ?? '').trim();
  const lower = src.toLowerCase();
  if (lower.includes('top sector') || lower.includes('strategic intel')) {
    return STRATEGIC_INTEL_GRC_FALLBACK;
  }
  return '—';
}

/** Active board uses `threat.source` (ThreatEvent.sourceAgent). Block DMZ revert for sims / strategic intel / attbot. */
function isEnrichedIntelNoRevertSource(source: string | null | undefined): boolean {
  const s = (source ?? '').trim().toLowerCase();
  if (s.length === 0) return false;
  return (
    s.includes('simulation') ||
    s.includes('top sector') ||
    s.includes('strategic intel') ||
    s.includes('attbot') ||
    s.includes('kimbot') ||
    s.includes('grcbot')
  );
}

type ActiveThreatCardBodySource = {
  name?: string;
  description?: string;
  source?: string;
  industry?: string;
  target?: string;
  loss?: number;
  score?: number;
  aiReport?: string | null;
  ingestionDetails?: string | null;
};

function trimmedNonEmpty(s: string | null | undefined): string | undefined {
  if (typeof s !== 'string') return undefined;
  const t = s.trim();
  return t.length > 0 ? t : undefined;
}

function parseIngestionDescriptionOrSummary(ingestionDetails: string | null | undefined): string | undefined {
  const raw = trimmedNonEmpty(ingestionDetails);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const rec = parsed as Record<string, unknown>;
    const d = rec.description;
    const summ = rec.summary;
    if (typeof d === 'string' && d.trim()) return d.trim();
    if (typeof summ === 'string' && summ.trim()) return summ.trim();
    return undefined;
  } catch {
    return undefined;
  }
}

/** Card body: root fields first, then `aiReport`, then JSON `description`/`summary`, then heuristic line. */
function buildActiveThreatDisplayDescription(t: ActiveThreatCardBodySource): string {
  const fromDescription = trimmedNonEmpty(t.description);
  if (fromDescription) return fromDescription;
  const fromAi = trimmedNonEmpty(t.aiReport ?? undefined);
  if (fromAi) return fromAi;
  const fromIngestion = parseIngestionDescriptionOrSummary(t.ingestionDetails);
  if (fromIngestion) return fromIngestion;

  const loss = t.loss ?? t.score;
  const lossLine =
    typeof loss === 'number' && Number.isFinite(loss)
      ? `Liability ~ $${Number(loss.toFixed(1))}M`
      : undefined;
  const sector = trimmedNonEmpty(t.industry) ?? trimmedNonEmpty(t.target);
  const src = trimmedNonEmpty(t.source);
  const bits = [lossLine, sector, src].filter(Boolean) as string[];
  if (bits.length > 0) return bits.join(' · ');

  const name = trimmedNonEmpty(t.name);
  if (name) return `Registered threat: ${name}`;
  return 'No description payload found.';
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

function readChaosClosureMeta(
  ingestionDetails: string | null | undefined,
): {
  scenario:
    | "INTERNAL"
    | "HOME_SERVER"
    | "REMOTE"
    | "REMOTE_SUPPORT"
    | "CLOUD_EXFIL"
    | "CASCADING_FAILURE"
    | null;
  hasResolutionJustification: boolean;
} {
  const rec = parseJsonRecord(ingestionDetails);
  if (!rec) return { scenario: null, hasResolutionJustification: false };
  const rawScenario =
    typeof rec.chaosScenario === "string" ? rec.chaosScenario.trim().toUpperCase() : "";
  const scenario =
    rawScenario === "INTERNAL" ||
    rawScenario === "HOME_SERVER" ||
    rawScenario === "REMOTE" ||
    rawScenario === "CLOUD_EXFIL" ||
    rawScenario === "CASCADING_FAILURE" ||
    rawScenario === "REMOTE_SUPPORT"
      ? rawScenario
      : null;
  const hasResolutionJustification =
    typeof rec.resolutionJustification === "string" && rec.resolutionJustification.trim().length > 0;
  return { scenario, hasResolutionJustification };
}

function isChaosTestIngestionCard(threat: { ingestionDetails?: string | null }): boolean {
  return parseJsonRecord(threat.ingestionDetails)?.isChaosTest === true;
}

/**
 * Full Spectrum system-integrity dual-key: title must include one of KIMBOT, GRCBOT, ATTBOT
 * and `ingestionDetails.isChaosTest`. Drives claim → log → CISO → admin execute.
 */
function isDualKeyHandshakeDrillCard(threat: { name?: string; ingestionDetails?: string | null }): boolean {
  if (!isChaosTestIngestionCard(threat)) return false;
  const n = (threat.name ?? "").toUpperCase();
  return n.includes("KIMBOT") || n.includes("GRCBOT") || n.includes("ATTBOT");
}

type SimIntegrityBotKind = "KIMBOT" | "GRCBOT" | "ATTBOT";

function getDualKeySimBotKind(threat: {
  name?: string;
  ingestionDetails?: string | null;
}): SimIntegrityBotKind | null {
  if (!isDualKeyHandshakeDrillCard(threat)) return null;
  const n = (threat.name ?? "").toUpperCase();
  if (n.includes("KIMBOT")) return "KIMBOT";
  if (n.includes("GRCBOT")) return "GRCBOT";
  if (n.includes("ATTBOT")) return "ATTBOT";
  return null;
}

function getDualKeySopLabelForBot(bot: SimIntegrityBotKind): string {
  if (bot === "GRCBOT") {
    return "POLICY DEVIATION JUSTIFICATION (MIN 50 CHARACTERS). Input justification, then switch to CISO to unlock AUTHORIZE & SIGN MANIFEST.";
  }
  if (bot === "ATTBOT") {
    return "MANDATORY RECOVERY LOG (MIN 50 CHARACTERS). DOCUMENT COUNTERMEASURES IMMEDIATELY. SWITCH TO CISO FOR EMERGENCY SIGN-OFF.";
  }
  return "RESOLUTION JUSTIFICATION (MIN 50 CHARACTERS). Input justification, then switch to CISO to unlock AUTHORIZE & SIGN MANIFEST.";
}

function getCisoDualKeyHandshakeButtonLabel(
  bot: SimIntegrityBotKind | null,
): "CISO EMERGENCY ATTESTATION" | "AUTHORIZE & SIGN MANIFEST" {
  return bot === "ATTBOT" ? "CISO EMERGENCY ATTESTATION" : "AUTHORIZE & SIGN MANIFEST";
}

/** Fires a one-shot “power-on” SOP line when `assigneeId` transitions from unassigned to assigned. */
function AttbotRecoveryLogSopLabel({
  assigneeId,
  className,
  children,
}: {
  assigneeId: string | null | undefined;
  className: string;
  children: React.ReactNode;
}) {
  const prev = useRef<string | null | undefined>(undefined);
  const [powerOn, setPowerOn] = useState(false);
  useEffect(() => {
    const now = (assigneeId ?? "").trim() || null;
    if (prev.current === undefined) {
      prev.current = now;
      return;
    }
    if (!prev.current && now) {
      setPowerOn(true);
      prev.current = now;
      const t = window.setTimeout(() => setPowerOn(false), 520);
      return () => window.clearTimeout(t);
    }
    prev.current = now;
  }, [assigneeId]);
  return (
    <p
      className={`mb-2 text-[10px] font-bold uppercase leading-relaxed ${
        powerOn
          ? "animate-in fade-in slide-in-from-top-1 duration-500 ease-out [animation-fill-mode:forwards] motion-reduce:animate-none"
          : ""
      } ${className}`}
    >
      {children}
    </p>
  );
}

/** Chaos / Ironchaos — no Ironsight auto-ignite or deep-trace on these cards. */
function isChaosDrillThreat(threatLike: unknown): boolean {
  if (threatLike == null || typeof threatLike !== 'object') return false;
  const o = threatLike as Record<string, unknown>;
  const src = (typeof o.source === 'string' ? o.source : '').trim().toUpperCase();
  const srcAgent = (typeof o.sourceAgent === 'string' ? o.sourceAgent : '').trim().toUpperCase();
  if (
    src === "IRONCHAOS" ||
    srcAgent === "IRONCHAOS" ||
    src === "ATTACK_BOT" ||
    srcAgent === "ATTACK_BOT"
  ) {
    return true;
  }
  const rec = parseJsonRecord(o.ingestionDetails);
  if (rec && rec.isChaosTest === true) return true;
  return false;
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
  if (isChaosDrillThreat(threatLike)) {
    return (
      <div className="rounded border border-slate-700/80 bg-slate-900/50 p-2 threat-list-fade-in">
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
          IMPACTED ASSETS (BLAST RADIUS)
        </p>
        <span className="inline-flex max-w-full shrink-0 cursor-default truncate rounded-full bg-blue-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
          Chaos Drill Environment
        </span>
      </div>
    );
  }

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
  if (isChaosDrillThreat(threatLike)) return false;
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
  if (isChaosDrillThreat(threatLike)) {
    return null;
  }
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

function AssigneeHistorySection({
  entries,
  historyThreatEventId,
}: {
  entries: AssignmentChangedLogEntry[];
  /** Dev-only: logs when history is empty so `entityId` can be checked against AuditLog. */
  historyThreatEventId?: string | null;
}) {
  useEffect(() => {
    if (
      process.env.NODE_ENV === 'development' &&
      entries.length === 0 &&
      historyThreatEventId?.trim()
    ) {
      console.log(
        '[AssigneeHistory] No assignee audit rows yet; threat entityId =',
        historyThreatEventId.trim(),
      );
    }
  }, [entries, historyThreatEventId]);

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
      <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
        {entries.map((entry, idx) => (
          <li key={`${entry.id}-${idx}`} className="text-[10px] leading-snug text-slate-300">
            <span className="font-mono text-slate-500">{idx + 1}.</span>{" "}
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
}: Props) {
  const router = useRouter();
  const addStreamMessage = useAgentStore((s) => s.addStreamMessage);
  const [panicRunPending, startPanicRun] = useTransition();
  const [drillRunPending, startDrillRun] = useTransition();
  const [panicArmed, setPanicArmed] = useState(false);
  const panicDisarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (panicDisarmTimerRef.current) clearTimeout(panicDisarmTimerRef.current);
    };
  }, []);
  const activeThreats = useRiskStore((state) => state.activeThreats);
  const replaceActiveThreats = useRiskStore((state) => state.replaceActiveThreats);
  const confirmThreat = useRiskStore((state) => state.confirmThreat);
  const resolveThreat = useRiskStore((state) => state.resolveThreat);
  const revertThreatToPipeline = useRiskStore((state) => state.revertThreatToPipeline);
  const deAcknowledgeThreat = useRiskStore((state) => state.deAcknowledgeThreat);
  const selectedTenantName = useRiskStore((state) => state.selectedTenantName);
  const updatePipelineThreat = useRiskStore((state) => state.updatePipelineThreat);
  const setThreatActionError = useRiskStore((state) => state.setThreatActionError);
  const setActiveRiskIdStore = useRiskStore((state) => state.setActiveRiskId);
  const recoveryBoardSyncPending = useRiskStore((state) => state.recoveryBoardSyncPending);
  const selectedIndustry = useRiskStore((state) => state.selectedIndustry);
  const setForensicPlaybackThreatId = useRiskStore((state) => state.setForensicPlaybackThreatId);
  const chaosFlightRecorderByThreatId = useRiskStore((s) => s.chaosFlightRecorderByThreatId);
  const hasMountedClient = useHasMounted();
  const { activeTenantUuid } = useTenantContext();
  const effectiveTenantUuid = useMemo(
    () => resolveEffectiveTenantUuidForActions(activeTenantUuid, selectedTenantName),
    [activeTenantUuid, selectedTenantName],
  );

  const kimbotEnabled = useKimbotStore((s) => s.enabled);
  const grcBotEnabled = useGrcBotStore((s) => s.enabled);
  const enginesOn = kimbotEnabled || grcBotEnabled;
  const isSimulationMode = useSystemConfigStore().isSimulationMode;
  const handshakeRole = useShadowHandshakeRoleStore((s) => s.handshakeRole);

  useEffect(() => {
    if (handshakeRole === 'ADMIN') {
      setCisoSimAuthFlashByThreatId({});
    }
  }, [handshakeRole]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.log("DEBUG: Engines State:", { enginesOn, kimbotEnabled, grcBotEnabled });
  }, [enginesOn, kimbotEnabled, grcBotEnabled]);

  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});
  const [workNotes, setWorkNotes] = useState<Record<string, WorkNote[]>>({});
  const workNotesRef = useRef(workNotes);
  workNotesRef.current = workNotes;
  const [neutralizeAttestationDraftsByThreatId, setNeutralizeAttestationDraftsByThreatId] = useState<
    Record<string, string>
  >({});
  const [states, setStates] = useState<Record<string, LifecycleState>>({});
  const [successFlash, setSuccessFlash] = useState<Record<string, boolean>>({});
  const [cisoSimAuthFlashByThreatId, setCisoSimAuthFlashByThreatId] = useState<Record<string, boolean>>({});
  const [riskSearchQuery, setRiskSearchQuery] = useState('');
  const [executionToast, setExecutionToast] = useState<{
    text: string;
    variant: 'info' | 'error';
  } | null>(null);
  const [traceRunningThreatId, setTraceRunningThreatId] = useState<string | null>(null);
  const [executingActionKey, setExecutingActionKey] = useState<string | null>(null);
  const [recoveryThreatId, setRecoveryThreatId] = useState<string | null>(null);
  const [resolvingThreatIds, setResolvingThreatIds] = useState<Record<string, boolean>>({});
  const [remoteAccessAdminEligible, setRemoteAccessAdminEligible] = useState(false);
  const [remoteAccessBusyThreatId, setRemoteAccessBusyThreatId] = useState<string | null>(null);
  const [grantRemoteJitBusyThreatId, setGrantRemoteJitBusyThreatId] = useState<string | null>(null);
  const [auditHistoryModalOpen, setAuditHistoryModalOpen] = useState(false);
  const [manualRecoveryBusyThreatId, setManualRecoveryBusyThreatId] = useState<string | null>(null);
  const [recoveryFailureProbeById, setRecoveryFailureProbeById] = useState<Record<string, string>>({});
  const optimisticProcessingUntilRef = useRef<Map<string, number>>(new Map());
  const optimisticSettleTimersRef = useRef<Map<string, number>>(new Map());
  /** After dual-key claim, `focus()` moves the cursor into the remediation log (one textarea per card id). */
  const resolutionTextareaByCardIdRef = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const handleManualRecoveryBusy = useCallback((threatId: string, busy: boolean) => {
    setManualRecoveryBusyThreatId((prev) => {
      if (busy) return threatId;
      return prev === threatId ? null : prev;
    });
  }, []);
  const handleRecoveryErrorProbeChange = useCallback((threatId: string, text: string | null) => {
    setRecoveryFailureProbeById((prev) => {
      const next = { ...prev };
      if (text != null && text.trim() !== "") {
        const v = text.trim();
        if (next[threatId] === v) return prev;
        next[threatId] = v;
      } else {
        if (!(threatId in next)) return prev;
        delete next[threatId];
      }
      return next;
    });
  }, []);
  /** Registry / bulk gates: neutralize attestation drafts (≥50 chars per id). */
  const validateBulkNeutralizeAttestation = useCallback(
    (threatIds: string[]) =>
      allThreatDraftsPassJustificationQuality(threatIds, neutralizeAttestationDraftsByThreatId),
    [neutralizeAttestationDraftsByThreatId],
  );
  /** Prevents duplicate client-side `triggerDeepTrace` calls per threat id for this mount. */
  const ironsightAutoIgnitedRef = useRef(new Set<string>());
  /** Central conductor: ingestion / victory windows + slot-collapse purge (replaces per-card timers). */
  const [lifecycleRegistry, setLifecycleRegistry] = useState<Record<string, LifecycleRegistryEntry>>({});
  const lifecycleRegistryRef = useRef(lifecycleRegistry);
  lifecycleRegistryRef.current = lifecycleRegistry;
  const [exitingThreatIds, setExitingThreatIds] = useState(() => new Set<string>());
  const exitingThreatIdsRef = useRef(exitingThreatIds);
  exitingThreatIdsRef.current = exitingThreatIds;
  const [lifecycleSweep, setLifecycleSweep] = useState(0);
  const threatStatusPrevRef = useRef<Record<string, string>>({});
  const victoryPurgeScheduledRef = useRef(new Set<string>());
  const terminalResolvedSeenAtRef = useRef(new Map<string, number>());
  const humanConcurrenceAuditLoggedRef = useRef(new Set<string>());
  const [, startTraceTransition] = useTransition();
  const [, startExecTransition] = useTransition();

  useEffect(() => {
    if (executionToast == null) return;
    const id = window.setTimeout(() => setExecutionToast(null), 4800);
    return () => window.clearTimeout(id);
  }, [executionToast]);

  useEffect(() => {
    const onChaosDrillFailed = (e: Event) => {
      const ce = e as CustomEvent<{ message?: string }>;
      const m = ce.detail?.message?.trim();
      setExecutionToast({
        text:
          m && m.length > 0
            ? m
            : 'Attestation Failed: Could not write to immutable ledger.',
        variant: 'error',
      });
    };
    window.addEventListener('ironframe:chaos-drill-failed', onChaosDrillFailed);
    return () => window.removeEventListener('ironframe:chaos-drill-failed', onChaosDrillFailed);
  }, []);

  useEffect(() => {
    const clearSettleTimer = (id: string) => {
      const t = optimisticSettleTimersRef.current.get(id);
      if (t) {
        window.clearTimeout(t);
        optimisticSettleTimersRef.current.delete(id);
      }
    };
    const onOptimisticStart = (e: Event) => {
      const ce = e as CustomEvent<{ threat?: PipelineThreat; processingMs?: number }>;
      const threat = ce.detail?.threat;
      if (!threat?.id) return;
      const processingMs = Math.max(2000, ce.detail?.processingMs ?? 3000);
      optimisticProcessingUntilRef.current.set(threat.id, Date.now() + processingMs);
      const { activeThreats: at, replaceActiveThreats: rep } = useRiskStore.getState();
      rep([threat, ...at.filter((t) => t.id !== threat.id)]);
    };
    const onOptimisticSuccess = (e: Event) => {
      const ce = e as CustomEvent<{ optimisticId?: string }>;
      const id = ce.detail?.optimisticId?.trim();
      if (!id) return;
      const until = optimisticProcessingUntilRef.current.get(id) ?? Date.now();
      const waitMs = Math.max(0, until - Date.now());
      clearSettleTimer(id);
      const settleTimer = window.setTimeout(() => {
        const { activeThreats: at, replaceActiveThreats: rep } = useRiskStore.getState();
        rep(
          at.map((t) =>
            t.id === id
              ? { ...t, threatStatus: 'RESOLVED', lifecycleState: 'active' as const }
              : t,
          ),
        );
        requestVictoryLapFromNeutralize(id);
      }, waitMs);
      optimisticSettleTimersRef.current.set(id, settleTimer);
    };
    const onOptimisticFailed = (e: Event) => {
      const ce = e as CustomEvent<{ optimisticId?: string }>;
      const id = ce.detail?.optimisticId?.trim();
      if (!id) return;
      clearSettleTimer(id);
      const { activeThreats: at, replaceActiveThreats: rep } = useRiskStore.getState();
      rep(at.filter((t) => t.id !== id));
      optimisticProcessingUntilRef.current.delete(id);
    };
    window.addEventListener('ironframe:chaos-drill-optimistic-start', onOptimisticStart);
    window.addEventListener('ironframe:chaos-drill-optimistic-success', onOptimisticSuccess);
    window.addEventListener('ironframe:chaos-drill-optimistic-failed', onOptimisticFailed);
    return () => {
      window.removeEventListener('ironframe:chaos-drill-optimistic-start', onOptimisticStart);
      window.removeEventListener('ironframe:chaos-drill-optimistic-success', onOptimisticSuccess);
      window.removeEventListener('ironframe:chaos-drill-optimistic-failed', onOptimisticFailed);
      for (const t of optimisticSettleTimersRef.current.values()) {
        window.clearTimeout(t);
      }
      optimisticSettleTimersRef.current.clear();
      optimisticProcessingUntilRef.current.clear();
    };
  }, []);

  useEffect(() => {
    void getRemoteAccessAdminEligibility().then((r) => setRemoteAccessAdminEligible(r.eligible));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession();
  }, []);

  const refreshActiveThreatsFromDb = useCallback(async () => {
    const res = await fetch('/api/threats/active', { cache: 'no-store' });
    if (!res.ok) return;
    const fromDb = (await res.json()) as PipelineThreat[];
    replaceActiveThreats(fromDb);
  }, [replaceActiveThreats]);
  const refreshActiveThreatsFromDbRef = useRef(refreshActiveThreatsFromDb);
  refreshActiveThreatsFromDbRef.current = refreshActiveThreatsFromDb;

  const purgeResolvedThreatFromBoard = useCallback(
    (tid: string) => {
      const id = tid.trim();
      if (!id || victoryPurgeScheduledRef.current.has(id)) return;
      victoryPurgeScheduledRef.current.add(id);
      humanConcurrenceAuditLoggedRef.current.delete(id);
      terminalResolvedSeenAtRef.current.delete(id);
      setExitingThreatIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      window.setTimeout(() => {
        const { activeThreats: at, replaceActiveThreats: rep, removeThreatFromPipeline } =
          useRiskStore.getState();
        rep(at.filter((t) => t.id !== id));
        removeThreatFromPipeline(id);
        void useRiskStore.getState().refreshPipelineThreatsFromDb().catch(() => undefined);
        useAgentStore.getState().clearActiveThreatById(id);
        useRiskStore.getState().setNeutralizeVictoryAttestation(id, null);
        markRegistryResolvedForThreatEvent(id);
        runRiskRegistryResolvedPurgeNow();
        setLifecycleRegistry((r) => {
          if (!(id in r)) return r;
          const { [id]: _d, ...rest } = r;
          return rest;
        });
        setExitingThreatIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        void mutate("/api/threats/active");
        optimisticProcessingUntilRef.current.delete(id);
        victoryPurgeScheduledRef.current.delete(id);
      }, THREAT_EXIT_FADE_MS);
    },
    [],
  );

  useEffect(() => {
    registerActiveThreatVictoryLapHandler((tid) => {
      const id = tid.trim();
      if (!id) return;
      const storeThreat = useRiskStore.getState().activeThreats.find((t) => t.id === id);
      const ingestion = storeThreat?.ingestionDetails ?? null;
      const purgeBlocked = chaosVictoryLapPurgeBlocked(ingestion, {
        isRemoteAccessAuthorized: storeThreat?.isRemoteAccessAuthorized,
      });
      markRegistryResolvedForThreatEvent(id);
      useRiskStore.getState().setAuditLingerForThreat(id, ACTIVE_THREAT_LIFECYCLE_MS + THREAT_EXIT_FADE_MS + 200);
      setLifecycleRegistry((prev) => {
        const cur = prev[id];
        if (cur?.kind === "victory" && !cur.purgeBlockedForHumanConcurrence) {
          return prev;
        }
        return {
          ...prev,
          [id]: {
            kind: "victory",
            startedAt: Date.now(),
            isVictoryLap: true,
            purgeBlockedForHumanConcurrence: purgeBlocked,
          },
        };
      });
    });
    return () => registerActiveThreatVictoryLapHandler(null);
  }, []);

  useEffect(() => {
    const prev = threatStatusPrevRef.current;
    const activeIdSet = new Set(activeThreats.map((x) => x.id));

    setLifecycleRegistry((reg) => {
      let next = { ...reg };
      let changed = false;

      for (const t of activeThreats) {
        const tid = t.id;
        const s = (t.threatStatus ?? '').trim().toUpperCase();
        const was = prev[tid];

        if (s !== 'IDENTIFIED' && next[tid]?.kind === 'ingestion') {
          const { [tid]: _removed, ...rest } = next;
          next = rest;
          changed = true;
        }

        if (isTerminalBoardThreatStatus(s)) {
          const cur = next[tid];
          if (!cur || cur.kind === "ingestion") {
            markRegistryResolvedForThreatEvent(tid);
            next = { ...next, [tid]: armVictoryLapRegistryEntry(t) };
            changed = true;
            useRiskStore.getState().setAuditLingerForThreat(
              tid,
              ACTIVE_THREAT_LIFECYCLE_MS + THREAT_EXIT_FADE_MS + 200,
            );
          }
        }

        if (
          s === 'IDENTIFIED' &&
          isChaosThreatIdentifiedPipelineRow(t) &&
          readIngestionDiscoveryHoldMarkers(t.ingestionDetails)
        ) {
          if (!next[tid]) {
            next = { ...next, [tid]: { kind: 'ingestion', startedAt: Date.now() } };
            changed = true;
          }
        }
      }

      for (const key of Object.keys(next)) {
        if (activeIdSet.has(key)) continue;
        if (exitingThreatIdsRef.current.has(key)) continue;
        if (next[key]?.kind === 'victory') continue;
        const { [key]: _removed, ...rest } = next;
        next = rest;
        changed = true;
      }

      return changed ? next : reg;
    });

    threatStatusPrevRef.current = Object.fromEntries(
      activeThreats.map((x) => [x.id, (x.threatStatus ?? '').trim().toUpperCase()]),
    );
  }, [activeThreats]);

  useEffect(() => {
    const iv = window.setInterval(() => {
      const now = Date.now();

      setLifecycleRegistry((prev) => {
        let next = { ...prev };
        let changed = false;
        for (const [tid, e] of Object.entries(prev)) {
          if (e.kind === 'ingestion' && now >= e.startedAt + ACTIVE_THREAT_LIFECYCLE_MS) {
            const { [tid]: _r, ...rest } = next;
            next = rest;
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      const regSnapshot = { ...lifecycleRegistryRef.current };
      for (const [tid, e] of Object.entries(regSnapshot)) {
        if (e.kind !== 'victory') continue;

        const storeThreat = useRiskStore.getState().activeThreats.find((t) => t.id === tid);
        if (e.purgeBlockedForHumanConcurrence && storeThreat) {
          const merged = mergedWorkNotesForThreat(tid, storeThreat, workNotesRef.current);
          /** Chaos 4: remote handshake; all levels: GRC ack / User_00 concurrence. */
          const grcAckReleasesPurge = chaosDrillOperatorConcurrenceSatisfied(
            storeThreat.ingestionDetails,
          );
          const remoteHandshakeReleasesPurge =
            storeThreat.isRemoteAccessAuthorized === true ||
            chaosRemoteSupportHandshakeSatisfied(storeThreat.ingestionDetails);
          if (
            hasUser00ForensicConcurrence(merged) ||
            grcAckReleasesPurge ||
            remoteHandshakeReleasesPurge
          ) {
            const concurrenceBody = [...merged]
              .reverse()
              .find(
                (n) =>
                  (n.text ?? '').trim().length >= FORENSIC_ATTESTATION_MIN &&
                  (n.user ?? '').trim().toLowerCase() === 'user_00',
              );
            if (concurrenceBody && !humanConcurrenceAuditLoggedRef.current.has(tid)) {
              humanConcurrenceAuditLoggedRef.current.add(tid);
              appendAuditLog({
                action_type: 'NOTE_ADDED',
                log_type: 'GRC',
                description: `Human Concurrence (OFFICIAL — User_00): ${(concurrenceBody.text ?? '').trim().slice(0, 4000)}`,
                metadata_tag: appendForensicScoreToMetadataTag(
                  `threatId:${tid}|HUMAN_CONCURRENCE`,
                  (concurrenceBody.text ?? '').trim(),
                ),
              });
            }
            setLifecycleRegistry((r) => {
              const cur = r[tid];
              if (!cur || cur.kind !== 'victory') return r;
              return {
                ...r,
                [tid]: { ...cur, purgeBlockedForHumanConcurrence: false, startedAt: Date.now() },
              };
            });
          }
          continue;
        }

        if (now < e.startedAt + ACTIVE_THREAT_LIFECYCLE_MS) continue;
        purgeResolvedThreatFromBoard(tid);
      }

      for (const t of useRiskStore.getState().activeThreats) {
        const tid = t.id;
        const st = (t.threatStatus ?? "").trim().toUpperCase();
        if (!isTerminalBoardThreatStatus(st)) {
          terminalResolvedSeenAtRef.current.delete(tid);
          continue;
        }
        const reg = lifecycleRegistryRef.current[tid];
        if (reg?.kind === "victory" && reg.purgeBlockedForHumanConcurrence) continue;

        let anchorMs = reg?.kind === "victory" ? reg.startedAt : terminalResolvedSeenAtRef.current.get(tid);
        if (anchorMs == null) {
          terminalResolvedSeenAtRef.current.set(tid, now);
          if (!reg || reg.kind === "ingestion") {
            setLifecycleRegistry((r) => ({
              ...r,
              [tid]: armVictoryLapRegistryEntry(t),
            }));
          }
          continue;
        }
        if (now < anchorMs + ACTIVE_THREAT_LIFECYCLE_MS) continue;
        purgeResolvedThreatFromBoard(tid);
      }

      setLifecycleSweep((n) => n + 1);
    }, 100);
    return () => window.clearInterval(iv);
  }, [purgeResolvedThreatFromBoard]);

  const handleRemoteAccessToggleForThreat = (tid: string) => {
    setRemoteAccessBusyThreatId(tid);
    void toggleRemoteAccessAuthorization(tid)
      .then((r) => {
        if (r.success) {
          updatePipelineThreat(tid, { isRemoteAccessAuthorized: r.isRemoteAccessAuthorized });
          const activeRow = useRiskStore.getState().activeThreats.find((t) => t.id === tid);
          if (activeRow) {
            useRiskStore.getState().upsertActiveThreat({
              ...activeRow,
              isRemoteAccessAuthorized: r.isRemoteAccessAuthorized,
            });
          }
          if (r.isRemoteAccessAuthorized) {
            setLifecycleRegistry((reg) => {
              const cur = reg[tid];
              if (!cur || cur.kind !== 'victory' || !cur.purgeBlockedForHumanConcurrence) return reg;
              return {
                ...reg,
                [tid]: { ...cur, purgeBlockedForHumanConcurrence: false, startedAt: Date.now() },
              };
            });
          }
          router.refresh();
        } else {
          setThreatActionError({ active: true, message: r.error });
        }
      })
      .finally(() => setRemoteAccessBusyThreatId(null));
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
    const activeRow = activeThreats.find((t) => t.id === tid);
    if (activeRow && isChaosDrillThreat(activeRow)) {
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
            setExecutionToast({ text: `Remediation logged: ${label}`, variant: 'info' });
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
  /** After master purge, dashboard `risks` props can lag `router.refresh()` — hide prop-sourced rows until parent sends []. */
  const [purgePropRisksHidden, setPurgePropRisksHidden] = useState(false);
  const currentUser = 'dereck';
  const actorDisplayLabel = SESSION_OPERATOR_LABEL[currentUser] ?? currentUser;

  useEffect(() => {
    if (purgePropRisksHidden && risks.length === 0) {
      setPurgePropRisksHidden(false);
    }
  }, [risks, purgePropRisksHidden]);

  useEffect(() => {
    const onPurgeDetonated = () => {
      flushSync(() => {
        setPurgePropRisksHidden(true);
        setNoteDrafts({});
        setResolutionDrafts({});
        setWorkNotes({});
        setStates({});
        setSuccessFlash({});
        setRiskSearchQuery('');
        setResolvingThreatIds({});
        setRecoveryThreatId(null);
        setTraceRunningThreatId(null);
        setExecutingActionKey(null);
        setExecutionToast(null);
        setRemoteAccessBusyThreatId(null);
        setGrantRemoteJitBusyThreatId(null);
        setManualRecoveryBusyThreatId(null);
        setRecoveryFailureProbeById({});
        setAuditHistoryModalOpen(false);
        setActiveAction(null);
        setActiveActionCardId(null);
        setActiveActionThreatId(null);
        setSelectedReason('');
        setCustomJustification('');
        setAssignments({});
        setLifecycleRegistry({});
        setExitingThreatIds(new Set());
        victoryPurgeScheduledRef.current.clear();
        terminalResolvedSeenAtRef.current.clear();
        humanConcurrenceAuditLoggedRef.current.clear();
        ironsightAutoIgnitedRef.current.clear();
        for (const t of optimisticSettleTimersRef.current.values()) {
          window.clearTimeout(t);
        }
        optimisticSettleTimersRef.current.clear();
        optimisticProcessingUntilRef.current.clear();
      });
    };
    window.addEventListener('ironframe:grc-purge-detonated', onPurgeDetonated);
    return () => window.removeEventListener('ironframe:grc-purge-detonated', onPurgeDetonated);
  }, []);

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
    const tenantForAction = effectiveTenantUuid;
    if (!tenantForAction) {
      appendAuditLog({
        action_type: "SYSTEM_WARNING",
        log_type: "GRC",
        description: "Assignee not persisted: no active tenant scope (set cookie or tenant route).",
      });
      return;
    }
    /**
     * Drawer suppression: success path MUST NOT call `setSelectedThreatId` (opens ThreatDetailDrawer).
     * Only `setActiveRiskId` below — keeps dashboard flat so Audit Intelligence retains focus.
     */
    const res = await setThreatAssigneeAction(
      threatEventId,
      value === 'unassigned' ? null : value,
      tenantForAction,
      currentUser,
      SESSION_OPERATOR_LABEL[currentUser] ?? currentUser,
    );
    if (res && typeof res === 'object' && 'success' in res && res.success === false) {
      setThreatActionError({ active: true, message: res.error });
      return;
    }
    if (res && typeof res === "object" && "success" in res && res.success === true) {
      const sealedThreatId = threatEventId.trim();
      useRiskStore.getState().setActiveRiskId(sealedThreatId);
      appendAuditLog({
        action_type: "GRC_PROCESS_THREAT",
        log_type: "GRC",
        user_id: SESSION_OPERATOR_LABEL[currentUser] ?? currentUser,
        metadata_tag: `threatId:${threatEventId}|tenant:${tenantForAction}|ASSIGNEE_CHANGE|plane:shadow`,
        description: `Irongate assignment sealed for threat ${threatEventId.slice(0, 12)}… — Audit Intelligence synced.`,
      });
      const unassigned = value === "unassigned" || !value;
      const assign = unassigned ? undefined : value;
      if (!unassigned && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ironframe:irongate-claim-attestation"));
        const threat =
          useRiskStore.getState().activeThreats.find((x) => x.id === threatEventId) ??
          useRiskStore.getState().pipelineThreats.find((x) => x.id === threatEventId);
        if (threat && isDualKeyHandshakeDrillCard(threat)) {
          const bot = getDualKeySimBotKind(threat);
          if (bot) {
            dispatchWorkforceSimulationProcessing(workforceAgentsForDualKeyBot(bot));
          }
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ironframe:dashboard-refetch"));
      }
      const storeSnap = useRiskStore.getState();
      const threatRow =
        storeSnap.activeThreats.find((t) => t.id === threatEventId) ??
        storeSnap.pipelineThreats.find((t) => t.id === threatEventId);
      const baseHistory = mergeAssignmentHistoryEntries(
        threatRow?.assignmentHistory,
        threatRow?.ingestionDetails ?? null,
      );
      const nextHistory =
        "newLog" in res && res.newLog
          ? mergeAssignmentHistoryEntries([...baseHistory, res.newLog], threatRow?.ingestionDetails ?? null)
          : baseHistory;
      updatePipelineThreat(threatEventId, {
        assigneeId: assign,
        assignedTo: assign,
        assignmentHistory: nextHistory,
      });
      void storeSnap.refreshActiveThreatsFromDb().catch(() => undefined);
      if (!unassigned) {
        const t = useRiskStore.getState().activeThreats.find((x) => x.id === threatEventId);
        if (t && isDualKeyHandshakeDrillCard(t)) {
          const el = () => resolutionTextareaByCardIdRef.current[cardKey]?.focus();
          requestAnimationFrame(() => {
            el();
            window.setTimeout(el, 120);
          });
        }
      }
    }
    router.refresh();
  };

  const risksForBoard = purgePropRisksHidden ? [] : risks;

  // Only show DB risks that are non-simulation when engines are OFF + optional tenant filter
  const filteredRisks = risksForBoard.filter((r) => {
    if (!enginesOn && r.isSimulation === true) return false;
    if (selectedTenantName && r.company.name !== selectedTenantName) return false;
    return true;
  });
  // Only hide legacy optimistic ids when engines are OFF. DB-backed ids always pass that gate.
  /** Active rows come from `GET /api/threats/active`, already tenant-scoped — do not match `selectedTenantName`
   *  (company handshake label like "Medshield Health") against `industry`/`target` (`ChaosLab`, sector entity, …) or all cards vanish. */
  const filteredActiveThreats = useMemo(() => {
    return activeThreats.filter((t) => {
      if (!enginesOn && (t.id.startsWith("grcbot-") || t.id.startsWith("kimbot-"))) return false;
      return true;
    });
  }, [activeThreats, enginesOn]);

  const visibleRisks = filteredRisks.filter((r) => states[r.id] !== 'resolved');
  const visibleActiveThreats = filteredActiveThreats.filter((t) => {
    if ((states[t.id] ?? t.lifecycleState ?? "active") === "resolved") return false;
    const st = (t.threatStatus ?? "").trim().toUpperCase();
    if (!isTerminalBoardThreatStatus(st)) return true;
    const reg = lifecycleRegistry[t.id];
    const now = Date.now();
    const purgeBlocked =
      reg?.kind === "victory" && Boolean(reg.purgeBlockedForHumanConcurrence);
    const inVictoryLap =
      reg?.kind === "victory" &&
      !purgeBlocked &&
      now < reg.startedAt + ACTIVE_THREAT_LIFECYCLE_MS;
    return inVictoryLap;
  });

  void lifecycleSweep;

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

  const showCompliance = useComplianceOverlayStore((s) => s.showCompliance);
  const appendGrAuditEntry = useComplianceOverlayStore((s) => s.appendAuditEntry);
  const grAuditHistory = useComplianceOverlayStore((s) => s.auditHistory);

  const recordChaosAcknowledgeAudit = useCallback(
    (threatId: string, ingestionDetails: string | null | undefined) => {
      const rec = parseJsonRecord(ingestionDetails);
      const isChaos = rec?.isChaosTest === true;
      const scen =
        typeof rec?.chaosScenario === 'string' ? rec.chaosScenario.trim().toUpperCase() : null;
      if (!isChaos && !scen) return;
      const lkg =
        typeof rec?.lkgAttestationIroncoreSha256 === 'string'
          ? rec.lkgAttestationIroncoreSha256.trim()
          : null;
      const frameworks = frameworkBadgesForChaosScenario(scen, isChaos);
      appendGrAuditEntry({
        threatId,
        eventType: 'ACKNOWLEDGED',
        scenario: scen,
        lkgAttestationIroncoreSha256: lkg,
        recoverySeconds: null,
        frameworkBadges: frameworks,
        controlLabel: chaosComplianceCoverageLabel(scen, isChaos),
      });
    },
    [appendGrAuditEntry],
  );

  useEffect(() => {
    for (const t of sortedActiveThreats) {
      if ((t.threatStatus ?? '').trim().toUpperCase() !== 'RESOLVED') continue;
      if (!isChaosDrillThreat(t)) continue;
      const rec = parseJsonRecord(t.ingestionDetails);
      const autonomousRecoveredAt =
        typeof rec?.autonomousRecoveredAt === 'string' ? rec.autonomousRecoveredAt.trim() : '';
      if (!autonomousRecoveredAt) continue;
      const created = t.createdAt?.trim();
      if (!created) continue;
      const sec = (Date.parse(autonomousRecoveredAt) - Date.parse(created)) / 1000;
      if (!Number.isFinite(sec) || sec < 0) continue;
      const scen =
        typeof rec?.chaosScenario === 'string' ? rec.chaosScenario.trim().toUpperCase() : null;
      const lkg =
        typeof rec?.lkgAttestationIroncoreSha256 === 'string'
          ? rec.lkgAttestationIroncoreSha256.trim()
          : null;
      const frameworks = frameworkBadgesForChaosScenario(scen, true);
      appendGrAuditEntry({
        threatId: t.id,
        eventType: 'AUTONOMOUS_RESOLVED',
        scenario: scen,
        lkgAttestationIroncoreSha256: lkg,
        recoverySeconds: sec,
        frameworkBadges: frameworks,
        controlLabel: chaosComplianceCoverageLabel(scen, true),
      });
    }
  }, [sortedActiveThreats, appendGrAuditEntry]);

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

  useEffect(() => {
    const interval = window.setInterval(() => {
      const list = sortedActiveThreatsRef.current;
      const hasActiveItems = list.some(
        (t) => (t.threatStatus ?? '').trim().toUpperCase() !== 'RESOLVED',
      );
      if (!hasActiveItems) return;
      void refreshActiveThreatsFromDbRef.current();
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [router]);

  const runDeepTraceRef = useRef(runDeepTrace);
  runDeepTraceRef.current = runDeepTrace;

  useEffect(() => {
    if (traceRunningThreatId != null) return;
    const st = statesRef.current;
    const tryIgnite = (threatLike: unknown, tid: string): boolean => {
      const id = tid.trim();
      if (!id || ironsightAutoIgnitedRef.current.has(id)) return false;
      if (isChaosDrillThreat(threatLike)) return false;
      if (!threatNeedsIronsightAutoTrace(threatLike)) return false;
      ironsightAutoIgnitedRef.current.add(id);
      runDeepTraceRef.current(id);
      return true;
    };
    for (const t of sortedActiveThreatsRef.current) {
      if (isChaosDrillThreat(t)) continue;
      const life = (st[t.id] ?? t.lifecycleState ?? 'active') as LifecycleState;
      if (life !== 'active') continue;
      if (tryIgnite(t, t.id)) return;
    }
    for (const r of sortedRisksRef.current) {
      if (isChaosDrillThreat(r)) continue;
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
    const fromStore = useRiskStore.getState().activeThreats.find((t) => t.id === riskId);
    const assigneeValue = assignedFor(
      riskId,
      fromStore?.assigneeId ?? (fromStore as { assignedTo?: string } | undefined)?.assignedTo,
      riskId,
    );
    const noteUser =
      assigneeValue === 'User_00' || assigneeValue.toLowerCase() === 'user_00'
        ? 'User_00'
        : SESSION_OPERATOR_LABEL[currentUser] ?? currentUser;
    const note: WorkNote = {
      timestamp: new Date().toISOString(),
      text: draft,
      user: noteUser,
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
      const at = useRiskStore.getState().activeThreats.find((x) => x.id === risk.threatId);
      recordChaosAcknowledgeAudit(risk.threatId, at?.ingestionDetails ?? risk.ingestionDetails ?? null);
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

  const resolutionJustificationBlock = (
    cardKey: string,
    options?: {
      sopLabel?: string | null;
      claimLocked?: boolean;
      attbotBreach?: boolean;
      /** For ATTBOT SOP “power-on” when assigneeId becomes set. */
      threatAssigneeId?: string | null;
      /** After claim, which placeholder copy to use. */
      unlockedSop?: "att" | "governance" | "generic";
    },
  ) => {
    const resolutionText = resolutionDrafts[cardKey] ?? '';
    const len = resolutionText.length;
    const lenOk = len >= 50;
    const claimLocked = options?.claimLocked === true;
    const attbotBreach = options?.attbotBreach === true;
    const unlockedSop = options?.unlockedSop ?? "generic";
    const labelText = options?.sopLabel?.trim()
      ? options.sopLabel
      : "RESOLUTION JUSTIFICATION (MIN 50 CHARACTERS)";
    const placeholder = (() => {
      if (claimLocked) return "Ownership required to initiate log...";
      if (unlockedSop === "att")
        return "Document countermeasures and recovery steps here...";
      if (unlockedSop === "governance") return "Input justification for governance manifest...";
      return attbotBreach
        ? "Document countermeasures and recovery steps here..."
        : options?.sopLabel
          ? "Minimum 50 characters, then follow Control Room identity: CISO → approve, then ADMIN → execute."
          : "Explain remediation outcome and closure rationale for the audit trail...";
    })();
    return (
      <div
        className={`block w-full max-w-full min-w-0 rounded-md border-2 p-4 ${
          claimLocked ? "opacity-60 grayscale-[0.5] " : ""
        }${
          attbotBreach
            ? "border-slate-100/15 bg-slate-950/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
            : "border-amber-400/70 bg-amber-950/20"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {attbotBreach && !claimLocked ? (
          <AttbotRecoveryLogSopLabel
            assigneeId={options?.threatAssigneeId}
            className="text-slate-100/90"
          >
            {labelText}
          </AttbotRecoveryLogSopLabel>
        ) : (
          <p
            className={`mb-2 text-[10px] font-bold uppercase leading-relaxed ${
              attbotBreach ? "text-slate-100/90" : "text-amber-200"
            }`}
          >
            {labelText}
          </p>
        )}
        <textarea
          ref={(el) => {
            resolutionTextareaByCardIdRef.current[cardKey] = el;
          }}
          rows={4}
          value={resolutionText}
          disabled={claimLocked}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setResolutionDrafts((prev) => ({ ...prev, [cardKey]: e.target.value }))
          }
          onClick={(e) => e.stopPropagation()}
          placeholder={placeholder}
          className={`mb-4 w-full min-h-[96px] min-w-0 max-w-full resize-y rounded border bg-slate-950 px-3 py-2 text-[11px] text-slate-100 outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
            attbotBreach
              ? "border-slate-200/20 placeholder:text-slate-500 focus:border-slate-200/35"
              : "border-amber-500/60 placeholder:text-amber-200/40 focus:border-amber-400"
          }`}
          aria-label="Resolution justification"
        />
        <div
          className={`flex flex-col gap-1 border-t pt-3 text-[10px] font-semibold sm:flex-row sm:items-center sm:justify-between ${
            attbotBreach ? "border-slate-100/10" : "border-amber-500/25"
          } ${claimLocked ? "hidden" : ""}`}
          aria-hidden={claimLocked || undefined}
        >
          <span
            className={`leading-snug ${lenOk ? (attbotBreach ? "text-white" : "text-slate-200") : "text-slate-500"}`}
          >
            50+ characters required to resolve.
          </span>
          <span
            className={`font-mono tabular-nums ${lenOk ? (attbotBreach ? "text-white" : "text-slate-200") : "text-slate-500"}`}
            aria-label={`${len} of 50 minimum characters`}
          >
            {len} / 50 min
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 font-sans" data-testid="active-risks-board">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-white font-sans">ACTIVE RISKS</h2>
          <button
            type="button"
            disabled={panicRunPending}
            onClick={() => {
              if (panicRunPending) return;
              if (!panicArmed) {
                setPanicArmed(true);
                if (panicDisarmTimerRef.current) clearTimeout(panicDisarmTimerRef.current);
                panicDisarmTimerRef.current = setTimeout(() => {
                  setPanicArmed(false);
                  panicDisarmTimerRef.current = null;
                }, 3000);
                return;
              }
              if (panicDisarmTimerRef.current) {
                clearTimeout(panicDisarmTimerRef.current);
                panicDisarmTimerRef.current = null;
              }
              setPanicArmed(false);
              startPanicRun(async () => {
                const r = await deprioritizeAllAgentsPanicAction(Date.now());
                if (r.ok) {
                  addStreamMessage(r.narrative);
                  router.refresh();
                }
              });
            }}
            className={`shrink-0 rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              panicArmed
                ? "motion-safe:animate-pulse border-rose-600 bg-rose-600/45 text-rose-50 shadow-[0_0_16px_rgba(225,29,72,0.55)] hover:border-rose-500 hover:bg-rose-600/55"
                : "border-rose-600/70 bg-rose-950/40 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.35)] hover:border-rose-500 hover:bg-rose-900/50"
            }`}
          >
            {panicRunPending ? "Applying…" : panicArmed ? "CONFIRM OVERRIDE?" : "Deprioritize all"}
          </button>
          <button
            type="button"
            disabled={drillRunPending}
            onClick={() =>
              startDrillRun(async () => {
                const r = await triggerInfiltrationDrill(Date.now());
                if (r.ok) {
                  addStreamMessage(
                    `> [INFILTRATION_DRILL] Mode ${r.mode} — threat ${r.threatId.slice(0, 8)}… lifecycle queued.`,
                  );
                  router.refresh();
                }
              })
            }
            className="shrink-0 rounded border border-cyan-500/50 bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-100 transition-colors hover:border-cyan-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {drillRunPending ? "Starting…" : "Infiltration drill"}
          </button>
        </div>
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
        {isEmpty && !recoveryBoardSyncPending ? (
          <div className="rounded border border-slate-800 bg-slate-950/40 p-4 text-center font-sans text-sm text-slate-500">
            [ WAITING FOR RISK CONFIRMATION... ]
          </div>
        ) : (
          <>
        {recoveryBoardSyncPending ? (
          <div
            className="rounded-lg border border-slate-600/50 bg-slate-800/35 p-4 shadow-inner animate-pulse"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <p className="text-center font-sans text-[11px] font-bold uppercase tracking-wide text-slate-400">
              [IRONTECH] Initializing Recovery Path...
            </p>
          </div>
        ) : null}
        <AnimatePresence mode="popLayout">
        {sortedActiveThreats.map((threat) => {
          void lifecycleSweep;
          const dbStatusUpper = (threat.threatStatus ?? '').trim().toUpperCase();
          const isArchived = dbStatusUpper === 'CLOSED_ARCHIVED';
          const isResolvedInDb = dbStatusUpper === 'RESOLVED';
          const reg = lifecycleRegistry[threat.id];
          const nowLifecycle = Date.now();
          const purgeBlockedForConcurrence =
            reg?.kind === 'victory' && Boolean(reg.purgeBlockedForHumanConcurrence);
          const inVictoryLapWindow =
            exitingThreatIds.has(threat.id) ||
            (reg?.kind === 'victory' &&
              reg.isVictoryLap &&
              !purgeBlockedForConcurrence &&
              nowLifecycle < reg.startedAt + ACTIVE_THREAT_LIFECYCLE_MS);
          const stickyResolvedVisual = isResolvedInDb || inVictoryLapWindow;
          const victoryLapContentGhost =
            exitingThreatIds.has(threat.id) ||
            (reg?.kind === 'victory' &&
              reg.isVictoryLap &&
              !purgeBlockedForConcurrence &&
              nowLifecycle >= reg.startedAt + VICTORY_LAP_GHOST_MS);
          const isIngestionDiscoveryHold = Boolean(
            reg?.kind === 'ingestion' &&
              nowLifecycle < reg.startedAt + ACTIVE_THREAT_LIFECYCLE_MS,
          );
          const statusRaw = (() => {
            if (isArchived) return 'CLOSED_ARCHIVED';
            if (isResolvedInDb || stickyResolvedVisual) return 'RESOLVED';
            return (threat.threatStatus ?? '').trim().toUpperCase();
          })();
          const isActuallyResolved = statusRaw === 'RESOLVED';

          const lifecycle: LifecycleState =
            isResolvedInDb || stickyResolvedVisual || isArchived
              ? 'resolved'
              : (states[threat.id] as LifecycleState | undefined) ??
                ((threat.lifecycleState as LifecycleState | undefined) ?? 'active');
          const threatServerAssignee = (threat.assigneeId ?? threat.assignedTo ?? null) as string | null;
          const assigneeValue = assignedFor(threat.id, threatServerAssignee, threat.id);
          /** Canonical `User_00` / legacy `user_00` — non-empty assignees are treated as assigned (not unassigned). */
          const isUnassigned = assigneeValue === 'unassigned';
          const isActive =
            !isActuallyResolved &&
            !isArchived &&
            (statusRaw === 'CONFIRMED' || statusRaw === 'MITIGATED');
          /** Resolved always wins emerald styling; never flash red on resolved rows. */
          const shouldFlash = !isActuallyResolved && !isArchived && isUnassigned && isActive;
          let infiltrationCriticalFlash = false;
          try {
            const ing = JSON.parse(
              (threat.ingestionDetails as string | undefined) ?? "{}",
            ) as Record<string, unknown>;
            const ae = ing.autoEscalation as Record<string, unknown> | undefined;
            infiltrationCriticalFlash =
              !isActuallyResolved &&
              (ing.severityBadge === "CRITICAL" || ae?.label === "CRITICAL");
          } catch {
            infiltrationCriticalFlash = false;
          }
          const notes = workNotes[threat.id] ?? (threat.workNotes ?? []);
          const grcDisplayText = displayGrcJustificationForActiveThreat({
            justification: threat.justification,
            ingestionDetails: threat.ingestionDetails,
            workNotes: notes,
            source: threat.source,
          });
          const canRevertToPipeline = !isEnrichedIntelNoRevertSource(threat.source);
          const displayDescription = buildActiveThreatDisplayDescription(threat);
          const assigneeHistoryForCard = mergeAssignmentHistoryEntries(
            [
              ...(threat.assignmentHistory ?? []),
              ...(threatEventHistoryById.get(threat.id) ?? []).filter(
                (row) =>
                  !(threat.assignmentHistory ?? []).some((local) => local.id === row.id),
              ),
            ],
            threat.ingestionDetails ?? null,
          );
          const isExpanded = true;
          const liabilityM = threat.score ?? threat.loss;
          const supplyChainImpact = computeSupplyChainImpact({
            name: threat.name,
            description: displayDescription,
            source: threat.source,
            liabilityInMillions: typeof liabilityM === "number" ? liabilityM : undefined,
          });

          const resolutionText = resolutionDrafts[threat.id] ?? '';
          const resolutionLenOk = resolutionText.trim().length >= 50;

          const chaosClosureMeta = readChaosClosureMeta(threat.ingestionDetails ?? null);
          const isRemoteSupportJitGate = isRemoteSupportAwaitingJitGrant(
            statusRaw,
            threat.ingestionDetails ?? null,
          );
          const isRemoteIntervention =
            !isRemoteSupportJitGate &&
            statusRaw === 'MITIGATED' &&
            Boolean(threat.remoteTechId || threat.isRemoteAccessAuthorized);
          const isEscalatedThreat =
            statusRaw === 'MITIGATED' && !isRemoteIntervention && !isRemoteSupportJitGate;
          const optimisticProcessing =
            (optimisticProcessingUntilRef.current.get(threat.id) ?? 0) > Date.now();
          const isResolveInFlight = resolvingThreatIds[threat.id] === true;
          /** Chaos drills: require persisted `RESOLVED` — do not treat local/JSON justification as closure. */
          const isChaosBoardThreat = isChaosDrillThreat(threat);
          const isLowerSeverityManualTask =
            ((threat.assigneeId || (threat as any).assignedTo)?.trim().toLowerCase() ?? '') === 'user_00';
          const isAutonomousClosed =
            isActuallyResolved ||
            (!isChaosBoardThreat && chaosClosureMeta.hasResolutionJustification);
          const irontechLive = parseIrontechLiveFromIngestion(threat.ingestionDetails ?? null);
          const infrastructureErrorProbeText = joinErrorProbeParts([
            ...(irontechLive?.attempts.map((a) => a.error) ?? []),
            threat.ingestionDetails ?? undefined,
            recoveryFailureProbeById[threat.id],
          ]);
          const irontechAttemptCount = irontechLive?.attempts?.length ?? 0;
          const sourceUpper = (threat.source ?? '').trim().toUpperCase();
          const isIrontechFamilySource =
            irontechAttemptCount > 0 ||
            sourceUpper.startsWith('IRON') ||
            sourceUpper.includes('IRONTECH');
          const chaosCardAgeMs = (() => {
            const iso = threat.createdAt?.trim();
            if (!iso) return 0;
            const t = Date.parse(iso);
            return Number.isNaN(t) ? 0 : Date.now() - t;
          })();
          const chaosMitigationSpinnerKill =
            isChaosDrillThreat(threat) &&
            !isActuallyResolved &&
            chaosCardAgeMs > 10_000;
          const ironTechAgentPhase =
            isActuallyResolved || chaosMitigationSpinnerKill || isRemoteSupportJitGate
              ? null
              : optimisticProcessing
                ? 'mitigating'
              : statusRaw === 'CONFIRMED' &&
                  irontechAttemptCount < 3 &&
                  isIrontechFamilySource
                ? 'mitigating'
                : manualRecoveryBusyThreatId === threat.id
                  ? 'mitigating'
                  : null;
          const chaosVisualState: 'active' | 'processing' | 'resolved' | null =
            isChaosBoardThreat
              ? isActuallyResolved
                ? 'resolved'
                : optimisticProcessing || isResolveInFlight
                  ? 'processing'
                  : 'active'
              : null;
          const lowerSeverityVisualState: 'assigned' | 'processing' | 'corrected' | null =
            isChaosBoardThreat && isLowerSeverityManualTask
              ? isActuallyResolved
                ? 'corrected'
                : optimisticProcessing || isResolveInFlight
                  ? 'processing'
                  : 'assigned'
              : null;
          const chaosCardShellClass =
            lowerSeverityVisualState === 'corrected'
              ? '!border-l-2 !border-emerald-500/80 !bg-emerald-950/40'
              : lowerSeverityVisualState === 'processing'
                ? '!border-l-2 !border-amber-500/80 !bg-amber-950/40 animate-pulse'
                : lowerSeverityVisualState === 'assigned'
                  ? '!border-l-2 !border-blue-500/80 !bg-blue-950/40'
                  : chaosVisualState === 'resolved'
                    ? 'border-l-2 border-emerald-500/90 bg-emerald-950/30 shadow-[0_0_15px_rgba(52,211,153,0.15)] transition-all duration-500'
                    : chaosVisualState === 'processing'
                      ? 'border-l-2 border-teal-500/80 animate-pulse bg-teal-950/20'
                      : chaosVisualState === 'active'
                        ? 'border-l-2 border-rose-600/80'
                        : '';
          const chaosStatusPillClass =
            lowerSeverityVisualState === 'corrected'
              ? 'bg-emerald-900/50 border border-emerald-700/50 text-emerald-200 text-[9px] font-black uppercase'
              : lowerSeverityVisualState === 'processing'
                ? 'bg-amber-900/50 border border-amber-700/50 text-amber-200 text-[9px] font-black uppercase'
                : lowerSeverityVisualState === 'assigned'
                  ? 'bg-blue-900/50 border border-blue-700/50 text-blue-200 text-[9px] font-black uppercase'
                  : chaosVisualState === 'resolved'
                    ? 'bg-emerald-950/80 border border-emerald-500/90 text-emerald-200 text-[9px] font-black uppercase'
                    : chaosVisualState === 'processing'
                      ? 'bg-teal-950/50 border border-teal-600/70 text-teal-200 text-[9px] font-black uppercase'
                      : 'bg-rose-950/70 border border-rose-800/60 text-rose-200 text-[9px] font-black uppercase';
          const irontechFailureAnimToken =
            irontechLive && irontechLive.streamSeq > 0
              ? `${threat.id}:${irontechLive.streamSeq}`
              : undefined;
          const blockEscalatedCardOverlay = isEscalatedThreat
            ? (e: MouseEvent) => {
                e.stopPropagation();
              }
            : undefined;

          const suppressOpsTechnicalPanels =
            isAutonomousClosed || statusRaw === 'MITIGATED';

          const isDualKeyDrill = isDualKeyHandshakeDrillCard(threat);
          const dualKeySimBot = getDualKeySimBotKind(threat);
          const hasDualKeyResolutionApproval = hasResolutionApprovalIdOnThreat(threat);
          const attbotPreAuthorizationGlow =
            isDualKeyDrill && dualKeySimBot === "ATTBOT" && !hasDualKeyResolutionApproval;

          const defaultConfirmResolve =
            lifecycle === 'active'
              ? async () => {
                  await confirmThreat(threat.id, 'admin-user-01');
                  recordChaosAcknowledgeAudit(threat.id, threat.ingestionDetails ?? null);
                  setStates((prev) => ({ ...prev, [threat.id]: 'confirmed' }));
                  setSuccessFlash((prev) => ({ ...prev, [threat.id]: true }));
                  setTimeout(() => setSuccessFlash((prev) => ({ ...prev, [threat.id]: false })), 1500);
                  if (isDualKeyDrill) {
                    const bot = getDualKeySimBotKind(threat);
                    if (bot) {
                      dispatchWorkforceSimulationProcessing(workforceAgentsForDualKeyBot(bot));
                    }
                  }
                }
              : lifecycle === 'confirmed'
                ? async () => {
                    try {
                      setResolvingThreatIds((prev) => ({ ...prev, [threat.id]: true }));
                      await resolveThreat(threat.id, 'admin-user-01', resolutionText.trim(), actorDisplayLabel);
                      appendAuditLog({
                        action_type: 'NOTE_ADDED',
                        log_type: 'GRC',
                        description: `Human Concurrence (OFFICIAL — RESOLUTION): ${resolutionText.trim().slice(0, 4000)}`,
                        metadata_tag: appendForensicScoreToMetadataTag(
                          `threatId:${threat.id}|HUMAN_CONCURRENCE`,
                          resolutionText.trim(),
                        ),
                      });
                      setResolutionDrafts((prev) => {
                        const next = { ...prev };
                        delete next[threat.id];
                        return next;
                      });
                      if (isDualKeyDrill) {
                        const bot = getDualKeySimBotKind(threat);
                        if (bot) {
                          dispatchWorkforceSimulationProcessing(workforceAgentsForDualKeyBot(bot));
                        }
                      }
                    } catch {
                      // threatActionError set in store
                    } finally {
                      setResolvingThreatIds((prev) => {
                        const next = { ...prev };
                        delete next[threat.id];
                        return next;
                      });
                    }
                  }
                : undefined;

          /** Full Spectrum (KIM/GRC/ATT): `!threat.assigneeId` (and assignedTo alias) means unclaimed — log + CISO/Admin stay locked. */
          const hasPersistedAssignee = Boolean(
            String((threat.assigneeId ?? (threat as { assignedTo?: string }).assignedTo ?? "").trim())
          );
          const needsDualKeyClaim = isDualKeyDrill && !hasPersistedAssignee; // i.e. !threat.assigneeId for dual-key cards

          let buttonLabel =
            lifecycle === 'active' ? 'CONFIRM THREAT' : lifecycle === 'confirmed' ? 'RESOLVE THREAT' : 'RESOLVED';
          let onPrimaryClick: (() => void | Promise<void>) | undefined = defaultConfirmResolve;

          if (needsDualKeyClaim) {
            buttonLabel = 'CLAIM & ASSIGN THREAT';
            onPrimaryClick = () => void persistThreatAssignee(threat.id, threat.id, currentUser);
          } else if (isDualKeyDrill && lifecycle === 'confirmed') {
            if (handshakeRole === 'CISO' && !hasDualKeyResolutionApproval) {
              buttonLabel = getCisoDualKeyHandshakeButtonLabel(dualKeySimBot);
              onPrimaryClick = async () => {
                try {
                  setResolvingThreatIds((prev) => ({ ...prev, [threat.id]: true }));
                  setThreatActionError({ active: false, message: '' });
                  const res = await generateSimulationApproval(threat.id);
                  if (!res.success) {
                    setThreatActionError({ active: true, message: res.error });
                    return;
                  }
                  if (dualKeySimBot) {
                    dispatchWorkforceSimulationProcessing(workforceAgentsForDualKeyBot(dualKeySimBot));
                  }
                  setCisoSimAuthFlashByThreatId((prev) => ({ ...prev, [threat.id]: true }));
                  await refreshActiveThreatsFromDb();
                  router.refresh();
                } finally {
                  setResolvingThreatIds((prev) => {
                    const next = { ...prev };
                    delete next[threat.id];
                    return next;
                  });
                }
              };
            } else if (hasDualKeyResolutionApproval && handshakeRole === 'ADMIN') {
              buttonLabel = 'EXECUTE RESOLUTION';
              onPrimaryClick = defaultConfirmResolve;
            } else if (hasDualKeyResolutionApproval && handshakeRole === 'CISO') {
              buttonLabel = 'AUTHORIZATION COMPLETE';
              onPrimaryClick = undefined;
            } else {
              buttonLabel = 'EXECUTE RESOLUTION';
              onPrimaryClick = undefined;
            }
          }

          const primaryCtaDisplayLabel = displayPrimaryCtaLabel(isSimulationMode, buttonLabel);

          const dualKeyAssignmentBlocked = needsDualKeyClaim;

          const dualKeyPrimaryLocked = (() => {
            if (!isDualKeyDrill) return false;
            if (needsDualKeyClaim) return false; // only enabled control is claim primary
            if (lifecycle !== 'confirmed') return false;
            if (handshakeRole === 'CISO' && !hasDualKeyResolutionApproval) {
              return !resolutionLenOk;
            }
            if (handshakeRole === 'CISO' && hasDualKeyResolutionApproval) {
              return true;
            }
            if (handshakeRole === 'ADMIN' && hasDualKeyResolutionApproval) {
              return false;
            }
            return true;
          })();

          const defaultPrimaryDisabled = lifecycle === 'confirmed' && !isDualKeyDrill && !resolutionLenOk;
          const primaryActionDisabled =
            !onPrimaryClick || defaultPrimaryDisabled || dualKeyPrimaryLocked;
          // For KIM/GRC/ATT, `needsDualKeyClaim` (no assigneeId) drives the single CLAIM & ASSIGN CTA; otherwise dualKeyPrimaryLocked enforces CISO/justification rules once assigned.
          const dualKeyResolutionFooterTitle = needsDualKeyClaim
            ? 'Assign this threat to yourself, then the remediation log and CISO/Admin actions unlock.'
            : undefined;

          const activeRiskShieldBadge =
            hasMountedClient && selectedIndustry === "Defense" ? DEFENSE_REGULATORY_SHIELD_BADGE_LABEL : null;

          const showNeutralizeAttestation =
            lifecycle === 'confirmed' &&
            !isActuallyResolved &&
            !isArchived &&
            !isDualKeyDrill;

          return (
            <motion.div
              key={threat.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: THREAT_EXIT_FADE_MS / 1000, ease: 'easeOut' }}
              className="min-h-0"
            >
            <ThreatCard
              cardThreatId={threat.id}
              showCompliance={showCompliance}
              suppressRemoteTechnicianHeader={isChaosDrillThreat(threat)}
              failureAnimToken={irontechFailureAnimToken}
              ironTechAgentPhase={ironTechAgentPhase}
              ingestionBootstrapFromIso={
                threat.createdAt ??
                (isSimulationMode
                  ? '2000-01-01T00:00:00.000Z'
                  : null)
              }
              ingestionBootstrapEnabled={
                statusRaw === 'CONFIRMED' && !isRemoteIntervention && !isEscalatedThreat
              }
              threatStatus={statusRaw || null}
              irontechAttemptCount={irontechAttemptCount}
              infrastructureErrorProbeText={infrastructureErrorProbeText}
              ingestionDetailsRaw={threat.ingestionDetails ?? null}
              isVictoryLap={inVictoryLapWindow}
              victoryLapContentGhost={victoryLapContentGhost}
              isIngestionDiscoveryHold={isIngestionDiscoveryHold}
              intelligenceFooter={
                isChaosBoardThreat ? (
                  <ChaosShadowAuditFeed
                    ingestionDetails={threat.ingestionDetails}
                    pendingStatusLine={chaosFlightRecorderByThreatId[threat.id]?.statusLine ?? null}
                  />
                ) : undefined
              }
              showNeutralizeAttestation={showNeutralizeAttestation}
              onNeutralizeAttestationDraftChange={(text) =>
                setNeutralizeAttestationDraftsByThreatId((prev) => ({ ...prev, [threat.id]: text }))
              }
              actorDisplayNameForNeutralize={actorDisplayLabel}
              registryNeutralizeAttestationOk={validateBulkNeutralizeAttestation([threat.id])}
              neutralizeAttestationContext={{
                threatName: threat.name,
                target: threat.target,
                industry: threat.industry,
                selectedTenantName,
              }}
              manualRecoveryInline={
                statusRaw === 'MITIGATED' && !isRemoteIntervention ? (
                  <InlineManualRecoveryBlock
                    threatId={threat.id}
                    onBusyChange={handleManualRecoveryBusy}
                    onRecoveryErrorProbeChange={handleRecoveryErrorProbeChange}
                    onSynced={() => {
                      void refreshActiveThreatsFromDb();
                      router.refresh();
                    }}
                  />
                ) : null
              }
              isEscalated={isEscalatedThreat}
              isRemoteIntervention={isRemoteIntervention}
              remoteTechId={threat.remoteTechId}
              isRemoteAccessAuthorized={threat.isRemoteAccessAuthorized}
              canAuthorizeRemoteAccess={remoteAccessAdminEligible}
              onRemoteAccessToggle={() => handleRemoteAccessToggleForThreat(threat.id)}
              remoteAccessBusy={remoteAccessBusyThreatId === threat.id}
              onEscalatedActivate={
                isRemoteIntervention ? () => setRecoveryThreatId(threat.id) : undefined
              }
              suppressAutoSurfaceOverride={isChaosBoardThreat}
              className={`group flex flex-col justify-between rounded-lg overflow-hidden border border-slate-800 bg-slate-950/80 shadow-inner transition-all duration-500 ${
                isChaosBoardThreat
                  ? chaosCardShellClass
                  : isActuallyResolved || isArchived
                    ? 'border-emerald-400 bg-emerald-900/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : isRemoteIntervention
                      ? 'border-amber-800/50 bg-amber-950/25 hover:border-amber-600/50 z-10'
                      : isEscalatedThreat
                        ? 'border-rose-600/55 bg-rose-950/15 hover:border-rose-500/70 z-10'
                        : infiltrationCriticalFlash
                          ? 'animate-pulse border-red-600 bg-red-950/25 shadow-[0_0_24px_rgba(239,68,68,0.55)] z-10'
                        : shouldFlash
                          ? 'animate-pulse border-red-500 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                          : ''
              } ${
                attbotPreAuthorizationGlow
                  ? "ring-1 ring-inset ring-slate-100/20 border-slate-100/15 bg-slate-950/90 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
                  : ""
              } p-4`}
            >
              <ChaosFlightSelfHealedBanner threatId={threat.id} />
              {purgeBlockedForConcurrence ? (
                <div className="mb-2 rounded border border-amber-500/50 bg-amber-950/30 px-2 py-2 text-[10px] leading-snug text-amber-100/95">
                  <p className="font-black uppercase tracking-wide text-amber-200">
                    Forensic gate — Chaos L4 remote handshake
                  </p>
                  <p className="mt-1">
                    Remote Support requires verified JIT / sidecar handshake before this seat releases. Grant remote
                    access or complete GRC concurrence, then the 4s victory lap will purge this row.
                  </p>
                </div>
              ) : null}
              <div className="flex w-full items-start justify-between text-left">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-slate-200">
                    <Link
                      href={`/threats/${threat.id}`}
                      onClick={(e) => {
                        blockEscalatedCardOverlay?.(e);
                        e.preventDefault();
                        setActiveRiskIdStore(threat.id);
                      }}
                      className="hover:text-blue-200 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-950 rounded"
                    >
                      {threat.name}
                    </Link>
                  </h3>
                  {hasMountedClient && activeRiskShieldBadge ? (
                    <span
                      className="mt-1 inline-flex rounded border border-emerald-600/50 bg-emerald-950/50 px-1.5 py-0.5 text-[8px] font-bold tracking-wide text-emerald-100/95"
                      title="GRC Gold — CMMC L3 regulatory shield (defense profile or governed ingest)"
                    >
                      {activeRiskShieldBadge}
                    </span>
                  ) : null}
                  {(() => {
                    const custody =
                      threat.forensicCustody ??
                      parseForensicCustodyFromIngestion(threat.ingestionDetails ?? undefined);
                    if (!custody?.length) return null;
                    return (
                      <div
                        className="mt-2 w-full max-w-md rounded border border-violet-800/40 bg-violet-950/20 px-2 py-1.5"
                        role="region"
                        aria-label="Forensic chain of custody"
                      >
                        <p className="text-[8px] font-black uppercase tracking-wider text-violet-300/90">
                          Forensic path (chain of custody)
                        </p>
                        <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[9px] text-slate-400">
                          {custody.map((step) => (
                            <li key={`${threat.id}-${step.agentId}-${step.signedAt}`}>
                              <span className="font-mono text-violet-400/90">
                                {step.agentId === FORENSIC_CUSTODY_PRODUCT_OWNER_AGENT_ID
                                  ? "Product Owner"
                                  : `Agent ${step.agentId}`}
                              </span>{" "}
                              {step.phase} ·{" "}
                              <time dateTime={step.signedAt} className="text-slate-500">
                                {new Date(step.signedAt).toLocaleString()}
                              </time>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })()}
                  <IronsightComplianceTagsBadges threatLike={threat} />
                  <p className="mt-1 font-mono text-[10px] text-slate-500">{threat.id}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Target: <span className="text-slate-400">{threat.target ?? threat.industry ?? 'Healthcare'}</span>
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">{displayDescription}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <GovernanceHeartbeat threatId={threat.id} className="text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setForensicPlaybackThreatId(threat.id)}
                      className="rounded border border-violet-700/55 bg-violet-950/40 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-violet-200/95 hover:bg-violet-900/45"
                    >
                      Why?
                    </button>
                  </div>
                  {threat.agentReasonings && threat.agentReasonings.length > 0 ? (
                    <div
                      className="mt-2 w-full max-w-md rounded border border-emerald-500/35 bg-emerald-950/25 px-2 py-1.5"
                      role="region"
                      aria-label="Audit-Ready Reason"
                    >
                      <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-200/90">
                        Audit-Ready Reason
                      </p>
                      <ul className="mt-1 max-h-32 space-y-1.5 overflow-y-auto text-left">
                        {threat.agentReasonings.map((ar) => (
                          <li
                            key={ar.id}
                            className="border-l-2 border-emerald-500/40 pl-2 text-[10px] leading-snug text-slate-300"
                          >
                            <span className="font-mono text-[9px] text-emerald-400/90">{ar.agentId}</span>
                            <p className="whitespace-pre-wrap text-slate-400">{ar.reasoning}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2" onPointerDown={blockEscalatedCardOverlay}>
                  {isChaosBoardThreat ? (
                    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 ${chaosStatusPillClass}`}>
                      {lowerSeverityVisualState === 'corrected' ? (
                        <ShieldCheck className="h-3 w-3" aria-hidden />
                      ) : lowerSeverityVisualState === 'processing' ? (
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                      ) : lowerSeverityVisualState === 'assigned' ? (
                        <ClipboardList className="h-3 w-3" aria-hidden />
                      ) : chaosVisualState === 'resolved' ? (
                        <ShieldCheck className="h-3 w-3" aria-hidden />
                      ) : chaosVisualState === 'processing' ? (
                        <Radar className="h-3 w-3" aria-hidden />
                      ) : (
                        <AlertTriangle className="h-3 w-3" aria-hidden />
                      )}
                      {chaosBoardStatusPillText(
                        isSimulationMode,
                        lowerSeverityVisualState,
                        chaosVisualState,
                      )}
                    </span>
                  ) : null}
                  <Link
                    href={`/threats/${threat.id}`}
                    onClick={(e) => {
                      blockEscalatedCardOverlay?.(e);
                      e.preventDefault();
                      setActiveRiskIdStore(threat.id);
                    }}
                    className="inline-flex items-center gap-1 rounded border border-slate-600 bg-slate-800/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-200 transition-colors hover:border-blue-500/60 hover:bg-blue-500/10 hover:text-blue-200"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden />
                    Assess Risk
                  </Link>
                  {!isAutonomousClosed && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => void persistThreatAssignee(threat.id, threat.id, currentUser)}
                        disabled={assigneeValue === currentUser}
                        className={`px-2 py-1 border rounded transition-colors ${
                          assigneeValue === currentUser
                            ? 'bg-ironcore-accent/20 border-ironcore-accent text-ironcore-accent cursor-default'
                            : 'bg-ironcore-bg border-ironcore-border text-ironcore-text hover:bg-ironcore-highlight'
                        }`}
                      >
                        {assigneeValue === currentUser
                          ? '✔️ Claimed'
                          : isSimulationMode
                            ? '🖐️ Claim'
                            : '🖐️ Claim & Assign'}
                      </button>
                      <select
                        value={assigneeValue}
                        onChange={(e) => void persistThreatAssignee(threat.id, threat.id, e.target.value)}
                        className="px-2 py-1 bg-black border border-ironcore-border text-ironcore-text rounded focus:outline-none focus:border-ironcore-accent"
                      >
                        <option value="unassigned">Unassigned</option>
                        <option value="dereck">Dereck</option>
                        <option value="User_00">User_00</option>
                        <option value="user_01">user_01</option>
                        <option value="secops">SecOps Team</option>
                        <option value="grc">GRC Team</option>
                        <option value="netsec">NetSec</option>
                      </select>
                    </div>
                  )}
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
                    {optimisticProcessing
                      ? isSimulationMode
                        ? 'Processing'
                        : 'VERIFY EVIDENCE'
                      : isAutonomousClosed
                        ? isSimulationMode
                          ? 'Autonomous recovery completed'
                          : '✅ AUDITED'
                        : isRemoteIntervention
                          ? 'Remote specialist queue'
                          : statusRaw === 'MITIGATED'
                            ? 'Escalated — manual recovery'
                            : lifecycle === 'active'
                              ? isSimulationMode
                                ? 'Just Acknowledged'
                                : 'ACKNOWLEDGE'
                              : lifecycle === 'confirmed'
                                ? isSimulationMode
                                  ? 'Confirmed'
                                  : 'VERIFY EVIDENCE'
                                : isSimulationMode
                                  ? 'Resolved'
                                  : '✅ AUDITED'}
                  </span>
                  <ActiveRiskSlaBadge ttlSeconds={threat.ttlSeconds ?? null} createdAtIso={threat.createdAt ?? null} />
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 space-y-3 rounded-md border border-slate-800 bg-slate-950/60 p-3">
                  <div className="space-y-1">
                    <AssigneeHistorySection
                      entries={assigneeHistoryForCard}
                      historyThreatEventId={threat.id}
                    />
                    {irontechLive && irontechLive.attempts.length > 0 ? (
                      <div className="rounded border border-cyan-800/45 bg-cyan-950/25 p-2">
                        <p className="text-[9px] font-black uppercase tracking-wide text-cyan-200/95">
                          Irontech recovery attempts (live)
                        </p>
                        <ul className="mt-1.5 max-h-32 space-y-1 overflow-y-auto">
                          {irontechLive.attempts.map((a) => (
                            <li
                              key={`${a.at}-${a.attempt}`}
                              className="border-b border-slate-800/60 pb-1 text-[10px] text-slate-300 last:border-0 last:pb-0"
                            >
                              <span className="font-mono text-[9px] text-cyan-400/90">
                                Attempt {a.attempt}/{a.max}
                              </span>
                              <span
                                className={`mt-0.5 block ${
                                  chaosClosureMeta.scenario === 'CASCADING_FAILURE' &&
                                  a.error.includes('Restoring from LKG')
                                    ? 'font-semibold text-amber-200/95'
                                    : 'text-slate-400'
                                }`}
                              >
                                {a.error}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {irontechLive.lastTerminalLine.trim() !== '' ? (
                          <p
                            className={`mt-2 border-t border-cyan-700/45 pt-2 font-mono text-[10px] leading-snug ${
                              chaosClosureMeta.scenario === 'CASCADING_FAILURE' &&
                              irontechLive.lastTerminalLine.includes('Restoring from LKG')
                                ? 'text-amber-200'
                                : 'text-amber-100/95'
                            }`}
                            role="status"
                            aria-live="polite"
                          >
                            <span className="mb-1 block text-[8px] font-black uppercase tracking-wide text-amber-400/90">
                              Irontech live line
                            </span>
                            <span
                              className={`block whitespace-pre-wrap ${
                                chaosClosureMeta.scenario === 'CASCADING_FAILURE' &&
                                irontechLive.lastTerminalLine.includes('Restoring from LKG')
                                  ? 'font-semibold'
                                  : ''
                              }`}
                            >
                              {irontechLive.lastTerminalLine}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {isRemoteSupportJitGate ? (
                      <div className="mt-4 rounded-md border border-amber-500/50 bg-amber-950/20 p-3">
                        <p className="mb-2 text-sm font-semibold text-amber-400">
                          [ACTION REQUIRED] Ironframe Tier 3 requests diagnostic access.
                        </p>
                        <button
                          type="button"
                          disabled={grantRemoteJitBusyThreatId === threat.id}
                          onClick={() => {
                            void (async () => {
                              setGrantRemoteJitBusyThreatId(threat.id);
                              try {
                                const clientAttr = await fetchChaosLedgerClientAttribution();
                                const r = await grantRemoteAccessAction(
                                  threat.id,
                                  clientAttr ?? undefined,
                                );
                                if (!r.ok) {
                                  setThreatActionError({ active: true, message: r.error });
                                  return;
                                }
                                await refreshActiveThreatsFromDb();
                                requestVictoryLapFromNeutralize(threat.id);
                                router.refresh();
                              } finally {
                                setGrantRemoteJitBusyThreatId(null);
                              }
                            })();
                          }}
                          className="rounded bg-amber-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-500 disabled:opacity-60"
                        >
                          {grantRemoteJitBusyThreatId === threat.id
                            ? 'Working…'
                            : 'GRANT 2-HOUR ACCESS'}
                        </button>
                      </div>
                    ) : null}
                    <div className="rounded border border-slate-700 bg-slate-900/70 p-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        GRC JUSTIFICATION (FROM PIPELINE TRIAGE)
                      </p>
                      <p
                        className="mt-1 whitespace-pre-wrap text-[10px] text-slate-200"
                        role="note"
                        aria-label="GRC justification from pipeline triage (read-only)"
                      >
                        {grcDisplayText}
                      </p>
                    </div>

                    {isActuallyResolved && !isArchived && threat.postMortemReportPath ? (
                      <PostMortemReportSection threatId={threat.id} threatName={threat.name} />
                    ) : null}
                    {isArchived && threat.postMortemReportPath ? (
                      <div className="rounded border border-slate-600/50 bg-slate-900/40 p-2 text-[9px] text-slate-500">
                        Forensic post-mortem on file — case status{' '}
                        <span className="font-mono text-slate-400">CLOSED_ARCHIVED</span> (Product Owner
                        signed).
                      </div>
                    ) : null}

                    {!suppressOpsTechnicalPanels && (
                      <>
                        <ImpactedBlastRadiusSection
                          threatLike={threat}
                          threatEventId={threat.id}
                          deepTraceRunning={traceRunningThreatId === threat.id}
                        />

                        {!(isActuallyResolved || isChaosDrillThreat(threat)) ? (
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
                        ) : null}
                      </>
                    )}

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
                    <PipelineSelfTestBar
                      threatId={threat.id}
                      threatTitle={threat.name}
                      threatStatus={statusRaw || null}
                      likelihood={threat.likelihood ?? 8}
                      impact={threat.impact ?? 9}
                      ingestionDetails={threat.ingestionDetails ?? null}
                      sourceComponentPath="app/components/ActiveRisksClient.tsx"
                      onAfterAction={() => router.refresh()}
                    />
                  </div>

                  <div className="mt-1 w-full max-w-full space-y-4">
                    {lifecycle === 'confirmed' && !suppressOpsTechnicalPanels && (
                      <div className="w-full min-w-0 max-w-full">
                        {resolutionJustificationBlock(threat.id, {
                          sopLabel: (() => {
                            if (isDualKeyDrill) {
                              return getDualKeySopLabelForBot(dualKeySimBot ?? "KIMBOT");
                            }
                            if (isChaosTestIngestionCard(threat)) {
                              return getDualKeySopLabelForBot("KIMBOT");
                            }
                            return null;
                          })(),
                          claimLocked: dualKeyAssignmentBlocked,
                          attbotBreach: isDualKeyDrill && dualKeySimBot === "ATTBOT",
                          threatAssigneeId: threat.assigneeId ?? null,
                          unlockedSop: dualKeyAssignmentBlocked
                            ? "generic"
                            : isDualKeyDrill && dualKeySimBot === "ATTBOT"
                              ? "att"
                              : isDualKeyDrill
                                ? "governance"
                                : "generic",
                        })}
                        {dualKeyAssignmentBlocked ? (
                          <p
                            className="mt-2 text-[9px] font-semibold leading-snug text-amber-300/95"
                            role="note"
                            aria-live="polite"
                          >
                            Claim and assign this threat before entering justification or authorization.
                          </p>
                        ) : null}
                        {isDualKeyDrill && !dualKeyAssignmentBlocked && lifecycle === 'confirmed' ? (
                          <>
                            {resolutionLenOk && handshakeRole === 'ADMIN' && !hasDualKeyResolutionApproval ? (
                              <p className="mt-2 text-[9px] font-medium leading-relaxed text-sky-300/95" role="status">
                                Justification met. Switch to CISO to Authorize.
                              </p>
                            ) : null}
                            {handshakeRole === 'CISO' && !resolutionLenOk && !hasDualKeyResolutionApproval ? (
                              <p className="mt-2 text-[9px] text-slate-400" role="status">
                                Awaiting justification (min 50 characters).
                              </p>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    )}

                    <div className="flex w-full flex-wrap items-center justify-between gap-2">
                    {successFlash[threat.id] && (
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                        Stakeholders Notified
                      </div>
                    )}
                    {isAutonomousClosed && (
                      <div className="ml-auto">
                        <button
                          type="button"
                          onClick={() => {
                            useAgentStore.getState().clearActiveThreatById(threat.id);
                            replaceActiveThreats(activeThreats.filter((t) => t.id !== threat.id));
                            void refreshActiveThreatsFromDb();
                            router.refresh();
                          }}
                          className="rounded border border-emerald-500/60 bg-emerald-950/35 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200 hover:bg-emerald-900/40"
                        >
                          Acknowledge
                        </button>
                      </div>
                    )}
                    {!suppressOpsTechnicalPanels && (
                    <div
                      className={`flex w-full min-w-0 flex-col gap-2 ${
                        lifecycle === 'confirmed' && isDualKeyDrill ? 'items-stretch' : 'ml-auto items-end'
                      }`}
                    >
                      {(cisoSimAuthFlashByThreatId[threat.id] ||
                        (handshakeRole === 'CISO' && hasDualKeyResolutionApproval)) &&
                      isDualKeyDrill &&
                      lifecycle === 'confirmed' ? (
                        <div
                          role="status"
                          className="w-full max-w-md rounded border border-emerald-600/50 bg-emerald-950/35 px-2 py-2 text-left"
                        >
                          <p className="text-[9px] font-black uppercase tracking-wide text-emerald-200">
                            Success: Authorization generated
                          </p>
                          <p className="mt-1 text-[9px] leading-snug text-emerald-100/95">
                            Switch back to Admin to finalize.
                          </p>
                        </div>
                      ) : null}
                      <div
                        className={`flex w-full flex-wrap gap-2 ${
                          lifecycle === 'confirmed' && isDualKeyDrill
                            ? 'flex-col items-stretch sm:flex-row sm:items-center sm:justify-end'
                            : 'items-center justify-end'
                        }`}
                      >
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
                                const tenantId = effectiveTenantUuid;
                                if (!tenantId) {
                                  appendAuditLog({
                                    action_type: "SYSTEM_WARNING",
                                    log_type: "GRC",
                                    description: "Action blocked: no active tenant scope.",
                                  });
                                  return;
                                }
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
                                    recordChaosAcknowledgeAudit(threat.id, threat.ingestionDetails ?? null);
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
                              disabled={
                                !selectedReason.trim() ||
                                customJustification.trim().length < 50 ||
                                dualKeyAssignmentBlocked
                              }
                              className={`rounded bg-emerald-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white shadow ${
                                customJustification.trim().length < 50 || dualKeyAssignmentBlocked
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
                      ) : needsDualKeyClaim ? (
                        <button
                          type="button"
                          disabled={primaryActionDisabled}
                          title={dualKeyResolutionFooterTitle}
                          onClick={() => void onPrimaryClick?.()}
                          className="w-full rounded px-3 py-1.5 text-[10px] font-black uppercase tracking-wide shadow sm:w-auto bg-amber-500 text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {primaryCtaDisplayLabel}
                        </button>
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
                              {canRevertToPipeline ? (
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
                              ) : null}
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
                                {isSimulationMode ? 'CONFIRM THREAT' : 'ACKNOWLEDGE'}
                              </button>
                            </>
                          )}
                          {lifecycle !== 'active' && (
                            <button
                              type="button"
                              disabled={primaryActionDisabled}
                              title={dualKeyResolutionFooterTitle}
                              onClick={() => void onPrimaryClick?.()}
                              className={`rounded px-3 py-1.5 text-[10px] font-black uppercase tracking-wide shadow ${
                                lifecycle === 'confirmed' && isDualKeyDrill ? 'w-full sm:w-auto' : ''
                              } ${
                                lifecycle === 'confirmed'
                                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                              } disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                              {resolvingThreatIds[threat.id] &&
                              isDualKeyDrill &&
                              lifecycle === 'confirmed' &&
                              handshakeRole === 'CISO' &&
                              !hasDualKeyResolutionApproval
                                ? dualKeySimBot === "ATTBOT"
                                  ? "Attesting…"
                                  : "Signing…"
                                : primaryCtaDisplayLabel}
                            </button>
                          )}
                        </>
                      )}
                      </div>
                    </div>
                    )}
                    </div>
                  </div>
                </div>
              )}
            </ThreatCard>
            </motion.div>
          );
        })}
        </AnimatePresence>

        {sortedRisks.map((risk) => {
          const lifecycle: LifecycleState = states[risk.id] ?? 'active';
          const isUnassigned = assignedFor(risk.id, risk.assigneeId, risk.threatId) === 'unassigned';
          const isActive = lifecycle === 'active';
          const shouldFlash = isUnassigned && isActive;
          const notes = workNotes[risk.id] ?? [];
          const riskThreatRow = risk.threatId
            ? useRiskStore.getState().activeThreats.find((t) => t.id === risk.threatId) ??
              useRiskStore.getState().pipelineThreats.find((t) => t.id === risk.threatId)
            : undefined;
          const riskAssigneeHistory = mergeAssignmentHistoryEntries(
            [
              ...(riskThreatRow?.assignmentHistory ?? []),
              ...(risk.threatId ? (threatEventHistoryById.get(risk.threatId) ?? []) : []).filter(
                (row) =>
                  !(riskThreatRow?.assignmentHistory ?? []).some((local) => local.id === row.id),
              ),
            ],
            riskThreatRow?.ingestionDetails ?? null,
          );
          const isExpanded = true;
          const supplyChainImpact = computeSupplyChainImpact({
            title: risk.title,
            source: risk.source,
          });

          const resolutionText = resolutionDrafts[risk.id] ?? '';
          const resolutionLenOk = resolutionText.trim().length >= 50;

          const buttonLabelRaw =
            lifecycle === 'active' ? 'CONFIRM THREAT' : lifecycle === 'confirmed' ? 'RESOLVE THREAT' : 'RESOLVED';
          const buttonLabel = displayPrimaryCtaLabel(isSimulationMode, buttonLabelRaw);

          const onPrimaryClick =
            lifecycle === 'active'
              ? () => handleConfirmThreat(risk)
              : lifecycle === 'confirmed'
              ? () => void handleResolveThreat(risk)
              : undefined;

          return (
            <div
              key={risk.id}
              className={`group flex flex-col justify-between rounded-lg border transition-all duration-500 ${
                shouldFlash
                  ? 'animate-pulse border-red-500 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.5)] z-10 scale-[1.01]'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700/80'
              } p-4`}
            >
              <div className="flex w-full items-start justify-between text-left">
                <div>
                  <button
                    type="button"
                    aria-label={`View threat details: ${risk.title}`}
                    className="text-left text-sm font-medium text-slate-200 hover:text-blue-200 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 rounded"
                    onClick={() => {
                      if (risk.threatId) setActiveRiskIdStore(risk.threatId);
                    }}
                  >
                    {risk.title}
                  </button>
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
                      {assignedFor(risk.id, risk.assigneeId, risk.threatId) === currentUser
                        ? '✔️ Claimed'
                        : isSimulationMode
                          ? '🖐️ Claim'
                          : '🖐️ Claim & Assign'}
                    </button>
                    <select
                      value={assignedFor(risk.id, risk.assigneeId, risk.threatId)}
                      onChange={(e) => void persistThreatAssignee(risk.id, risk.threatId, e.target.value)}
                      className="px-2 py-1 bg-black border border-ironcore-border text-ironcore-text rounded focus:outline-none focus:border-ironcore-accent"
                    >
                      <option value="unassigned">Unassigned</option>
                      <option value="dereck">Dereck</option>
                      <option value="User_00">User_00</option>
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
                      ? isSimulationMode
                        ? 'Just Acknowledged'
                        : 'ACKNOWLEDGE'
                      : lifecycle === 'confirmed'
                        ? isSimulationMode
                          ? 'Confirmed'
                          : 'VERIFY EVIDENCE'
                        : isSimulationMode
                          ? 'Resolved'
                          : '✅ AUDITED'}
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
                  <AssigneeHistorySection
                    entries={riskAssigneeHistory}
                    historyThreatEventId={risk.threatId ?? undefined}
                  />
                  <ImpactedBlastRadiusSection
                    threatLike={risk}
                    threatEventId={risk.threatId ?? null}
                    deepTraceRunning={
                      risk.threatId != null && risk.threatId !== '' && traceRunningThreatId === risk.threatId
                    }
                  />
                  {!(lifecycle === 'resolved' || isChaosDrillThreat(risk)) ? (
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
                  ) : null}
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
                                  const at0 = useRiskStore.getState().activeThreats.find((x) => x.id === threatId);
                                  recordChaosAcknowledgeAudit(
                                    threatId,
                                    at0?.ingestionDetails ?? risk.ingestionDetails ?? null,
                                  );
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
                          {isSimulationMode ? 'CONFIRM THREAT' : 'ACKNOWLEDGE'}
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

      <div className="mt-6 border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => setAuditHistoryModalOpen(true)}
          className="rounded border border-slate-600 bg-slate-900/80 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
        >
          View audit logs
        </button>
      </div>

      {auditHistoryModalOpen ? (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="grc-audit-modal-title"
        >
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-lg border border-slate-600 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h2 id="grc-audit-modal-title" className="text-sm font-bold uppercase tracking-wide text-slate-100">
                Compliance audit history
              </h2>
              <button
                type="button"
                onClick={() => setAuditHistoryModalOpen(false)}
                className="rounded border border-slate-600 px-2 py-1 text-[10px] font-bold uppercase text-slate-400 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="max-h-[calc(85vh-56px)] overflow-auto p-4">
              <p className="mb-3 text-[9px] text-slate-500">
                Persisted locally (acknowledgements + autonomous recoveries). Hash, recovery time, and framework map
                are captured per event.
              </p>
              <table className="w-full border-collapse text-left text-[10px] text-slate-300">
                <thead>
                  <tr className="border-b border-slate-700 text-[8px] font-black uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-2">Time</th>
                    <th className="py-2 pr-2">Threat</th>
                    <th className="py-2 pr-2">Event</th>
                    <th className="py-2 pr-2">Frameworks</th>
                    <th className="py-2 pr-2">Recovery</th>
                    <th className="py-2 pr-2">SHA256</th>
                    <th className="py-2">Control</th>
                  </tr>
                </thead>
                <tbody>
                  {grAuditHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No audit entries yet. Confirm a chaos drill or complete an autonomous recovery.
                      </td>
                    </tr>
                  ) : (
                    grAuditHistory.map((row) => (
                      <tr key={row.id} className="border-b border-slate-800/90 align-top">
                        <td className="py-2 pr-2 font-mono text-[9px] text-slate-400 whitespace-nowrap">
                          {row.recordedAt}
                        </td>
                        <td className="py-2 pr-2 font-mono text-cyan-300/90">{row.threatId}</td>
                        <td className="py-2 pr-2">{row.eventType}</td>
                        <td className="max-w-[100px] py-2 pr-2 break-words text-slate-400">
                          {row.frameworkBadges.length ? row.frameworkBadges.join(', ') : '—'}
                        </td>
                        <td className="py-2 pr-2 font-mono text-emerald-300/90">
                          {row.recoverySeconds != null ? `${row.recoverySeconds.toFixed(1)}s` : '—'}
                        </td>
                        <td className="max-w-[140px] py-2 pr-2 break-all font-mono text-[8px] text-slate-500">
                          {row.lkgAttestationIroncoreSha256 ?? '—'}
                        </td>
                        <td className="py-2 text-slate-400">{row.controlLabel ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      <ManualRecoveryOverlay
        threatId={recoveryThreatId}
        onClose={() => setRecoveryThreatId(null)}
        onResolved={() => {
          void refreshActiveThreatsFromDb();
          router.refresh();
        }}
      />

      {executionToast != null && (
        <div
          className={`pointer-events-auto fixed bottom-6 right-6 z-[100] max-w-sm threat-list-fade-in rounded-lg border px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-sm ${
            executionToast.variant === 'error'
              ? 'border-rose-600/70 bg-rose-950/95'
              : 'border-cyan-500/45 bg-slate-950/95'
          }`}
          role="alert"
          aria-live="assertive"
        >
          <p
            className={`text-xs font-semibold tracking-wide ${
              executionToast.variant === 'error' ? 'text-rose-100' : 'text-cyan-100'
            }`}
          >
            {executionToast.text}
          </p>
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
