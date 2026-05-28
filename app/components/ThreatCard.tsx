"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, FilePenLine, Loader2 } from "lucide-react";
import {
  isGrcInfrastructureLimitMessage,
  parseRetryAfterSecondsFromMessage,
} from "@/app/utils/grcInfrastructureLimit";
import { useAgentStore } from "@/app/store/agentStore";
import { useRiskStore } from "@/app/store/riskStore";
import {
  useConstitutionalLockFlags,
  useForensicAttestationMin,
  useSustainabilityApiDegraded,
} from "@/app/context/ConstitutionalIntegrityProvider";
import {
  chaosComplianceCoverageLabel,
  formatRecoverySlaParts,
  frameworkBadgesForChaosScenario,
} from "@/app/utils/grcComplianceUi";
import {
  chaosLevelForCardDisplay,
  getChaosLevelSurfaceAccent,
  getChaosLevelVisual,
} from "@/app/utils/chaosLevelVisual";
import { requestVictoryLapFromNeutralize } from "@/app/utils/activeThreatLifecycleBridge";
import { meetsForensicAttestationWithMin } from "@/app/utils/forensicAttestation";
import { FORENSIC_VOID_JUSTIFICATION_MESSAGE } from "@/app/utils/constitutionalForensicGates";
import {
  appendForensicScoreToMetadataTag,
  buildLexiconLintSegments,
  computeForensicAttestationScore,
  exceedsWeakLexiconToneLock,
  FORENSIC_VERIFIED_MIN_SCORE_EXCLUSIVE,
  hasWeakLexiconViolation,
  replaceSpanInCombinedAttestation,
} from "@/app/utils/grcLexicon";
import { validateForensicJustification } from "@/app/utils/validateJustification";
import { IRONLOCK_REJECTION_FIDELITY_MESSAGE } from "@/app/utils/ironlockRejectionMessages";
import JustificationModal from "@/app/components/ForensicGate/JustificationModal";
import {
  appendTasCitesToMetadataTag,
  directiveLabelForId,
  extractConstitutionalCitationIds,
  getDirectiveTasRef,
} from "@/app/config/constitutionalDirectives";
import { appendConstitutionalHashToMetadataTag, shortenSha256Hex } from "@/app/utils/tasConstitutionalFingerprintFormat";
import { ConstitutionalText } from "@/app/components/ConstitutionalText";
import { appendAuditLog } from "@/app/utils/auditLogger";
import { resolveTasConstitutionHref } from "@/app/utils/tasConstitutionDeepLink";
import {
  PERSONAL_OBSERVATION_PLACEHOLDER,
  USER_00_CONSTITUTIONAL_ATTESTATION_PREFIX,
  buildFullNeutralizeJustification,
  composeConstitutionalStarter60to80,
  extractIrontechHowFromIngestion,
  gatherAuditHowSnippetsForThreat,
} from "@/app/utils/neutralizeDraftingAssistant";

/** Parent registry drives ingestion / victory timing — card is a dumb visual shell. */

function useIngestionBootstrapVisual(
  createdAtIso: string | null | undefined,
  enabled: boolean,
  durationMs = 2000,
): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!enabled || !createdAtIso) {
      setOn(false);
      return;
    }
    const start = Date.parse(createdAtIso);
    if (Number.isNaN(start)) {
      setOn(false);
      return;
    }
    const end = start + durationMs;
    const tick = () => setOn(Date.now() < end);
    tick();
    if (Date.now() >= end) return;
    const iv = window.setInterval(tick, 200);
    const to = window.setTimeout(() => {
      setOn(false);
      window.clearInterval(iv);
    }, Math.max(0, end - Date.now()));
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(to);
    };
  }, [createdAtIso, enabled, durationMs]);
  return on;
}

type Props = {
  /** ESCALATED: inline Double-Check / Save block (Main Ops). Rendered above card body. */
  manualRecoveryInline?: ReactNode;
  /** ThreatEvent.status === ESCALATED (Phone Home) or PENDING_REMOTE_INTERVENTION (opens overlay). */
  isEscalated: boolean;
  /** Level-3: muted gold remote support lane on the card. */
  isRemoteIntervention?: boolean;
  /** Assigned technician ref from dispatch (REMOTE_TECH_DISPATCH_ID / DB). */
  remoteTechId?: string | null;
  isRemoteAccessAuthorized?: boolean;
  /** From getRemoteAccessAdminEligibility — UI only; server re-checks on toggle. */
  canAuthorizeRemoteAccess?: boolean;
  onRemoteAccessToggle?: () => void;
  remoteAccessBusy?: boolean;
  className: string;
  children: ReactNode;
  /** Opens manual recovery / remote overlay when card is activated. */
  onEscalatedActivate?: () => void;
  /** When this value changes (e.g. per Irontech stream seq), card briefly shakes/pulses. */
  failureAnimToken?: string | null;
  /** Sprint 6.18: Irontech attempts 1–3 (ACTIVE, under three failures) or manual Attempt 4 in flight. */
  ironTechAgentPhase?: "analyzing" | "mitigating" | null;
  /** Sprint 6.19: first ~2s after `createdAt` uses zinc ingestion shell (ACTIVE path). */
  ingestionBootstrapFromIso?: string | null;
  ingestionBootstrapEnabled?: boolean;
  /** Joined Irontech / ingestion / recovery errors — quota detection. */
  infrastructureErrorProbeText?: string | null;
  ingestionDetailsRaw?: string | null;
  threatStatus?: string | null;
  irontechAttemptCount?: number;
  /** Parent lifecycle registry: emerald victory lap chrome (agent or user resolve). */
  isVictoryLap?: boolean;
  /** Final ~500ms of lap: braid What/When/How fades before slot collapse. */
  victoryLapContentGhost?: boolean;
  /** Risk-velocity discovery hold (IDENTIFIED chaos) — parent registry. */
  isIngestionDiscoveryHold?: boolean;
  /** Intelligence braid (What / When / How) — rendered until purge. */
  intelligenceFooter?: ReactNode;
  /** Chaos / IRONCHAOS drills — hide Assigned technician + Authorize Remote Access (use drill-specific CTAs). */
  suppressRemoteTechnicianHeader?: boolean;
  /** GRC auditor overlay: framework tags, attestation, SLA detail. */
  showCompliance?: boolean;
  /** Use parent card surface classes without internal status color overrides. */
  suppressAutoSurfaceOverride?: boolean;
  /** When set, AGENT_PIVOT HUD flash targets this threat id (amber pulse + overlay). */
  cardThreatId?: string | null;
  /** Forensic neutralize lane: work-note attestation (≥50 chars) before Neutralize unlocks. */
  showNeutralizeAttestation?: boolean;
  /** Registry / bulk sync: current neutralize draft length for this card. */
  onNeutralizeAttestationDraftChange?: (text: string) => void;
  /** Registry / bulk sync: parent registry attestation gate (multi-select neutralize). */
  registryNeutralizeAttestationOk?: boolean;
  actorDisplayNameForNeutralize?: string;
  /** Card + tenant facts for drafting assistant (TAS §4 chip — roster only, no invented $). */
  neutralizeAttestationContext?: {
    threatName?: string | null;
    target?: string | null;
    industry?: string | null;
    selectedTenantName?: string | null;
  } | null;
};

/**
 * Active Ops threat shell: escalated lock chrome, or Level-3 remote support strip + authorize toggle.
 */
export function ThreatCard({
  manualRecoveryInline,
  isEscalated,
  isRemoteIntervention = false,
  remoteTechId,
  isRemoteAccessAuthorized = false,
  canAuthorizeRemoteAccess = false,
  onRemoteAccessToggle,
  remoteAccessBusy = false,
  className,
  children,
  onEscalatedActivate,
  failureAnimToken,
  ironTechAgentPhase = null,
  ingestionBootstrapFromIso = null,
  ingestionBootstrapEnabled = false,
  infrastructureErrorProbeText = null,
  ingestionDetailsRaw = null,
  threatStatus = null,
  irontechAttemptCount = 0,
  isVictoryLap = false,
  victoryLapContentGhost = false,
  isIngestionDiscoveryHold = false,
  intelligenceFooter,
  suppressRemoteTechnicianHeader = false,
  showCompliance = false,
  suppressAutoSurfaceOverride = false,
  cardThreatId = null,
  showNeutralizeAttestation = false,
  onNeutralizeAttestationDraftChange,
  registryNeutralizeAttestationOk = true,
  actorDisplayNameForNeutralize,
  neutralizeAttestationContext = null,
}: Props) {
  const activateOverlay = isEscalated && onEscalatedActivate;
  const [failureAnimOn, setFailureAnimOn] = useState(false);
  const [handoffState, setHandoffState] = useState<"IDLE" | "AUTHORIZING" | "CONNECTED">("IDLE");
  const [machineAttestationCore, setMachineAttestationCore] = useState<string | null>(null);
  const [humanAttestationExtension, setHumanAttestationExtension] = useState("");
  const [draftAssistantBusy, setDraftAssistantBusy] = useState(false);
  const [neutralizeBusy, setNeutralizeBusy] = useState(false);
  const [forensicModalOpen, setForensicModalOpen] = useState(false);
  const combinedJustification = buildFullNeutralizeJustification(machineAttestationCore, humanAttestationExtension);
  const forensicMin = useForensicAttestationMin();
  const isApiDegraded = useSustainabilityApiDegraded();
  const combinedLen = combinedJustification.trim().length;
  const combinedLenOk = meetsForensicAttestationWithMin(combinedJustification, forensicMin);
  const humanRequiredOk =
    !machineAttestationCore?.trim() || humanAttestationExtension.trim().length > 0;
  const justificationQualityOk = validateForensicJustification(combinedJustification, forensicMin).ok;
  const lexiconWeakViolation = hasWeakLexiconViolation(combinedJustification);
  const lexiconToneLockViolation = exceedsWeakLexiconToneLock(combinedJustification);
  const forensicScore = useMemo(
    () => computeForensicAttestationScore(combinedJustification),
    [combinedJustification],
  );
  const constitutionalViolation =
    combinedLenOk && humanRequiredOk && !justificationQualityOk;
  const { isLocked: constitutionalLock, isConstitutionalEmergency } = useConstitutionalLockFlags();
  const neutralizeGateOk =
    combinedLenOk &&
    humanRequiredOk &&
    justificationQualityOk &&
    forensicScore.meetsVerifiedThreshold &&
    !lexiconToneLockViolation &&
    !constitutionalLock;
  const forensicGateNeedsReset =
    combinedLenOk &&
    humanRequiredOk &&
    !constitutionalViolation &&
    !lexiconWeakViolation &&
    !forensicScore.meetsVerifiedThreshold;
  const showConstitutionalIntegrityHigh =
    forensicScore.isGold &&
    combinedLenOk &&
    humanRequiredOk &&
    justificationQualityOk &&
    !lexiconWeakViolation &&
    !isVictoryLap;

  const [lexiconPopoverKey, setLexiconPopoverKey] = useState<string | null>(null);
  const lexiconPreviewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (lexiconPopoverKey == null) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = lexiconPreviewRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      setLexiconPopoverKey(null);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [lexiconPopoverKey]);

  const applyLexiconReplacement = useCallback(
    (start: number, end: number, replacement: string) => {
      const { machineCore: nextM, humanExtension: nextH } = replaceSpanInCombinedAttestation(
        machineAttestationCore,
        humanAttestationExtension,
        start,
        end,
        replacement,
      );
      setMachineAttestationCore(nextM);
      setHumanAttestationExtension(nextH);
      const combined = buildFullNeutralizeJustification(nextM, nextH);
      const registryPayload = nextM?.trim() && nextH.trim().length === 0 ? "" : combined;
      onNeutralizeAttestationDraftChange?.(registryPayload);
      setLexiconPopoverKey(null);
    },
    [machineAttestationCore, humanAttestationExtension, onNeutralizeAttestationDraftChange],
  );

  const neutralizeVictoryBraidText = useRiskStore((s) => {
    const id = cardThreatId?.trim();
    if (!id) return "";
    return s.neutralizeVictoryAttestationByThreatId[id] ?? "";
  });
  const victoryConstitutionalSealShort = useRiskStore((s) => {
    const id = cardThreatId?.trim();
    if (!id) return "";
    return s.neutralizeConstitutionalSealShortByThreatId[id] ?? "";
  });
  const victoryLegalBasisIds = useMemo(
    () => extractConstitutionalCitationIds(neutralizeVictoryBraidText),
    [neutralizeVictoryBraidText],
  );
  const nonsenseZoneEntryCountRef = useRef(0);
  const evasionAuditLoggedRef = useRef(false);
  const wasInNonsenseZoneRef = useRef(false);
  const lastCardTidRef = useRef<string | null>(null);

  useEffect(() => {
    const tid = cardThreatId?.trim() ?? null;
    if (lastCardTidRef.current !== tid) {
      lastCardTidRef.current = tid;
      nonsenseZoneEntryCountRef.current = 0;
      evasionAuditLoggedRef.current = false;
      wasInNonsenseZoneRef.current = false;
    }
  }, [cardThreatId]);

  useEffect(() => {
    if (!showNeutralizeAttestation || !cardThreatId?.trim()) return;
    const tid = cardThreatId.trim();
    const inZone =
      combinedLenOk &&
      humanRequiredOk &&
      !validateForensicJustification(combinedJustification, forensicMin).ok;

    if (inZone) {
      if (!wasInNonsenseZoneRef.current) {
        nonsenseZoneEntryCountRef.current += 1;
        if (nonsenseZoneEntryCountRef.current > 2 && !evasionAuditLoggedRef.current) {
          evasionAuditLoggedRef.current = true;
          appendAuditLog({
            action_type: "SYSTEM_WARNING",
            log_type: "GRC",
            description:
              "[AUDIT_WARNING] — COMPLIANCE EVASION ATTEMPT BY USER_00 — Integrity Gate Bypassed with Low-Entropy Input.",
            metadata_tag: `threatId:${tid}|ATTESTATION_EVASION|AUDIT_WARNING`,
            user_id: "User_00",
          });
        }
      }
      wasInNonsenseZoneRef.current = true;
    } else {
      wasInNonsenseZoneRef.current = false;
    }
  }, [
    showNeutralizeAttestation,
    cardThreatId,
    combinedJustification,
    combinedLenOk,
    humanRequiredOk,
    forensicMin,
  ]);

  const applyConstitutionalDraft = useCallback(async () => {
    const tid = cardThreatId?.trim();
    if (!tid) return;
    setDraftAssistantBusy(true);
    try {
      const auditSnips = gatherAuditHowSnippetsForThreat(tid);
      const irHow = extractIrontechHowFromIngestion(ingestionDetailsRaw);
      const { machineCore } = composeConstitutionalStarter60to80({
        threatId: tid,
        threatName: neutralizeAttestationContext?.threatName,
        target: neutralizeAttestationContext?.target,
        auditHowSnippets: auditSnips,
        irontechHow: irHow,
      });
      setMachineAttestationCore(machineCore);
      setHumanAttestationExtension("");
      onNeutralizeAttestationDraftChange?.("");
    } finally {
      setDraftAssistantBusy(false);
    }
  }, [cardThreatId, ingestionDetailsRaw, neutralizeAttestationContext, onNeutralizeAttestationDraftChange]);
  const ingestionBootstrapOn = useIngestionBootstrapVisual(
    ingestionBootstrapFromIso,
    ingestionBootstrapEnabled,
    3000,
  );
  const statusNorm = (threatStatus ?? "").trim().toUpperCase();
  const isHeartbeatVisualStatus =
    statusNorm === "CONFIRMED" || statusNorm === "MITIGATED";
  /**
   * Selector narrowing: subscribe only to this card's effective heartbeat phase.
   * If telemetry scope is unavailable/misaligned, fall back to "ASSIGNED" (server-side baseline shell).
   */
  const cardTelemetryPhase = useAgentStore((s) => {
    if (!isHeartbeatVisualStatus) return "ASSIGNED";
    const scope = s.telemetryTenantScope;
    const telem = s.ironwaveTelemetry;
    if (!scope || telem.tenantUuid !== scope) return "ASSIGNED";
    return telem.phase;
  });
  const hasLiveCardTelemetry = isHeartbeatVisualStatus && cardTelemetryPhase !== "ASSIGNED";
  const isResolvedThreat = statusNorm === "RESOLVED";
  const isStrictEscalated = isEscalated;
  const devRbacBypass = process.env.NODE_ENV !== "production";
  const effectiveCanAuthorizeRemoteAccess = canAuthorizeRemoteAccess || devRbacBypass;
  const forceIngressGray = statusNorm === "CONFIRMED" && ingestionBootstrapOn;
  const probeTrimmed = (infrastructureErrorProbeText ?? "").trim();
  const infrastructureLimit = isGrcInfrastructureLimitMessage(probeTrimmed);
  /** Irontech/Chaos only — never infer from ACTIVE + low attempt count alone (avoids Kimbot/GRC bleed). */
  const isIrontechOperation =
    Boolean(ironTechAgentPhase) || irontechAttemptCount > 0;
  const forceMitigatingSpinner =
    !isResolvedThreat &&
    isIrontechOperation &&
    statusNorm === "CONFIRMED" &&
    irontechAttemptCount < 3 &&
    !infrastructureLimit;
  const retryAfterSec = infrastructureLimit
    ? parseRetryAfterSecondsFromMessage(probeTrimmed)
    : null;
  const showIronTechWorkingBadge =
    !isResolvedThreat &&
    !infrastructureLimit &&
    (forceMitigatingSpinner || Boolean(ironTechAgentPhase));
  const chaosMeta = (() => {
    const raw = (ingestionDetailsRaw ?? "").trim();
    if (!raw)
      return {
        scenario: null,
        isChaosTest: false,
        hasAutonomousJustification: false,
        autonomousRecoveredAt: "",
        lkgAttestationIroncoreSha256: "",
        chaosLevelNum: null as number | null,
      };
    try {
      const parsed = JSON.parse(raw) as {
        chaosScenario?: unknown;
        chaos_level?: unknown;
        isChaosTest?: unknown;
        resolutionJustification?: unknown;
        autonomousRecoveredAt?: unknown;
        lkgAttestationIroncoreSha256?: unknown;
      };
      const v = typeof parsed.chaosScenario === "string" ? parsed.chaosScenario.trim().toUpperCase() : "";
      const scenario =
        v === "INTERNAL" ||
        v === "HOME_SERVER" ||
        v === "REMOTE" ||
        v === "CASCADING" ||
        v === "CASCADING_FAILURE" ||
        v === "CLOUD_EXFIL" ||
        v === "REMOTE_SUPPORT"
          ? v
          : null;
      let chaosLevelNum: number | null =
        typeof parsed.chaos_level === "number" && Number.isFinite(parsed.chaos_level)
          ? Math.min(5, Math.max(1, Math.round(parsed.chaos_level)))
          : null;
      if (chaosLevelNum == null && scenario != null) {
        const map: Record<string, number> = {
          INTERNAL: 1,
          HOME_SERVER: 2,
          CLOUD_EXFIL: 3,
          REMOTE: 4,
          REMOTE_SUPPORT: 4,
          CASCADING: 5,
          CASCADING_FAILURE: 5,
        };
        chaosLevelNum = map[scenario] ?? null;
      }
      const isChaosTest = parsed.isChaosTest === true ? true : false;
      const justification =
        typeof parsed.resolutionJustification === "string"
          ? parsed.resolutionJustification.trim()
          : "";
      const hasAutonomousJustification =
        justification.startsWith("[IRONTECH AUTONOMOUS RECOVERY]") ||
        justification.startsWith("[SIDECAR DRILL COMPLETE]");
      const autonomousRecoveredAt =
        typeof parsed.autonomousRecoveredAt === "string"
          ? parsed.autonomousRecoveredAt.trim()
          : "";
      const lkgAttestationIroncoreSha256 =
        typeof parsed.lkgAttestationIroncoreSha256 === "string"
          ? parsed.lkgAttestationIroncoreSha256.trim()
          : "";
      return {
        scenario,
        isChaosTest,
        hasAutonomousJustification,
        autonomousRecoveredAt,
        lkgAttestationIroncoreSha256,
        chaosLevelNum,
      };
    } catch {
      return {
        scenario: null,
        isChaosTest: false,
        hasAutonomousJustification: false,
        autonomousRecoveredAt: "",
        lkgAttestationIroncoreSha256: "",
        chaosLevelNum: null as number | null,
      };
    }
  })();

  const pivotFlash = useAgentStore((s) => s.agentPivotFlash);
  const cardIdTrimmed = cardThreatId?.trim() ?? "";
  const pivotHudActive =
    Boolean(cardIdTrimmed) &&
    pivotFlash != null &&
    pivotFlash.threatId === cardIdTrimmed &&
    Date.now() < pivotFlash.until;

  const chaosScenario = chaosMeta.scenario;
  /** TAS §3 — Agent 11 stamps governed baseline (1.6B exposure envelope) before Irontech clearance UX completes. */
  const tasSection3BaselineConfirmed = (() => {
    try {
      const raw = (ingestionDetailsRaw ?? "").trim();
      if (!raw) return false;
      const j = JSON.parse(raw) as {
        tasSection3AgenticNeutralization?: { governanceExposureBaselineBillions?: unknown };
      };
      const g = j.tasSection3AgenticNeutralization?.governanceExposureBaselineBillions;
      return typeof g === "number" && Number.isFinite(g) && Math.abs(g - 1.6) < 1e-9;
    } catch {
      return false;
    }
  })();
  const chaosLaneCard =
    chaosMeta.isChaosTest ||
    Boolean(chaosScenario) ||
    (ingestionDetailsRaw ?? "").toLowerCase().includes("chaos_drill");
  const chaosDisplayLevel = chaosLevelForCardDisplay(
    chaosMeta.chaosLevelNum ?? undefined,
    ingestionDetailsRaw ?? undefined,
    chaosLaneCard,
  );
  const chaosVisualActive = chaosDisplayLevel != null ? getChaosLevelVisual(chaosDisplayLevel) : null;
  const ChaosCardIcon = chaosVisualActive?.icon;
  const chaosSurfaceAccent =
    chaosVisualActive != null ? getChaosLevelSurfaceAccent(chaosVisualActive.level) : "";
  const complianceCoverageLabel = chaosComplianceCoverageLabel(
    chaosScenario,
    chaosMeta.isChaosTest,
  );
  const showLkgAttestationSha =
    chaosScenario === "CASCADING_FAILURE" &&
    statusNorm === "RESOLVED" &&
    chaosMeta.lkgAttestationIroncoreSha256.length > 0;
  const isRemoteChaosDrill = chaosMeta.scenario === "REMOTE" || chaosMeta.isChaosTest;
  const autoResolvedByIrontech =
    statusNorm === "RESOLVED" &&
    (chaosScenario === "INTERNAL" ||
      chaosScenario === "HOME_SERVER" ||
      chaosScenario === "CLOUD_EXFIL" ||
      chaosScenario === "CASCADING_FAILURE" ||
      chaosScenario === "REMOTE_SUPPORT" ||
      chaosMeta.hasAutonomousJustification) &&
    (!chaosLaneCard || tasSection3BaselineConfirmed || chaosMeta.hasAutonomousJustification);
  const recoverySlaParts =
    isResolvedThreat && autoResolvedByIrontech
      ? formatRecoverySlaParts(ingestionBootstrapFromIso, chaosMeta.autonomousRecoveredAt)
      : null;
  const frameworkBadges = frameworkBadgesForChaosScenario(chaosScenario, chaosMeta.isChaosTest);
  const showFrameworkOverlay =
    showCompliance && frameworkBadges.length > 0 && (chaosMeta.isChaosTest || chaosScenario);
  const canShowRemoteHandoff = isStrictEscalated || isRemoteIntervention;

  useEffect(() => {
    if (failureAnimToken === undefined || failureAnimToken === null || failureAnimToken === "") return;
    setFailureAnimOn(true);
    const id = window.setTimeout(() => setFailureAnimOn(false), 720);
    return () => window.clearTimeout(id);
  }, [failureAnimToken]);

  useEffect(() => {
    if (isRemoteAccessAuthorized) {
      setHandoffState("CONNECTED");
      return;
    }
    if (!canShowRemoteHandoff) {
      setHandoffState("IDLE");
    }
  }, [isRemoteAccessAuthorized, canShowRemoteHandoff]);

  const handleAuthorizeRemoteAccess = () => {
    if (handoffState !== "IDLE") return;
    // NEW GRC INTERCEPT:
    if (chaosMeta.isChaosTest || chaosScenario) {
      setHandoffState("AUTHORIZING");
      useAgentStore
        .getState()
        .appendRiskIngestionTerminalLine(
          "> [IRONTECH] Authorization received. Simulated handoff initiated.",
        );
      window.setTimeout(() => setHandoffState("CONNECTED"), 3000);
      return; // CRITICAL: Stop here for drills
    }
    setHandoffState("AUTHORIZING");
    useAgentStore
      .getState()
      .appendRiskIngestionTerminalLine(
        "> [IRONTECH] Authorization received. Telemetry routed to human operator. Standing by.",
      );
    onRemoteAccessToggle?.();
    window.setTimeout(() => {
      setHandoffState("CONNECTED");
    }, 3000);
  };

  const ironwaveIrontechShell =
    isHeartbeatVisualStatus && cardTelemetryPhase === "SCANNING"
      ? "!border-amber-500 !shadow-[0_0_22px_rgba(245,158,11,0.38)] !bg-gradient-to-br !from-slate-950/90 !to-amber-950/25 animate-pulse-amber"
      : isHeartbeatVisualStatus && cardTelemetryPhase === "VERIFIED"
        ? "!border-emerald-500 !shadow-[0_0_20px_rgba(16,185,129,0.28)] !bg-gradient-to-br !from-slate-950/90 !to-emerald-950/20 animate-flash-green"
        : isHeartbeatVisualStatus && (cardTelemetryPhase === "ASSIGNED" || !hasLiveCardTelemetry)
          ? "!border-cyan-400 !shadow-[0_0_18px_rgba(34,211,238,0.22)] !bg-gradient-to-br !from-slate-950/90 !to-cyan-950/25"
          : "";

  const surfaceOverride = suppressAutoSurfaceOverride
    ? ""
    :
    infrastructureLimit && !failureAnimOn
      ? "!border-amber-500/50 !bg-amber-950/25"
      : isIngestionDiscoveryHold && statusNorm === "IDENTIFIED"
        ? "!border-amber-600/45 !bg-gradient-to-br !from-slate-950/90 !to-amber-950/20 !shadow-[0_0_14px_rgba(245,158,11,0.18)]"
      : statusNorm === "RESOLVED"
        ? [
            "!border-emerald-500/50 !bg-emerald-900/25 !shadow-[0_0_15px_rgba(16,185,129,0.2)]",
            isVictoryLap ? "ring-2 ring-emerald-400/80 shadow-[0_0_28px_rgba(16,185,129,0.45)] animate-pulse" : "",
          ]
            .filter(Boolean)
            .join(" ")
        : forceIngressGray && !infrastructureLimit
          ? "!border-zinc-700 !bg-zinc-900"
          : isIrontechOperation || chaosScenario
            ? [chaosSurfaceAccent, ironwaveIrontechShell || "!border-blue-900/40 !bg-gradient-to-br !from-slate-950/90 !to-blue-950/30"]
                .filter(Boolean)
                .join(" ")
            : "";

  return (
    <div
      role={activateOverlay ? "button" : undefined}
      tabIndex={activateOverlay ? 0 : undefined}
      onClick={
        activateOverlay
          ? () => {
              onEscalatedActivate?.();
            }
          : undefined
      }
      onKeyDown={
        activateOverlay
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEscalatedActivate?.();
              }
            }
          : undefined
      }
      className={`relative ${className} ${surfaceOverride} ${
        failureAnimOn ? "threat-card-failure-shake threat-card-failure-pulse " : ""
      }${
        isStrictEscalated && isRemoteIntervention
          ? "threat-card-remote-support"
          : isStrictEscalated
            ? `${infrastructureLimit ? "" : "critical-lock-border"}${activateOverlay ? " cursor-pointer" : ""}`
            : ""
      }`}
    >
      {pivotHudActive ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[40] flex justify-center px-2 pt-1"
          role="status"
          aria-live="polite"
        >
          <span className="rounded border border-amber-500/85 bg-amber-950/95 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-amber-50 shadow-[0_0_22px_rgba(245,158,11,0.5)]">
            ⚠️ AGENT PIVOT: Strategy Recalibrated
          </span>
        </div>
      ) : null}
      {isVictoryLap ? (
        <div
          className="pointer-events-none absolute right-3 top-3 z-[35] flex items-center gap-1 rounded-full border border-emerald-400/90 bg-emerald-950/95 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.45)]"
          role="status"
          aria-live="polite"
        >
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" strokeWidth={3} aria-hidden />
          Victory lap
        </div>
      ) : null}
      {showCompliance && complianceCoverageLabel ? (
        <span
          className={`pointer-events-none absolute right-3 z-[24] max-w-[min(240px,50vw)] rounded border border-teal-600/55 bg-slate-950/95 px-2 py-1 text-left text-[7px] font-bold uppercase leading-snug tracking-wide text-teal-100/95 shadow-[0_0_10px_rgba(45,212,191,0.15)] ${
            isStrictEscalated && !isRemoteIntervention ? "top-12" : "top-3"
          }`}
          title="Compliance coverage (framework mapping)"
        >
          {complianceCoverageLabel}
        </span>
      ) : null}
      {showFrameworkOverlay ? (
        <div className="pointer-events-none relative z-[12] mb-2 flex flex-wrap gap-1">
          {frameworkBadges.map((b) => (
            <span
              key={b}
              className="rounded border border-slate-600/80 bg-slate-900/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-300"
            >
              {b === "SOC2" ? "[SOC 2]" : b === "ISO" ? "[ISO]" : "[NIST]"}
            </span>
          ))}
        </div>
      ) : null}
      {chaosVisualActive && ChaosCardIcon ? (
        <div className="relative z-[12] mb-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wide ${chaosVisualActive.chipClass}`}
            title={chaosVisualActive.label}
          >
            <ChaosCardIcon className="h-3 w-3 shrink-0" aria-hidden />
            Irontech Chaos L{chaosVisualActive.level}
          </span>
        </div>
      ) : null}
      {infrastructureLimit || showIronTechWorkingBadge ? (
        <div className="relative z-10 mb-3 flex flex-col gap-2">
          {infrastructureLimit ? (
            <span className="pointer-events-none max-w-full self-start rounded border border-amber-500/70 bg-amber-950/95 px-2 py-1 text-[7px] font-black uppercase leading-tight tracking-wide text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.35)]">
              [GRC] INFRASTRUCTURE LIMIT REACHED
            </span>
          ) : null}

          {showIronTechWorkingBadge ? (
            <div
              className="pointer-events-none flex max-w-full items-center gap-1.5 self-start rounded border border-cyan-600/70 bg-slate-950/95 px-2 py-1 shadow-[0_0_14px_rgba(34,211,238,0.25)] irontech-working-badge-pulse"
              role="status"
              aria-live="polite"
              aria-label={
                forceMitigatingSpinner || ironTechAgentPhase === "mitigating"
                  ? "Irontech mitigating"
                  : "Irontech analyzing"
              }
            >
              <Loader2
                className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-300"
                aria-hidden
              />
              <span className="text-[7px] font-black uppercase leading-tight tracking-wide text-cyan-100">
                {forceMitigatingSpinner || ironTechAgentPhase === "mitigating"
                  ? "[IRONTECH] MITIGATING..."
                  : "[IRONTECH] ANALYZING..."}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {infrastructureLimit ? (
        <div className="relative z-[22] mb-2 rounded border border-amber-600/45 bg-amber-950/35 px-2 py-1.5">
          <p className="text-[10px] font-semibold leading-snug text-amber-100">
            ⚠️ System Overload: Gemini-2.5-Flash Quota Exceeded.
          </p>
          {retryAfterSec != null ? (
            <p className="mt-1 text-[9px] font-mono text-amber-200/95">
              Retry in {retryAfterSec} seconds
            </p>
          ) : null}
        </div>
      ) : null}
      {chaosScenario === "INTERNAL" && statusNorm === "RESOLVED" ? (
        <div className="mb-3 rounded-md border border-emerald-400/70 bg-emerald-900/35 px-3 py-2 shadow-[0_0_16px_rgba(16,185,129,0.28)]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-100">
            LOCAL FIX APPLIED: Irontech successfully located and applied an internal recovery patch. Please review the terminal logs below and dismiss this alert.
          </p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-200/90">
            Auto-dismissing in 4s...
          </p>
        </div>
      ) : null}
      {chaosScenario === "HOME_SERVER" && statusNorm === "RESOLVED" ? (
        <div className="mb-3 rounded-md border border-cyan-400/70 bg-cyan-950/35 px-3 py-2 shadow-[0_0_16px_rgba(34,211,238,0.28)]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-100">
            GLOBAL PATCH APPLIED: Irontech queried the IronFrame Home Server, downloaded the missing patch, and restored stability. Please verify system integrity and dismiss this alert.
          </p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-cyan-200/90">
            Auto-dismissing in 4s...
          </p>
        </div>
      ) : null}
      {chaosScenario === "REMOTE" && statusNorm === "MITIGATED" && handoffState !== "CONNECTED" ? (
        <div className="mb-3 rounded-md border border-rose-400/80 bg-rose-950/45 px-3 py-2 shadow-[0_0_18px_rgba(244,63,94,0.32)]">
          <p className="text-[10px] font-black uppercase tracking-wide text-rose-100">
            MITIGATION FAILED: An automated diagnostic packet has been emailed to Ironframe Support. Please click &apos;Authorize Remote Access&apos; below to allow our human tech team to intervene.
          </p>
        </div>
      ) : null}
      {chaosScenario === "CASCADING" && statusNorm === "MITIGATED" && handoffState !== "CONNECTED" ? (
        <div className="mb-3 rounded-md border border-zinc-700/80 bg-zinc-950/90 px-3 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <p className="text-[10px] font-black uppercase tracking-wide text-zinc-200">
            CASCADING FAILURE DETECTED: Irontech attempted Local and Global mitigation paths, but both failed. The threat is a zero-day variant. Human intervention is strictly required. Please click &apos;Authorize Remote Access&apos; below.
          </p>
        </div>
      ) : null}

      {manualRecoveryInline}

      {canShowRemoteHandoff && !suppressRemoteTechnicianHeader && (
        <div
          className="pointer-events-auto z-30 mb-3 space-y-2 rounded-lg border border-amber-700/55 bg-amber-950/50 p-3 shadow-inner shadow-amber-950/40"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-amber-200/90">
                Assigned technician
              </p>
              <p className="mt-0.5 text-base font-black tracking-tight text-amber-50">
                {remoteTechId?.trim() ? remoteTechId : "Pending assignment"}
              </p>
            </div>
            <span className="shrink-0 rounded border border-amber-600/70 bg-amber-900/60 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-amber-100">
              Remote support
            </span>
          </div>
          {handoffState === "CONNECTED" ? (
            <p className="w-full rounded-md border border-indigo-500/60 bg-indigo-950/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-indigo-100">
              Session controlled by Ironframe Support.
            </p>
          ) : (
            <button
              type="button"
              disabled={
                handoffState !== "IDLE" ||
                !effectiveCanAuthorizeRemoteAccess ||
                remoteAccessBusy
              }
              title={
                effectiveCanAuthorizeRemoteAccess
                  ? undefined
                  : "Only Admin/Owner (or allowlisted email) can authorize remote access."
              }
              onClick={handleAuthorizeRemoteAccess}
              className={`w-full rounded-md border px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                handoffState === "AUTHORIZING"
                  ? "animate-pulse border-amber-400/80 bg-amber-900/65 text-amber-100"
                  : isRemoteAccessAuthorized
                    ? "border-emerald-600/70 bg-emerald-950/50 text-emerald-100 hover:bg-emerald-950/70"
                    : "border-amber-500/60 bg-amber-900/40 text-amber-100 hover:bg-amber-900/55"
              }`}
            >
              {handoffState === "AUTHORIZING"
                ? "[⏳ Awaiting Technician Connection...]"
                : remoteAccessBusy
                  ? "Updating…"
                  : `[🔓 Authorize Remote Access]${isRemoteAccessAuthorized ? " — ON" : " — OFF"}`}
            </button>
          )}
        </div>
      )}

      {isStrictEscalated && (
        handoffState === "CONNECTED" ? (
          <span className="pointer-events-none absolute right-3 top-3 z-20 rounded border border-indigo-400/90 bg-indigo-950/95 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-indigo-100 shadow-[0_0_12px_rgba(99,102,241,0.5)] animate-pulse">
            [📡 REMOTE TECH SESSION ACTIVE]
          </span>
        ) : !isRemoteIntervention ? (
          <span className="pointer-events-none absolute right-3 top-3 z-20 rounded border border-rose-500/90 bg-rose-950/95 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-rose-100 shadow-[0_0_12px_rgba(225,29,72,0.5)]">
            MANUAL ACTION REQUIRED
          </span>
        ) : null
      )}

      <div
        className={[
          "transition-opacity duration-700 ease-out",
          victoryLapContentGhost ? "pointer-events-none opacity-[0.18]" : "opacity-100",
        ].join(" ")}
      >
        {children}
      </div>

      {showNeutralizeAttestation && cardThreatId ? (
        <div className="mt-3 rounded border border-slate-700/90 bg-slate-950/55 p-2">
          {showConstitutionalIntegrityHigh ? (
            <div className="mb-2 flex justify-center" role="status" aria-live="polite">
              <span className="rounded border border-amber-400/35 bg-amber-950/25 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-amber-100/90 shadow-[0_0_12px_rgba(251,191,36,0.18)]">
                [CONSTITUTIONAL INTEGRITY: HIGH]
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400">
              Forensic work note (required to neutralize)
            </label>
          </div>

          {machineAttestationCore ? (
            <div
              className="mt-2 rounded border border-violet-900/40 bg-violet-950/20 px-2 py-2 text-[10px] leading-relaxed text-violet-100/95"
              role="region"
              aria-label="Machine-suggested attestation starter"
            >
              <p className="text-[8px] font-black uppercase tracking-wide text-violet-300/90 not-italic">
                Constitutional clerk (authoritative lexicon + TAS.md directive; no weak language)
              </p>
              <ConstitutionalText
                text={machineAttestationCore}
                tooltipTheme="parchment"
                className="mt-1.5 block whitespace-pre-wrap italic text-violet-50/95"
              />
              <p className="mt-2 border-t border-violet-800/40 pt-2 italic text-violet-200/85">
                {PERSONAL_OBSERVATION_PLACEHOLDER}
              </p>
            </div>
          ) : null}

          <label className="mt-2 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
            {machineAttestationCore ? "Your attestation (required)" : "Your attestation"}
          </label>
          <div className="mt-1 flex gap-1.5">
            <textarea
              rows={machineAttestationCore ? 4 : 3}
              value={humanAttestationExtension}
              onChange={(e) => {
                const v = e.target.value;
                setHumanAttestationExtension(v);
                const combined = buildFullNeutralizeJustification(machineAttestationCore, v);
                const registryPayload =
                  machineAttestationCore?.trim() && v.trim().length === 0 ? "" : combined;
                onNeutralizeAttestationDraftChange?.(registryPayload);
              }}
              placeholder={
                machineAttestationCore
                  ? "Complete the constitutional attestation below the machine starter…"
                  : "Minimum 50 characters — official human attestation for neutralization…"
              }
              className="min-h-[4.5rem] min-w-0 flex-1 resize-y rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-[10px] not-italic text-slate-100 outline-none focus:border-emerald-500/70"
              aria-label="Human forensic attestation"
            />
            <button
              type="button"
              disabled={draftAssistantBusy}
              title="Draft justification (TAS constitutional directives + threat telemetry)"
              aria-label="Draft justification from TAS directives and telemetry"
              onClick={() => {
                void applyConstitutionalDraft();
              }}
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center self-start rounded border border-violet-600/60 bg-violet-950/40 text-violet-100 transition-colors hover:bg-violet-900/45 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {draftAssistantBusy ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
              ) : (
                <FilePenLine className="h-4 w-4 shrink-0" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={() => setForensicModalOpen(true)}
              title="Open full-screen forensic justification editor (Ironlock gate)"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center self-start rounded border border-amber-700/50 bg-amber-950/30 text-amber-100 transition-colors hover:bg-amber-900/40"
              aria-label="Expand forensic justification"
            >
              <span className="text-[10px] font-black" aria-hidden>
                ⛶
              </span>
            </button>
          </div>
          <div className="mt-2 rounded border border-slate-700/80 bg-slate-900/50 px-2 py-1.5">
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Forensic grade</p>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-amber-700 via-emerald-500 to-amber-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (forensicScore.total / 65) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[9px] font-mono text-slate-300">
              {forensicScore.gradeBand} — {forensicScore.total} pts (Verified requires score &gt;{" "}
              {FORENSIC_VERIFIED_MIN_SCORE_EXCLUSIVE} and zero weak lexicon)
            </p>
            <p className="mt-0.5 text-[8px] text-slate-500">
              TAS +{forensicScore.breakdown.tasKeyword} · Auth +{forensicScore.breakdown.authoritative} · Tech +
              {forensicScore.breakdown.technical} · Weak {forensicScore.breakdown.weakPenalty}
            </p>
          </div>
          {lexiconToneLockViolation ? (
            <div
              className="mt-2 rounded border-2 border-rose-700/90 bg-rose-950/55 px-2 py-2 text-[10px] font-black uppercase leading-snug tracking-wide text-rose-50 shadow-[0_0_20px_rgba(225,29,72,0.35)]"
              role="alert"
            >
              AUDIT RISK: Subjective language detected. Use authoritative lexicon.
            </div>
          ) : null}
          {lexiconWeakViolation && combinedJustification.trim().length > 0 ? (
            <div
              ref={lexiconPreviewRef}
              className="mt-2 max-h-32 overflow-y-auto rounded border border-rose-900/50 bg-slate-950/90 px-2 py-1.5 text-[9px] leading-relaxed text-slate-200"
              aria-label="Attestation preview with vocabulary expansion"
            >
              <p className="mb-1 text-[8px] font-black uppercase tracking-wide text-rose-400">
                Live preview — hover weak terms for alternatives; click a suggestion to replace
              </p>
              <div className="whitespace-pre-wrap break-words font-mono text-[10px]">
                {buildLexiconLintSegments(combinedJustification).map((seg) =>
                  !seg.isWeak || seg.start == null || seg.end == null ? (
                    <ConstitutionalText key={seg.key} text={seg.text} tooltipTheme="slate" stopClickPropagation />
                  ) : (
                    <span key={seg.key} className="relative inline">
                      <button
                        type="button"
                        title={`High-integrity alternatives: ${(seg.alternatives ?? []).join(" · ")}`}
                        className={`rounded px-0.5 font-semibold text-rose-300 underline decoration-rose-500 decoration-2 underline-offset-2 hover:bg-rose-950/80 ${
                          lexiconPopoverKey === seg.key ? "bg-rose-950/90" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLexiconPopoverKey((k) => (k === seg.key ? null : seg.key));
                        }}
                      >
                        {seg.text}
                      </button>
                      {lexiconPopoverKey === seg.key && (seg.alternatives?.length ?? 0) > 0 ? (
                        <span
                          className="absolute left-0 top-full z-[60] mt-1 flex min-w-[10rem] flex-col gap-0.5 rounded border border-slate-600 bg-slate-900 p-1 shadow-xl"
                          onMouseDown={(e) => e.stopPropagation()}
                          role="menu"
                        >
                          {(seg.alternatives ?? []).map((alt) => (
                            <button
                              key={alt}
                              type="button"
                              role="menuitem"
                              className="rounded px-2 py-1 text-left text-[9px] font-semibold uppercase tracking-wide text-emerald-100 hover:bg-emerald-950/80"
                              onClick={() => applyLexiconReplacement(seg.start!, seg.end!, alt)}
                            >
                              {alt}
                            </button>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  ),
                )}
              </div>
            </div>
          ) : null}
          {lexiconWeakViolation ? (
            <div
              className="mt-2 rounded border-2 border-rose-600/90 bg-rose-950/45 px-2 py-2 text-[10px] font-bold uppercase leading-snug tracking-wide text-rose-50 shadow-[0_0_18px_rgba(225,29,72,0.28)]"
              role="alert"
            >
              LEXICON VIOLATION: Weak or hedging language detected. Remove flagged terms; authoritative attestations are
              mandatory per TAS.md.
            </div>
          ) : null}
          {constitutionalViolation ? (
            <div
              className="mt-2 rounded border-2 border-amber-500/90 bg-amber-950/55 px-2 py-2 text-[10px] font-bold uppercase leading-snug tracking-wide text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.35)]"
              role="alert"
            >
              CONSTITUTIONAL VIOLATION: Low-Entropy/Nonsense Input Detected. High-integrity forensic justification is
              mandatory per TAS.md.
            </div>
          ) : null}
          {(constitutionalViolation ||
            lexiconWeakViolation ||
            lexiconToneLockViolation ||
            forensicGateNeedsReset) ? (
            <button
              type="button"
              disabled={draftAssistantBusy}
              onClick={() => void applyConstitutionalDraft()}
              className="mt-2 w-full rounded border border-violet-500/75 bg-violet-950/45 px-2 py-1.5 text-[9px] font-black uppercase tracking-wide text-violet-100 transition-colors hover:bg-violet-900/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset draft — constitutional clerk
            </button>
          ) : null}
          <p
            className={`mt-1 text-right text-[10px] font-mono tabular-nums ${
              isApiDegraded
                ? !combinedLenOk
                  ? "text-amber-400/95"
                  : constitutionalViolation ||
                      lexiconWeakViolation ||
                      lexiconToneLockViolation ||
                      !forensicScore.meetsVerifiedThreshold
                    ? "font-semibold text-amber-400"
                    : "font-semibold text-amber-300/90"
                : !combinedLenOk
                  ? "text-rose-400/95"
                  : constitutionalViolation ||
                      lexiconWeakViolation ||
                      lexiconToneLockViolation ||
                      !forensicScore.meetsVerifiedThreshold
                    ? "font-semibold text-amber-400"
                    : "font-semibold text-emerald-400"
            }`}
            aria-live="polite"
          >
            {combinedLen} / {forensicMin} characters required
            {isConstitutionalEmergency && combinedLen < forensicMin ? (
              <span className="mt-1 block text-rose-300">{FORENSIC_VOID_JUSTIFICATION_MESSAGE}</span>
            ) : null}
          </p>
          {isApiDegraded ? (
            <p className="mt-1 rounded border border-amber-800/50 bg-amber-950/30 px-2 py-1.5 text-[8px] font-bold uppercase leading-snug tracking-wide text-amber-100/95">
              DEGRADED STATE: API outage detected. 100-character forensic justification required for non-repudiation.
            </p>
          ) : null}
          <button
            type="button"
            title={
              lexiconToneLockViolation
                ? "AUDIT RISK: More than two weak terms — replace with authoritative lexicon."
                : lexiconWeakViolation
                  ? "LEXICON VIOLATION: Remove weak or hedging language before neutralize."
                  : constitutionalViolation
                    ? "CONSTITUTIONAL VIOLATION: Replace low-entropy or bypass-pattern text before neutralize."
                    : !forensicScore.meetsVerifiedThreshold
                      ? `Forensic grade must exceed ${FORENSIC_VERIFIED_MIN_SCORE_EXCLUSIVE} points with no weak lexicon.`
                      : "Minimum 50-character forensic justification required for GRC compliance."
            }
            disabled={
              constitutionalLock || !neutralizeGateOk || neutralizeBusy || !registryNeutralizeAttestationOk
            }
            onClick={() => {
              const tid = cardThreatId.trim();
              if (!tid || !neutralizeGateOk) return;
              setNeutralizeBusy(true);
              void (async () => {
                try {
                  const ok = await handleNeutralize(tid, combinedJustification.trim(), {
                    operatorId: "User_00",
                    actorDisplayName: actorDisplayNameForNeutralize,
                  });
                  if (ok) {
                    setMachineAttestationCore(null);
                    setHumanAttestationExtension("");
                    onNeutralizeAttestationDraftChange?.("");
                  }
                } finally {
                  setNeutralizeBusy(false);
                }
              })();
            }}
            className="mt-1 w-full rounded border border-emerald-600/70 bg-emerald-950/40 px-2 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-100 transition-colors hover:bg-emerald-900/45 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {neutralizeBusy ? "Neutralizing…" : "Neutralize"}
          </button>
          <JustificationModal
            open={forensicModalOpen}
            onClose={() => setForensicModalOpen(false)}
            value={humanAttestationExtension}
            onChange={(v) => {
              setHumanAttestationExtension(v);
              const combined = buildFullNeutralizeJustification(machineAttestationCore, v);
              const registryPayload =
                machineAttestationCore?.trim() && v.trim().length === 0 ? "" : combined;
              onNeutralizeAttestationDraftChange?.(registryPayload);
            }}
            minChars={forensicMin}
            isApiDegraded={isApiDegraded}
          />
        </div>
      ) : null}

      {isVictoryLap && neutralizeVictoryBraidText.trim() ? (
        <div
          className="mt-2 rounded border border-emerald-600/45 bg-emerald-950/35 px-2 py-2 shadow-inner shadow-emerald-950/30"
          role="region"
          aria-label="GRC attestation victory lap"
        >
          {victoryLegalBasisIds.length > 0 ? (
            <div className="mb-2 rounded border border-amber-500/55 bg-amber-950/45 px-2 py-2 shadow-[0_0_14px_rgba(245,158,11,0.2)]">
              <p className="text-[8px] font-black uppercase tracking-[0.22em] text-amber-100/95">
                Legal Basis for Resolution
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {victoryLegalBasisIds.map((id) => {
                  const label = directiveLabelForId(id);
                  const tasRef = getDirectiveTasRef(id);
                  const chipLinkClass =
                    "inline-flex items-center rounded border border-amber-400/80 bg-amber-950/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-50 underline decoration-amber-200/40 underline-offset-2 transition-colors hover:border-amber-300 hover:bg-amber-900/85 hover:decoration-amber-100/80";
                  const chipPlainClass =
                    "inline-flex items-center rounded border border-amber-400/80 bg-amber-950/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-50";
                  if (!tasRef) {
                    return (
                      <span key={id} className={chipPlainClass}>
                        {label}
                      </span>
                    );
                  }
                  const href = resolveTasConstitutionHref(tasRef.anchorId, tasRef.tasLine);
                  if (href.startsWith("vscode:")) {
                    return (
                      <a key={id} href={href} className={chipLinkClass} onClick={(e) => e.stopPropagation()}>
                        {label}
                      </a>
                    );
                  }
                  return (
                    <Link
                      key={id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={chipLinkClass}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-200/95">
            GRC attestation — victory lap
          </p>
          <ConstitutionalText
            text={neutralizeVictoryBraidText}
            tooltipTheme="slate"
            className="mt-1 block whitespace-pre-wrap text-[10px] font-semibold leading-relaxed text-emerald-50/95"
            stopClickPropagation
          />
          {victoryConstitutionalSealShort ? (
            <div className="mt-2 border-t border-emerald-500/35 pt-2 text-center">
              <p className="text-[7px] font-black uppercase tracking-[0.2em] text-emerald-200/90">
                Seal of the Constitution
              </p>
              <p className="mt-0.5 font-mono text-[9px] font-bold tabular-nums text-emerald-100/95">
                SHA-256: {victoryConstitutionalSealShort}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {intelligenceFooter ? (
        <div
          className={[
            "mt-2 transition-opacity duration-700 ease-out",
            victoryLapContentGhost ? "pointer-events-none opacity-[0.18]" : "opacity-100",
          ].join(" ")}
          role="region"
          aria-label="Agent telemetry braid"
        >
          {intelligenceFooter}
        </div>
      ) : null}

      {showCompliance && showLkgAttestationSha ? (
        <div className="pointer-events-none mt-2 px-1">
          <p className="mb-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
            Attestation (G: manifest)
          </p>
          <code className="block text-[10px] opacity-50">
            SHA256 ironcore: {chaosMeta.lkgAttestationIroncoreSha256}
          </code>
        </div>
      ) : null}
      {showCompliance && recoverySlaParts ? (
        <div className="mt-2 space-y-0.5 text-center">
          <p className="text-[9px] font-black uppercase tracking-wide text-emerald-400/95">
            {recoverySlaParts.recoveryLine}
          </p>
          <p className="text-[9px] font-black uppercase tracking-wide text-emerald-400/95">
            {recoverySlaParts.slaLine}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * POST `/api/threats/[id]/neutralize` on 200 OK → mark RESOLVED locally; {@link requestVictoryLapFromNeutralize}
 * hands off to `ActiveRisksClient` lifecycle registry (4s victory lap + purge + SWR).
 */
export async function handleNeutralize(
  threatId: string,
  justification: string,
  options?: { operatorId?: string; actorDisplayName?: string },
): Promise<boolean> {
  const tid = threatId?.trim();
  const composed = justification.trim();
  const state = useRiskStore.getState();
  const minLen = state.requiredForensicAttestationMin;
  if (!tid || composed.length < minLen) {
    if (state.isSustainabilityApiDegraded) {
      useRiskStore.getState().setThreatActionError({
        active: true,
        message: IRONLOCK_REJECTION_FIDELITY_MESSAGE,
      });
    } else if (state.isConstitutionalEmergency || state.constitutionalDegradedMode) {
      useRiskStore.getState().setThreatActionError({
        active: true,
        message: FORENSIC_VOID_JUSTIFICATION_MESSAGE,
      });
    }
    return false;
  }
  if (!validateForensicJustification(composed, minLen).ok) return false;
  if (hasWeakLexiconViolation(composed)) return false;
  if (exceedsWeakLexiconToneLock(composed)) return false;
  if (!computeForensicAttestationScore(composed).meetsVerifiedThreshold) return false;
  const persisted = `${USER_00_CONSTITUTIONAL_ATTESTATION_PREFIX}${composed}`;
  const res = await fetch(`/api/threats/${encodeURIComponent(tid)}/neutralize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      justification: persisted,
      operatorId: options?.operatorId ?? "threat-card-neutralize",
      actorDisplayName: options?.actorDisplayName,
    }),
  });

  let body: { ok?: boolean; constitutionalHash?: string; error?: string };
  try {
    body = (await res.json()) as { ok?: boolean; constitutionalHash?: string; error?: string };
  } catch {
    return false;
  }

  if (!res.ok) {
    if (res.status === 422 && typeof body.error === "string" && body.error) {
      useRiskStore.getState().setThreatActionError({ active: true, message: body.error });
    }
    return false;
  }
  if (!body.ok || typeof body.constitutionalHash !== "string" || !/^[a-fA-F0-9]{64}$/.test(body.constitutionalHash)) {
    return false;
  }
  const constitutionalHash = body.constitutionalHash.toLowerCase();
  const sealShort = shortenSha256Hex(constitutionalHash);

  appendAuditLog({
    action_type: "NOTE_ADDED",
    log_type: "GRC",
    description: persisted.slice(0, 4000),
    metadata_tag: appendConstitutionalHashToMetadataTag(
      appendTasCitesToMetadataTag(
        appendForensicScoreToMetadataTag(
          `threatId:${tid}|USER_00_SIGNATURE|HUMAN_CONCURRENCE`,
          composed,
        ),
        composed,
      ),
      constitutionalHash,
    ),
    user_id: "User_00",
  });

  useRiskStore.getState().setNeutralizeVictoryAttestation(tid, composed, sealShort);

  useRiskStore.getState().setAuditLingerForThreat(tid, 4500);
  useRiskStore.setState((s) => ({
    activeThreats: s.activeThreats.map((t) =>
      t.id === tid
        ? { ...t, threatStatus: "RESOLVED", lifecycleState: "active" as const }
        : t,
    ),
  }));
  requestVictoryLapFromNeutralize(tid, { humanConcurrenceText: composed });

  return true;
}
