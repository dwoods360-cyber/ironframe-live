"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Leaf, Shield, ShieldCheck, AlertTriangle, Gauge, Award } from "lucide-react";
import { ironguardFetch } from "@/app/utils/apiClient";
import type { CostOfNonComplianceResult } from "@/app/utils/financialRisk";
import { useTenantContext } from "@/app/context/TenantProvider";

type SparkPoint = { at: string; gco2PerKwh: number; dirty: boolean };

type PulsePayload = {
  tenantId: string;
  zone: string;
  carbonIntensityGco2PerKwh: number;
  intensitySource?: string;
  sustainabilityAleCents: string;
  sustainabilityAleDisplay: string;
  mitigatedValueCentsAggregate: string;
  sparkline24h: SparkPoint[];
  dirtyGrid: {
    isDirty: boolean;
    thresholdGco2PerKwh: number;
    alertMessage: string | null;
  };
  throttling: {
    agent6SuppressingBackground: boolean;
    dirtyWindowForThrottle: boolean;
    autonomousMitigationEnabled: boolean;
    intensityGco2PerKwh: number;
    thresholdGco2PerKwh: number;
    throttleLastUpdatedAt: string | null;
    notificationMessage: string | null;
  };
  forensic: {
    verified: boolean;
    sha256: string | null;
    artifactId: string | null;
    canonicalPreview: string | null;
  };
  governanceDividend: {
    penaltyAvoidedDisplay: string;
  };
  resilienceStreak: {
    monitoringEnabled: boolean;
    activeSince: string | null;
    daysElapsed: number;
    daysTarget: number;
    verifiedSustainabilityLeader: boolean;
  };
};

type ApiResponse = {
  ok: boolean;
  pulse?: PulsePayload;
  financialImpact?: CostOfNonComplianceResult;
  source?: string;
  error?: string;
};

type LkgApiResponse = {
  ok: boolean;
  pulse?: PulsePayload;
  financialImpact?: CostOfNonComplianceResult;
  lkg?: { recordedAt: string; threatId: string };
  error?: string;
};

const STATS_PATH = "/api/sustainability/stats";
const PULSE_LKG_PATH = "/api/sustainability/pulse-lkg";
const POLL_MS = 60_000;

async function sustainabilityStatsFetcher(url: string): Promise<ApiResponse> {
  const res = await ironguardFetch(url, { cache: "no-store" });
  return (await res.json()) as ApiResponse;
}

/** Arc gauge 0…maxGco2 (gCO₂eq/kWh). */
function IntensityGauge({ gco2, maxGco2 }: { gco2: number; maxGco2: number }) {
  const pct = Math.min(1, Math.max(0, gco2 / maxGco2));
  const angle = pct * Math.PI;
  const r = 36;
  const cx = 44;
  const cy = 44;
  const x1 = cx - r;
  const y1 = cy;
  const x2 = cx + r * Math.cos(Math.PI - angle);
  const y2 = cy - r * Math.sin(Math.PI - angle);
  const largeArc = angle > Math.PI / 2 ? 1 : 0;
  const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;

  return (
    <svg viewBox="0 0 88 52" className="h-14 w-full max-w-[140px]" aria-hidden>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="rgb(51 65 85 / 0.6)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d={d}
        fill="none"
        stroke={pct > 0.66 ? "rgb(244 63 94 / 0.95)" : "rgb(52 211 153 / 0.9)"}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Sparkline({ points }: { points: SparkPoint[] }) {
  const { pathD, maxY } = useMemo(() => {
    if (!points.length) return { pathD: "", maxY: 1 };
    const maxY = Math.max(...points.map((p) => p.gco2PerKwh), 1);
    const w = 280;
    const h = 48;
    const step = points.length > 1 ? w / (points.length - 1) : 0;
    const coords = points.map((p, i) => {
      const x = i * step;
      const y = h - (p.gco2PerKwh / maxY) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { pathD: coords.join(" "), maxY };
  }, [points]);

  if (!points.length) {
    return (
      <p className="text-[8px] text-slate-500">Collecting 24h grid intensity samples…</p>
    );
  }

  return (
    <div className="mt-2">
      <svg viewBox="0 0 280 48" className="h-12 w-full" aria-hidden>
        <path d={pathD} fill="none" stroke="rgb(34 211 238 / 0.7)" strokeWidth="1.5" />
        {points.map((p, i) => {
          const x = points.length > 1 ? (i / (points.length - 1)) * 280 : 140;
          const y = 48 - (p.gco2PerKwh / maxY) * 44 - 2;
          return (
            <circle
              key={`${p.at}-${i}`}
              cx={x}
              cy={y}
              r={2.5}
              fill={p.dirty ? "rgb(244 63 94)" : "rgb(52 211 153)"}
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[7px] uppercase text-slate-500">
        <span className="text-emerald-400/90">Clean</span>
        <span className="text-rose-400/90">Dirty</span>
      </div>
    </div>
  );
}

export default function CarbonPulse() {
  const { activeTenantUuid } = useTenantContext();
  const [forensicOpen, setForensicOpen] = useState(false);
  const [forensicCanonical, setForensicCanonical] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [fallbackBundle, setFallbackBundle] = useState<{
    pulse: PulsePayload;
    financialImpact?: CostOfNonComplianceResult;
  } | null>(null);
  const [lkgRecordedAt, setLkgRecordedAt] = useState<string | null>(null);

  const swrKey = activeTenantUuid ? ([STATS_PATH, activeTenantUuid] as const) : null;

  const { data, isLoading, error } = useSWR(
    swrKey,
    ([url]) => sustainabilityStatsFetcher(url),
    {
      refreshInterval: POLL_MS,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    },
  );

  const pulse = data?.pulse;
  const fin = data?.financialImpact;
  const swrErrorMessage = error instanceof Error ? error.message : error ? String(error) : null;
  const loadError = swrErrorMessage || (data && !data.ok ? data.error ?? null : null);

  useEffect(() => {
    setIsUsingFallback(false);
    setFallbackBundle(null);
    setLkgRecordedAt(null);
  }, [activeTenantUuid]);

  useEffect(() => {
    if (pulse) {
      setIsUsingFallback(false);
      setFallbackBundle(null);
      setLkgRecordedAt(null);
      return;
    }
    if (!loadError || !activeTenantUuid) return;

    let cancelled = false;
    void (async () => {
      const res = await ironguardFetch(PULSE_LKG_PATH, { cache: "no-store" });
      const json = (await res.json()) as LkgApiResponse;
      if (cancelled) return;
      if (!res.ok || !json.ok || !json.pulse) return;
      setFallbackBundle({
        pulse: json.pulse,
        financialImpact: json.financialImpact,
      });
      setIsUsingFallback(true);
      setLkgRecordedAt(json.lkg?.recordedAt ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [pulse, loadError, activeTenantUuid]);

  const effectivePulse = pulse ?? fallbackBundle?.pulse;
  const effectiveFin = fin ?? fallbackBundle?.financialImpact;
  const forensicFallbackActive =
    effectivePulse?.intensitySource === "FORENSIC_FALLBACK" || data?.source === "FORENSIC_FALLBACK";

  const lkgTooltip = useMemo(() => {
    if (!lkgRecordedAt) {
      return "Live API unreachable. Displaying SHA-256 verified artifact from last known ledger commit.";
    }
    return `Live API unreachable. Displaying SHA-256 verified artifact from ${new Date(lkgRecordedAt).toLocaleString()}.`;
  }, [lkgRecordedAt]);

  const openForensic = () => {
    const p = effectivePulse;
    const aid = p?.forensic.artifactId;
    if (!aid || !p) return;
    void (async () => {
      const res = await ironguardFetch(
        `/api/grc/carbon-pulse/evidence?artifactId=${encodeURIComponent(aid)}`,
      );
      const json = (await res.json()) as { canonical?: string | null };
      setForensicCanonical(json.canonical ?? p.forensic.canonicalPreview);
      setForensicOpen(true);
    })();
  };

  const gaugeMax = useMemo(() => {
    const base = effectivePulse?.throttling.thresholdGco2PerKwh ?? 400;
    return Math.max(
      600,
      Math.ceil(Math.max(base, effectivePulse?.carbonIntensityGco2PerKwh ?? 0) * 1.15),
    );
  }, [effectivePulse?.throttling.thresholdGco2PerKwh, effectivePulse?.carbonIntensityGco2PerKwh]);

  return (
    <section
      className="shrink-0 border-b border-emerald-900/40 bg-gradient-to-br from-emerald-950/30 via-slate-950/80 to-slate-950/90 p-3"
      aria-label="Environmental shield carbon pulse"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isUsingFallback ? (
            <span title={lkgTooltip}>
              <Shield
                className="h-4 w-4 shrink-0 text-amber-400"
                aria-hidden
                strokeWidth={2.2}
              />
            </span>
          ) : (
            <Leaf className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
          )}
          <div>
            <h3 className="text-[9px] font-black uppercase tracking-widest text-emerald-200/95">
              Sustainability Pulse
            </h3>
            <p className="text-[7px] text-slate-500">Ironbloom · Ironlock · Poll {POLL_MS / 1000}s</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {forensicFallbackActive ? (
            <span
              className="inline-flex items-center rounded border border-amber-700/50 bg-amber-950/40 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-amber-200/95"
              title="ELECTRICITY_MAPS_API_KEY unset — US-MN 2026 forensic anchor (380 gCO₂eq/kWh ±2.5% jitter)"
            >
              Fallback Active
            </span>
          ) : null}
          {effectivePulse ? (
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[7px] font-black uppercase ${
                effectivePulse.throttling.agent6SuppressingBackground
                  ? "border-amber-500/60 bg-amber-950/50 text-amber-200"
                  : "border-slate-600/60 bg-slate-900/80 text-slate-400"
              }`}
              title="Agent 6 (Ironlock) autonomous background suppression"
            >
              {effectivePulse.throttling.agent6SuppressingBackground ? "Live · Throttle" : "Standby"}
            </span>
          ) : null}
          {effectivePulse?.forensic.verified ? (
            <button
              type="button"
              onClick={openForensic}
              className="inline-flex items-center gap-1 rounded border border-cyan-600/50 bg-slate-950/60 px-1.5 py-0.5 text-[7px] font-bold uppercase text-cyan-200 hover:border-cyan-400"
              title="Blockchain-ready forensic manifest (SHA-256)"
            >
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Forensic
            </button>
          ) : null}
        </div>
      </div>

      {isLoading && !effectivePulse ? (
        <p className="mt-2 text-[8px] text-slate-500">Loading live grid intensity…</p>
      ) : loadError && !effectivePulse && !activeTenantUuid ? (
        <p className="mt-2 text-[8px] text-amber-400/90">{loadError}</p>
      ) : loadError && !effectivePulse && activeTenantUuid ? (
        <p className="mt-2 text-[8px] text-amber-400/90">
          Live feed unavailable — loading verified offline bundle…
        </p>
      ) : !effectivePulse ? (
        <p className="mt-2 text-[8px] text-amber-400/90">Pulse unavailable</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div
              className="rounded border border-cyan-800/40 bg-slate-950/60 p-2"
              title={isUsingFallback ? lkgTooltip : undefined}
            >
              <p className="mb-1 flex items-center gap-1 text-[7px] uppercase text-slate-500">
                <Gauge className="h-3 w-3" aria-hidden />
                Intensity{" "}
                {forensicFallbackActive
                  ? "(forensic fallback)"
                  : isUsingFallback
                    ? "(verified local)"
                    : "(live)"}
              </p>
              {isUsingFallback ? (
                <div className="flex items-center gap-2">
                  <Shield
                    className="h-10 w-10 shrink-0 text-amber-400"
                    aria-hidden
                    strokeWidth={2.2}
                  />
                  <div>
                    <p className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-lg font-black tabular-nums text-cyan-100">
                        {Math.round(effectivePulse.carbonIntensityGco2PerKwh)}
                        <span className="text-[9px] font-normal text-slate-400"> gCO₂eq/kWh</span>
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-wide text-amber-200">
                        OFFLINE / VERIFIED
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-[7px] text-slate-500" title={effectivePulse.zone}>
                      {effectivePulse.zone}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <IntensityGauge gco2={effectivePulse.carbonIntensityGco2PerKwh} maxGco2={gaugeMax} />
                  <div>
                    <p className="font-mono text-lg font-black tabular-nums text-cyan-100">
                      {Math.round(effectivePulse.carbonIntensityGco2PerKwh)}
                      <span className="text-[9px] font-normal text-slate-400"> gCO₂eq/kWh</span>
                    </p>
                    {forensicFallbackActive ? (
                      <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-wide text-amber-300/90">
                        Fallback Active · US-MN anchor
                      </p>
                    ) : null}
                    <p className="mt-0.5 truncate text-[7px] text-slate-500" title={effectivePulse.zone}>
                      {effectivePulse.zone}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div
              className="rounded border border-emerald-800/40 bg-slate-950/60 p-2"
              title={isUsingFallback ? lkgTooltip : undefined}
            >
              <p className="text-[7px] uppercase text-slate-500">Sustainability ALE</p>
              <p className="font-mono text-sm font-black tabular-nums text-emerald-200">
                {effectivePulse.sustainabilityAleDisplay}
              </p>
              <p className="mt-0.5 font-mono text-[7px] text-slate-500">
                Σ mitigated {effectivePulse.mitigatedValueCentsAggregate} cents (aggregate)
              </p>
              <p className="mt-1 font-mono text-[7px] text-emerald-500/80">
                Widget reference ALE (raw cents): {effectivePulse.sustainabilityAleCents}
              </p>
            </div>
          </div>

          <div className="mt-2 rounded border border-slate-800/60 bg-slate-950/40 px-2 py-1.5">
            <p className="text-[7px] font-bold uppercase tracking-wide text-slate-500">
              Throttling (Agent 6)
            </p>
            <p className="mt-0.5 text-[8px] leading-snug text-slate-300">
              Autonomous mitigation:{" "}
              <span
                className={
                  effectivePulse.throttling.autonomousMitigationEnabled
                    ? "text-emerald-300"
                    : "text-slate-500"
                }
              >
                {effectivePulse.throttling.autonomousMitigationEnabled
                  ? "ON (self-healing)"
                  : "OFF"}
              </span>
              {" · "}
              Dirty window (&gt; {Math.round(effectivePulse.throttling.thresholdGco2PerKwh)} g/kWh):{" "}
              {effectivePulse.throttling.dirtyWindowForThrottle ? (
                <span className="text-rose-300">yes</span>
              ) : (
                <span className="text-slate-500">no</span>
              )}
            </p>
            {effectivePulse.throttling.notificationMessage ? (
              <p className="mt-1 text-[7px] text-amber-200/90">
                {effectivePulse.throttling.notificationMessage}
              </p>
            ) : null}
          </div>

          <div
            className={`mt-2 rounded px-2 py-1.5 ${
              effectivePulse.resilienceStreak.verifiedSustainabilityLeader
                ? "border-2 border-emerald-400/70 bg-emerald-950/40 shadow-[0_0_14px_rgba(52,211,153,0.35)]"
                : "border border-teal-900/50 bg-slate-950/40"
            }`}
          >
            <p className="text-[7px] font-bold uppercase tracking-wide text-slate-500">
              Resilience streak (maturity)
            </p>
            {effectivePulse.resilienceStreak.verifiedSustainabilityLeader ? (
              <p className="mt-1 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wide text-emerald-200">
                <Award className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
                Verified Sustainability Leader — +0.5 maturity continuity bonus active
              </p>
            ) : effectivePulse.resilienceStreak.monitoringEnabled ? (
              <p className="mt-1 text-[8px] leading-snug text-teal-100/90">
                Day{" "}
                {Math.min(
                  effectivePulse.resilienceStreak.daysElapsed + 1,
                  effectivePulse.resilienceStreak.daysTarget,
                )}
                /{effectivePulse.resilienceStreak.daysTarget} until +0.5 bonus
                <span className="block text-[7px] text-slate-500">
                  ({effectivePulse.resilienceStreak.daysElapsed} full days since self-healing enabled)
                </span>
              </p>
            ) : (
              <p className="mt-1 text-[8px] text-slate-500">
                Streak inactive — enable Autonomous Carbon Mitigation to start the 30-day clock.
              </p>
            )}
          </div>

          <div className="mt-2">
            <p className="text-[7px] font-bold uppercase tracking-wide text-slate-500">
              Risk trajectory (24h)
            </p>
            <Sparkline points={effectivePulse.sparkline24h} />
          </div>

          {effectivePulse.dirtyGrid.isDirty && effectivePulse.dirtyGrid.alertMessage ? (
            <p className="mt-2 flex items-start gap-1.5 rounded border border-rose-800/50 bg-rose-950/30 px-2 py-1.5 text-[8px] leading-snug text-rose-100">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-rose-300" aria-hidden />
              {effectivePulse.dirtyGrid.alertMessage}
            </p>
          ) : null}

          {effectiveFin ? (
            <div className="mt-2 space-y-1.5 text-[7px] leading-snug text-slate-400">
              <p>
                CFO: Potential carbon penalty avoided by Dirty Grid response:{" "}
                <span className="font-mono font-semibold text-emerald-300">
                  {effectivePulse.governanceDividend.penaltyAvoidedDisplay}
                </span>
                {" · "}
                Combined governance dividend {effectiveFin.combinedGovernanceDividendDisplay}
              </p>
              {effectiveFin.resilienceGavelNarrative ? (
                <p className="rounded border border-amber-700/40 bg-amber-950/20 px-2 py-1.5 text-amber-100/90">
                  <span className="font-bold uppercase tracking-wide text-amber-200/95">Gavel · </span>
                  {effectiveFin.resilienceGavelNarrative}
                  {effectiveFin.resilienceBonusDividendAtRiskDisplay ? (
                    <span className="mt-0.5 block font-mono text-cyan-200/90">
                      Core dividend at risk if bonus lost:{" "}
                      {effectiveFin.resilienceBonusDividendAtRiskDisplay}
                    </span>
                  ) : null}
                </p>
              ) : effectivePulse.resilienceStreak.monitoringEnabled &&
                !effectivePulse.resilienceStreak.verifiedSustainabilityLeader ? (
                <p className="text-slate-500">
                  Automated environmental controls under review: completing 30 days of self-healing locks +0.5
                  maturity; manual-only operation increases scrutiny and compresses the governance dividend.
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {forensicOpen && effectivePulse?.forensic.sha256 ? (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Forensic manifest"
        >
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded border border-emerald-700/50 bg-slate-950 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-200">
              Blockchain-ready manifest
            </p>
            <p className="mt-1 text-[8px] text-slate-500">SHA-256 over canonical JSON (sorted fields)</p>
            <p className="mt-2 break-all font-mono text-[9px] text-cyan-200">{effectivePulse.forensic.sha256}</p>
            <pre className="mt-3 max-h-48 overflow-auto rounded border border-slate-800 bg-black/50 p-2 text-[8px] text-slate-300">
              {forensicCanonical ?? "Canonical JSON unavailable offline."}
            </pre>
            <button
              type="button"
              className="mt-3 w-full rounded border border-slate-600 py-1.5 text-[9px] font-bold uppercase text-slate-300"
              onClick={() => setForensicOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
