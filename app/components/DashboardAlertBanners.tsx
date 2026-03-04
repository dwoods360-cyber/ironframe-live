"use client";

/**
 * Regulatory Alert Banner: vertical scrolling stack of multiple alerts.
 * Accepts an array of alert objects; empty array shows "No new regulatory alerts".
 * Auto-rotates every 5s with subtle transition; sorted by highest liability/impact first.
 */

import React, { useState, useEffect, useMemo } from "react";
import { PanelRightOpen, X } from "lucide-react";
import { useRiskStore } from "@/app/store/riskStore";
import type { PipelineThreat } from "@/app/store/riskStore";
import { formatRiskExposure } from "@/app/utils/riskFormatting";
import {
  type RegulatoryAlert,
  getPromotedAlertsFromThreats,
  tickerStringsToAlerts,
  sortAlertsByPriorityAndImpact,
} from "@/app/utils/regulatoryAlerts";

const SYSTEM_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const CAROUSEL_INTERVAL_MS = 5000;

type RegulatoryBannerState = {
  ticker: string[];
  isSyncing: boolean;
};

export interface DashboardAlertBannersProps {
  /** Optional direct array of alerts. When provided, used as primary data (merged with promoted/ticker if both exist). */
  alerts?: RegulatoryAlert[];
  phoneHomeAlert?: string | null;
  regulatoryState?: RegulatoryBannerState;
}

export default function DashboardAlertBanners({
  alerts: alertsProp,
  phoneHomeAlert = null,
  regulatoryState = { ticker: [], isSyncing: false },
}: DashboardAlertBannersProps) {
  const pipelineThreats = useRiskStore((s) => s.pipelineThreats);
  const activeThreats = useRiskStore((s) => s.activeThreats);
  const currencyMagnitude = useRiskStore((s) => s.currencyMagnitude);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [expandPanelOpen, setExpandPanelOpen] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);

  const allAlerts = useMemo(() => {
    const combined: PipelineThreat[] = [...pipelineThreats, ...activeThreats];
    const promoted = getPromotedAlertsFromThreats(combined);
    const tickerAlerts = tickerStringsToAlerts(regulatoryState.ticker ?? []);
    const merged: RegulatoryAlert[] = [];
    const seen = new Set<string>();
    if (alertsProp?.length) {
      for (const a of alertsProp) {
        if (!seen.has(a.id)) {
          seen.add(a.id);
          merged.push(a);
        }
      }
    }
    for (const a of promoted) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        merged.push(a);
      }
    }
    for (const a of tickerAlerts) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        merged.push(a);
      }
    }
    return sortAlertsByPriorityAndImpact(merged);
  }, [alertsProp, pipelineThreats, activeThreats, regulatoryState.ticker]);

  const hasAlerts = allAlerts.length > 0;
  const currentAlert = hasAlerts ? allAlerts[carouselIndex % allAlerts.length] : null;

  useEffect(() => {
    if (!hasAlerts || allAlerts.length <= 1) return;
    const id = setInterval(() => {
      setCarouselIndex((i) => {
        const next = (i + 1) % allAlerts.length;
        setTransitionKey((k) => k + 1);
        return next;
      });
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasAlerts, allAlerts.length]);

  useEffect(() => {
    setCarouselIndex(0);
  }, [allAlerts.length]);

  const displayMessage = regulatoryState.isSyncing
    ? "Syncing regulatory feed..."
    : hasAlerts && currentAlert
      ? currentAlert.message
      : "No new regulatory alerts.";

  return (
    <>
      {phoneHomeAlert && (
        <div
          className="border-b border-red-500/60 bg-red-500/15 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-red-300"
          style={{ fontFamily: SYSTEM_FONT }}
        >
          {phoneHomeAlert}
          <a href="mailto:support@ironframe.local" className="ml-2 text-red-200 underline">
            Contact Support
          </a>
        </div>
      )}

      <div className="relative border-b border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="flex items-center gap-2 text-[10px]" style={{ fontFamily: SYSTEM_FONT }}>
          <span className="shrink-0 rounded border border-red-500/70 bg-red-500/15 px-2 py-0.5 font-bold uppercase tracking-wide text-red-300">
            REGULATORY ALERT
          </span>
          <div className="min-h-[1.25rem] min-w-0 flex-1 overflow-hidden">
            <p
              key={transitionKey}
              className="animate-regulatory-slide whitespace-nowrap text-slate-200"
            >
              {displayMessage}
            </p>
          </div>
          {hasAlerts && allAlerts.length > 1 && (
            <span className="shrink-0 text-slate-500">
              {carouselIndex + 1} of {allAlerts.length}
            </span>
          )}
          {hasAlerts && (
            <button
              type="button"
              onClick={() => setExpandPanelOpen(true)}
              className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Expand regulatory alerts list"
            >
              <PanelRightOpen size={14} />
            </button>
          )}
        </div>

        {expandPanelOpen && (
          <div
            className="fixed inset-y-0 right-0 z-50 w-80 border-l border-slate-700 bg-slate-900 shadow-xl"
            style={{ fontFamily: SYSTEM_FONT }}
          >
            <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-white">
                Active Regulatory Alerts
              </span>
              <button
                type="button"
                onClick={() => setExpandPanelOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close panel"
              >
                <X size={14} />
              </button>
            </div>
            <div className="max-h-[calc(100vh-48px)] overflow-y-auto p-2">
              {allAlerts.length === 0 ? (
                <p className="text-[10px] text-slate-500">No active alerts.</p>
              ) : (
                <ul className="space-y-1.5">
                  {allAlerts.map((alert) => (
                    <li
                      key={alert.id}
                      className={`rounded border px-2 py-1.5 text-[10px] ${
                        alert.priority === "CRITICAL"
                          ? "border-red-500/50 bg-red-500/10 text-red-100"
                          : "border-slate-700 bg-slate-800/80 text-slate-200"
                      }`}
                    >
                      <span className="font-bold uppercase">{alert.priority}</span>
                      <p className="mt-0.5 break-words">{alert.message}</p>
                      {alert.liabilityM != null && (
                        <p className="mt-0.5 text-slate-400">
                          Liability: ${formatRiskExposure(alert.liabilityM * 1_000_000, currencyMagnitude)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
