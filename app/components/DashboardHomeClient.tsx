'use client';

import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
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
import { resolveDashboardTenantUuid } from '../utils/clientTenantCookie';
import type { StreamAlert } from '../hooks/useAlerts';
import { useRiskStore } from '../store/riskStore';
import { useDashboardThreatRealtime } from '../hooks/useDashboardThreatRealtime';
import { IronwaveHeartbeat } from './IronwaveHeartbeat';

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
 * Main Ops shell — primary “ear” for `ThreatEvent` Realtime (cards + RISK INGESTION terminal), tenant-scoped.
 * See `useDashboardThreatRealtime` (postgres_changes on `public.ThreatEvent`).
 */
export default function DashboardHomeClient({ children }: Props) {
  const router = useRouter();
  const { tenantFetch, activeTenantUuid } = useTenantContext();
  const replacePipelineThreats = useRiskStore((s) => s.replacePipelineThreats);
  const replaceActiveThreats = useRiskStore((s) => s.replaceActiveThreats);
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);
  const [drawerFocus, setDrawerFocus] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newThreatToast, setNewThreatToast] = useState<{ title: string } | null>(null);
  const newThreatToastDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    tenantCompanyIds,
    replacePipelineThreats,
    replaceActiveThreats,
    onNewThreatDetected,
    onAfterSync: () => router.refresh(),
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
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <p className="text-slate-400">Loading dashboard…</p>
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
      <div className="flex h-full overflow-hidden bg-slate-950">
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
        <aside className="w-[446px] h-full flex flex-col bg-slate-950/50 border-r border-slate-800/50 overflow-y-auto min-h-0">
          <StrategicIntel />
        </aside>

        <section
          className="flex min-w-0 flex-1 flex-col overflow-y-auto border-r border-slate-800 bg-slate-950 p-0"
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

        <aside className="w-[400px] h-full flex flex-col bg-slate-950/50 border-l border-slate-800/50 overflow-hidden">
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
