"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import AuditIntelligence from "@/app/components/AuditIntelligence";
import { getAuditLogs } from "@/app/utils/auditLogger";
import {
  getFilteredAuditLogsForReport,
  buildAuditPdf,
  computeRiskSummary,
} from "@/app/utils/exportAudit";
import { useRiskStore } from "@/app/store/riskStore";

export default function ReportsAuditTrailPage() {
  const [scopeState, setScopeState] = useState({ vendorChanges: false, companyId: null as string | null });

  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const acceptedThreatImpacts = useRiskStore((s) => s.acceptedThreatImpacts);
  const pipelineThreats = useRiskStore((s) => s.pipelineThreats);
  const dashboardLiabilities = useRiskStore((s) => s.dashboardLiabilities);
  const riskOffset = useRiskStore((s) => s.riskOffset);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setScopeState({
      vendorChanges: params.get("scope") === "vendor-changes",
      companyId: params.get("companyId"),
    });
  }, []);

  const isVendorChangesScope = scopeState.vendorChanges;
  const effectiveCompanyId = scopeState.companyId;

  const handleDownloadPdf = () => {
    const logs = getAuditLogs();
    const filter = {
      logTypeFilter: "GRC" as const,
      descriptionIncludes: isVendorChangesScope
        ? ["vendor", "cadence", "document update request"]
        : undefined,
      companyId: effectiveCompanyId,
      selectedIndustry,
      selectedTenantName,
    };
    const filteredEntries = getFilteredAuditLogsForReport(logs, filter);

    const riskSummary = computeRiskSummary({
      selectedIndustry,
      acceptedThreatImpacts,
      pipelineThreats,
      dashboardLiabilities,
      riskOffset,
    });

    const pdf = buildAuditPdf({
      activeTenantName: selectedTenantName ?? "My Organization",
      riskSummary,
      entries: filteredEntries,
      generatedAt: new Date().toISOString(),
    });

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
          companyId={effectiveCompanyId}
        />
      </section>
    </div>
  );
}
