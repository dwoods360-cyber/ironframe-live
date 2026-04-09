'use client';

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import ActiveRisksClient from './ActiveRisksClient';
import AuditIntelligence from './AuditIntelligence';
import PhysicalTelemetry from './PhysicalTelemetry';
import DashboardWithDrawer from './DashboardWithDrawer';
import StrategicIntel from './StrategicIntel';
import ThreatPipeline from './ThreatPipeline';
import DashboardAlertBanners from './DashboardAlertBanners';
import Header from './Header';
import LiabilityAlertToast from './LiabilityAlertToast';
import RecordExpiredToast from './RecordExpiredToast';
import ThreatActionErrorToast from './ThreatActionErrorToast';
import { useTenantContext } from '../context/TenantProvider';
import { TENANT_UUIDS } from '../utils/tenantIsolation';
import type { StreamAlert } from '../hooks/useAlerts';

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

export default function DashboardHomeClient({ children }: Props) {
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
    const tenantUuid = activeTenantUuid ?? TENANT_UUIDS.medshield;
    tenantFetch('/api/dashboard', {
      cache: 'no-store',
      headers: { 'x-tenant-id': tenantUuid } as HeadersInit,
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
          <Header tenantNames={companies.map((c) => c.name)} />
          <section aria-labelledby="enterprise-risk-posture-heading">
            <h2 id="enterprise-risk-posture-heading" className="border-b border-slate-800 bg-slate-950 px-6 pt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Enterprise Risk Posture
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
          <div className="min-h-0 flex-1 overflow-hidden">
            <AuditIntelligence
              serverAuditLogs={serverAuditLogsForAudit}
              onOpenThreat={(threatId, focus) => {
                setSelectedThreatId(threatId);
                setDrawerFocus(focus ?? null);
              }}
            />
          </div>
          <PhysicalTelemetry />
        </aside>
      </div>
    </DashboardWithDrawer>
  );
}
