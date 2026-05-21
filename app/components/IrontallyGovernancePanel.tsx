"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IrontallyFrameworkId, TasFrameworkControlMapping } from "@/app/config/irontallyFrameworkControls";
import type { IrontallyFrameworkSnapshot } from "@/app/services/irontallyMapper";
import { downloadComplianceReadinessPdfAction } from "@/app/actions/irontallyActions";
import { useTenantContext } from "@/app/context/TenantProvider";
import type {
  FrameworkReadinessLabel,
  FrameworkReadinessSummary,
  IrontallyReadinessApiResponse,
} from "@/app/types/irontallyReadiness";

const FRAMEWORK_CHIPS: Array<{ id: IrontallyFrameworkId; label: string }> = [
  { id: "nist_csf", label: "NIST CSF 2.0" },
  { id: "iso_27001", label: "ISO 27001" },
  { id: "soc2_type2", label: "SOC 2 Type II" },
];

type Props = {
  snapshot: IrontallyFrameworkSnapshot;
};

export default function IrontallyGovernancePanel({ snapshot }: Props) {
  const { tenantFetch } = useTenantContext();
  const [selectedFramework, setSelectedFramework] = useState<IrontallyFrameworkId | null>(null);
  const [mappings, setMappings] = useState<TasFrameworkControlMapping[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<FrameworkReadinessSummary[] | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [evidenceFramework, setEvidenceFramework] = useState<FrameworkReadinessLabel | "ALL">("ALL");

  const loadReadiness = useCallback(async () => {
    setReadinessLoading(true);
    setReadinessError(null);
    try {
      const res = await tenantFetch("/api/grc/irontally?readiness=1");
      if (!res.ok) {
        setReadinessError(`Evidence ledger unavailable (${res.status}).`);
        setReadiness(null);
        return;
      }
      const j = (await res.json()) as IrontallyReadinessApiResponse;
      if (!j.ok || !j.readiness) {
        setReadinessError(j.error ?? "No readiness payload returned.");
        setReadiness(null);
        return;
      }
      setReadiness(j.readiness);
    } catch {
      setReadinessError("Failed to load auditor-ready evidence.");
      setReadiness(null);
    } finally {
      setReadinessLoading(false);
    }
  }, [tenantFetch]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

  const evidenceRows = useMemo(() => {
    if (!readiness) return [];
    const frameworks =
      evidenceFramework === "ALL"
        ? readiness
        : readiness.filter((r) => r.framework === evidenceFramework);
    return frameworks.flatMap((fw) =>
      fw.verifiedEvidenceLogs.map((log) => ({
        framework: fw.framework,
        passing: `${fw.passingControlsCount}/${fw.totalControlsMonitored}`,
        ...log,
      })),
    );
  }, [readiness, evidenceFramework]);

  const loadDrill = useCallback(
    async (framework: IrontallyFrameworkId) => {
      setSelectedFramework(framework);
      setDrillLoading(true);
      try {
        const res = await tenantFetch(
          `/api/grc/irontally?framework=${framework}&score=${snapshot.maturityScore}`,
        );
        if (!res.ok) return;
        const j = (await res.json()) as { mappings?: TasFrameworkControlMapping[] };
        setMappings(j.mappings ?? []);
      } finally {
        setDrillLoading(false);
      }
    },
    [tenantFetch, snapshot.maturityScore],
  );

  const onExport = () => {
    void (async () => {
      setExporting(true);
      setExportMsg(null);
      const res = await downloadComplianceReadinessPdfAction();
      setExporting(false);
      if (!res.ok) {
        setExportMsg(res.error);
        return;
      }
      const bin = atob(res.base64Pdf);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg("Audit-ready PDF exported.");
    })();
  };

  const { market } = snapshot;

  return (
    <div className="mt-5 border-t border-slate-800 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-violet-200/90">
          Irontally — framework mapper
        </p>
        <button
          type="button"
          disabled={exporting}
          onClick={onExport}
          className="rounded border border-violet-600/60 px-2 py-1 text-[8px] font-bold uppercase text-violet-100 disabled:opacity-50"
        >
          {exporting ? "Signing…" : "Audit-ready export"}
        </button>
      </div>
      {exportMsg ? <p className="mt-1 text-[8px] text-emerald-300">{exportMsg}</p> : null}

      <div className="mt-4 rounded border border-violet-900/50 bg-slate-950/80 p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-violet-200/90">
            Auditor-ready evidence ledger
          </p>
          <button
            type="button"
            disabled={readinessLoading}
            onClick={() => void loadReadiness()}
            className="rounded border border-slate-700 px-2 py-0.5 text-[7px] font-bold uppercase text-slate-300 disabled:opacity-50"
          >
            {readinessLoading ? "Syncing…" : "Refresh ledger"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(["ALL", "SOC2", "ISO27001", "CSRD"] as const).map((fw) => (
            <button
              key={fw}
              type="button"
              onClick={() => setEvidenceFramework(fw)}
              className={`rounded border px-1.5 py-0.5 text-[7px] font-bold uppercase ${
                evidenceFramework === fw
                  ? "border-cyan-600/60 bg-cyan-950/40 text-cyan-100"
                  : "border-slate-800 text-slate-500"
              }`}
            >
              {fw}
            </button>
          ))}
        </div>
        {readinessError ? (
          <p className="mt-2 text-[8px] text-amber-300">{readinessError}</p>
        ) : readinessLoading && !readiness ? (
          <p className="mt-2 text-[8px] text-slate-500">Compiling framework readiness from AuditLog…</p>
        ) : evidenceRows.length === 0 ? (
          <p className="mt-2 text-[8px] text-slate-500">
            No verified control attestations yet. Run ingest or orchestration bus to emit{" "}
            <code className="text-violet-300">ORCHESTRATION_BUS_CYCLE_SUCCESS</code> rows.
          </p>
        ) : (
          <div className="mt-2 max-h-48 overflow-auto rounded border border-slate-800">
            <table className="w-full min-w-[520px] border-collapse text-left text-[7px]">
              <thead className="sticky top-0 bg-slate-900 text-[7px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="border-b border-slate-800 px-2 py-1">Framework</th>
                  <th className="border-b border-slate-800 px-2 py-1">Control</th>
                  <th className="border-b border-slate-800 px-2 py-1">Agent signature</th>
                  <th className="border-b border-slate-800 px-2 py-1">Timestamp</th>
                  <th className="border-b border-slate-800 px-2 py-1">Physical context</th>
                </tr>
              </thead>
              <tbody>
                {evidenceRows.map((row, i) => (
                  <tr key={`${row.framework}-${row.controlId}-${row.timestamp}-${i}`} className="text-slate-300">
                    <td className="border-b border-slate-800/80 px-2 py-1 align-top font-bold text-violet-200/90">
                      {row.framework}
                      <span className="block font-normal text-slate-500">{row.passing}</span>
                    </td>
                    <td className="border-b border-slate-800/80 px-2 py-1 align-top text-violet-100">{row.controlId}</td>
                    <td className="border-b border-slate-800/80 px-2 py-1 align-top font-mono text-cyan-200/90">
                      {row.agentSignature.length > 24
                        ? `${row.agentSignature.slice(0, 22)}…`
                        : row.agentSignature}
                    </td>
                    <td className="border-b border-slate-800/80 px-2 py-1 align-top whitespace-nowrap text-slate-400">
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td
                      className="border-b border-slate-800/80 px-2 py-1 align-top leading-snug text-slate-400"
                      title={row.physicalContext}
                    >
                      {row.physicalContext.length > 120
                        ? `${row.physicalContext.slice(0, 118)}…`
                        : row.physicalContext}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {snapshot.frameworks.map((f) => (
          <span
            key={f.frameworkId}
            className={`rounded border px-2 py-0.5 text-[7px] font-bold uppercase ${
              f.certified
                ? "border-emerald-700/60 text-emerald-200"
                : "border-amber-700/60 text-amber-200"
            }`}
            title={f.postureDetail}
          >
            {f.frameworkName}: {f.tierOrLevel}
          </span>
        ))}
      </div>

      <p className="mt-3 text-[9px] font-black uppercase tracking-widest text-slate-500">
        Market comparison
      </p>
      <p className="mt-0.5 text-[8px] text-slate-400">{market.industryLabel}</p>
      <div className="mt-2 h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={market.chartSeries} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 8 }} />
            <YAxis domain={[0, 10]} tick={{ fill: "#94a3b8", fontSize: 8 }} width={24} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #334155",
                fontSize: 10,
              }}
              formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(1)} / 10`, "Maturity"]}
            />
            <Bar dataKey="score" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {market.chartSeries.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[8px] text-cyan-200/90">
        Resilience surplus:{" "}
        <span className="font-mono font-bold">{market.resilienceSurplusDisplay}</span>
        {" · "}
        vs industry: {market.vsIndustryDelta >= 0 ? "+" : ""}
        {market.vsIndustryDelta.toFixed(1)} pts
      </p>

      <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
        Framework drill (TAS.md controls)
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {FRAMEWORK_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => void loadDrill(chip.id)}
            className={`rounded border px-2 py-1 text-[8px] font-bold uppercase transition-colors ${
              selectedFramework === chip.id
                ? "border-violet-500 bg-violet-950/50 text-violet-100"
                : "border-slate-700 text-slate-400 hover:border-violet-600/50"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {drillLoading ? (
        <p className="mt-2 text-[8px] text-slate-500">Loading control cross-walk…</p>
      ) : mappings.length > 0 ? (
        <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
          {mappings.map((m) => (
            <li
              key={`${m.directiveId}-${m.controlId}`}
              className="rounded border border-slate-800 bg-slate-900/50 px-2 py-1.5"
            >
              <p className="text-[8px] font-bold text-violet-200">
                {m.controlId} — {m.controlTitle}
              </p>
              <p className="mt-0.5 text-[7px] leading-snug text-slate-300">{m.satisfaction}</p>
              <Link
                href={`/constitution/tas#${m.anchorId}`}
                className="mt-1 inline-block text-[7px] text-cyan-400 hover:underline"
              >
                TAS Ln {m.tasLine} · {m.directiveLabel}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 rounded border border-slate-800 bg-black/30 p-2 text-[7px] leading-relaxed text-slate-400">
        {snapshot.readinessStatement}
      </p>
    </div>
  );
}
