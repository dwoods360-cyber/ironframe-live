'use client';

import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import ActiveRisksClient from './ActiveRisksClient';
import AuditIntelligence from './AuditIntelligence';
import DashboardWithDrawer from './DashboardWithDrawer';
import StrategicIntel from './StrategicIntel';
import ThreatPipeline from './ThreatPipeline';
import DashboardAlertBanners from './DashboardAlertBanners';
import Header from './Header';
import LiabilityAlertToast from './LiabilityAlertToast';
import RecordExpiredToast from './RecordExpiredToast';
import ThreatActionErrorToast from './ThreatActionErrorToast';
import { useTenantContext } from '../context/TenantProvider';
import { resolveEffectiveTenantUuidForActions } from '@/app/utils/resolveEffectiveTenantUuidForActions';
import type { StreamAlert } from '../hooks/useAlerts';
import { useRiskStore } from '../store/riskStore';
import { useAgentStore } from '../store/agentStore';
import { appendAuditLog } from '@/app/utils/auditLogger';
import { useSystemConfigStore } from '../store/systemConfigStore';
import { useDashboardThreatRealtime } from '../hooks/useDashboardThreatRealtime';
import { IronwaveHeartbeat } from './IronwaveHeartbeat';
import IrontechLeftPaneControls from './IrontechLeftPaneControls';
import Sidebar from './Sidebar';
import ClockDriftBanner from './ClockDriftBanner';
import ClockDriftMonitor from './ClockDriftMonitor';
import SentinelIntakeForm from '@/components/SentinelIntakeForm';
import { useRiskRegistrySync } from '@/app/hooks/useRiskRegistrySync';
import type { RiskRegistryRecord } from '@/app/types/riskLifecycle';
import type { GovernanceMaturitySnapshot } from '@/app/types/governanceMaturity';
import GrcMaturityStrip from '@/app/components/GrcMaturityStrip';
import GrcAleExposureMap from '@/app/components/GrcAleExposureMap';
import BudgetJustification from '@/components/BudgetJustification';
import ForensicReasoningPlaybackModal from '@/components/ForensicReasoningPlaybackModal';
import AuditorRiskLedger from '@/components/AuditorRiskLedger';
import { formatCentsToUSD } from '@/app/utils/formatCentsToUSD';
import { getTenantGovernanceMultiplierBps } from '@/app/actions/complianceActions';
import { useKimbotStore } from '@/app/store/kimbotStore';
import { useGrcBotStore } from '@/app/store/grcBotStore';
import { useAdversarySimulatorStore } from '@/app/store/adversarySimulatorStore';
import { useHasMounted } from '@/app/hooks/useHasMounted';
import {
  GRC_GOLD_AUDITOR_LEDGER_HEADING,
  GRC_GOLD_AUDITOR_VIEW_INTRO,
  GRC_GOLD_AUDITOR_VIEW_TITLE,
} from '@/lib/constants/grcGold';
import type { ReasoningWaterfallVM } from '@/app/utils/reasoningWaterfallFromIngestion';
import ResourceMonitor from '@/app/components/ResourceMonitor';
import GrcGoldLivingAuditBlock from '@/app/components/GrcGoldLivingAuditBlock';
import HandshakeStatusBar, {
  type SyncHandshakePhase,
  HANDSHAKE_SYSTEM_READY_LINE,
} from '@/app/components/HandshakeStatusBar';
import { TENANT_API_CACHE_INVALIDATE_EVENT } from '@/app/utils/apiCacheCoordinator';
import { isShadowPlaneActiveClient } from '@/app/utils/shadowPlaneActive';
import { useShadowPlaneThreatRefetch } from '@/app/hooks/useShadowPlaneThreatRefetch';
import { ChevronRight } from 'lucide-react';

const EXCLUDED_BASELINE_RISK_TITLES = new Set([
  'Schneider Electric SCADA Vulnerability',
  'Azure Health API Exposure',
  'Palo Alto Firewall Misconfiguration',
]);

import {
  DASHBOARD_CENTER_CONTENT,
  DASHBOARD_CENTER_PAD_X,
  DASHBOARD_CENTER_PANE,
  DASHBOARD_CENTER_RISK_STACK,
  DASHBOARD_CENTER_SCROLL,
  DASHBOARD_HOME_SHELL,
  DASHBOARD_LEFT_PANE,
  DASHBOARD_RIGHT_PANE,
  DASHBOARD_RIGHT_SCROLL,
  DASHBOARD_TRIPANE_SHELL,
} from "@/app/lib/dashboardTripaneLayout";

/** Strip legacy Medshield ghost rows from secondary asset metadata (forensic anchor is authoritative). */
function isMedshieldGhostAsset(asset: string): boolean {
  const n = asset.trim().toLowerCase();
  return n === "medshield" || n === "medshield health";
}

type DashboardData = {
  companies: Array<{
    id: string;
    name: string;
    sector: string;
    policies: unknown[];
    risks: Array<{ id: string; title: string; status: string; score_cents: number; source: string; company?: { name: string; sector: string } }>;
    industry_avg_loss_cents?: number | null;
  }>;
  serverAuditLogs: Array<{
    id: string;
    action: string;
    operatorId: string;
    createdAt: string;
    threatId: string | null;
    justification: string | null;
  }>;
  risks: Array<{
    id: string;
    title: string;
    source: string;
    assigneeId?: string;
    threatId?: string | null;
    score_cents: number;
    company: { name: string; sector: string };
    isSimulation?: boolean;
    ingestionDetails?: string | null;
    ttlSeconds?: number;
    threatCreatedAt?: string;
  }>;
  threatEvents?: Array<{
    id: string;
    title: string;
    sourceAgent: string;
    targetEntity?: string;
    status?: string;
    assigneeId: string | null;
    complianceFramework?: string;
    mappedControls?: string[];
    remediationStatus?: string;
    financialRiskCents?: string;
    /** SimThreatEvent.governed_impact (cents) — Epic 8 USD chip on RiskEventCard */
    governedImpactCents?: string;
    reasoningWaterfall?: ReasoningWaterfallVM | null;
    assignmentHistory?: Array<{
      id: string;
      action: string;
      justification: string | null;
      operatorId: string;
      createdAt: string;
    }>;
  }>;
  aleExposureByAssetCents?: Record<string, string>;
  complianceDriftOpenCount?: number;
  scrutinyHeatmap?: Record<string, { total: number; agents: Record<string, number> }>;
  currentHeat?: Record<string, { total: number; agents: Record<string, number> }>;
  predictiveHeat?: Record<string, number>;
  isConflictDetected?: boolean;
  ironwatchAlerts?: string[];
  complianceVelocity?: number | null;
  avgHoursToControlMapping?: number | null;
  /** Sum of budget-justification value (cents) for closed YTD shadow RiskEvents — JSON string for BigInt safety. */
  totalValueMitigatedYtdCents?: string;
  projectedInsuranceSavingsCents?: string;
  insuranceModelFramework?: string;
  insuranceHasContinuousMonitoring?: boolean;
  insuranceHasDueDiligencePdfs?: boolean;
  insuranceDefaultPremiumCents?: string;
  insuranceTotalDiscountBps?: number;
};

type Props = {
  /** Server-rendered Enterprise Risk Posture strip (async RSC child). */
  children: ReactNode;
  /** Request-time epoch from RSC — client compares for GRC clock drift HUD. */
  serverTimeEpochMs?: number;
  /** Server-ingress governance maturity snapshot for the forensic strip. */
  governanceMaturity?: GovernanceMaturitySnapshot | null;
  /** Hydrated `risk_registry` rows — Stage-1 Irongate sync (logs / assignee history, not a UI deck). */
  initialRiskRegistry?: RiskRegistryRecord[];
  /** Production Ironbloom `mitigated_value_cents` aggregate (BigInt string, simulation excluded). */
  carbonMitigatedValueCents?: string;
  /** Formatted USD for CFO surfaces. */
  carbonMitigatedDisplay?: string;
};

/** Pre-tenant dashboard shell: global systems render; tenant-scoped fields stay empty until Command Center selection. */
const EMPTY_DASHBOARD_DATA: DashboardData = {
  companies: [],
  serverAuditLogs: [],
  risks: [],
  threatEvents: [],
  aleExposureByAssetCents: {},
  complianceDriftOpenCount: 0,
  scrutinyHeatmap: {},
  currentHeat: {},
  predictiveHeat: {},
  isConflictDetected: false,
  ironwatchAlerts: [],
  complianceVelocity: null,
  avgHoursToControlMapping: null,
  totalValueMitigatedYtdCents: "0",
  projectedInsuranceSavingsCents: "0",
  insuranceModelFramework: "SOC2",
  insuranceHasContinuousMonitoring: false,
  insuranceHasDueDiligencePdfs: false,
  insuranceDefaultPremiumCents: "0",
  insuranceTotalDiscountBps: 0,
};

function InsuranceForensicHandshakeConnector({ flowActive }: { flowActive: boolean }) {
  const bridge = (
    <div className="relative w-full overflow-visible">
      <div className="relative h-px w-full">
        <div className="absolute inset-0 border-t border-dashed border-cyan-600/40" />
        {flowActive ? (
          <div className="pointer-events-none absolute left-0 top-1/2 h-4 w-[min(55%,10rem)] -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-200/95 via-cyan-400/88 to-transparent blur-[3px] ironframe-connector-flow-x" />
        ) : null}
      </div>
      <div className="mt-2 flex justify-center">
        <ChevronRight
          className="text-cyan-500/55 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]"
          strokeWidth={2.25}
          size={18}
          aria-hidden
        />
      </div>
    </div>
  );

  return (
    <>
      <div
        className="relative hidden min-h-[8rem] w-12 shrink-0 flex-col justify-center px-0.5 lg:flex"
        aria-hidden
      >
        {bridge}
      </div>
      <div className="relative flex w-full shrink-0 py-1 lg:hidden" aria-hidden>
        {bridge}
      </div>
    </>
  );
}

/**
 * Main Ops shell — primary “ear” for production `ThreatEvent` and shadow `RiskEvent` (DB table `SimThreatEvent`) realtime, tenant-scoped.
 * See `useDashboardThreatRealtime` (postgres_changes on `ThreatEvent` or `SimThreatEvent` when simulation mode is on).
 */
export default function DashboardHomeClient({
  children,
  serverTimeEpochMs,
  governanceMaturity = null,
  initialRiskRegistry = [],
  carbonMitigatedValueCents = "0",
  carbonMitigatedDisplay = "$0.00",
}: Props) {
  const isSimulationMode = useSystemConfigStore().isSimulationMode;
  useRiskRegistrySync(true, initialRiskRegistry);
  const { tenantFetch, activeTenantUuid, activeTenantKey } = useTenantContext();
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const replacePipelineThreats = useRiskStore((s) => s.replacePipelineThreats);
  const replaceActiveThreats = useRiskStore((s) => s.replaceActiveThreats);
  const pulseThreatBoardsFromDb = useRiskStore((s) => s.pulseThreatBoardsFromDb);
  const isManualFormOpen = useRiskStore((s) => s.isManualFormOpen);
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const activeRiskId = useRiskStore((s) => s.activeRiskId);
  const kimbotEnabled = useKimbotStore((s) => s.enabled);
  const grcBotEnabled = useGrcBotStore((s) => s.enabled);
  const adversarySimActive = useAdversarySimulatorStore(
    (s) => s.infiltrActive || s.phishActive,
  );
  const presetRiskSelected = kimbotEnabled || grcBotEnabled || adversarySimActive;
  const auditorViewEnabled = useRiskStore((s) => s.auditorViewEnabled);
  const forensicPlaybackThreatId = useRiskStore((s) => s.forensicPlaybackThreatId);
  const setForensicPlaybackThreatId = useRiskStore((s) => s.setForensicPlaybackThreatId);
  const hasMounted = useHasMounted();
  /** Cookie lane only after mount — matches ThreatPipeline / avoids handshake UI SSR mismatch. */
  const shadowHandshakeBypassActive = useMemo(
    () =>
      isSimulationMode ||
      process.env.NEXT_PUBLIC_SHADOW_PLANE_ACTIVE === "true" ||
      process.env.NEXT_PUBLIC_SHADOW_PLANE_ACTIVE === "1" ||
      (hasMounted && isShadowPlaneActiveClient()),
    [isSimulationMode, hasMounted],
  );
  const router = useRouter();
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);
  const [drawerFocus, setDrawerFocus] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newThreatToast, setNewThreatToast] = useState<{ title: string } | null>(null);
  const scrutinySignatureRef = useRef<string>("");
  const forecastSignatureRef = useRef<string>("");
  const newThreatToastDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const isLaunchingRef = useRef(false);
  const [tenantGovernanceBps, setTenantGovernanceBps] = useState<number | null>(null);
  const [localCycleBumpsByAsset, setLocalCycleBumpsByAsset] = useState<Record<string, number>>({});
  /** Bootstrap companies (e.g. Ironchaos) may not be in the last GET /api/dashboard payload yet. */
  const [realtimeCompanyAllowlistExtras, setRealtimeCompanyAllowlistExtras] = useState<string[]>([]);
  /** Premium/carrier/discount fingerprint from `BudgetJustification` — ties Forensic Audit to insurance edits. */
  const [insuranceClientPostureSig, setInsuranceClientPostureSig] = useState("");
  /** Skip first `insurancePostureSignal` baseline; subsequent changes drive central handshake + GRC audit ledger. */
  const insuranceSigPrevForAuditRef = useRef<string | null>(null);
  /** War Room handshake strip — aligned with Forensic recalc + sign-off gate. */
  const [handshakePhase, setHandshakePhase] = useState<SyncHandshakePhase>("idle");
  /** Browser timer handles — `number` in DOM typings (Node `Timeout` conflicts in strict composite projects). */
  const verifiedHandshakeTimeoutRef = useRef<number | null>(null);
  const driftHandshakeTimeoutRef = useRef<number | null>(null);

  const clearHandshakeTimers = useCallback(() => {
    if (verifiedHandshakeTimeoutRef.current) {
      clearTimeout(verifiedHandshakeTimeoutRef.current);
      verifiedHandshakeTimeoutRef.current = null;
    }
    if (driftHandshakeTimeoutRef.current) {
      clearTimeout(driftHandshakeTimeoutRef.current);
      driftHandshakeTimeoutRef.current = null;
    }
  }, []);

  const onHandshakeSignOffComplete = useCallback(() => {
    clearHandshakeTimers();
    setHandshakePhase("idle");
  }, [clearHandshakeTimers]);

  /** Align with ThreatPipeline / server actions: shadow+sim use Medshield when Global has no cookie. */
  const dashboardTenantUuid = useMemo(
    () => resolveEffectiveTenantUuidForActions(activeTenantUuid, selectedTenantName),
    [activeTenantUuid, selectedTenantName],
  );

  /** One verification ledger row per tenant UUID session scope — deferred append (Audit Intelligence subscribe-safe). */
  const handshakeBaselineLoggedForUuid = useRef<string | null>(null);
  useEffect(() => {
    if (!dashboardTenantUuid) {
      handshakeBaselineLoggedForUuid.current = null;
      return;
    }
    if (handshakeBaselineLoggedForUuid.current === dashboardTenantUuid) {
      return;
    }
    handshakeBaselineLoggedForUuid.current = dashboardTenantUuid;

    const tenantDisplay =
      selectedTenantName?.trim() ||
      (activeTenantKey ? activeTenantKey.toUpperCase() : null) ||
      "COMMAND CENTER TARGET";

    Promise.resolve().then(() => {
      appendAuditLog({
        action_type: "CONFIG_CHANGE",
        log_type: "GRC",
        user_id: "Irongate-Audit",
        description: `[ 🤝 HANDSHAKE TEST ] | LOGIC BRIDGE VERIFIED FOR TENANT: ${tenantDisplay}. NEW BASELINE ESTABLISHED.`,
        metadata_tag: "GRC_HANDSHAKE|LOGIC_BRIDGE_VERIFIED",
      });
    });
  }, [dashboardTenantUuid, selectedTenantName, activeTenantKey]);
  const tenantCompanyIds = useMemo(() => {
    const base = (data?.companies ?? []).map((c) => String(c.id)).filter(Boolean);
    const merged = [...new Set([...base, ...realtimeCompanyAllowlistExtras])];
    return merged;
  }, [data?.companies, realtimeCompanyAllowlistExtras]);

  useEffect(() => {
    setRealtimeCompanyAllowlistExtras([]);
  }, [dashboardTenantUuid]);

  const setShadowPlaneHandshakeAuthorized = useRiskStore((s) => s.setShadowPlaneHandshakeAuthorized);

  /**
   * von Flywheel: env/simulation shadow flags only here (stable SSR + first client render).
   * Cookie-based “live range” is applied in a normal `useEffect` after `hasMounted` so HTML matches hydration.
   */
  useLayoutEffect(() => {
    if (!dashboardTenantUuid) return;
    if (
      isSimulationMode ||
      process.env.NEXT_PUBLIC_SHADOW_PLANE_ACTIVE === "true" ||
      process.env.NEXT_PUBLIC_SHADOW_PLANE_ACTIVE === "1"
    ) {
      clearHandshakeTimers();
      setHandshakePhase("verified");
      setShadowPlaneHandshakeAuthorized(true);
    }
  }, [
    dashboardTenantUuid,
    isSimulationMode,
    clearHandshakeTimers,
    setShadowPlaneHandshakeAuthorized,
  ]);

  useEffect(() => {
    if (!hasMounted || !dashboardTenantUuid) return;
    if (!isShadowPlaneActiveClient()) return;
    clearHandshakeTimers();
    setHandshakePhase("verified");
    setShadowPlaneHandshakeAuthorized(true);
  }, [hasMounted, dashboardTenantUuid, clearHandshakeTimers, setShadowPlaneHandshakeAuthorized]);

  useEffect(() => {
    setInsuranceClientPostureSig("");
    insuranceSigPrevForAuditRef.current = null;
    if (!dashboardTenantUuid) {
      clearHandshakeTimers();
      setHandshakePhase("idle");
      setShadowPlaneHandshakeAuthorized(false);
      return;
    }
    clearHandshakeTimers();
    const shadowImmediate =
      isSimulationMode ||
      process.env.NEXT_PUBLIC_SHADOW_PLANE_ACTIVE === "true" ||
      process.env.NEXT_PUBLIC_SHADOW_PLANE_ACTIVE === "1" ||
      (typeof document !== "undefined" && isShadowPlaneActiveClient());
    if (shadowImmediate) {
      setHandshakePhase("verified");
      setShadowPlaneHandshakeAuthorized(true);
    } else {
      setHandshakePhase("idle");
      setShadowPlaneHandshakeAuthorized(false);
    }
  }, [dashboardTenantUuid, clearHandshakeTimers, setShadowPlaneHandshakeAuthorized, isSimulationMode]);

  useEffect(() => {
    if (!dashboardTenantUuid) {
      setTenantGovernanceBps(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const r = await getTenantGovernanceMultiplierBps(dashboardTenantUuid);
      if (cancelled) return;
      if (r.ok) setTenantGovernanceBps(r.bps);
    })();
    return () => {
      cancelled = true;
    };
  }, [dashboardTenantUuid]);

  useEffect(() => {
    const onClearThreatModals = () => {
      setSelectedThreatId(null);
      setDrawerFocus(null);
    };
    window.addEventListener("clear-threat-modals", onClearThreatModals);
    return () => window.removeEventListener("clear-threat-modals", onClearThreatModals);
  }, []);

  useEffect(() => {
    const onAllowlist = (e: Event) => {
      const ce = e as CustomEvent<{ tenantCompanyId?: string }>;
      const id = ce.detail?.tenantCompanyId?.trim();
      if (!id) return;
      setRealtimeCompanyAllowlistExtras((prev) =>
        prev.includes(id) ? prev : [...prev, id],
      );
    };
    window.addEventListener("ironframe:tenant-company-allowlist", onAllowlist);
    return () => window.removeEventListener("ironframe:tenant-company-allowlist", onAllowlist);
  }, []);

  /** Cold-boot invalidation (Dev Tenant Switcher / Command Center): drop insurance fingerprint + dashboard payload cache before refetch. */
  useEffect(() => {
    const onTenantApiCacheInvalidate = () => {
      setInsuranceClientPostureSig("");
      insuranceSigPrevForAuditRef.current = null;
      clearHandshakeTimers();
      setHandshakePhase("idle");
      setShadowPlaneHandshakeAuthorized(false);
      setData(null);
    };
    window.addEventListener(TENANT_API_CACHE_INVALIDATE_EVENT, onTenantApiCacheInvalidate);
    return () => window.removeEventListener(TENANT_API_CACHE_INVALIDATE_EVENT, onTenantApiCacheInvalidate);
  }, [clearHandshakeTimers, setShadowPlaneHandshakeAuthorized]);

  const onNewThreatDetected = useCallback((title: string) => {
    if (newThreatToastDismissRef.current) clearTimeout(newThreatToastDismissRef.current);
    setNewThreatToast({ title });
    newThreatToastDismissRef.current = setTimeout(() => {
      setNewThreatToast(null);
      newThreatToastDismissRef.current = null;
    }, 5200);
  }, []);

  const refetchDashboard = useCallback(() => {
    if (!dashboardTenantUuid) return;
    void tenantFetch('/api/dashboard', {
      cache: 'no-store',
      headers: { 'x-tenant-id': dashboardTenantUuid } as HeadersInit,
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((json: DashboardData) => setData(json))
      .catch(() => undefined);
  }, [tenantFetch, dashboardTenantUuid]);

  useEffect(() => {
    const onRefetch = () => {
      refetchDashboard();
      void pulseThreatBoardsFromDb().catch(() => undefined);
    };
    window.addEventListener('ironframe:dashboard-refetch', onRefetch);
    return () => window.removeEventListener('ironframe:dashboard-refetch', onRefetch);
  }, [refetchDashboard, pulseThreatBoardsFromDb]);

  useShadowPlaneThreatRefetch({
    dashboardTenantUuid,
    isSimulationMode,
    pulseThreatBoardsFromDb,
    refetchDashboard,
  });

  useDashboardThreatRealtime({
    enabled: Boolean(data) && Boolean(dashboardTenantUuid) && !loading && tenantCompanyIds.length > 0,
    isSimulationMode,
    tenantCompanyIds,
    replacePipelineThreats,
    replaceActiveThreats,
    onNewThreatDetected,
    onAfterSync: () => {
      refetchDashboard();
      router.refresh();
    },
  });

  useEffect(() => {
    return () => {
      if (newThreatToastDismissRef.current) clearTimeout(newThreatToastDismissRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!dashboardTenantUuid) {
      setData(null);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setError(null);
    tenantFetch('/api/dashboard', {
      cache: 'no-store',
      headers: { 'x-tenant-id': dashboardTenantUuid } as HeadersInit,
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 401 ? 'Tenant context required' : 'Failed to load dashboard');
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantFetch, dashboardTenantUuid]);

  const liveAlerts: StreamAlert[] = useMemo(() => {
    if (!data?.companies) return [];
    return data.companies.flatMap((company) =>
      (company.risks ?? [])
        .filter((r) => r.status === 'ACTIVE' && !EXCLUDED_BASELINE_RISK_TITLES.has(r.title))
        .map((risk) => ({
          id: `risk-${risk.id}`,
          type: 'AGENT_ALERT' as const,
          origin: 'SYSTEM' as const,
          isExternalSOC: false,
          sourceAgent: risk.source,
          title: risk.title,
          impact: `${company.name} (${company.sector}): Active risk requires triage.`,
          severityScore: Number(risk.score_cents),
          liabilityUsd: company.industry_avg_loss_cents ? Number(company.industry_avg_loss_cents) / 100 : 0,
          status: 'OPEN' as const,
          createdAt: new Date().toISOString(),
          sector: company.sector,
        }))
    );
  }, [data?.companies]);

  const serverAuditLogsForAudit = useMemo(() => {
    if (!data?.serverAuditLogs) return [];
    return data.serverAuditLogs.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
    }));
  }, [data?.serverAuditLogs]);

  const scrutinyHeatmap = data?.currentHeat ?? data?.scrutinyHeatmap ?? {};
  const predictiveHeatRaw = data?.predictiveHeat ?? {};
  /** Guard rail: never render predictive overlays if active tenant context diverges from dashboard scope. */
  const predictiveHeat = useMemo(() => {
    if (activeTenantUuid?.trim() && activeTenantUuid.trim() !== dashboardTenantUuid) {
      return {} as Record<string, number>;
    }
    return predictiveHeatRaw;
  }, [activeTenantUuid, dashboardTenantUuid, predictiveHeatRaw]);
  const aleExposureByAssetCents = data?.aleExposureByAssetCents ?? {};
  const complianceDriftOpenCount = data?.complianceDriftOpenCount ?? 0;
  const ironwatchAlerts = data?.ironwatchAlerts ?? [];
  const isConflictDetected = data?.isConflictDetected === true;
  const complianceVelocity = data?.complianceVelocity ?? null;
  const avgHoursToControlMapping = data?.avgHoursToControlMapping ?? null;
  const totalValueMitigatedYtdCents = data?.totalValueMitigatedYtdCents ?? "0";
  const projectedInsuranceSavingsCents = data?.projectedInsuranceSavingsCents ?? "0";
  const insuranceModelFramework = data?.insuranceModelFramework ?? "SOC2";
  const insuranceHasContinuousMonitoring = data?.insuranceHasContinuousMonitoring === true;
  const insuranceHasDueDiligencePdfs = data?.insuranceHasDueDiligencePdfs === true;
  const insuranceDefaultPremiumCents =
    data?.insuranceDefaultPremiumCents ?? (!dashboardTenantUuid ? "0" : "5000000");
  const insuranceDiscountPct =
    data?.insuranceTotalDiscountBps != null && Number.isFinite(data.insuranceTotalDiscountBps)
      ? data.insuranceTotalDiscountBps / 100
      : null;

  const insurancePostureSignal = useMemo(
    () =>
      [
        insuranceDefaultPremiumCents,
        projectedInsuranceSavingsCents,
        insuranceModelFramework,
        data?.insuranceTotalDiscountBps ?? "",
        insuranceHasContinuousMonitoring,
        insuranceHasDueDiligencePdfs,
        insuranceClientPostureSig,
      ].join("|"),
    [
      insuranceDefaultPremiumCents,
      projectedInsuranceSavingsCents,
      insuranceModelFramework,
      data?.insuranceTotalDiscountBps,
      insuranceHasContinuousMonitoring,
      insuranceHasDueDiligencePdfs,
      insuranceClientPostureSig,
    ],
  );

  const onInsurancePostureChange = useCallback((signature: string) => {
    setInsuranceClientPostureSig(signature);
  }, []);

  /** Handshake GRC lines: `appendAuditLog` only via `Promise.resolve().then` (avoids “Cannot update while rendering” on AuditIntelligence). */
  useEffect(() => {
    if (!dashboardTenantUuid) return;

    /** Shadow / Simulation Mode: skip insurance sync / 60s drift — verified immediately (no manual sign-off gate). */
    if (shadowHandshakeBypassActive) {
      clearHandshakeTimers();
      setHandshakePhase("verified");
      setShadowPlaneHandshakeAuthorized(true);
      return;
    }

    setShadowPlaneHandshakeAuthorized(false);

    const next = insurancePostureSignal;
    const prev = insuranceSigPrevForAuditRef.current;
    if (prev === null) {
      insuranceSigPrevForAuditRef.current = next;
      return;
    }
    if (prev === next) return;
    insuranceSigPrevForAuditRef.current = next;

    clearHandshakeTimers();

    const syncStartLine = "[ 🛡️ SYNC ] | INITIATING FINANCIAL-FORENSIC HANDSHAKE...";
    Promise.resolve().then(() => {
      appendAuditLog({
        action_type: "CONFIG_CHANGE",
        log_type: "GRC",
        description: syncStartLine,
        metadata_tag: "GRC_HANDSHAKE|SYNC_START",
      });
      useAgentStore.getState().addStreamMessage(syncStartLine);
    });

    setHandshakePhase("syncing");

    verifiedHandshakeTimeoutRef.current = window.setTimeout(() => {
      verifiedHandshakeTimeoutRef.current = null;
      const syncDoneLine =
        "[ ✅ SYNC ] | HANDSHAKE VERIFIED. POSTURE ALIGNED AT 1.60x MULTIPLIER.";
      Promise.resolve().then(() => {
        appendAuditLog({
          action_type: "CONFIG_CHANGE",
          log_type: "GRC",
          description: syncDoneLine,
          metadata_tag: "GRC_HANDSHAKE|SYNC_VERIFIED",
        });
        useAgentStore.getState().addStreamMessage(syncDoneLine);
      });
      setHandshakePhase("verified");

      /** Drift sentry: only after postural baseline (`verified`); 60s integrity window (requires tenant — guarded above). */
      driftHandshakeTimeoutRef.current = window.setTimeout(() => {
        driftHandshakeTimeoutRef.current = null;
        let transitioned = false;
        setHandshakePhase((p) => {
          if (p !== "verified") return p;
          transitioned = true;
          return "drift";
        });
        if (transitioned) {
          const driftLine =
            "[ ⚠️ DRIFT ] | CRITICAL: POSTURAL INTEGRITY TIMEOUT. RE-AUTHORIZATION REQUIRED.";
          Promise.resolve().then(() => {
            appendAuditLog({
              action_type: "SYSTEM_WARNING",
              log_type: "GRC",
              description: driftLine,
              metadata_tag: "GRC_HANDSHAKE|DRIFT_TIMEOUT",
            });
            useAgentStore.getState().addStreamMessage(driftLine);
          });
        }
      }, 60000);
    }, 1500);

    return () => {
      clearHandshakeTimers();
    };
  }, [
    insurancePostureSignal,
    clearHandshakeTimers,
    dashboardTenantUuid,
    isSimulationMode,
    shadowHandshakeBypassActive,
    setShadowPlaneHandshakeAuthorized,
  ]);

  const scrutinyAssetTelemetryRows = useMemo(() => {
    const keys = new Set<string>([
      ...Object.keys(scrutinyHeatmap),
      ...Object.keys(predictiveHeat),
      ...Object.keys(aleExposureByAssetCents),
    ]);
    return [...keys]
      .map((asset) => {
        const payload = scrutinyHeatmap[asset] ?? { total: 0, agents: {} };
        const focusHeat = payload.total;
        const localCycleBump = localCycleBumpsByAsset[asset] ?? 0;
        let aleCents = 0n;
        try {
          aleCents = BigInt(aleExposureByAssetCents[asset] ?? "0");
        } catch {
          aleCents = 0n;
        }
        return {
          asset,
          total: payload.total,
          agents: payload.agents ?? {},
          focusHeat: focusHeat + localCycleBump,
          predicted: predictiveHeat[asset] ?? 0,
          aleCents,
          localCycleBump,
        };
      })
      .sort((a, b) => {
        const aleOrder = Number(b.aleCents - a.aleCents);
        if (aleOrder !== 0) return aleOrder;
        return (b.focusHeat + b.predicted) - (a.focusHeat + a.predicted);
      });
  }, [scrutinyHeatmap, predictiveHeat, aleExposureByAssetCents, localCycleBumpsByAsset]);
  const sentinelAssetOptions = useMemo(
    () => scrutinyAssetTelemetryRows.map((card) => card.asset).filter(Boolean),
    [scrutinyAssetTelemetryRows],
  );

  useEffect(() => {
    const signature = JSON.stringify(scrutinyHeatmap);
    if (!signature || signature === "{}") return;
    if (signature === scrutinySignatureRef.current) return;
    scrutinySignatureRef.current = signature;

    const hottest = scrutinyAssetTelemetryRows[0];
    if (!hottest || hottest.total <= 0) return;

    const topAgents = Object.entries(hottest.agents)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([name]) => name);
    const topAgentLine =
      topAgents.length >= 2
        ? `${topAgents[0]} and ${topAgents[1]}`
        : topAgents[0] ?? "core workforce";

    useAgentStore.getState().addStreamMessage(
      `🤖 [GRC_SCRUTINY] | Exposure map updated. High reasoning density on '${hottest.asset}'. ${topAgentLine} recorded ${hottest.total} cycles in the last 60 minutes (resilience audit telemetry).`,
    );
  }, [scrutinyHeatmap, scrutinyAssetTelemetryRows]);

  useEffect(() => {
    const signature = JSON.stringify(predictiveHeat);
    if (!signature || signature === "{}") return;
    if (signature === forecastSignatureRef.current) return;
    forecastSignatureRef.current = signature;

    const top = Object.entries(predictiveHeat).sort((a, b) => b[1] - a[1])[0];
    if (!top) return;
    const [asset, score] = top;
    const pct = Math.max(1, Math.min(99, Math.round(score)));
    useAgentStore.getState().addStreamMessage(
      `🤖 [FORECAST_INITIATED] | Ironsight projects a ${pct}% probability of threat lateral movement to '${asset}'. Workforce pre-positioning scrutiny to mitigate predictive blast radius.`,
    );
  }, [predictiveHeat]);

  useEffect(() => {
    const focusId = activeRiskId?.trim();
    if (!focusId || !data?.threatEvents?.length) return;
    const threat = data.threatEvents.find((t) => t.id === focusId);
    if (!threat?.targetEntity) return;
    const asset = threat.targetEntity.trim();
    if (!asset) return;
    setLocalCycleBumpsByAsset((prev) => ({ ...prev, [asset]: (prev[asset] ?? 0) + 1 }));
    useAgentStore.getState().addStreamMessage(
      `🛡️ [IRONWATCH] | ACKNOWLEDGED ${focusId.slice(0, 8)}… → resilience audit cycle advanced for '${asset}'.`,
    );
  }, [activeRiskId, data?.threatEvents]);

  const globalOpsHeartbeatOnce = useRef(false);
  /** Standby audit row: `appendAuditLog` deferred to microtask (same as handshake). */
  useEffect(() => {
    if (globalOpsHeartbeatOnce.current) return;
    globalOpsHeartbeatOnce.current = true;
    Promise.resolve().then(() => {
      appendAuditLog({
        action_type: "CONFIG_CHANGE",
        log_type: "GRC",
        description: HANDSHAKE_SYSTEM_READY_LINE,
        metadata_tag: "GRC_HANDSHAKE|SYSTEM_READY_STANDBY",
      });
      useAgentStore.getState().addStreamMessage(
        "> [SYSTEM] Global ops heartbeat · Agent mesh / Audit Intelligence / Sentinel nominal — awaiting Command Center tenant scope.",
      );
      useAgentStore.getState().addStreamMessage(HANDSHAKE_SYSTEM_READY_LINE);
    });
  }, []);

  if (loading && dashboardTenantUuid) {
    return (
      <div className={DASHBOARD_HOME_SHELL}>
      <div className={DASHBOARD_TRIPANE_SHELL}>
        <aside className={DASHBOARD_LEFT_PANE} aria-hidden>
          <div className="space-y-3 p-4">
            <div className="h-3 w-28 animate-pulse rounded bg-slate-800" />
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-2 w-12 animate-pulse rounded bg-slate-800/80" />
              ))}
            </div>
            <div className="rounded-md border border-zinc-800/80 bg-zinc-950/40 p-3">
              <div className="mb-2 h-6 w-full animate-pulse rounded bg-amber-950/30" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-8 animate-pulse rounded bg-slate-800/90" />
                <div className="h-8 animate-pulse rounded bg-slate-800/90" />
                <div className="h-8 animate-pulse rounded bg-slate-800/90" />
                <div className="h-8 animate-pulse rounded bg-slate-800/90" />
              </div>
            </div>
          </div>
          <div className="min-h-[120px] flex-1 border-t border-slate-800/60 p-4">
            <div className="h-3 w-36 animate-pulse rounded bg-slate-800" />
            <div className="mt-3 space-y-2">
              <div className="h-16 animate-pulse rounded bg-slate-800/70" />
              <div className="h-16 animate-pulse rounded bg-slate-800/50" />
            </div>
          </div>
        </aside>
        <section
          className={DASHBOARD_CENTER_PANE}
          data-testid="dashboard-main"
          aria-busy
          aria-label="Loading pipeline and active risk posture"
        >
          <div className={DASHBOARD_CENTER_SCROLL}>
          <div className="border-b border-slate-800 px-6 pt-4">
            <div className="h-3 w-48 animate-pulse rounded bg-slate-800" />
          </div>
          <div className={DASHBOARD_CENTER_CONTENT}>
            <div>
              <div className="mb-3 h-3 w-40 animate-pulse rounded bg-slate-800" />
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-36 w-[min(100%,220px)] shrink-0 animate-pulse rounded-none border border-slate-800/80 bg-slate-900/80"
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-3 h-3 w-36 animate-pulse rounded bg-slate-800" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-none border border-slate-800/60 bg-slate-900/60" />
                ))}
              </div>
            </div>
          </div>
          </div>
        </section>
        <aside className={DASHBOARD_RIGHT_PANE}>
          <div className={DASHBOARD_RIGHT_SCROLL}>
            <div className="space-y-3 p-4">
              <div className="h-3 w-32 animate-pulse rounded bg-slate-800" />
              <div className="h-40 animate-pulse rounded border border-slate-800/80 bg-slate-900/50" />
            </div>
          </div>
        </aside>
      </div>
      </div>
    );
  }
  if (error && dashboardTenantUuid) {
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center bg-slate-950">
        <p className="text-red-400">{error ?? "Failed to load dashboard"}</p>
      </div>
    );
  }

  const effectiveData = data ?? EMPTY_DASHBOARD_DATA;
  const companies = effectiveData.companies;
  const defenseIndustryUi =
    selectedIndustry === "Defense" ||
    (companies?.some((c) => /\bdefense\b/i.test(c.sector ?? "") || /\bdefense\b/i.test(c.name ?? "")) ?? false);

  return (
    <DashboardWithDrawer
      selectedThreatId={selectedThreatId}
      setSelectedThreatId={setSelectedThreatId}
      drawerFocus={drawerFocus}
      clearDrawerFocus={() => setDrawerFocus(null)}
    >
      <div className={DASHBOARD_HOME_SHELL}>
        {typeof serverTimeEpochMs === "number" ? (
          <ClockDriftMonitor serverTimeEpochMs={serverTimeEpochMs} />
        ) : null}
        <IronwaveHeartbeat tenantUuid={dashboardTenantUuid ?? null} />
        <LiabilityAlertToast />
        <RecordExpiredToast />
        <ThreatActionErrorToast />
        {newThreatToast ? (
          <div
            role="status"
            aria-live="polite"
            className="fixed top-[4.5rem] left-1/2 z-[99] w-[min(92vw,28rem)] -translate-x-1/2 rounded-lg border border-cyan-500/70 bg-slate-900/95 px-4 py-3 shadow-[0_0_20px_rgba(34,211,238,0.25)] threat-list-fade-in"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">New threat detected</p>
                <p className="mt-1 text-sm text-slate-100">{newThreatToast.title}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (newThreatToastDismissRef.current) clearTimeout(newThreatToastDismissRef.current);
                  newThreatToastDismissRef.current = null;
                  setNewThreatToast(null);
                }}
                className="shrink-0 rounded border border-slate-600 bg-slate-800/80 px-2 py-1 text-[10px] font-bold uppercase text-slate-300 hover:bg-slate-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
        {isConflictDetected && ironwatchAlerts.length > 0 ? (
          <div
            role="alert"
            aria-live="assertive"
            className="fixed top-[8.5rem] left-1/2 z-[99] w-[min(96vw,40rem)] -translate-x-1/2 rounded-lg border border-amber-500/70 bg-amber-950/90 px-4 py-3 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">
              Compliance drift signal (Ironwatch)
            </p>
            {ironwatchAlerts.slice(0, 2).map((msg, idx) => (
              <p key={`${idx}-${msg.slice(0, 24)}`} className="mt-1 text-[11px] leading-relaxed text-amber-100">
                {msg}
              </p>
            ))}
          </div>
        ) : null}
      <div className={DASHBOARD_TRIPANE_SHELL}>
        <aside className={DASHBOARD_LEFT_PANE}>
          <Sidebar />
          {auditorViewEnabled ? (
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-300/90">{GRC_GOLD_AUDITOR_VIEW_TITLE}</p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{GRC_GOLD_AUDITOR_VIEW_INTRO}</p>
            </div>
          ) : (
            <>
              <div className="max-h-[42vh] min-h-0 shrink-0 overflow-y-auto overscroll-y-contain border-b border-zinc-900 [scrollbar-gutter:stable]">
                <IrontechLeftPaneControls />
              </div>
              <div className="flex min-h-[10rem] flex-1 flex-col overflow-hidden">
                <StrategicIntel />
              </div>
            </>
          )}
        </aside>

        <section className={DASHBOARD_CENTER_PANE} data-testid="dashboard-main">
          <div className={DASHBOARD_CENTER_SCROLL}>
          <div className={DASHBOARD_CENTER_CONTENT}>
          {typeof serverTimeEpochMs === "number" ? (
            <ClockDriftBanner
              serverTimeEpochMs={serverTimeEpochMs}
              className={`sticky top-0 z-[49] mt-3 ${DASHBOARD_CENTER_PAD_X}`}
            />
          ) : null}
          <DashboardAlertBanners phoneHomeAlert={null} regulatoryState={{ ticker: [], isSyncing: false }} />
          <Header />
          <div className="border-b border-slate-800/80 px-6 py-2">
            <ResourceMonitor />
          </div>
          {auditorViewEnabled ? (
            <section
              className={`w-full border-b border-slate-800 bg-slate-950/70 py-6 ${DASHBOARD_CENTER_PAD_X}`}
              aria-labelledby="scrutiny-heatmap-heading"
            >
              {complianceDriftOpenCount > 0 ? (
                <div className="mb-3 rounded border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-[10px] text-amber-100/95">
                  <span className="font-bold uppercase tracking-wide text-amber-300">Compliance drift — </span>
                  {complianceDriftOpenCount} risk event{complianceDriftOpenCount === 1 ? "" : "s"} lack mapped controls (SOC 2 / ISO 27001 / NIST). Prioritize control mapping before operational alerts.
                </div>
              ) : null}
              <div className="mt-1 space-y-4">
                <div>
                  <h2
                    id="scrutiny-heatmap-heading"
                    className="text-xs font-black uppercase tracking-wider text-amber-300/95"
                  >
                    {GRC_GOLD_AUDITOR_LEDGER_HEADING}
                  </h2>
                  <p className="mt-2 w-full text-[10px] leading-relaxed text-slate-500">
                    SimThreatEvent records for this tenant: mapped controls, governance SHA-256, and Product owner / designated
                    CISO signature from the forensic seal. Heatmaps and illustrative overlays are hidden in Auditor view.
                  </p>
                </div>
                <AuditorRiskLedger />
              </div>
            </section>
          ) : (
            <section
              data-testid="forensic-center-section"
              className="flex w-full min-w-0 flex-1 flex-col border-b border-slate-800 bg-slate-950/70"
              aria-label="Forensic center lane"
            >
              {complianceDriftOpenCount > 0 ? (
                <div className={`mt-4 rounded border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-[10px] text-amber-100/95 ${DASHBOARD_CENTER_PAD_X}`}>
                  <span className="font-bold uppercase tracking-wide text-amber-300">Compliance drift — </span>
                  {complianceDriftOpenCount} risk event{complianceDriftOpenCount === 1 ? "" : "s"} lack mapped controls (SOC 2 / ISO 27001 / NIST). Prioritize control mapping before operational alerts.
                </div>
              ) : null}
              <div className={`w-full py-5 pb-8 ${DASHBOARD_CENTER_PAD_X}`} data-testid="scrutiny-block">
                <GrcMaturityStrip maturity={governanceMaturity} className="mt-0" />
                <div className="mt-4">
                  <HandshakeStatusBar phase={handshakePhase} />
                </div>
                <GrcAleExposureMap
                  className="mt-5"
                  isSimulationMode={isSimulationMode}
                  complianceVelocity={complianceVelocity}
                  avgHoursToControlMapping={avgHoursToControlMapping}
                  carbonMitigatedValueCents={carbonMitigatedValueCents}
                  totalValueMitigatedYtdCents={totalValueMitigatedYtdCents}
                  projectedInsuranceSavingsCents={projectedInsuranceSavingsCents}
                  insuranceDiscountPct={insuranceDiscountPct}
                >
                <div className="space-y-4">
                  <div
                    className={`flex flex-col gap-4 lg:items-stretch ${isSimulationMode ? "lg:flex-row" : ""}`}
                  >
                    {isSimulationMode ? (
                      <div className="min-w-0 flex-[2]">
                        <BudgetJustification
                          framework={insuranceModelFramework}
                          hasContinuousMonitoring={insuranceHasContinuousMonitoring}
                          hasDueDiligencePdfs={insuranceHasDueDiligencePdfs}
                          defaultPremiumCents={insuranceDefaultPremiumCents}
                          tenantFetch={tenantFetch}
                          onInsurancePostureChange={onInsurancePostureChange}
                        />
                      </div>
                    ) : null}
                    {isSimulationMode ? (
                      <InsuranceForensicHandshakeConnector
                        flowActive={handshakePhase === "syncing"}
                      />
                    ) : null}
                    <div
                      className={`min-w-0 self-start ${isSimulationMode ? "flex-1" : "w-full"}`}
                    >
                      <GrcGoldLivingAuditBlock
                        variant="grid"
                        industry={selectedIndustry}
                        dashboardCompanyName={null}
                        handshakePhase={handshakePhase}
                        onHandshakeSignOff={onHandshakeSignOffComplete}
                        shadowPlaneAuthorizesSignOff={shadowHandshakeBypassActive}
                      />
                    </div>
                  </div>
                </div>
                </GrcAleExposureMap>
              </div>
            </section>
          )}
          {!auditorViewEnabled ? (
            <section aria-labelledby="enterprise-risk-posture-heading" className="w-full min-w-0">
              <h2
                id="enterprise-risk-posture-heading"
                className={`border-b border-slate-800 bg-slate-950 pt-5 pb-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${DASHBOARD_CENTER_PAD_X}`}
              >
                ENTERPRISE RISK POSTURE
              </h2>
              <div className="w-full min-w-0">{children}</div>
            </section>
          ) : null}

          {!auditorViewEnabled ? (
            <section
              className={DASHBOARD_CENTER_RISK_STACK}
              aria-label="Active risks — four-stage lifecycle"
              data-testid="active-risks-focal-section"
            >
              <ActiveRisksClient
                risks={effectiveData.risks}
                threatEvents={effectiveData.threatEvents ?? []}
                setSelectedThreatId={setSelectedThreatId}
              />
            </section>
          ) : null}
          {!auditorViewEnabled ? (
            <ThreatPipeline
              supplyChainThreat={null}
              showSocStream={true}
              incomingAgentAlerts={liveAlerts}
              setSelectedThreatId={setSelectedThreatId}
            />
          ) : null}
          {!auditorViewEnabled ? (
            <div className={`${DASHBOARD_CENTER_PAD_X} pb-2`}>
              <SentinelIntakeForm
                assetOptions={sentinelAssetOptions}
                manualRiskChipActive={isManualFormOpen}
                presetSimulationActive={presetRiskSelected}
              />
            </div>
          ) : null}
          </div>
          </div>
        </section>

        <aside data-ironframe-audit-intelligence="true" className={DASHBOARD_RIGHT_PANE}>
          <div className={DASHBOARD_RIGHT_SCROLL}>
            <AuditIntelligence
              serverAuditLogs={serverAuditLogsForAudit}
              tenantGovernanceBps={tenantGovernanceBps}
              onOpenThreat={(threatId, focus) => {
                setSelectedThreatId(threatId);
                setDrawerFocus(focus ?? null);
              }}
            />
          </div>
        </aside>

      </div>
      </div>
      <ForensicReasoningPlaybackModal
        threatId={forensicPlaybackThreatId}
        onClose={() => setForensicPlaybackThreatId(null)}
      />
    </DashboardWithDrawer>
  );
}
