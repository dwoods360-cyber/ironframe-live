'use client';

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import ActiveRisksClient from './ActiveRisksClient';
import AuditIntelligence from './AuditIntelligence';
import DashboardWithDrawer from './DashboardWithDrawer';
import StrategicIntel from './StrategicIntel';
import ThreatPipeline from './ThreatPipeline';
import Header from './Header';
import { useTenantContext } from '../context/TenantProvider';
import { resolveDashboardTenantUuid } from '../utils/clientTenantCookie';
import type { StreamAlert } from '../hooks/useAlerts';
import { useRiskStore } from '../store/riskStore';
import { useKimbotStore } from '../store/kimbotStore';
import { useGrcBotStore } from '../store/grcBotStore';
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
  serverBotAuditLogs?: Array<{
    id: string;
    createdAt: string;
    operator: string;
    botType: string;
    disposition: string;
    metadata: Record<string, unknown> | null;
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
  const { tenantFetch, activeTenantUuid } = useTenantContext();
  const replacePipelineThreats = useRiskStore((s) => s.replacePipelineThreats);
  const replaceActiveThreats = useRiskStore((s) => s.replaceActiveThreats);
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);
  const [drawerFocus, setDrawerFocus] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Bootstrap companies (e.g. Ironchaos) may not be in the last GET /api/dashboard payload yet. */
  const [realtimeCompanyAllowlistExtras, setRealtimeCompanyAllowlistExtras] = useState<string[]>([]);

  // Silent-boot guardrail: force all bot stores OFF on dashboard mount.
  useEffect(() => {
    useKimbotStore.setState({ enabled: false });
    useGrcBotStore.getState().stop();
  }, []);

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

  useDashboardThreatRealtime({
    enabled: Boolean(data) && !loading && tenantCompanyIds.length > 0,
    tenantCompanyIds,
    replacePipelineThreats,
    replaceActiveThreats,
  });

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

  const serverBotAuditLogsForAudit = useMemo(() => {
    if (!data?.serverBotAuditLogs) return [];
    return data.serverBotAuditLogs.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
    }));
  }, [data?.serverBotAuditLogs]);

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
      <main className="flex flex-col min-h-screen bg-black text-white selection:bg-emerald-500/30">
        <div className="flex flex-col min-h-screen">
          <div className="flex flex-1 overflow-hidden">
          <IronwaveHeartbeat tenantUuid={dashboardTenantUuid ?? null} />
          <aside className="w-[446px] h-full flex flex-col bg-slate-950/50 border-r border-slate-800/50 overflow-y-auto min-h-0">
            <StrategicIntel />
          </aside>

          <section
            className="flex min-w-0 flex-1 flex-col overflow-y-auto border-r border-slate-800 bg-slate-950 p-0"
            data-testid="dashboard-main"
          >
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
              serverBotAuditLogs={serverBotAuditLogsForAudit}
              onOpenThreat={(threatId, focus) => {
                setSelectedThreatId(threatId);
                setDrawerFocus(focus ?? null);
              }}
            />
          </aside>
          </div>
        </div>
      </main>
    </DashboardWithDrawer>
  );
}
