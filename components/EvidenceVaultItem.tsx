"use client";

import Link from "next/link";
import type { BulkEvidenceRow } from "@/app/types/bulkEvidenceBundle";
import { hasClearance } from "@/app/utils/clearanceLogic";

const EXPORT_RESTRICTED_TOOLTIP =
  "Access to this chapter is restricted under CMMC 2.0 Export Control protocols. Contact your GRC Authority for clearance elevation.";

type Props = {
  row: BulkEvidenceRow;
  userClearance: string;
  onRequestElevation?: () => void;
};

export default function EvidenceVaultItem({ row, userClearance, onRequestElevation }: Props) {
  const restricted =
    row.isExportControlled && !hasClearance(userClearance, row.requiredClearance);

  if (restricted) {
    return (
      <div className="relative max-w-[220px]" title={EXPORT_RESTRICTED_TOOLTIP}>
        <div className="mb-1.5 rounded border border-rose-600/90 bg-rose-950/55 px-2 py-1.5 text-[8px] font-black uppercase leading-tight tracking-wide text-rose-100 shadow-[0_0_12px_rgba(225,29,72,0.25)]">
          ⚠️ ITAR RESTRICTED - CLEARANCE REQUIRED
        </div>
        <div className="flex flex-col gap-1.5">
          <span
            className="inline-flex items-center justify-center rounded border border-slate-600 bg-slate-950 px-2 py-2 text-xl leading-none text-slate-400"
            role="img"
            aria-label="Locked — clearance required"
          >
            🔒
          </span>
          <button
            type="button"
            disabled
            className="rounded border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-600"
          >
            Download PDF
          </button>
          {onRequestElevation ? (
            <button
              type="button"
              onClick={onRequestElevation}
              className="rounded border border-amber-600/80 bg-amber-950/60 px-2 py-1.5 text-[9px] font-black uppercase tracking-wide text-amber-100 hover:border-amber-400"
            >
              Request Access
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-[220px] flex-col gap-1.5">
      <Link
        href={`/threats/${row.riskEventId}`}
        className="rounded border border-cyan-700/60 bg-cyan-950/35 px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-cyan-100 hover:border-cyan-500"
      >
        View document
      </Link>
      {row.hasPostMortemPdf ? (
        <a
          href={`/api/incident-report/${row.riskEventId}`}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-slate-200 hover:border-slate-400"
        >
          Download PDF
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="rounded border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-600"
        >
          Download PDF
        </button>
      )}
    </div>
  );
}
