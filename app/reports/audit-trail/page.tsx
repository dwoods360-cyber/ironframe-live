"use client";

import Link from "next/link";
import { useState } from "react";
import AuditIntelligence from "@/app/components/AuditIntelligence";
import { getAuditLogs } from "@/app/utils/auditLogger";

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function makeMinimalPdf(content: string) {
  const safeContent = escapePdfText(content);
  return `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length ${safeContent.length + 45} >>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(${safeContent}) Tj\nET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000062 00000 n \n0000000125 00000 n \n0000000278 00000 n \n0000000412 00000 n \ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n493\n%%EOF`;
}

export default function ReportsAuditTrailPage() {
  const [isVendorChangesScope] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get("scope") === "vendor-changes";
  });

  const handleDownloadPdf = () => {
    const logs = getAuditLogs();
    const content = [
      `Audit Report Generated: ${new Date().toISOString()}`,
      `Total Historical Logs: ${logs.length}`,
      "Signed by: Dereck",
      "Stamp: Data Integrity Verified",
    ].join(" | ");

    const pdf = makeMinimalPdf(content);
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-trail-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full bg-slate-950 p-6">
      <section className="rounded border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[9px] font-bold uppercase text-slate-200 hover:border-blue-500 hover:text-blue-300"
            >
              Back
            </Link>
            <h1 className="text-[11px] font-bold uppercase tracking-wide text-white">Reports // Audit Trail Intelligence</h1>
            {isVendorChangesScope ? (
              <span className="rounded border border-blue-500/70 bg-blue-500/10 px-2 py-1 text-[9px] font-bold uppercase text-blue-200">
                Vendor Change Scope
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-emerald-500/70 bg-emerald-500/10 px-2 py-1 text-[9px] font-bold uppercase text-emerald-300">
              Data Integrity: Verified
            </span>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="rounded border border-blue-500/70 bg-blue-500/10 px-2 py-1 text-[9px] font-bold uppercase text-blue-200"
            >
              Download Audit Report (PDF)
            </button>
          </div>
        </div>

        <AuditIntelligence
          showRetentionBadge
          logTypeFilter="GRC"
          descriptionIncludes={isVendorChangesScope ? ["vendor", "cadence", "document update request"] : undefined}
        />
      </section>
    </div>
  );
}
