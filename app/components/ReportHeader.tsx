"use client";

import { Lock } from "lucide-react";
import { useRiskStore } from "@/app/store/riskStore";

type ReportHeaderProps = {
  /** When provided, used instead of store industry (e.g. from report slug) */
  industry?: string;
  reportName: string;
};

export default function ReportHeader({ industry: industryProp, reportName }: ReportHeaderProps) {
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const industry = industryProp ?? selectedIndustry ?? "GRC";

  return (
    <section className="border-b border-slate-800 bg-slate-900/50 px-4 py-6">
      <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-[11px] font-bold tracking-wide text-white">{reportName.toUpperCase()}</h1>
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-500">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Confidential
        </div>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        REPORTS / {industry.toUpperCase()} / {reportName.toUpperCase()}
      </p>
    </section>
  );
}
