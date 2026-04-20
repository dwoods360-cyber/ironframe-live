import { Droplets, Leaf, Zap } from "lucide-react";
import type { GlobalSustainabilityImpact } from "@/app/actions/sustainabilityActions";

type Props = {
  data: GlobalSustainabilityImpact;
};

/**
 * CSRD / official reporting: audit-style sustainability ledger (Ironbloom production metrics; mirrors dashboard strip).
 */
export default function ReportsEnvironmentalImpactSection({ data }: Props) {
  const kwhStr = Math.round(data.totalKwh).toLocaleString();
  const waterStr = data.totalWaterLiters.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
  const co2KgStr = data.totalCarbonKg.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  return (
    <section
      className="mt-8 rounded-xl border border-slate-700/90 bg-[#0f172a]/50 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
      aria-labelledby="reports-env-impact-heading"
    >
      <div className="mb-4 flex flex-col gap-1 border-b border-slate-800 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="reports-env-impact-heading"
            className="text-xs font-black uppercase tracking-[0.18em] text-slate-100"
          >
            Environmental Impact Summary
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Sustainability Ledger (Kimbot) — tenant-verified physical metrics (kWh, L, CO₂e); monetary-only proxies are
            rejected. CSRD disclosure support.
          </p>
        </div>
        <p className="text-[10px] font-mono uppercase text-slate-500">
          Ledger rows: <span className="text-slate-300">{data.recordCount}</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="min-w-full border-collapse text-left text-[11px]">
          <thead className="bg-slate-900/90">
            <tr>
              <th className="border-b border-slate-800 px-4 py-2.5 font-bold uppercase tracking-wide text-slate-400">
                Indicator
              </th>
              <th className="border-b border-slate-800 px-4 py-2.5 font-bold uppercase tracking-wide text-slate-400">
                Verified total
              </th>
              <th className="border-b border-slate-800 px-4 py-2.5 font-bold uppercase tracking-wide text-slate-400">
                Unit
              </th>
              <th className="hidden border-b border-slate-800 px-4 py-2.5 font-bold uppercase tracking-wide text-slate-400 sm:table-cell">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="bg-slate-950/60">
            <tr>
              <td className="border-t border-slate-800 px-4 py-3">
                <span className="flex items-center gap-2 font-semibold text-slate-200">
                  <Zap className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                  Total Energy Averted
                </span>
              </td>
              <td className="border-t border-slate-800 px-4 py-3 font-mono tabular-nums text-slate-100">
                {kwhStr}
              </td>
              <td className="border-t border-slate-800 px-4 py-3 text-slate-400">kWh</td>
              <td className="hidden border-t border-slate-800 px-4 py-3 text-slate-500 sm:table-cell">
                SustainabilityMetric.kwhAverted
              </td>
            </tr>
            <tr>
              <td className="border-t border-slate-800 px-4 py-3">
                <span className="flex items-center gap-2 font-semibold text-slate-200">
                  <Droplets className="h-4 w-4 shrink-0 text-sky-400" aria-hidden />
                  Total Water Preservation
                </span>
              </td>
              <td className="border-t border-slate-800 px-4 py-3 font-mono tabular-nums text-slate-100">
                {waterStr}
              </td>
              <td className="border-t border-slate-800 px-4 py-3 text-slate-400">L</td>
              <td className="hidden border-t border-slate-800 px-4 py-3 text-slate-500 sm:table-cell">
                SustainabilityMetric.coolingWaterLiters
              </td>
            </tr>
            <tr>
              <td className="border-t border-slate-800 px-4 py-3">
                <span className="flex items-center gap-2 font-semibold text-slate-200">
                  <Leaf className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                  Verified CO₂e Offset
                </span>
              </td>
              <td className="border-t border-slate-800 px-4 py-3 font-mono tabular-nums text-emerald-300/95">
                {co2KgStr}
              </td>
              <td className="border-t border-slate-800 px-4 py-3 text-slate-400">kg CO₂e</td>
              <td className="hidden border-t border-slate-800 px-4 py-3 text-slate-500 sm:table-cell">
                carbonOffsetGrams ÷ 1000
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
        Values aggregate resolved-threat sustainability records for the active tenant. Same ledger as the Executive Dashboard
        Ironbloom CSRD card; suitable for internal CSRD evidence packs (verify against exported audit logs before external filing).
      </p>
    </section>
  );
}
