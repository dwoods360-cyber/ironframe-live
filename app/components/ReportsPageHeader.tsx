"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import EnterpriseHeatMapModal from "./EnterpriseHeatMapModal";

export default function ReportsPageHeader() {
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
