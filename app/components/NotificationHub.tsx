"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { MonitoringAlert } from "@/services/monitoringAgent";
import { RiskTier } from "@/app/vendors/schema";

type NotificationHubProps = {
  alerts: MonitoringAlert[];
  resolveRiskTier: (vendorName: string) => RiskTier;
  onApprove: (alert: MonitoringAlert) => void;
  onArchiveLowPriority: (alertIds: string[]) => void;
};

type AlertPriority = "HIGH" | "LOW" | "INFORMATIONAL";

const DEBUG_PANEL_POSITION_STORAGE_KEY = "dev-tenant-switcher-position-v1";

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

export default function NotificationHub({ alerts, resolveRiskTier, onApprove, onArchiveLowPriority }: NotificationHubProps) {
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [positionTop, setPositionTop] = useState(20);

  useEffect(() => {
    const calculatePosition = () => {
      if (typeof window === "undefined") {
        return;
      }

      const raw = window.localStorage.getItem(DEBUG_PANEL_POSITION_STORAGE_KEY);
      if (!raw) {
        setPositionTop(20);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as { x?: number; y?: number };
        const x = typeof parsed.x === "number" ? parsed.x : 0;
        const y = typeof parsed.y === "number" ? parsed.y : 0;
        const overlapsRightZone = x > window.innerWidth - 360;
        const overlapsTopZone = y < 120;

        if (overlapsRightZone && overlapsTopZone) {
          setPositionTop(132);
          return;
        }
      } catch {
        // no-op
      }

      setPositionTop(20);
    };

    calculatePosition();
    window.addEventListener("resize", calculatePosition);
    return () => window.removeEventListener("resize", calculatePosition);
  }, []);

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

  const selectedAlert = selectedAlertId
    ? sortedAlerts.find((alert) => alert.id === selectedAlertId) ?? null
    : null;

  return (
    <>
      <div className="fixed right-4 z-[92]" style={{ top: `${positionTop}px` }}>
        <button
          type="button"
          onClick={() => setSelectedAlertId(sortedAlerts[0]?.id ?? null)}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-950/95 text-slate-200 shadow-lg"
          aria-label="Permission Required notifications"
        >
          <Bell className="h-5 w-5" />
          <span
            data-testid="notification-badge-count"
            className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-red-400/80 bg-red-500 px-1 text-[9px] font-bold text-white"
          >
            {sortedAlerts.length}
          </span>
        </button>
      </div>

      {sortedAlerts.length > 0 ? (
        <div className="fixed right-4 z-[91] w-[340px] space-y-2" style={{ top: `${positionTop + 48}px` }}>
          {sortedAlerts.map((alert) => {
            const riskTier = resolveRiskTier(alert.vendorName);
            const isHighPriority = riskTier === "CRITICAL" || riskTier === "HIGH";
            const priority = resolveAlertPriority(alert, riskTier);

            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => setSelectedAlertId(alert.id)}
                className={`w-full rounded border px-3 py-2 text-left text-[10px] ${getRiskClasses(riskTier)} ${isHighPriority ? "animate-pulse" : ""}`}
                data-testid="notification-alert-item"
                data-risk-tier={riskTier}
                data-priority={priority}
              >
                <p className="font-bold uppercase tracking-wide">Permission Required // {riskTier}</p>
                <p className="mt-1 truncate">{alert.vendorName} • {alert.documentType}</p>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onArchiveLowPriority(lowPriorityAlertIds)}
            disabled={lowPriorityAlertIds.length === 0}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-200 hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="archive-low-priority"
          >
            Archive All Low-Priority
          </button>
        </div>
      ) : null}

      {selectedAlert ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/70">
          <div className="w-full max-w-lg rounded border border-slate-800 bg-slate-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-white">Document Update // Permission Required</h3>
              <button
                type="button"
                onClick={() => setSelectedAlertId(null)}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-bold uppercase text-slate-300"
              >
                Close
              </button>
            </div>

            <p className="text-[10px] text-slate-200">
              {selectedAlert.source} detected updated {selectedAlert.documentType} for {selectedAlert.vendorName}. Approve download and versioning?
            </p>

            <button
              type="button"
              onClick={() => {
                onApprove(selectedAlert);
                setSelectedAlertId(null);
              }}
              className="mt-4 rounded border border-blue-500/70 bg-blue-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-200"
            >
              Download and Version
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
