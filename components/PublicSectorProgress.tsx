"use client";

import { useEffect, useMemo, useState } from "react";
import { getFrameworkCoverage, getTenantGovernanceMultiplierBps } from "@/app/actions/complianceActions";
import { useTenantContext } from "@/app/context/TenantProvider";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";

type Props = {
  activeIndustry: string;
};

/** Primary headline for the regulatory progress bar by sector (high-stakes pivot). */
export function regulatoryProgressHeadline(activeIndustry: string): string {
  switch (activeIndustry) {
    case "Defense":
      return "CMMC 2.0 Compliance Progress";
    case "Aerospace":
      return "AS9100 Rev D Readiness";
    case "Federal Government":
      return "FISMA / NIST 800-53 Progress";
    default:
      return "NIST 800-53 Baseline";
  }
}

/**
 * Regulatory readiness bar for high-stakes sectors (NIST / CMMC-backed coverage).
 * Hooks are unconditional; render is gated only after the null check (Rules of Hooks).
 */
export default function PublicSectorProgress({ activeIndustry }: Props) {
  const showRegulatoryBar = [
    "Defense",
    "Aerospace",
    "Federal Government",
    "Public Sector",
    "State & Local",
  ].includes(activeIndustry);
  const { activeTenantUuid } = useTenantContext();
  const tenantUuid = useMemo(() => resolveDashboardTenantUuid(activeTenantUuid), [activeTenantUuid]);
  const [govMultiplierBps, setGovMultiplierBps] = useState<number | null>(null);
  const [readinessPct, setReadinessPct] = useState<number | null>(null);
  const [validated, setValidated] = useState(0);
  const [required, setRequired] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantUuid) {
      setGovMultiplierBps(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const g = await getTenantGovernanceMultiplierBps(tenantUuid);
      if (cancelled) return;
      if (g.ok) setGovMultiplierBps(g.bps);
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantUuid]);

  useEffect(() => {
    if (!showRegulatoryBar) {
      setLoading(false);
      setReadinessPct(null);
      setLoadError(null);
      return;
    }
    if (!tenantUuid) {
      setLoading(false);
      setLoadError("Tenant context required.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      const res = await getFrameworkCoverage(tenantUuid, "NIST");
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setReadinessPct(null);
        setLoadError(res.error);
        return;
      }
      setReadinessPct(res.coverage.readinessPercent);
      setValidated(res.coverage.totals.validatedControls);
      setRequired(res.coverage.totals.requiredControls);
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantUuid, showRegulatoryBar]);

  /** Upper bound of the regulatory uplift curve — from `Tenant.industry` / industrial seed (bps), not a UI guess. */
  const regulatoryMultiplierStart = govMultiplierBps != null ? govMultiplierBps / 100 : 1.4;

  const effectiveRegulatoryMult = useMemo(() => {
    const r = readinessPct ?? 0;
    return (
      regulatoryMultiplierStart - (regulatoryMultiplierStart - 1) * (r / 100)
    );
  }, [readinessPct, regulatoryMultiplierStart]);

  const barWidth = Math.min(100, Math.max(0, readinessPct ?? 0));

  if (!showRegulatoryBar) {
    return null;
  }

  return (
    <div className="mb-3 rounded border border-indigo-500/35 bg-indigo-950/35 px-2.5 py-2.5 ring-1 ring-indigo-400/15">
      <p className="text-[9px] font-black leading-snug tracking-wide text-indigo-200/95">
        {regulatoryProgressHeadline(activeIndustry)}
      </p>
      <p className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-indigo-400/80">{activeIndustry}</p>
      <p className="mt-1 text-[9px] leading-snug text-indigo-100/85">
        Regulatory multiplier ({regulatoryMultiplierStart.toFixed(1)}x baseline) declines as validated controls increase:{" "}
        <span className="font-mono font-bold text-indigo-200">{effectiveRegulatoryMult.toFixed(2)}x</span> effective vs
        residual exposure.
      </p>
      {loading ? (
        <p className="mt-2 text-[9px] text-indigo-300/70">Loading coverage...</p>
      ) : loadError ? (
        <p className="mt-2 text-[9px] text-rose-300/90">{loadError}</p>
      ) : (
        <>
          <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-indigo-200/80">
            <span>
              Controls validated:{" "}
              <span className="font-mono font-semibold text-indigo-100">
                {String(validated)}/{String(required)}
              </span>
            </span>
            <span className="font-mono text-indigo-200">
              {readinessPct != null ? `${readinessPct.toFixed(1)}%` : "--"}
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-900">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-500"
              style={{ width: `${String(barWidth)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
