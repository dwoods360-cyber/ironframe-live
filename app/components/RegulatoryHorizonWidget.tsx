"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTenantContext } from "@/app/context/TenantProvider";
import {
  generateTasAmendmentAction,
  pollRegulatoryFeedsAction,
} from "@/app/actions/complianceDriftActions";
import { runSimulatedAuditAction } from "@/app/actions/simulatedAuditActions";
import { runIndustryScoutAction } from "@/app/actions/regulatoryPipelineActions";
import type { SimulatedAuditReport } from "@/app/types/simulatedAudit";
import type {
  ComplianceDriftState,
  RegulatoryDriftAlert,
} from "@/app/types/complianceDrift";

type DriftApiResponse = {
  ok: boolean;
  horizons: ComplianceDriftState["horizons"];
  activeDrifts: RegulatoryDriftAlert[];
  lastPollAt: string | null;
  maturityPenalty?: { penaltyPoints: number; activeUrgentDrifts: number };
};

function severityClass(severity: string): string {
  if (severity === "CRITICAL") return "border-rose-600/80 bg-rose-950/50 text-rose-100 animate-pulse";
  if (severity === "HIGH") return "border-amber-600/70 bg-amber-950/40 text-amber-100";
  return "border-slate-700 bg-slate-900/60 text-slate-200";
}

/**
 * Not mounted on dashboard center pane (Epic-11 — no RiskEventsRegulatoryOverlay lane).
 * Retained for compliance-drift admin / ops surfaces.
 */
export default function RegulatoryHorizonWidget() {
  const { tenantFetch } = useTenantContext();
  const [data, setData] = useState<DriftApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [draftByAlert, setDraftByAlert] = useState<Record<string, string>>({});
  const [draftBusy, setDraftBusy] = useState<string | null>(null);
  const [auditBusy, setAuditBusy] = useState<string | null>(null);
  const [scoutBusy, setScoutBusy] = useState(false);
  const [auditByAlert, setAuditByAlert] = useState<Record<string, SimulatedAuditReport>>({});

  const refresh = useCallback(async () => {
    try {
      const res = await tenantFetch("/api/grc/compliance-drift");
      if (!res.ok) return;
      const j = (await res.json()) as DriftApiResponse;
      if (j.ok) setData(j);
    } finally {
      setLoading(false);
    }
  }, [tenantFetch]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 120_000);
    return () => clearInterval(id);
  }, [refresh]);

  const onPoll = () => {
    void (async () => {
      setPolling(true);
      await pollRegulatoryFeedsAction();
      setPolling(false);
      await refresh();
    })();
  };

  const onRunSimulatedAudit = (alertId: string) => {
    const draft = draftByAlert[alertId];
    if (!draft?.trim()) return;
    void (async () => {
      setAuditBusy(alertId);
      const res = await runSimulatedAuditAction(alertId, draft);
      setAuditBusy(null);
      if (res.ok) {
        setAuditByAlert((prev) => ({ ...prev, [alertId]: res.report }));
      }
    })();
  };

  const onGenerateAmendment = (alertId: string) => {
    void (async () => {
      setDraftBusy(alertId);
      const res = await generateTasAmendmentAction(alertId);
      setDraftBusy(null);
      if (res.ok) {
        setDraftByAlert((prev) => ({ ...prev, [alertId]: res.markdown }));
        await refresh();
      }
    })();
  };

  if (loading) {
    return (
      <p className="text-[9px] uppercase tracking-widest text-slate-500">Regulatory horizon loading…</p>
    );
  }

  const horizons = data?.horizons ?? [];
  const drifts = data?.activeDrifts ?? [];

  return (
    <div className="rounded-lg border border-violet-800/50 bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-200">
            Regulatory horizon
          </p>
          <p className="mt-0.5 text-[8px] text-slate-400">
            Ironsight (Agent 4) poll · Irontally (Agent 19) gap analysis
            {data?.lastPollAt ? ` · Last poll ${new Date(data.lastPollAt).toLocaleString()}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/admin/governance/comparison"
            className="rounded border border-cyan-700/60 px-2 py-1 text-[8px] font-bold uppercase text-cyan-100 hover:bg-cyan-950/40"
          >
            NIST / ISO comparison
          </Link>
          <button
            type="button"
            disabled={scoutBusy}
            onClick={() => {
              void (async () => {
                setScoutBusy(true);
                await runIndustryScoutAction();
                setScoutBusy(false);
                await refresh();
              })();
            }}
            className="rounded border border-cyan-600/60 px-2 py-1 text-[8px] font-bold uppercase text-cyan-100 disabled:opacity-50"
          >
            {scoutBusy ? "Scouting…" : "Industry scout"}
          </button>
          <button
            type="button"
            disabled={polling}
            onClick={onPoll}
            className="rounded border border-violet-600/60 px-2 py-1 text-[8px] font-bold uppercase text-violet-100 disabled:opacity-50"
          >
            {polling ? "Polling…" : "Poll feeds"}
          </button>
        </div>
      </div>

      {data?.maturityPenalty && data.maturityPenalty.penaltyPoints > 0 ? (
        <p className="mt-2 rounded border border-rose-800/50 bg-rose-950/30 px-2 py-1 text-[8px] text-rose-200">
          Maturity penalty −{data.maturityPenalty.penaltyPoints.toFixed(1)} active (
          {data.maturityPenalty.activeUrgentDrifts} drift(s) &lt;30 days)
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {horizons.map((h) => (
          <div
            key={h.id}
            className="rounded border border-slate-800 bg-black/30 px-2 py-2"
            title={h.frameworkRef}
          >
            <p className="text-[7px] font-bold uppercase text-slate-500">{h.authority}</p>
            <p className="mt-0.5 text-[8px] leading-snug text-slate-200">{h.label}</p>
            <p
              className={`mt-1 font-mono text-[10px] font-black tabular-nums ${
                h.daysRemaining < 30 ? "text-rose-300" : h.daysRemaining < 90 ? "text-amber-300" : "text-cyan-300"
              }`}
            >
              {h.daysRemaining}d
            </p>
          </div>
        ))}
      </div>

      {drifts.length > 0 ? (
        <div className="mt-4 space-y-2">
          {drifts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded border px-3 py-2 ${severityClass(alert.severity)}`}
            >
              <p className="text-[9px] font-black uppercase tracking-wide">{alert.pulseMessage}</p>
              <p className="mt-1 text-[8px] opacity-90">
                {alert.agentLabel} · TAS §{alert.tasSection} ·{" "}
                <Link href={`/constitution/tas#${alert.tasAnchorId}`} className="underline">
                  Ln {alert.tasLine}
                </Link>
              </p>
              <p className="mt-1 text-[7px] opacity-80">{alert.tasCurrentPosture.slice(0, 200)}…</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={draftBusy === alert.id}
                  onClick={() => onGenerateAmendment(alert.id)}
                  className="rounded border border-violet-500/60 bg-violet-950/50 px-2 py-1 text-[8px] font-bold uppercase text-violet-50 disabled:opacity-50"
                >
                  {draftBusy === alert.id ? "Drafting…" : "Generate TAS amendment"}
                </button>
                <button
                  type="button"
                  disabled={auditBusy === alert.id || !draftByAlert[alert.id]?.trim()}
                  onClick={() => onRunSimulatedAudit(alert.id)}
                  className="rounded border border-cyan-500/60 bg-cyan-950/50 px-2 py-1 text-[8px] font-bold uppercase text-cyan-50 disabled:opacity-50"
                >
                  {auditBusy === alert.id ? "Auditing…" : "Run simulated audit"}
                </button>
              </div>
              {draftByAlert[alert.id] ? (
                <pre className="mt-2 max-h-40 overflow-y-auto rounded border border-slate-800 bg-black/50 p-2 text-[7px] leading-relaxed text-slate-300 whitespace-pre-wrap">
                  {draftByAlert[alert.id]}
                </pre>
              ) : null}
              {auditByAlert[alert.id] ? (
                <div className="mt-2 rounded border border-cyan-800/50 bg-cyan-950/20 p-2">
                  <p className="text-[8px] font-black uppercase text-cyan-200">Audit-backtest report</p>
                  <p className="mt-1 text-[7px] leading-relaxed text-slate-200">
                    {auditByAlert[alert.id].theoreticalOutcome}
                  </p>
                  <p className="mt-1 text-[7px] text-slate-400">{auditByAlert[alert.id].narrative}</p>
                  {auditByAlert[alert.id].proposedConstitutionalSha256 ? (
                    <p className="mt-1 font-mono text-[6px] text-emerald-400">
                      Proposed hash {auditByAlert[alert.id].proposedConstitutionalSha256?.slice(0, 16)}…
                      {auditByAlert[alert.id].constitutionalHashPromoted
                        ? " · PROMOTED"
                        : " · staging only"}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[8px] text-slate-500">No active TAS drift — constitutional posture aligned with polled feeds.</p>
      )}
    </div>
  );
}
