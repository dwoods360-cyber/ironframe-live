"use client";

import { useCallback, useMemo, useState } from "react";
import { calculateInsuranceIncentive } from "@/app/utils/insuranceMath";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";
import { CARRIER_EXPORT_OPTIONS, type CarrierKey } from "@/app/utils/carrierTemplates";

export type BudgetJustificationProps = {
  framework: string;
  hasContinuousMonitoring: boolean;
  hasDueDiligencePdfs: boolean;
  /** Default annual premium (cents) from dashboard model. */
  defaultPremiumCents: string;
  tenantFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

function dollarsToCentsInput(raw: string): bigint | null {
  const t = raw.replace(/[$,\s]/g, "").trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return BigInt(Math.round(n * 100));
}

export default function BudgetJustification({
  framework,
  hasContinuousMonitoring,
  hasDueDiligencePdfs,
  defaultPremiumCents,
  tenantFetch,
}: BudgetJustificationProps) {
  const defaultDollars = useMemo(() => {
    try {
      return (Number(BigInt(defaultPremiumCents)) / 100).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    } catch {
      return "50000";
    }
  }, [defaultPremiumCents]);

  const [premiumField, setPremiumField] = useState(defaultDollars);
  const [carrierKey, setCarrierKey] = useState<CarrierKey>("GENERIC");

  const premiumCents = useMemo(() => {
    const fromField = dollarsToCentsInput(premiumField);
    if (fromField != null && fromField > 0n) return fromField;
    try {
      return BigInt(defaultPremiumCents);
    } catch {
      return 5_000_000n;
    }
  }, [premiumField, defaultPremiumCents]);

  const incentive = useMemo(
    () =>
      calculateInsuranceIncentive({
        basePremium_cents: premiumCents,
        framework,
        hasContinuousMonitoring,
        hasDueDiligencePdfs,
      }),
    [premiumCents, framework, hasContinuousMonitoring, hasDueDiligencePdfs],
  );

  const exportPdf = useCallback(async () => {
    const params = new URLSearchParams({
      premiumCents: premiumCents.toString(),
      carrierKey,
    });
    const res = await tenantFetch(`/api/insurance/actuarial-report?${params.toString()}`, { method: "GET" });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ironframe-actuarial-${carrierKey.toLowerCase().replace(/_/g, "-")}.pdf`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [tenantFetch, premiumCents, carrierKey]);

  const discountLabel = `${(incentive.totalDiscountBps / 100).toFixed(2)}%`;

  return (
    <div className="rounded border border-slate-700/80 bg-slate-900/40 px-3 py-3 text-[10px] text-slate-200">
      <p className="font-black uppercase tracking-wide text-cyan-300/90">Cyber insurance optimization</p>
      <p className="mt-1 text-[9px] text-slate-400">
        Model: {framework}
        {hasContinuousMonitoring ? " · Ironwatch active (last hour)" : ""}
        {hasDueDiligencePdfs ? " · Due diligence PDFs on file" : ""}
      </p>

      <label className="mt-2 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
        Target carrier for evidence export
        <select
          value={carrierKey}
          onChange={(e) => setCarrierKey(e.target.value as CarrierKey)}
          className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-100"
        >
          {CARRIER_EXPORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-2 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
        Annual insurance premium (USD)
        <input
          type="text"
          inputMode="decimal"
          value={premiumField}
          onChange={(e) => setPremiumField(e.target.value)}
          className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 font-mono text-[11px] text-slate-100"
          placeholder="50000"
          autoComplete="off"
        />
      </label>

      <div className="mt-3 rounded border border-teal-800/50 bg-teal-950/30 px-2 py-2">
        <p className="text-[9px] font-bold uppercase tracking-wide text-teal-300/90">Projected renewal discount</p>
        <p className="mt-0.5 font-mono text-[12px] font-semibold text-teal-100">
          {formatCentsToUSD(incentive.totalEstimatedSavings_cents)}{" "}
          <span className="text-[10px] font-normal text-teal-200/80">({discountLabel} of premium)</span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => void exportPdf()}
        className="mt-3 w-full rounded border border-teal-600/60 bg-teal-900/35 px-2 py-2 text-[9px] font-bold uppercase tracking-wide text-teal-100 hover:border-teal-400 hover:bg-teal-800/40"
      >
        Export underwriter evidence
      </button>
      <p className="mt-1.5 text-[8px] text-slate-500">
        Downloads the actuarial evidence PDF (point-of-presence narrative for carriers).
      </p>
    </div>
  );
}
