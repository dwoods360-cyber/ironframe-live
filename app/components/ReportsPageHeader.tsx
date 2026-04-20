"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Leaf } from "lucide-react";
import EnterpriseHeatMapModal from "./EnterpriseHeatMapModal";

type ReportsPageHeaderProps = {
  /** Live CSRD / Kimbot carbon line, e.g. "CO2 Offset: 12.3 kg" */
  co2OffsetChip?: string;
};

export default function ReportsPageHeader({ co2OffsetChip }: ReportsPageHeaderProps) {
  const [heatMapOpen, setHeatMapOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/30 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/reports/audit-trail"
            className="inline-flex items-center gap-2 rounded-full border border-blue-500/70 bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase text-blue-200"
          >
            <FileText className="h-3 w-3" />
            Audit Trail
          </Link>
          <div
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-500/70 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase text-emerald-200"
            title={co2OffsetChip ?? "Carbon offset (tenant sustainability ledger)"}
          >
            <Leaf className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden />
            <span className="truncate font-mono normal-case font-semibold tracking-normal">
              CSRD Compliance · {co2OffsetChip ?? "CO2 Offset: —"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setHeatMapOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/70 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase text-amber-200 hover:bg-amber-500/20"
          >
            View Enterprise Heat Map
          </button>
        </div>
      </div>
      <EnterpriseHeatMapModal isOpen={heatMapOpen} onClose={() => setHeatMapOpen(false)} />
    </>
  );
}
