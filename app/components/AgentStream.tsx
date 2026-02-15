"use client";

import { Eye, ShieldAlert } from "lucide-react";
import { getAlertDispatchMeta, StreamAlert } from "@/app/hooks/useAlerts";

type AgentStreamProps = {
  alerts: StreamAlert[];
  socIntakeEnabled: boolean;
  onApprove: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
};

const SCORE_STYLE = (score: number) => {
  if (score >= 85) {
    return "text-red-300 border-red-500/70 bg-red-500/15";
  }

  if (score >= 65) {
    return "text-amber-300 border-amber-500/70 bg-amber-500/15";
  }

  return "text-emerald-300 border-emerald-500/70 bg-emerald-500/15";
};

export default function AgentStream({ alerts, socIntakeEnabled, onApprove, onDismiss }: AgentStreamProps) {
  const visibleAlerts = alerts.filter((alert) => {
    const isCadenceDispatchConfirmation = alert.title === "CISO/LEGAL ESCALATION DISPATCH CONFIRMED";

    if (alert.type === "SOC_EMAIL" && !socIntakeEnabled && !isCadenceDispatchConfirmation) {
      return false;
    }

    return true;
  });

  return (
    <section className="rounded border border-slate-800 bg-slate-900/40 p-3">
      <h2 className="text-[10px] font-bold uppercase tracking-wide text-white">AGENT STREAM</h2>
      <p className="mt-1 text-[9px] uppercase tracking-wide text-slate-400">Live Actionable Alerts</p>

      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {visibleAlerts.length === 0 ? (
          <div className="rounded border border-slate-800 bg-slate-950/50 p-3 text-[10px] text-slate-400">
            No active agent alerts.
          </div>
        ) : (
          visibleAlerts.map((alert) => {
            const dispatchMeta = getAlertDispatchMeta({
              type: alert.type,
              origin: alert.origin,
              isExternalSOC: alert.isExternalSOC,
            });

            return (
            <article key={alert.id} className={`rounded border bg-slate-950/50 p-3 ${dispatchMeta.borderClass}`}>
              <div className="flex items-center gap-2">
                <p
                  title={dispatchMeta.sourceTooltip}
                  className={`text-[9px] font-bold uppercase tracking-wide ${dispatchMeta.badgeClass}`}
                >
                  {dispatchMeta.label}
                </p>
                {alert.origin !== "SOC_INTAKE" && alert.sourceAgent === "IRONSIGHT" ? (
                  <Eye className="h-3.5 w-3.5 text-blue-300" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
                )}
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">[{alert.sourceAgent}]</p>
              </div>
              <p className="mt-1 text-[10px] font-bold uppercase text-white">{alert.title}</p>
              <p className="mt-1 text-[10px] text-slate-300">{alert.impact}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px]">
                <span className={`rounded border px-2 py-0.5 font-bold uppercase ${SCORE_STYLE(alert.severityScore)}`}>
                  Severity: {alert.severityScore}/100
                </span>
                <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-bold uppercase text-slate-300">
                  Liability: ${alert.liabilityUsd.toLocaleString()}
                </span>
                <span
                  className={`rounded border px-2 py-0.5 font-bold uppercase ${
                    alert.status === "APPROVED"
                      ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300"
                      : alert.status === "DISMISSED"
                        ? "border-amber-500/70 bg-amber-500/15 text-amber-300"
                        : "border-blue-500/70 bg-blue-500/15 text-blue-300"
                  }`}
                >
                  {alert.status}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={alert.status !== "OPEN"}
                  onClick={() => onApprove(alert.id)}
                  className="rounded border border-emerald-500/70 bg-emerald-500/15 px-2 py-1 text-[9px] font-bold uppercase text-emerald-200 disabled:opacity-50"
                >
                  APPROVE
                </button>
                <button
                  type="button"
                  disabled={alert.status !== "OPEN"}
                  onClick={() => onDismiss(alert.id)}
                  className="rounded border border-amber-500/70 bg-amber-500/15 px-2 py-1 text-[9px] font-bold uppercase text-amber-200 disabled:opacity-50"
                >
                  DISMISS
                </button>
              </div>
            </article>
          )})
        )}
      </div>
    </section>
  );
}
