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
import { useSystemConfigStore } from '../store/systemConfigStore';
import { useDashboardThreatRealtime } from '../hooks/useDashboardThreatRealtime';
import { IronwaveHeartbeat } from './IronwaveHeartbeat';
import IrontechLeftPaneControls from './IrontechLeftPaneControls';

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
    assigneeId: string | null;
    assignmentHistory?: Array<{
      id: string;
      action: string;
      justification: string | null;
      operatorId: string;
      createdAt: string;
    }>;
  }>;
};

type Props = {
  /** Server-rendered Enterprise Risk Posture strip (async RSC child). */
  children: ReactNode;
};

/**
 * Main Ops shell — primary “ear” for `ThreatEvent` / `SimThreatEvent` Realtime (cards + RISK INGESTION terminal), tenant-scoped.
 * See `useDashboardThreatRealtime` (postgres_changes on `public.ThreatEvent` or `SimThreatEvent` when simulation mode is on).
 */
export default function DashboardHomeClient({ children }: Props) {
  const isSimulationMode = useSystemConfigStore().isSimulationMode;
  const { tenantFetch, activeTenantUuid } = useTenantContext();
  const replacePipelineThreats = useRiskStore((s) => s.replacePipelineThreats);
  const replaceActiveThreats = useRiskStore((s) => s.replaceActiveThreats);
  const pulseThreatBoardsFromDb = useRiskStore((s) => s.pulseThreatBoardsFromDb);
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);
  const [drawerFocus, setDrawerFocus] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newThreatToast, setNewThreatToast] = useState<{ title: string } | null>(null);
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
          aria-label="Loading pipeline and active risks"
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
        <aside className="relative z-0 flex h-full min-h-0 w-full max-w-[min(28rem,100%)] shrink-0 flex-col overflow-hidden border-r border-slate-800/50 bg-slate-950/50">
          {isSimulationMode && !loading && data ? (
            <div className="min-h-0 max-h-[min(560px,55vh)] shrink-0 overflow-y-auto overscroll-y-contain border-b border-zinc-900 [scrollbar-gutter:stable]">
              <IrontechLeftPaneControls variant="sidebar" />
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable]">
            <StrategicIntel />
          </div>
        </aside>

        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto border-r border-slate-800 bg-slate-950 p-0"
          data-testid="dashboard-main"
        >
          <DashboardAlertBanners phoneHomeAlert={null} regulatoryState={{ ticker: [], isSyncing: false }} />
          <Header tenantNames={companies.map((c) => c.name)} />
          <section aria-labelledby="enterprise-risk-posture-heading">
            <h2 id="enterprise-risk-posture-heading" className="border-b border-slate-800 bg-slate-950 px-6 pt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              ENTERPRISE RISK POSTURE
            </h2>
            {children}
          </section>

          <ThreatPipeline
            supplyChainThreat={null}
            showSocStream={true}
            incomingAgentAlerts={liveAlerts}
            setSelectedThreatId={setSelectedThreatId}
          />
          <ActiveRisksClient
            risks={data.risks}
            threatEvents={data.threatEvents ?? []}
            setSelectedThreatId={setSelectedThreatId}
          />
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
    </DashboardWithDrawer>
  );
}
