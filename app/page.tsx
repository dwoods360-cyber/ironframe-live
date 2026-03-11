'use client';

import { useState, useEffect, useMemo } from 'react';
import ActiveRisksClient from './components/ActiveRisksClient';
import AuditIntelligence from './components/AuditIntelligence';
import DashboardWithDrawer from './components/DashboardWithDrawer';
import StrategicIntel from './components/StrategicIntel';
import ThreatPipeline from './components/ThreatPipeline';
import DashboardAlertBanners from './components/DashboardAlertBanners';
import GlobalHealthSummaryCard from './components/GlobalHealthSummaryCard';
import Header from './components/Header';
import LiabilityAlertToast from './components/LiabilityAlertToast';
import RecordExpiredToast from './components/RecordExpiredToast';
import ThreatActionErrorToast from './components/ThreatActionErrorToast';
import { useTenantContext } from './context/TenantProvider';
import { TENANT_UUIDS } from './utils/tenantIsolation';
import type { StreamAlert } from './hooks/useAlerts';

// # AUDIT_STREAM_LOGIC — serverAuditLogsForAudit passed to AuditIntelligence (real-time log mapping)
// # SEARCH_ENGINE_INPUTS / # GRC_ACTION_CHIPS / # ANALYST_NOTES_FEED — live in AuditIntelligence and Drawer/Panel

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
    threatId?: string | null;
    score_cents: number;
    company: { name: string; sector: string };
    isSimulation?: boolean;
  }>;
};

export default function Page() {
  const { tenantFetch, activeTenantUuid } = useTenantContext();
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);
  const [drawerFocus, setDrawerFocus] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Tenant isolation: send x-tenant-id (required by GET /api/dashboard). Default to medshield when not on a tenant route.
    const tenantUuid = activeTenantUuid ?? TENANT_UUIDS.medshield;
    tenantFetch('/api/dashboard', { headers: { 'x-tenant-id': tenantUuid } } as RequestInit)
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
  }, [tenantFetch, activeTenantUuid]);

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

  const serializedCompaniesForHealth = useMemo(() => {
    if (!data?.companies) return [];
    return data.companies.map((c) => ({
      name: c.name,
      sector: c.sector,
      risks: (c.risks ?? []).map((r) => ({ status: r.status })),
      policies: (c.policies ?? []).map((p: unknown) => ({
        status: (p as { status?: string })?.status ?? "UNKNOWN",
      })),
      industry_avg_loss_cents: c.industry_avg_loss_cents ?? null,
    }));
  }, [data?.companies]);

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

  const companies = data!.companies;

  return (
    <DashboardWithDrawer
      selectedThreatId={selectedThreatId}
      setSelectedThreatId={setSelectedThreatId}
      drawerFocus={drawerFocus}
      clearDrawerFocus={() => setDrawerFocus(null)}
    >
      <div className="flex h-full overflow-hidden bg-slate-950">
        <LiabilityAlertToast />
        <RecordExpiredToast />
        <ThreatActionErrorToast />
        <aside className="w-[446px] h-full flex flex-col bg-slate-950/50 border-r border-slate-800/50 overflow-y-auto min-h-0">
          <StrategicIntel />
        </aside>

        <section
          className="flex min-w-0 flex-1 flex-col overflow-y-auto border-r border-slate-800 bg-slate-950 p-0"
          data-testid="dashboard-main"
        >
          <DashboardAlertBanners phoneHomeAlert={null} regulatoryState={{ ticker: [], isSyncing: false }} />
          {/* # HEADER_TITLE — EMERGENCY CLICK TEST (rendered by Header.tsx for Playwright E2E — Iteration 3.1) */}
          <Header tenantNames={companies.map((c) => c.name)} />
          <section aria-labelledby="enterprise-risk-posture-heading">
            <h2 id="enterprise-risk-posture-heading" className="border-b border-slate-800 bg-slate-950 px-6 pt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Enterprise Risk Posture
            </h2>
            <GlobalHealthSummaryCard companies={serializedCompaniesForHealth} coreintelTrendActive={false} />
          </section>

          <ThreatPipeline
            supplyChainThreat={null}
            showSocStream={true}
            incomingAgentAlerts={liveAlerts}
            setSelectedThreatId={setSelectedThreatId}
          />
          <ActiveRisksClient risks={data.risks} setSelectedThreatId={setSelectedThreatId} />
        </section>

        {/* # AUDIT_STREAM_LOGIC — serverAuditLogs + useAuditLoggerStore (auditLogs) merged in AuditIntelligence */}
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
