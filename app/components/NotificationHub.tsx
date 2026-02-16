"use client";

import { useMemo } from "react";
import { MonitoringAlert } from "@/services/monitoringAgent";
import { RiskTier } from "@/app/vendors/schema";

type NotificationHubProps = {
  alerts: MonitoringAlert[];
  resolveRiskTier: (vendorName: string) => RiskTier;
  onApprove: (alert: MonitoringAlert) => void;
  onReject: (alertId: string) => void;
  onArchiveLowPriority: (alertIds: string[]) => void;
};

type AlertPriority = "HIGH" | "LOW" | "INFORMATIONAL";

const RISK_PRIORITY: Record<RiskTier, number> = {
  CRITICAL: 3,
  HIGH: 2,
  LOW: 1,
};

function getRiskClasses(riskTier: RiskTier) {
  if (riskTier === "CRITICAL") {
    return "border-red-500/60 bg-red-500/15 text-red-100";
  }

  if (riskTier === "HIGH") {
    return "border-amber-500/60 bg-amber-500/15 text-amber-100";
  }

  return "border-emerald-500/50 bg-emerald-500/10 text-emerald-100";
}

function resolveAlertPriority(alert: MonitoringAlert, riskTier: RiskTier): AlertPriority {
  if (riskTier === "CRITICAL" || riskTier === "HIGH") {
    return "HIGH";
  }

  const source = alert.source.toLowerCase();
  if (source.includes("informational") || source.includes("info")) {
    return "INFORMATIONAL";
  }

  return "LOW";
}

export default function NotificationHub({ alerts, resolveRiskTier, onApprove, onReject, onArchiveLowPriority }: NotificationHubProps) {
  const sortedAlerts = useMemo(
    () =>
      alerts
        .slice()
        .sort((left, right) => {
          const riskDiff = RISK_PRIORITY[resolveRiskTier(right.vendorName)] - RISK_PRIORITY[resolveRiskTier(left.vendorName)];
          if (riskDiff !== 0) {
            return riskDiff;
          }

          return right.discoveredAt.localeCompare(left.discoveredAt);
        }),
    [alerts, resolveRiskTier],
  );

  const lowPriorityAlertIds = useMemo(
    () =>
      sortedAlerts
        .filter((alert) => {
          const riskTier = resolveRiskTier(alert.vendorName);
          const priority = resolveAlertPriority(alert, riskTier);
          return priority === "LOW" || priority === "INFORMATIONAL";
        })
        .map((alert) => alert.id),
    [resolveRiskTier, sortedAlerts],
  );

  return (
    <div className="mb-4 rounded border border-slate-800 bg-slate-950/40 px-3 py-2">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-200">Permission Required</p>
        <span
          data-testid="notification-badge-count"
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-red-400/80 bg-red-500 px-1 text-[9px] font-bold text-white"
        >
          {sortedAlerts.length}
        </span>
      </div>

      {sortedAlerts.length > 0 ? (
        <div
          data-testid="notification-horizontal-bar"
          className="flex flex-row gap-2 overflow-x-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {sortedAlerts.map((alert) => {
            const riskTier = resolveRiskTier(alert.vendorName);
            const isHighPriority = riskTier === "CRITICAL" || riskTier === "HIGH";
            const priority = resolveAlertPriority(alert, riskTier);

            return (
              <div
                key={alert.id}
                className={`min-w-[190px] rounded border px-2 py-1 text-left text-[9px] ${getRiskClasses(riskTier)} ${isHighPriority ? "animate-pulse" : ""}`}
                data-testid="notification-alert-item"
                data-risk-tier={riskTier}
                data-priority={priority}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 pr-1">
                    <p className="font-bold uppercase tracking-tight leading-tight">Permission Required // {riskTier}</p>
                    <p className="leading-tight break-words">{alert.vendorName} • {alert.documentType}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => onApprove(alert)}
                      className="rounded border border-blue-500/70 bg-blue-500/20 px-1 py-0 text-[8px] font-bold uppercase tracking-tight text-blue-200"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(alert.id)}
                      className="rounded border border-slate-700 bg-slate-900 px-1 py-0 text-[8px] font-bold uppercase tracking-tight text-slate-200"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => onArchiveLowPriority(lowPriorityAlertIds)}
            disabled={lowPriorityAlertIds.length === 0}
            className="min-w-[170px] rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[8px] font-bold uppercase tracking-tight text-slate-200 hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="archive-low-priority"
          >
            Archive All Low-Priority
          </button>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400">No active permission-required notices.</p>
      )}
    </div>
  );
}
