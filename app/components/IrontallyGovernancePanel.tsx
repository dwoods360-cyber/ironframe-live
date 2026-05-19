"use client";

import { useCallback, useState } from "react";
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
              formatter={(v: number) => [`${v.toFixed(1)} / 10`, "Maturity"]}
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
