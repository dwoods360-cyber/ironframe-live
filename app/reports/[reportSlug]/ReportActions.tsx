"use client";

import Link from "next/link";
import { useState } from "react";
import { createEvidenceFromReport } from "@/app/store/evidenceStore";

type ReportActionsProps = {
  reportName: string;
  industry: string;
};

export default function ReportActions({ reportName, industry }: ReportActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  const handleGenerate = async () => {
    if (isGenerating || isArchived) return;

    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    createEvidenceFromReport(reportName, industry);
    setIsGenerating(false);
    setIsArchived(true);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || isArchived}
        className="rounded border border-[#1f6feb] bg-[#1f6feb] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-90"
      >
        {isGenerating ? "Generating Signature..." : isArchived ? "DOC ARCHIVED" : "Generate Signed Copy"}
      </button>

      {isArchived && (
        <Link
          href="/evidence"
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-400 hover:border-blue-500"
        >
          View in Locker
        </Link>
      )}

      <button
        type="button"
        className="rounded border border-[#1f6feb] bg-[#1f6feb] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:brightness-110"
      >
        Notify Compliance Team
      </button>
    </div>
  );
}
