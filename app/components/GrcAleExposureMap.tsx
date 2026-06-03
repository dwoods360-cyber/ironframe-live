"use client";

import type { ReactNode } from "react";
import { CFO_SUSTAINABILITY_ROI_METADATA } from "@/app/config/cfoSustainabilityMetadata";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";

export type GrcAleExposureMapProps = {
  isSimulationMode: boolean;
  complianceVelocity: number | null;
  avgHoursToControlMapping: number | null;
  /** Production Ironbloom sealed `mitigated_value_cents` aggregate (CSRD — non-simulation ledger). */
  carbonMitigatedValueCents?: string | null;
  totalValueMitigatedYtdCents: string | null | undefined;
  projectedInsuranceSavingsCents: string | null | undefined;
  insuranceDiscountPct: number | null;
  className?: string;
  children?: ReactNode;
};

const METRIC_CARD_SHELL =
  "flex h-24 flex-col justify-between rounded border border-slate-900 bg-slate-950 p-4";

const METRIC_LABEL =
  "block font-mono text-[10px] uppercase tracking-widest text-slate-500";

/**
 * Scrutiny-block financial integrity anchor — Compliance Velocity / Value Mitigated / Insurance savings.
 */
export default function GrcAleExposureMap({
  isSimulationMode,
  complianceVelocity,
  avgHoursToControlMapping,
  carbonMitigatedValueCents,
  totalValueMitigatedYtdCents,
  projectedInsuranceSavingsCents,
  insuranceDiscountPct,
  className = "",
  children,
}: GrcAleExposureMapProps) {
  const complianceVelocityDisplay =
    complianceVelocity != null && Number.isFinite(complianceVelocity)
      ? `${complianceVelocity.toFixed(2)} ctl/hr`
      : "—";

  const complianceVelocityTitle =
    avgHoursToControlMapping != null && Number.isFinite(avgHoursToControlMapping)
      ? `Validated controls per hour — avg. map latency ${avgHoursToControlMapping.toFixed(1)}h`
      : "Validated controls per hour (shadow plane)";

  const valueMitigatedLabel = isSimulationMode ? "Value Mitigated (YTD)" : "Value mitigated";
  const valueMitigatedDisplay = isSimulationMode
    ? formatCentsToUSD(totalValueMitigatedYtdCents ?? "0")
    : formatCentsToUSD(carbonMitigatedValueCents ?? "0");
  const valueMitigatedTitle = isSimulationMode
    ? "Year-to-date sum of budget justification value for RESOLVED and CLOSED_ARCHIVED risk events"
    : `ICP $85/metric ton · kWh × gCO₂/kWh × sealed BigInt cents. ${CFO_SUSTAINABILITY_ROI_METADATA}`;

  const insuranceSavingsDisplay = formatCentsToUSD(projectedInsuranceSavingsCents ?? "0");
  const insuranceDiscountLabel =
    insuranceDiscountPct != null ? `(${insuranceDiscountPct}% off premium)` : null;

  return (
    <section
      className={`w-full min-w-0 ${className}`.trim()}
      data-testid="grc-ale-exposure-map"
      aria-labelledby="grc-ale-exposure-map-heading"
    >
      <div className="w-full min-w-0 border-b border-slate-800/70 pb-5">
        <h2
          id="grc-ale-exposure-map-heading"
          className="text-xs font-black uppercase tracking-wider text-cyan-300"
        >
          GRC ALE exposure map
        </h2>
        <p className="mt-1 max-w-md text-[9px] leading-relaxed text-slate-500">
          High-level financial integrity — compliance velocity and mitigated value. Raw signal
          ingestion (Stage 1) is reflected in audit logs and assignee history, not a separate deck.
        </p>

        {/* Financial & compliance metrics row */}
        <div className="mt-4 grid w-full grid-cols-3 gap-4">
          <div
            className={METRIC_CARD_SHELL}
            data-testid="compliance-velocity-chip"
            title={complianceVelocityTitle}
          >
            <span className={METRIC_LABEL}>Compliance Velocity</span>
            <span className="mt-1 text-xl font-bold text-white">{complianceVelocityDisplay}</span>
          </div>

          <div
            className={METRIC_CARD_SHELL}
            data-testid={isSimulationMode ? "value-mitigated-chip" : "carbon-ale-mitigated-chip"}
            title={valueMitigatedTitle}
          >
            <span className={METRIC_LABEL}>{valueMitigatedLabel}</span>
            <span className="mt-1 text-xl font-bold text-teal-400">{valueMitigatedDisplay}</span>
          </div>

          <div
            className={METRIC_CARD_SHELL}
            data-testid="insurance-savings-chip"
            title="Illustrative annual cyber insurance renewal incentive from framework tier and monitoring posture"
          >
            <span className={METRIC_LABEL}>Projected Insurance Savings</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-white">{insuranceSavingsDisplay}</span>
              {insuranceDiscountLabel ? (
                <span className="font-mono text-[10px] font-semibold text-emerald-500">
                  {insuranceDiscountLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {children ? <div className="mt-5 space-y-4">{children}</div> : null}
    </section>
  );
}
