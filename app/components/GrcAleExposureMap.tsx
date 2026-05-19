"use client";

import type { ReactNode } from "react";
import ForensicMetricChip from "@/app/components/ui/ForensicMetricChip";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";

export type GrcAleExposureMapProps = {
  isSimulationMode: boolean;
  complianceVelocity: number | null;
  avgHoursToControlMapping: number | null;
  totalValueMitigatedYtdCents: string | null | undefined;
  projectedInsuranceSavingsCents: string | null | undefined;
  insuranceDiscountPct: number | null;
  className?: string;
  children?: ReactNode;
};

/**
 * Scrutiny-block financial integrity anchor — Compliance Velocity / Value Mitigated chips.
 * Event-level framework and governed liability appear on Active Risks cards and assignee history.
 */
export default function GrcAleExposureMap({
  isSimulationMode,
  complianceVelocity,
  avgHoursToControlMapping,
  totalValueMitigatedYtdCents,
  projectedInsuranceSavingsCents,
  insuranceDiscountPct,
  className = "",
  children,
}: GrcAleExposureMapProps) {
  return (
    <section
      className={`w-full min-w-0 ${className}`.trim()}
      data-testid="grc-ale-exposure-map"
      aria-labelledby="grc-ale-exposure-map-heading"
    >
      <div className="flex w-full min-w-0 flex-col gap-4 border-b border-slate-800/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 shrink-0">
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
        </div>

        <div className="flex min-w-0 flex-wrap items-stretch gap-2 sm:justify-end">
          <ForensicMetricChip
            label="Compliance velocity"
            value={
              complianceVelocity != null && Number.isFinite(complianceVelocity)
                ? `${complianceVelocity.toFixed(2)} ctl/hr`
                : "—"
            }
            sublabel={
              avgHoursToControlMapping != null && Number.isFinite(avgHoursToControlMapping)
                ? `Avg. map latency: ${avgHoursToControlMapping.toFixed(1)}h`
                : null
            }
            tone="violet"
            title="Validated controls per hour (shadow plane): inverse of mean hours to first control-mapping ReasoningLog"
            testId="compliance-velocity-chip"
          />

          {isSimulationMode ? (
            <ForensicMetricChip
              label="Value mitigated (YTD)"
              value={formatCentsToUSD(totalValueMitigatedYtdCents ?? "0")}
              tone="emerald"
              title="Year-to-date sum of budget justification value for RESOLVED and CLOSED_ARCHIVED risk events"
              testId="value-mitigated-chip"
            />
          ) : null}

          {isSimulationMode ? (
            <ForensicMetricChip
              label="Projected insurance savings"
              value={formatCentsToUSD(projectedInsuranceSavingsCents ?? "0")}
              sublabel={
                insuranceDiscountPct != null
                  ? `(${insuranceDiscountPct}% off premium)`
                  : null
              }
              tone="teal"
              title="Illustrative annual cyber insurance renewal incentive from framework tier and monitoring posture"
              testId="insurance-savings-chip"
            />
          ) : null}
        </div>
      </div>

      {children ? <div className="mt-5 space-y-4">{children}</div> : null}
    </section>
  );
}
