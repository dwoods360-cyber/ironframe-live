"use client";

import { useEffect, useMemo, useState } from "react";
import { useTenantContext } from "@/app/context/TenantProvider";
import { useRiskStore } from "@/app/store/riskStore";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { formatRiskExposure } from "@/app/utils/riskFormatting";

/** Dot size bounds (px) — financial weight within GRC bands. */
const DOT_MIN_PX = 12;
const DOT_MAX_PX = 32;

type PlotPoint = {
  id: string;
  name: string;
  likelihood: number;
  impact: number;
  /** `impact * likelihood` (1–100) — drives legend colors. */
  score: number;
  financialRiskUsd: number;
  industry?: string;
  source?: string;
};

function bubbleColor(derivedRisk: number): string {
  if (derivedRisk <= 25) return "bg-emerald-500/90 border-emerald-400";
  if (derivedRisk <= 50) return "bg-amber-500/90 border-amber-400";
  if (derivedRisk <= 75) return "bg-orange-500/90 border-orange-400";
  return "bg-rose-500/90 border-rose-400";
}

const CRITICAL_RISK_MIN = 76;
const HIGH_OR_CRITICAL_MIN = 51;

function getDotSizePx(derivedRisk: number, financialUsd: number): number {
  let px = DOT_MIN_PX;
  if (derivedRisk <= 25) px = 12;
  else if (derivedRisk <= 50) px = 14;
  else if (derivedRisk <= 75) px = 20;
  else px = 24;
  const usd = Math.max(0, financialUsd);
  if (usd >= 1_000_000) px += 2;
  if (usd >= 5_000_000) px += 2;
  if (usd >= 10_000_000) px += 2;
  if (usd >= 25_000_000) px += 2;
  return Math.min(DOT_MAX_PX, Math.max(DOT_MIN_PX, px));
}

/** Lower = more severe (Critical first). */
function severityBand(score: number): number {
  if (score >= 76) return 0;
  if (score >= 51) return 1;
  if (score >= 26) return 2;
  return 3;
}

function sortThreatsForTargetingList(points: PlotPoint[]): PlotPoint[] {
  return [...points].sort((a, b) => {
    const bandDiff = severityBand(a.score) - severityBand(b.score);
    if (bandDiff !== 0) return bandDiff;
    if (b.score !== a.score) return b.score - a.score;
    return b.financialRiskUsd - a.financialRiskUsd || a.id.localeCompare(b.id);
  });
}

export default function EnterpriseHeatMap() {
  const { tenantFetch, activeTenantUuid } = useTenantContext();
  const currencyMagnitude = useRiskStore((s) => s.currencyMagnitude);
  const [points, setPoints] = useState<PlotPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  /** Default: Top 10 by USD to limit radar density; toggle for full set. */
  const [showAllThreats, setShowAllThreats] = useState(false);

  const displayedThreats = useMemo(() => {
    if (showAllThreats) return points;
    return [...points]
      .sort((a, b) => b.financialRiskUsd - a.financialRiskUsd)
      .slice(0, 10);
  }, [points, showAllThreats]);

  const sortedThreats = useMemo(
    () => sortThreatsForTargetingList(displayedThreats),
    [displayedThreats],
  );

  const idToIndex = useMemo(() => {
    const m = new Map<string, number>();
    sortedThreats.forEach((p, i) => m.set(p.id, i + 1));
    return m;
  }, [sortedThreats]);

  /** Always full pipeline — independent of Top 10 / view-all filter. */
  const highCriticalExposureUsd = useMemo(
    () =>
      points
        .filter((p) => p.score >= HIGH_OR_CRITICAL_MIN)
        .reduce((sum, p) => sum + (Number.isFinite(p.financialRiskUsd) ? p.financialRiskUsd : 0), 0),
    [points],
  );

  const highCriticalExposureFormatted = useMemo(
    () => formatRiskExposure(highCriticalExposureUsd, currencyMagnitude),
    [highCriticalExposureUsd, currencyMagnitude],
  );

  useEffect(() => {
    let cancelled = false;
    const tenantUuid = activeTenantUuid ?? TENANT_UUIDS.medshield;

    setLoading(true);
    setError(null);

    tenantFetch("/api/threat-events-heatmap", {
      cache: "no-store",
      headers: { "x-tenant-id": tenantUuid } as HeadersInit,
    })
      .then(async (res) => {
        if (!res.ok) {
          const msg = res.status === 401 ? "Tenant context required" : "Failed to load heat map";
          throw new Error(msg);
        }
        return res.json() as Promise<{ threats: PlotPoint[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setPoints(
            data.threats.map((t) => ({
              ...t,
              financialRiskUsd: Number.isFinite(t.financialRiskUsd) ? t.financialRiskUsd : 0,
            })),
          );
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setPoints([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantFetch, activeTenantUuid]);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        Likelihood (1–10) × Impact (1–10) — live ThreatEvent (pipeline, active, confirmed)
      </div>
      {loading ? (
        <p className="text-[11px] text-slate-500" role="status">
          Loading threat positions…
        </p>
      ) : null}
      {error ? (
        <p className="text-[11px] text-rose-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 pb-6 lg:grid-cols-10 lg:gap-4 lg:pb-8">
        {/* Radar — cols 1–7 */}
        <div className="min-w-0 lg:col-span-7">
          <div className="relative mx-auto h-[min(380px,55vh)] w-full max-w-full min-w-[280px] overflow-visible rounded-lg border border-slate-700 bg-gradient-to-tr from-emerald-500/10 via-amber-500/10 to-rose-500/20 sm:min-w-[320px]">
            <span
              className="pointer-events-none absolute right-2 top-2 z-[5] text-[8px] font-bold uppercase tracking-wider text-rose-200/50"
              aria-hidden
            >
              CRITICAL ZONE
            </span>
            <div className="absolute inset-0 z-0 flex flex-col">
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((yVal) => (
                <div key={yVal} className="flex flex-1 border-b border-slate-800/80">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((xVal) => (
                    <div
                      key={xVal}
                      className="flex-1 border-r border-slate-800/60 last:border-r-0"
                      aria-hidden
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="absolute -bottom-6 left-0 right-0 z-[1] flex items-center justify-between gap-1 px-1 text-[9px] font-bold text-slate-400">
              <span className="shrink-0">Rare ➔</span>
              <span className="min-w-0 text-center text-slate-300">Likelihood</span>
              <span className="shrink-0">➔ Certain</span>
            </div>
            <div
              className="pointer-events-none absolute -left-[3.25rem] top-1/2 z-[1] max-h-[min(100%,12rem)] -translate-y-1/2 text-[9px] font-bold leading-tight text-slate-400 [writing-mode:vertical-rl] sm:-left-14"
              aria-hidden
            >
              Impact (Low ➔ Severe)
            </div>
            {/* Plot band: bottom ∈ [5%, 95%] of plot area so impact 10/1 never sit on the frame edge */}
            <div className="pointer-events-none absolute inset-2 z-[2] overflow-visible">
              {displayedThreats.map((p) => {
                const derivedRisk = p.score;
                const leftPct = (p.likelihood / 10) * 100;
                const bottomPct = (p.impact / 10) * 90 + 5;
                const usd = p.financialRiskUsd;
                const usdFormatted = formatRiskExposure(usd, currencyMagnitude);
                const tooltip = `${p.name} — Risk ${derivedRisk} (L${p.likelihood} × I${p.impact}) · $${usdFormatted}${p.source ? ` · ${p.source}` : ""}`;
                const isCritical = derivedRisk >= CRITICAL_RISK_MIN;
                const sizePx = getDotSizePx(derivedRisk, usd);
                const idx = idToIndex.get(p.id) ?? 0;
                const isHovered = hoveredId === p.id;
                return (
                  <div
                    key={p.id}
                    className="pointer-events-auto absolute z-[25]"
                    style={{
                      left: `${leftPct}%`,
                      bottom: `${bottomPct}%`,
                      transform: "translate(-50%, 50%)",
                    }}
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    title={tooltip}
                    role="group"
                    aria-label={tooltip}
                  >
                    <div
                      className={`flex shrink-0 items-center justify-center rounded-full border-2 text-[8px] font-bold leading-none text-white shadow-lg transition-[box-shadow] duration-200 ease-out sm:text-[9px] ${bubbleColor(derivedRisk)} ${isCritical ? "animate-pulse" : ""} ${isHovered ? "z-[30] ring-2 ring-cyan-300 ring-offset-2 ring-offset-slate-950" : ""}`}
                      style={{
                        width: Math.max(sizePx, 18),
                        height: Math.max(sizePx, 18),
                        minWidth: Math.max(sizePx, 18),
                        minHeight: Math.max(sizePx, 18),
                      }}
                    >
                      {idx > 0 ? idx : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Targeting list — cols 8–10 */}
        <aside className="flex min-h-0 min-w-0 flex-col gap-2 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-full text-[9px] font-medium uppercase tracking-wide text-slate-500">
              View
            </span>
            <button
              type="button"
              onClick={() => setShowAllThreats(false)}
              className={`rounded-md border px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                !showAllThreats
                  ? "border-cyan-500/50 bg-cyan-950/40 text-cyan-100"
                  : "border-slate-700/80 bg-transparent text-slate-500 hover:border-slate-600 hover:text-slate-300"
              }`}
            >
              Show Top 10 Risks
            </button>
            <button
              type="button"
              onClick={() => setShowAllThreats(true)}
              className={`rounded-md border px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                showAllThreats
                  ? "border-cyan-500/50 bg-cyan-950/40 text-cyan-100"
                  : "border-slate-700/80 bg-transparent text-slate-500 hover:border-slate-600 hover:text-slate-300"
              }`}
            >
              Show All Active Risks
            </button>
            <span className="w-full text-[8px] text-slate-600">
              {points.length > 0
                ? showAllThreats
                  ? `Showing all ${points.length} active`
                  : `Showing top ${displayedThreats.length} of ${points.length} (by USD)`
                : null}
            </span>
          </div>
          <div className="shrink-0 rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Targeting</p>
            <p className="mt-1 text-[11px] font-semibold tabular-nums text-slate-200">
              Critical/High Exposure:{" "}
              <span className="text-amber-200">${highCriticalExposureFormatted}</span>
            </p>
          </div>
          <div
            className="min-h-[200px] flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40 p-2 lg:max-h-[min(380px,55vh)]"
            role="list"
            aria-label="Threat targeting list"
          >
            {sortedThreats.length === 0 ? (
              <p className="px-2 py-4 text-center text-[11px] text-slate-500">No threats in radar.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sortedThreats.map((p) => {
                  const idx = idToIndex.get(p.id) ?? 0;
                  const usdFormatted = formatRiskExposure(p.financialRiskUsd, currencyMagnitude);
                  const active = hoveredId === p.id;
                  return (
                    <li key={p.id} role="listitem">
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredId(p.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={`w-full rounded-md border px-2.5 py-2 text-left transition-shadow duration-200 ${
                          active
                            ? "border-cyan-500/70 bg-slate-900/90 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]"
                            : "border-slate-700/90 bg-slate-950/80 hover:border-slate-600"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-[10px] font-bold text-slate-200">
                            {idx}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 text-[11px] font-semibold leading-snug text-slate-100">
                              {p.name}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-200">
                                ${usdFormatted}
                              </span>
                              <span className="text-[9px] font-medium text-slate-500">
                                I: {p.impact} / L: {p.likelihood}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <div
        role="group"
        aria-label="Risk band legend"
        className="flex flex-row flex-wrap items-center justify-center gap-4 border-t border-gray-200 pt-4 text-[9px] text-slate-500 dark:border-gray-800 sm:gap-6"
      >
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          Low (≤25)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
          Medium (26–50)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-hidden />
          High (51–75)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-hidden />
          Critical (76+)
        </span>
      </div>
    </div>
  );
}
