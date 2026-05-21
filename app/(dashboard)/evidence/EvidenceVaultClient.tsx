"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFrameworkCoverage } from "@/app/actions/complianceActions";
import { getIndustryBenchmarks, setShareAnonymizedBenchmarks } from "@/app/actions/benchmarkActions";
import { getBulkEvidenceBundle, submitBulkEvidenceBrokerMock } from "@/app/actions/exportActions";
import { useTenantContext } from "@/app/context/TenantProvider";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";
import { applyBrokerConfidenceCompliancePremium } from "@/app/utils/grcMath";
import { CLEARANCE_LEVELS, USER_CLEARANCE_COOKIE_NAME, clearanceElevationTarget } from "@/app/utils/clearanceLogic";
import EvidenceVaultItem from "@/components/EvidenceVaultItem";
import ClearanceRequestModal from "@/components/ClearanceRequestModal";
import NotificationCenter from "@/components/NotificationCenter";
import ShredderUI, { ShredderControl } from "@/components/ShredderUI";
import { listAuditReceiptsForTenant, type AuditReceiptRow } from "@/app/actions/shredderActions";
import { useRiskStore } from "@/app/store/riskStore";
import { useShallow } from "zustand/react/shallow";
import { CARRIER_EXPORT_OPTIONS, type CarrierKey } from "@/app/utils/carrierTemplates";
import type { BulkEvidenceBundle } from "@/app/types/bulkEvidenceBundle";
import { useEvidenceStore } from "@/app/store/evidenceStore";

type RangePreset = "CY2025" | "FY2025" | "LAST90" | "CUSTOM";
type CoverageFramework = "SOC2" | "ISO27001" | "NIST";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeForPreset(preset: RangePreset, customStart: string, customEnd: string): { startIso: string; endIso: string } {
  const now = new Date();
  if (preset === "CUSTOM") {
    return { startIso: customStart, endIso: customEnd };
  }
  if (preset === "LAST90") {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 90);
    return { startIso: isoDate(start), endIso: isoDate(now) };
  }
  if (preset === "CY2025") {
    return { startIso: "2025-01-01", endIso: "2025-12-31" };
  }
  /* FY2025 — Oct 1 2024 through Sep 30 2025 */
  return { startIso: "2024-10-01", endIso: "2025-09-30" };
}

export default function EvidenceVaultClient() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const contextParam = searchParams.get("context");
  const itarVaultDeepLink = filterParam?.trim().toUpperCase() === "ITAR";
  const vaultContextRiskId = contextParam?.trim() ?? "";

  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const grcGapDeps = useRiskStore(
    useShallow((s) => ({
      industry: s.selectedIndustry,
      impacts: s.acceptedThreatImpacts,
      liabilities: s.dashboardLiabilities,
      riskOffset: s.riskOffset,
    })),
  );
  const getGrcGapCents = useRiskStore((s) => s.getGrcGapCents);

  const { activeTenantUuid } = useTenantContext();
  const dashboardTenantUuid = useMemo(
    () => resolveDashboardTenantUuid(activeTenantUuid),
    [activeTenantUuid],
  );
  const evidenceLockerRows = useEvidenceStore();

  const [preset, setPreset] = useState<RangePreset>("FY2025");
  const [customStart, setCustomStart] = useState("2025-01-01");
  const [customEnd, setCustomEnd] = useState("2025-12-31");
  const [carrierKey, setCarrierKey] = useState<CarrierKey>("GENERIC");
  const [bundle, setBundle] = useState<BulkEvidenceBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mockResult, setMockResult] = useState<{
    message: string;
    endpointWouldHit: string;
    method: string;
    transportNote: string;
    correlationId: string;
    eventCount: number;
  } | null>(null);
  const [mockBusy, setMockBusy] = useState(false);
  const [coverageFramework, setCoverageFramework] = useState<CoverageFramework>("SOC2");
  const [readinessPct, setReadinessPct] = useState<number | null>(null);
  const [readinessInfo, setReadinessInfo] = useState<{ validated: number; required: number } | null>(null);
  const [peerBenchmarkingEnabled, setPeerBenchmarkingEnabled] = useState(false);
  const [peerAvgPct, setPeerAvgPct] = useState<number | null>(null);
  const [peerBucket, setPeerBucket] = useState<"Top 10" | "Median" | "Bottom" | null>(null);
  const [peerInsight, setPeerInsight] = useState<string | null>(null);
  const [simulatedUserClearance, setSimulatedUserClearance] = useState("PUBLIC");
  const [clearanceModal, setClearanceModal] = useState<{
    riskEventId: string;
    targetClearance: string;
  } | null>(null);
  const [ironcastToast, setIroncastToast] = useState<string | null>(null);
  const [shredReceipts, setShredReceipts] = useState<AuditReceiptRow[]>([]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const m = document.cookie.match(new RegExp(`${USER_CLEARANCE_COOKIE_NAME}=([^;]+)`));
    if (m?.[1]) {
      try {
        setSimulatedUserClearance(decodeURIComponent(m[1].trim()));
      } catch {
        setSimulatedUserClearance(m[1].trim());
      }
    }
  }, []);

  const persistClearanceCookie = useCallback((level: string) => {
    const v = encodeURIComponent(level);
    document.cookie = `${USER_CLEARANCE_COOKIE_NAME}=${v}; path=/; max-age=31536000; SameSite=Lax`;
    setSimulatedUserClearance(level);
  }, []);

  const range = useMemo(() => rangeForPreset(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const gaugeDeg = useMemo(() => {
    const pct = readinessPct ?? 0;
    return Math.max(0, Math.min(360, (pct / 100) * 360));
  }, [readinessPct]);

  const load = useCallback(async () => {
    if (!dashboardTenantUuid) {
      setLoadError("Tenant context required.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const [res, coverageRes] = await Promise.all([
      getBulkEvidenceBundle(dashboardTenantUuid, range),
      getFrameworkCoverage(dashboardTenantUuid, coverageFramework),
    ]);
    if (!res.ok) {
      setLoadError(res.error);
      setBundle(null);
    } else {
      setBundle(res.bundle);
    }
    if (!coverageRes.ok) {
      setReadinessPct(null);
      setReadinessInfo(null);
      setLoadError((prev) => prev ?? coverageRes.error);
    } else {
      setReadinessPct(coverageRes.coverage.readinessPercent);
      setReadinessInfo({
        validated: coverageRes.coverage.totals.validatedControls,
        required: coverageRes.coverage.totals.requiredControls,
      });
    }
    const shredList = await listAuditReceiptsForTenant();
    setShredReceipts(shredList.ok ? shredList.receipts : []);

    const peerRes = await getIndustryBenchmarks(dashboardTenantUuid);
    if (peerRes.ok) {
      setPeerBenchmarkingEnabled(peerRes.payload.benchmarkingEnabled);
      setPeerAvgPct(peerRes.payload.industryAvgPct);
      setPeerBucket(peerRes.payload.percentileBucket);
      setPeerInsight(peerRes.payload.insight);
      if (readinessPct == null) setReadinessPct(peerRes.payload.yourScorePct);
    }
    setLoading(false);
  }, [dashboardTenantUuid, range, coverageFramework]);

  useEffect(() => {
    void load();
  }, [load]);

  const onBulkExport = useCallback(async () => {
    if (!dashboardTenantUuid) return;
    setMockBusy(true);
    setMockResult(null);
    const res = await submitBulkEvidenceBrokerMock(dashboardTenantUuid, range, carrierKey);
    setMockBusy(false);
    if (!res.ok) {
      setLoadError(res.error);
      return;
    }
    setMockResult({
      message: res.message,
      endpointWouldHit: res.endpointWouldHit,
      method: res.method,
      transportNote: res.transportNote,
      correlationId: res.correlationId,
      eventCount: res.eventCount,
    });
  }, [dashboardTenantUuid, range, carrierKey]);

  const cumulativeRoi = bundle?.totals.cumulativeRoiCents ?? "0";

  const vaultTableRows = useMemo(() => {
    const rows = bundle?.rows ?? [];
    if (!itarVaultDeepLink) return rows;
    return rows.filter((r) => r.isExportControlled);
  }, [bundle?.rows, itarVaultDeepLink]);

  const contextHighlightRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (!vaultContextRiskId || loading) return;
    const el = contextHighlightRef.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [vaultContextRiskId, loading, vaultTableRows]);

  /** Readiness vs peer — carrier-facing confidence signal when benchmarking is on (+ compliance premium in grcMath). */
  const brokerConfidencePct = useMemo(() => {
    if (readinessPct == null) return null;
    let base: number;
    if (!peerBenchmarkingEnabled || peerAvgPct == null || peerAvgPct <= 0) {
      base = readinessPct;
    } else {
      const delta = readinessPct - peerAvgPct;
      base = Math.max(0, Math.min(100, Math.round((readinessPct + delta / 2) * 100) / 100));
    }
    const industry = selectedIndustry ?? grcGapDeps.industry ?? "Healthcare";
    return applyBrokerConfidenceCompliancePremium(base, industry, getGrcGapCents());
  }, [
    readinessPct,
    peerBenchmarkingEnabled,
    peerAvgPct,
    selectedIndustry,
    grcGapDeps,
    getGrcGapCents,
  ]);

  return (
    <div className="mx-auto w-full max-w-[min(100%,96rem)] px-4 py-4 text-slate-100 md:px-8">
      <NotificationCenter message={ironcastToast} onDismiss={() => setIroncastToast(null)} durationMs={12000} />

      {clearanceModal ? (
        <ClearanceRequestModal
          open
          riskEventId={clearanceModal.riskEventId}
          targetClearance={clearanceModal.targetClearance}
          onClose={() => setClearanceModal(null)}
          onResolved={(res) => {
            setClearanceModal(null);
            if (res.approved && res.targetClearance) {
              persistClearanceCookie(res.targetClearance);
              const label = res.targetClearance.replace(/_/g, " ");
              setIroncastToast(
                `🔓 Access Granted: Your ${label} clearance is now active. Restricted chapters are unlocked.`,
              );
            }
          }}
        />
      ) : null}

      <header className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-sm font-black uppercase tracking-widest text-cyan-300">Evidence vault</h1>
        <p className="mt-1 max-w-3xl text-[11px] text-slate-400">
          Bulk aggregation of closed and validated shadow risk events: budget justification, due diligence signals, and
          broker-ready export simulation (mTLS + OAuth2 transport documented).
        </p>
      </header>

      <div className="mb-6 grid gap-4 rounded-lg border border-emerald-800/50 bg-emerald-950/25 px-4 py-4 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-300/90">Cumulative ROI (bundle)</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-100">
            {loading ? "—" : formatCentsToUSD(cumulativeRoi)}
          </p>
          {!bundle?.meta.simulationPlane ? (
            <p className="mt-2 text-[10px] text-amber-200/90">
              Shadow plane is off — no RiskEvent aggregates loaded. Enable simulation to populate the vault.
            </p>
          ) : bundle ? (
            <p className="mt-2 text-[9px] text-slate-500">
              Σ ALE (baseline): {formatCentsToUSD(bundle.totals.totalMitigatedAleCents)} · Labor savings (MHE × rate):{" "}
              {formatCentsToUSD(bundle.totals.totalMheLaborSavingsCents)} · Events: {bundle.eventCount}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <div
            className="relative h-20 w-20 rounded-full border border-slate-700"
            style={{
              background: `conic-gradient(rgb(34 197 94) ${gaugeDeg}deg, rgb(30 41 59) ${gaugeDeg}deg 360deg)`,
            }}
            aria-label={`Underwriter Readiness: ${(readinessPct ?? 0).toFixed(1)} percent`}
          >
            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-slate-950 text-[12px] font-black text-emerald-200">
              {readinessPct == null ? "—" : `${Math.round(readinessPct)}%`}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-300/90">Underwriter Readiness</p>
            <p className="text-[11px] text-emerald-100">
              {readinessPct == null ? "Unavailable" : `${readinessPct.toFixed(2)}%`}
            </p>
            {readinessInfo ? (
              <p className="text-[9px] text-slate-500">
                {readinessInfo.validated}/{readinessInfo.required} controls validated ({coverageFramework})
              </p>
            ) : null}
            {peerBenchmarkingEnabled && peerAvgPct != null && readinessPct != null ? (
              <>
                <p className="mt-2 text-[9px] font-black uppercase tracking-wide text-slate-500">Broker confidence</p>
                <p className="font-mono text-[13px] font-bold text-cyan-200">
                  {brokerConfidencePct == null ? "—" : `${brokerConfidencePct.toFixed(1)}%`}
                </p>
                <div className="mt-2 h-2 w-44 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-cyan-500"
                    style={{ width: `${Math.max(0, Math.min(100, (readinessPct / Math.max(peerAvgPct, 1)) * 100))}%` }}
                  />
                </div>
                <p className="mt-1 text-[9px] text-cyan-200/90">
                  Your Score: {readinessPct.toFixed(2)}% | Industry Avg: {peerAvgPct.toFixed(2)}%
                </p>
                <p className="text-[9px] text-slate-500">
                  You are in the {peerBucket ?? "Median"} of your sector.
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-[9px] font-black uppercase tracking-wide text-slate-500">Broker confidence</p>
                <p className="font-mono text-[13px] font-bold text-slate-400">
                  {brokerConfidencePct == null ? "—" : `${brokerConfidencePct.toFixed(1)}%`}
                </p>
                <p className="mt-1 text-[9px] text-slate-500">Peer benchmarking is off — score uses readiness plus sector compliance premium where applicable.</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Date range
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as RangePreset)}
            className="mt-1 block w-48 rounded border border-slate-600 bg-slate-950 px-2 py-2 text-[11px] text-slate-100"
          >
            <option value="FY2025">Fiscal year 2025 (Oct–Sep)</option>
            <option value="CY2025">Calendar 2025</option>
            <option value="LAST90">Last 90 days</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </label>
        {preset === "CUSTOM" ? (
          <>
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Start
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="mt-1 block rounded border border-slate-600 bg-slate-950 px-2 py-2 text-[11px] text-slate-100"
              />
            </label>
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              End
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="mt-1 block rounded border border-slate-600 bg-slate-950 px-2 py-2 text-[11px] text-slate-100"
              />
            </label>
          </>
        ) : (
          <p className="text-[10px] text-slate-500">
            {range.startIso} → {range.endIso}
          </p>
        )}

        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Broker / carrier
          <select
            value={carrierKey}
            onChange={(e) => setCarrierKey(e.target.value as CarrierKey)}
            className="mt-1 block w-44 rounded border border-slate-600 bg-slate-950 px-2 py-2 text-[11px] text-slate-100"
          >
            {CARRIER_EXPORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Readiness framework
          <select
            value={coverageFramework}
            onChange={(e) => setCoverageFramework(e.target.value as CoverageFramework)}
            className="mt-1 block w-40 rounded border border-slate-600 bg-slate-950 px-2 py-2 text-[11px] text-slate-100"
          >
            <option value="SOC2">SOC2</option>
            <option value="ISO27001">ISO27001</option>
            <option value="NIST">NIST</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          <input
            type="checkbox"
            checked={peerBenchmarkingEnabled}
            onChange={(e) => {
              const next = e.target.checked;
              setPeerBenchmarkingEnabled(next);
              if (dashboardTenantUuid) {
                void setShareAnonymizedBenchmarks(dashboardTenantUuid, next);
              }
            }}
            className="h-4 w-4 rounded border-slate-500 bg-slate-950"
          />
          Peer Benchmarking
        </label>

        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Simulated clearance
          <select
            value={simulatedUserClearance}
            onChange={(e) => persistClearanceCookie(e.target.value)}
            className="mt-1 block w-44 rounded border border-slate-600 bg-slate-950 px-2 py-2 text-[11px] text-slate-100"
            title="Sets the ironframe-user-clearance cookie for export-control checks (Irongate / incident-report PDF)."
          >
            {CLEARANCE_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => void load()}
          className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-200 hover:border-slate-400"
        >
          Refresh
        </button>

        <button
          type="button"
          disabled={mockBusy || !dashboardTenantUuid}
          onClick={() => void onBulkExport()}
          className="rounded border border-teal-600/70 bg-teal-900/40 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-teal-100 hover:border-teal-400 disabled:opacity-50"
        >
          {mockBusy ? "Submitting…" : "Bulk export (simulated)"}
        </button>
        <Link
          href="/evidence/gaps"
          className="rounded border border-amber-700/70 bg-amber-950/35 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-100 hover:border-amber-500"
        >
          Internal health check
        </Link>
        <Link
          href="/evidence/sectors"
          className="rounded border border-violet-700/70 bg-violet-950/35 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-violet-100 hover:border-violet-500"
        >
          Sector comparison
        </Link>
      </div>

      {loadError ? (
        <div className="mb-4 rounded border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-[11px] text-rose-200">
          {loadError}
        </div>
      ) : null}
      {peerBenchmarkingEnabled && peerInsight ? (
        <div className="mb-4 rounded border border-cyan-800/60 bg-cyan-950/25 px-3 py-2 text-[10px] text-cyan-100">
          {peerInsight}
        </div>
      ) : null}

      {itarVaultDeepLink || vaultContextRiskId ? (
        <div
          className="mb-4 rounded-lg border border-cyan-700/45 bg-cyan-950/25 px-4 py-3 text-[10px] text-cyan-100"
          role="status"
        >
          {itarVaultDeepLink ? (
            <p className="font-black uppercase tracking-wide text-cyan-300">ITAR evidence filter active</p>
          ) : null}
          {vaultContextRiskId ? (
            <p className="mt-1 font-mono text-[10px] text-slate-300">
              Forensic context (risk event):{" "}
              <span className="font-bold text-white">{vaultContextRiskId}</span>
            </p>
          ) : null}
          <p className="mt-2 text-[9px] leading-relaxed text-slate-500">
            Rows below emphasize export-controlled chapters when ITAR filter is on; matching risk id is highlighted when present in the bundle.
          </p>
        </div>
      ) : null}

      {mockResult ? (
        <div
          className="mb-6 rounded-lg border border-teal-700/50 bg-teal-950/30 px-4 py-3 text-[11px] text-teal-100"
          role="status"
        >
          <p className="font-bold text-teal-300">{mockResult.message}</p>
          <p className="mt-2 font-mono text-[10px] text-teal-200/90">
            <span className="text-slate-500">Would POST to:</span> {mockResult.endpointWouldHit}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            Method: {mockResult.method} · Correlation: {mockResult.correlationId} · Events in bundle:{" "}
            {mockResult.eventCount}
          </p>
          <p className="mt-2 text-[9px] leading-relaxed text-slate-500">{mockResult.transportNote}</p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[720px] border-collapse text-left text-[10px]">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-[9px] font-black uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">Case</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Underwriter</th>
              <th className="px-3 py-2">Due diligence</th>
              <th className="px-3 py-2 text-right">ALE</th>
              <th className="px-3 py-2 text-right">Labor save</th>
              <th className="px-3 py-2 text-right">ROI</th>
              <th className="px-3 py-2 text-right">MHE (h)</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                  Loading bundle…
                </td>
              </tr>
            ) : !bundle || vaultTableRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                  {bundle && bundle.rows.length > 0 && itarVaultDeepLink
                    ? "No ITAR / export-controlled rows in this range — adjust filters or date range."
                    : "No closed or validated risk events in this range."}
                </td>
              </tr>
            ) : (
              vaultTableRows.map((r) => {
                const isContextRow = Boolean(vaultContextRiskId && r.riskEventId === vaultContextRiskId);
                return (
                <tr
                  key={r.riskEventId}
                  ref={isContextRow ? contextHighlightRef : undefined}
                  className={`border-b border-slate-800/80 hover:bg-slate-900/50 ${
                    isContextRow ? "bg-cyan-950/35 ring-1 ring-inset ring-cyan-500/45" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    <div className="max-w-[200px] truncate font-medium text-slate-200" title={r.title}>
                      {r.title}
                    </div>
                    <div className="font-mono text-[9px] text-slate-500">{r.riskEventId.slice(0, 12)}…</div>
                    {r.retention?.highRiskSector ? (
                      <div className="mt-1 text-[8px] font-bold uppercase tracking-wide">
                        {r.retention.pendingShred ? (
                          <span className="text-rose-400" title="Retention policy: 365-day validation window exceeded">
                            Pending shred · overdue
                          </span>
                        ) : (
                          <span className="text-amber-300/90" title="Days remaining before retention review">
                            Days remaining: {r.retention.daysRemaining}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{r.status}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        r.underwriterReady
                          ? "rounded-full border border-emerald-700/60 bg-emerald-950/50 px-2 py-0.5 text-[9px] font-bold text-emerald-200"
                          : "rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[9px] text-slate-500"
                      }
                    >
                      {r.underwriterReady ? "Ready" : "Pending"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {r.hasPostMortemPdf ? "PDF on file" : "—"} · {r.mappedControls.length} controls
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-200">{formatCentsToUSD(r.aleCents)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-200">
                    {formatCentsToUSD(r.humanLaborSavingsCents)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-200/90">
                    {formatCentsToUSD(r.valueCreatedCents)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-400">{r.mheHumanHours.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right align-top">
                    <div className="flex flex-col items-end gap-1">
                      <EvidenceVaultItem
                        row={r}
                        userClearance={simulatedUserClearance}
                        onRequestElevation={() =>
                          setClearanceModal({
                            riskEventId: r.riskEventId,
                            targetClearance: clearanceElevationTarget(r.requiredClearance),
                          })
                        }
                      />
                      <ShredderControl chapterId={r.riskEventId} onComplete={() => void load()} />
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>

      <ShredderUI receipts={shredReceipts} />

      <section className="mt-10 rounded border border-slate-800 bg-slate-900/40">
        <div className="border-b border-slate-800 px-4 py-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-white">Evidence locker</h2>
          <p className="mt-1 text-[10px] text-slate-500">
            Local ledger entries (simulation store). Distinct from the shadow RiskEvent bundle above.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] text-slate-200">
            <thead className="border-b border-slate-800 bg-slate-950/70">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-white">
                  Document Name
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-white">Hash ID</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-white">
                  Source Entity
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-white">
                  Timestamp
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-white">Status</th>
              </tr>
            </thead>
            <tbody>
              {evidenceLockerRows.map((row, index) => {
                const isVerified = row.status === "VERIFIED";
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-800 ${index % 2 === 0 ? "bg-slate-900/30" : "bg-slate-950/20"}`}
                  >
                    <td className="px-3 py-2 font-semibold text-white">{row.name}</td>
                    <td className="px-3 py-2 text-slate-300">{row.hash}</td>
                    <td className="px-3 py-2 text-slate-300">{row.entity}</td>
                    <td className="px-3 py-2 text-slate-300">{row.timestamp}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase ${
                          isVerified ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isVerified ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                          }`}
                        />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
