'use client';

import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
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
import { resolveDashboardTenantUuid } from '../utils/clientTenantCookie';
import type { StreamAlert } from '../hooks/useAlerts';
import { useRiskStore } from '../store/riskStore';
import { useAgentStore } from '../store/agentStore';
import { useSystemConfigStore } from '../store/systemConfigStore';
import { useDashboardThreatRealtime } from '../hooks/useDashboardThreatRealtime';
import { IronwaveHeartbeat } from './IronwaveHeartbeat';
import IrontechLeftPaneControls from './IrontechLeftPaneControls';
import ClockDriftBanner from './ClockDriftBanner';
import ClockDriftMonitor from './ClockDriftMonitor';
import SentinelIntakeForm from '@/components/SentinelIntakeForm';
import RiskEventCard from '@/components/RiskEventCard';
import BudgetJustification from '@/components/BudgetJustification';
import ForensicReasoningPlaybackModal from '@/components/ForensicReasoningPlaybackModal';
import AuditorRiskLedger from '@/components/AuditorRiskLedger';
import { formatCentsToUSD } from '@/app/utils/formatCentsToUSD';
import { getSectorRegulatoryProfile } from '@/app/utils/sectorRegulatoryProfile';
import { useKimbotStore } from '@/app/store/kimbotStore';
import { useGrcBotStore } from '@/app/store/grcBotStore';
import { useAdversarySimulatorStore } from '@/app/store/adversarySimulatorStore';
import { useHasMounted } from '@/app/hooks/useHasMounted';
import { DEFENSE_REGULATORY_SHIELD_BADGE_LABEL } from '@/lib/constants/grcGovernance';
import {
  GRC_GOLD_AUDITOR_LEDGER_HEADING,
  GRC_GOLD_AUDITOR_VIEW_INTRO,
  GRC_GOLD_AUDITOR_VIEW_TITLE,
} from '@/lib/constants/grcGold';
import type { ReasoningWaterfallVM } from '@/app/utils/reasoningWaterfallFromIngestion';
import ResourceMonitor from '@/app/components/ResourceMonitor';

const EXCLUDED_BASELINE_RISK_TITLES = new Set([
  'Schneider Electric SCADA Vulnerability',
  'Azure Health API Exposure',
  'Palo Alto Firewall Misconfiguration',
]);

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
    status?: string;
    assigneeId: string | null;
    complianceFramework?: string;
    mappedControls?: string[];
    remediationStatus?: string;
    financialRiskCents?: string;
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
};

/**
 * Main Ops shell — primary “ear” for production `ThreatEvent` and shadow `RiskEvent` (DB table `SimThreatEvent`) realtime, tenant-scoped.
 * See `useDashboardThreatRealtime` (postgres_changes on `ThreatEvent` or `SimThreatEvent` when simulation mode is on).
 */
export default function DashboardHomeClient({ children, serverTimeEpochMs }: Props) {
  const isSimulationMode = useSystemConfigStore().isSimulationMode;
  const { tenantFetch, activeTenantUuid } = useTenantContext();
  const replacePipelineThreats = useRiskStore((s) => s.replacePipelineThreats);
  const replaceActiveThreats = useRiskStore((s) => s.replaceActiveThreats);
  const pulseThreatBoardsFromDb = useRiskStore((s) => s.pulseThreatBoardsFromDb);
  const isManualFormOpen = useRiskStore((s) => s.isManualFormOpen);
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
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
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);
  const [drawerFocus, setDrawerFocus] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newThreatToast, setNewThreatToast] = useState<{ title: string } | null>(null);
  const [scrutinyView, setScrutinyView] = useState<"TOTAL_WORKFORCE" | "AGENT_FOCUS">("TOTAL_WORKFORCE");
  const [focusedAgent, setFocusedAgent] = useState<string>("Ironsight");
  const scrutinySignatureRef = useRef<string>("");
  const forecastSignatureRef = useRef<string>("");
  const newThreatToastDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const isLaunchingRef = useRef(false);
  /** Bootstrap companies (e.g. Ironchaos) may not be in the last GET /api/dashboard payload yet. */
  const [realtimeCompanyAllowlistExtras, setRealtimeCompanyAllowlistExtras] = useState<string[]>([]);

  const dashboardTenantUuid = useMemo(
    () => resolveDashboardTenantUuid(activeTenantUuid),
    [activeTenantUuid],
  );

  const tenantCompanyIds = useMemo(() => {
    const base = (data?.companies ?? []).map((c) => String(c.id)).filter(Boolean);
    const merged = [...new Set([...base, ...realtimeCompanyAllowlistExtras])];
    return merged;
  }, [data?.companies, realtimeCompanyAllowlistExtras]);

  useEffect(() => {
    setRealtimeCompanyAllowlistExtras([]);
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

  const onNewThreatDetected = useCallback((title: string) => {
    if (newThreatToastDismissRef.current) clearTimeout(newThreatToastDismissRef.current);
    setNewThreatToast({ title });
    newThreatToastDismissRef.current = setTimeout(() => {
      setNewThreatToast(null);
      newThreatToastDismissRef.current = null;
    }, 5200);
  }, []);

  useDashboardThreatRealtime({
    enabled: Boolean(data) && !loading && tenantCompanyIds.length > 0,
    isSimulationMode,
    tenantCompanyIds,
    replacePipelineThreats,
    replaceActiveThreats,
    onNewThreatDetected,
  });

  useEffect(() => {
    return () => {
      if (newThreatToastDismissRef.current) clearTimeout(newThreatToastDismissRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!data) setLoading(true);
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
    return () => { cancelled = true; };
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
  const predictiveHeat = data?.predictiveHeat ?? {};
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
  const insuranceDefaultPremiumCents = data?.insuranceDefaultPremiumCents ?? "5000000";
  const insuranceDiscountPct =
    data?.insuranceTotalDiscountBps != null && Number.isFinite(data.insuranceTotalDiscountBps)
      ? (data.insuranceTotalDiscountBps / 100).toFixed(2)
      : null;
  const scrutinyAgentNames = useMemo(() => {
    const names = new Set<string>();
    Object.values(scrutinyHeatmap).forEach((asset) => {
      Object.keys(asset.agents ?? {}).forEach((agent) => {
        if (agent.trim()) names.add(agent);
      });
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [scrutinyHeatmap]);

  useEffect(() => {
    if (scrutinyAgentNames.length === 0) return;
    if (!scrutinyAgentNames.includes(focusedAgent)) {
      setFocusedAgent(scrutinyAgentNames[0]);
    }
  }, [scrutinyAgentNames, focusedAgent]);

  const maxAleCentsBigInt = useMemo(() => {
    const vals = Object.values(aleExposureByAssetCents).map((s) => {
      try {
        return BigInt(s || "0");
      } catch {
        return 0n;
      }
    });
    return vals.reduce((m, v) => (v > m ? v : m), 0n);
  }, [aleExposureByAssetCents]);

  const scrutinyCards = useMemo(() => {
    const keys = new Set<string>([
      ...Object.keys(scrutinyHeatmap),
      ...Object.keys(predictiveHeat),
      ...Object.keys(aleExposureByAssetCents),
    ]);
    return [...keys]
      .map((asset) => {
        const payload = scrutinyHeatmap[asset] ?? { total: 0, agents: {} };
        const focusHeat =
          scrutinyView === "TOTAL_WORKFORCE"
            ? payload.total
            : (payload.agents?.[focusedAgent] ?? 0);
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
          focusHeat,
          predicted: predictiveHeat[asset] ?? 0,
          aleCents,
        };
      })
      .sort((a, b) => {
        const aleOrder = Number(b.aleCents - a.aleCents);
        if (aleOrder !== 0) return aleOrder;
        return (b.focusHeat + b.predicted) - (a.focusHeat + a.predicted);
      });
  }, [scrutinyHeatmap, predictiveHeat, scrutinyView, focusedAgent, aleExposureByAssetCents]);
  const sentinelAssetOptions = useMemo(
    () => scrutinyCards.map((card) => card.asset).filter(Boolean),
    [scrutinyCards],
  );

  const discoveryRegulatoryBadge = useMemo(() => {
    if (!hasMounted) return null;
    if (selectedIndustry === "Defense") return DEFENSE_REGULATORY_SHIELD_BADGE_LABEL;
    return getSectorRegulatoryProfile(selectedIndustry)?.shieldDiscoveryBadge ?? null;
  }, [hasMounted, selectedIndustry]);

  useEffect(() => {
    const signature = JSON.stringify(scrutinyHeatmap);
    if (!signature || signature === "{}") return;
    if (signature === scrutinySignatureRef.current) return;
    scrutinySignatureRef.current = signature;

    const hottest = scrutinyCards[0];
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
  }, [scrutinyHeatmap, scrutinyCards]);

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

  if (loading) {
    return (
      <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-slate-950">
        <aside
          className="relative z-0 flex h-full min-h-0 w-full max-w-[min(28rem,100%)] shrink-0 flex-col overflow-y-auto overscroll-y-contain border-r border-slate-800/50 bg-slate-950/50 [scrollbar-gutter:stable]"
          aria-hidden
        >
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
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-slate-800 bg-slate-950"
          data-testid="dashboard-main"
          aria-busy
          aria-label="Loading pipeline and active risk posture"
        >
          <div className="border-b border-slate-800 px-6 pt-4">
            <div className="h-3 w-48 animate-pulse rounded bg-slate-800" />
          </div>
          <div className="min-h-0 flex-1 space-y-6 overflow-hidden p-4 sm:p-6">
            <div>
              <div className="mb-3 h-3 w-40 animate-pulse rounded bg-slate-800" />
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-36 w-[min(100%,220px)] shrink-0 animate-pulse rounded-lg border border-slate-800/80 bg-slate-900/80"
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-3 h-3 w-36 animate-pulse rounded bg-slate-800" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-lg border border-slate-800/60 bg-slate-900/60" />
                ))}
              </div>
            </div>
          </div>
        </section>
        <aside className="flex h-full min-h-0 w-[400px] max-w-[min(400px,100%)] shrink-0 flex-col overflow-hidden border-l border-slate-800/50 bg-slate-950/50">
          <div className="space-y-3 p-4">
            <div className="h-3 w-32 animate-pulse rounded bg-slate-800" />
            <div className="h-40 animate-pulse rounded border border-slate-800/80 bg-slate-900/50" />
          </div>
        </aside>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <p className="text-red-400">{error ?? 'Failed to load dashboard'}</p>
      </div>
    );
  }

  const companies = data.companies;

  return (
    <DashboardWithDrawer
      selectedThreatId={selectedThreatId}
      setSelectedThreatId={setSelectedThreatId}
      drawerFocus={drawerFocus}
      clearDrawerFocus={() => setDrawerFocus(null)}
    >
      <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-slate-950">
        {typeof serverTimeEpochMs === 'number' ? (
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
        <aside className="relative z-0 flex h-full min-h-0 w-full max-w-[min(28rem,100%)] shrink-0 flex-col overflow-hidden border-r border-slate-800/50 bg-slate-950/50">
          {auditorViewEnabled ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-300/90">{GRC_GOLD_AUDITOR_VIEW_TITLE}</p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{GRC_GOLD_AUDITOR_VIEW_INTRO}</p>
            </div>
          ) : (
            <>
              {!loading && data ? (
                <div className="min-h-0 max-h-[min(560px,55vh)] shrink-0 overflow-y-auto overscroll-y-contain border-b border-zinc-900 [scrollbar-gutter:stable]">
                  <IrontechLeftPaneControls />
                </div>
              ) : null}
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable]">
                <StrategicIntel />
              </div>
            </>
          )}
        </aside>

        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto border-r border-slate-800 bg-slate-950 p-0"
          data-testid="dashboard-main"
        >
          {typeof serverTimeEpochMs === "number" ? (
            <ClockDriftBanner
              serverTimeEpochMs={serverTimeEpochMs}
              className="sticky top-0 z-[49] mx-4 mt-3"
            />
          ) : null}
          <DashboardAlertBanners phoneHomeAlert={null} regulatoryState={{ ticker: [], isSyncing: false }} />
          <Header tenantNames={companies.map((c) => c.name)} />
          <div className="border-b border-slate-800/80 px-6 py-2">
            <ResourceMonitor />
          </div>
          <section
            aria-labelledby="scrutiny-heatmap-heading"
            className="border-b border-slate-800 bg-slate-950/70 px-6 py-4"
          >
            {complianceDriftOpenCount > 0 ? (
              <div className="mb-3 rounded border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-[10px] text-amber-100/95">
                <span className="font-bold uppercase tracking-wide text-amber-300">Compliance drift — </span>
                {complianceDriftOpenCount} risk event{complianceDriftOpenCount === 1 ? "" : "s"} lack mapped controls (SOC 2 / ISO 27001 / NIST). Prioritize control mapping before operational alerts.
              </div>
            ) : null}
            {auditorViewEnabled ? (
              <div className="mt-1 space-y-4">
                <div>
                  <h2
                    id="scrutiny-heatmap-heading"
                    className="text-xs font-black uppercase tracking-wider text-amber-300/95"
                  >
                    {GRC_GOLD_AUDITOR_LEDGER_HEADING}
                  </h2>
                  <p className="mt-2 max-w-3xl text-[10px] leading-relaxed text-slate-500">
                    SimThreatEvent records for this tenant: mapped controls, governance SHA-256, and Product owner / designated
                    CISO signature from the forensic seal. Heatmaps and illustrative overlays are hidden in Auditor view.
                  </p>
                </div>
                <AuditorRiskLedger />
              </div>
            ) : (
              <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h2
                id="scrutiny-heatmap-heading"
                className="text-xs font-black uppercase tracking-wider text-cyan-300"
              >
                GRC ALE exposure map
              </h2>
              <div
                className="rounded border border-violet-800/50 bg-violet-950/35 px-3 py-2 text-[10px] text-violet-100/95"
                title="Validated controls per hour (shadow plane): inverse of mean hours to first control-mapping ReasoningLog"
              >
                <p className="font-black uppercase tracking-wide text-violet-300/90">Compliance velocity</p>
                <p className="mt-0.5 font-mono tabular-nums text-[11px] font-semibold text-violet-100">
                  {complianceVelocity != null && Number.isFinite(complianceVelocity)
                    ? `${complianceVelocity.toFixed(2)} ctl/hr`
                    : "—"}
                </p>
                {avgHoursToControlMapping != null && Number.isFinite(avgHoursToControlMapping) ? (
                  <p className="mt-0.5 text-[9px] text-violet-300/80">
                    Avg. map latency: {avgHoursToControlMapping.toFixed(1)}h
                  </p>
                ) : null}
              </div>
              {isSimulationMode ? (
                <div
                  className="rounded border border-emerald-800/50 bg-emerald-950/35 px-3 py-2 text-[10px] text-emerald-100/95"
                  title="Year-to-date sum of budget justification value (potential loss avoided minus modeled analyst labor) for RESOLVED and CLOSED_ARCHIVED risk events"
                >
                  <p className="font-black uppercase tracking-wide text-emerald-300/90">Value mitigated (YTD)</p>
                  <p className="mt-0.5 font-mono tabular-nums text-[11px] font-semibold text-emerald-100">
                    {formatCentsToUSD(totalValueMitigatedYtdCents)}
                  </p>
                </div>
              ) : null}
              {isSimulationMode ? (
                <div
                  className="rounded border border-teal-800/50 bg-teal-950/35 px-3 py-2 text-[10px] text-teal-100/95"
                  title="Annual cyber insurance renewal incentive (illustrative): modeled % off default $50k premium using framework tier, Ironwatch activity (last hour), and due diligence PDFs on file"
                >
                  <p className="font-black uppercase tracking-wide text-teal-300/90">Projected insurance savings</p>
                  <p className="mt-0.5 font-mono tabular-nums text-[11px] font-semibold text-teal-100">
                    {formatCentsToUSD(projectedInsuranceSavingsCents)}
                    {insuranceDiscountPct != null ? (
                      <span className="ml-1 text-[9px] font-normal text-teal-200/85">
                        ({insuranceDiscountPct}% off premium)
                      </span>
                    ) : null}
                  </p>
                </div>
              ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScrutinyView("TOTAL_WORKFORCE")}
                  className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    scrutinyView === "TOTAL_WORKFORCE"
                      ? "border-cyan-400 bg-cyan-950/40 text-cyan-200"
                      : "border-slate-700 bg-slate-900/50 text-slate-400"
                  }`}
                >
                  Total Workforce
                </button>
                <button
                  type="button"
                  onClick={() => setScrutinyView("AGENT_FOCUS")}
                  className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    scrutinyView === "AGENT_FOCUS"
                      ? "border-cyan-400 bg-cyan-950/40 text-cyan-200"
                      : "border-slate-700 bg-slate-900/50 text-slate-400"
                  }`}
                >
                  Agent Focus
                </button>
                {scrutinyView === "AGENT_FOCUS" ? (
                  <select
                    value={focusedAgent}
                    onChange={(e) => setFocusedAgent(e.target.value)}
                    className="rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] text-slate-200"
                  >
                    {scrutinyAgentNames.length > 0 ? (
                      scrutinyAgentNames.map((agent) => (
                        <option key={agent} value={agent}>
                          {agent}
                        </option>
                      ))
                    ) : (
                      <option value={focusedAgent}>{focusedAgent}</option>
                    )}
                  </select>
                ) : null}
              </div>
            </div>

            {isSimulationMode && (data?.threatEvents?.length ?? 0) > 0 ? (
              <div className="mt-3">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  Risk events · regulatory overlay
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-gutter:stable]">
                  {(data?.threatEvents ?? []).slice(0, 14).map((te) => (
                    <RiskEventCard
                      key={te.id}
                      id={te.id}
                      title={te.title}
                      complianceFramework={te.complianceFramework ?? "NIST"}
                      financialRiskCents={te.financialRiskCents ?? "0"}
                      status={te.status}
                      showDefenseIndustryBadge={hasMounted && selectedIndustry === "Defense"}
                      reasoningWaterfall={te.reasoningWaterfall ?? null}
                      onOpen={(tid) => setSelectedThreatId(tid)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {isSimulationMode && data ? (
              <div className="mt-3 max-w-md">
                <BudgetJustification
                  framework={insuranceModelFramework}
                  hasContinuousMonitoring={insuranceHasContinuousMonitoring}
                  hasDueDiligencePdfs={insuranceHasDueDiligencePdfs}
                  defaultPremiumCents={insuranceDefaultPremiumCents}
                  tenantFetch={tenantFetch}
                />
              </div>
            ) : null}

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {scrutinyCards.slice(0, 6).map((card) => {
                const denom = maxAleCentsBigInt > 0n ? maxAleCentsBigInt : 1n;
                const aleRatio = Number(card.aleCents) / Number(denom);
                const alpha = Math.min(0.82, 0.12 + aleRatio * 0.68);
                const ghostAlpha = Math.min(0.55, 0.06 + card.predicted / 140);
                const aleDisplay =
                  card.aleCents > 0n
                    ? `${card.aleCents.toString()} ¢ ALE`
                    : "0 ¢ ALE";
                const preAnalyzedAgents = Object.entries(card.agents)
                  .filter(([, n]) => n > 0)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([name]) => name);
                return (
                  <div
                    key={card.asset}
                    className="rounded border border-cyan-900/40 p-3 transition-colors"
                    style={{ backgroundColor: `rgba(8,145,178,${alpha})` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-bold text-cyan-100">{card.asset}</p>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                        {discoveryRegulatoryBadge ? (
                          <span
                            className="rounded border border-emerald-600/50 bg-emerald-950/50 px-1.5 py-0.5 text-[8px] font-bold tracking-wide text-emerald-100/95"
                            title="Industry profile regulatory overlay"
                          >
                            {discoveryRegulatoryBadge}
                          </span>
                        ) : null}
                        {card.predicted > 0 ? (
                          <span
                            className="rounded border border-cyan-300/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-200"
                            style={{ backgroundColor: `rgba(8,145,178,${ghostAlpha})` }}
                            title="Predictive exposure overlay (control positioning)"
                          >
                            Forecast
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-slate-100">
                      ALE exposure (cents): {aleDisplay}
                    </p>
                    <p className="text-[9px] text-slate-300/85">
                      Resilience audit cycles: {card.focusHeat}{" "}
                      {scrutinyView === "AGENT_FOCUS" ? `(${focusedAgent})` : "(all agents)"}
                    </p>
                    <p className="text-[9px] text-slate-300/80">Total cycles: {card.total}</p>
                    <p className="text-[9px] text-cyan-200/85">
                      Predictive overlay: {card.predicted.toFixed(1)}
                    </p>
                    {preAnalyzedAgents.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1 border-t border-cyan-900/30 pt-2">
                        <span className="w-full text-[8px] font-black uppercase tracking-wider text-cyan-500/90">
                          Pre-analyzed
                        </span>
                        {preAnalyzedAgents.map((agent) => (
                          <span
                            key={`${card.asset}-${agent}`}
                            title={`${agent} pre-analyzed exposure on this asset (scrutiny telemetry)`}
                            className="rounded-full border border-violet-700/45 bg-slate-950/65 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-violet-200/95"
                          >
                            {agent.length > 12 ? `${agent.slice(0, 11)}…` : agent}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {scrutinyCards.length === 0 ? (
                <div className="rounded border border-slate-800 bg-slate-900/50 p-3 text-[10px] text-slate-400">
                  No ALE exposure or audit telemetry in the current observation window.
                </div>
              ) : null}
            </div>
              </>
            )}
          </section>
          {!auditorViewEnabled ? (
            <section aria-labelledby="enterprise-risk-posture-heading">
              <h2 id="enterprise-risk-posture-heading" className="border-b border-slate-800 bg-slate-950 px-6 pt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                ENTERPRISE RISK POSTURE
              </h2>
              {children}
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
            <div className="px-4 pb-2">
              <SentinelIntakeForm
                assetOptions={sentinelAssetOptions}
                manualRiskChipActive={isManualFormOpen}
                presetSimulationActive={presetRiskSelected}
              />
            </div>
          ) : null}
          {!auditorViewEnabled ? (
            <ActiveRisksClient
              risks={data.risks}
              threatEvents={data.threatEvents ?? []}
              setSelectedThreatId={setSelectedThreatId}
            />
          ) : null}
        </section>

        <aside className="relative z-0 flex h-full min-h-0 w-[400px] max-w-[min(400px,100%)] shrink-0 flex-col overflow-hidden border-l border-slate-800/50 bg-slate-950/50">
          <AuditIntelligence
            serverAuditLogs={serverAuditLogsForAudit}
            onOpenThreat={(threatId, focus) => {
              setSelectedThreatId(threatId);
              setDrawerFocus(focus ?? null);
            }}
          />
        </aside>

      </div>
      <ForensicReasoningPlaybackModal
        threatId={forensicPlaybackThreatId}
        onClose={() => setForensicPlaybackThreatId(null)}
      />
    </DashboardWithDrawer>
  );
}
