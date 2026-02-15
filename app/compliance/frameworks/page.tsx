"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { getRetentionStatusLabel, RETENTION_PERIOD_DAYS } from "@/app/utils/retentionPolicy";

const FRAMEWORK_COLUMNS = ["HIPAA", "PCI-DSS", "NERC CIP"] as const;

const CONTROL_MAPPINGS = [
  {
    control: "Encryption",
    mappings: {
      HIPAA: "164.312(a)(2)(iv)",
      "PCI-DSS": "3.5.1",
      "NERC CIP": "CIP-011-3",
    },
  },
  {
    control: "MFA",
    mappings: {
      HIPAA: "164.312(d)",
      "PCI-DSS": "8.4.2",
      "NERC CIP": "CIP-007-6",
    },
  },
  {
    control: "Air-Gapping",
    mappings: {
      HIPAA: "164.308(a)(7)",
      "PCI-DSS": "1.2.3",
      "NERC CIP": "CIP-005-5",
    },
  },
] as const;

export default function ComplianceFrameworksPage() {
  const [isCompiling, setIsCompiling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  const handleGeneratePackage = async () => {
    setIsCompiling(true);
    setProgress(8);
    setStatus("Compiling Logs & Evidence...");

    const timer = setInterval(() => {
      setProgress((value) => (value >= 88 ? value : value + 11));
    }, 180);

    try {
      const response = await fetch("/api/audit/export", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          entityId: "medshield",
          dateRange: {
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            to: new Date().toISOString().slice(0, 10),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }

      const fileName = response.headers.get("x-audit-bundle-name") ?? "AUDIT_BUNDLE.zip";
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      setStatus(`Package generated: ${fileName}`);
    } catch (error) {
      setStatus((error as Error).message);
      setProgress(0);
    } finally {
      clearInterval(timer);
      setIsCompiling(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-950 p-6">
      <section className="rounded border border-slate-800 bg-slate-900/40">
        <div className="relative border-b border-slate-800 px-4 py-3 pr-56">
          <h1 className="text-[11px] font-bold uppercase tracking-wide text-white">CONTROL MAPPING HUB (HIPAA VS. PCI VS. NERC)</h1>
          <span className="absolute left-4 top-[calc(100%+6px)] inline-flex rounded border border-emerald-500/70 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
            {getRetentionStatusLabel()}
          </span>
          <button
            type="button"
            onClick={handleGeneratePackage}
            disabled={isCompiling}
            className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded border border-blue-500/80 bg-[#1f6feb] px-3 py-1 text-[10px] font-bold uppercase text-white hover:bg-blue-500 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            GENERATE AUDITOR PACKAGE
          </button>
        </div>

        {(isCompiling || status) && (
          <div className="border-b border-slate-800 px-4 pb-2 pt-5">
            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide">
              <span className="font-bold text-blue-300">Compiling Logs &amp; Evidence...</span>
              <span className="text-slate-400">{progress}%</span>
            </div>
            <div className="h-1.5 rounded bg-slate-900">
              <div className="h-full rounded bg-blue-500 transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
            {status && <p className="mt-1 text-[10px] text-slate-400">{status}</p>}
            <p className="mt-1 text-[9px] uppercase tracking-wide text-slate-500">Retention Window: {RETENTION_PERIOD_DAYS} days</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[10px] text-slate-200">
            <thead className="border-b border-slate-800 bg-slate-950/70">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-white">Internal Controls</th>
                {FRAMEWORK_COLUMNS.map((framework) => (
                  <th key={framework} className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-white">
                    {framework}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {CONTROL_MAPPINGS.map((row, index) => (
                <tr
                  key={row.control}
                  className={`border-b border-slate-800 ${index % 2 === 0 ? "bg-slate-900/30" : "bg-slate-950/20"}`}
                >
                  <td className="px-3 py-2 text-[11px] font-bold text-white">{row.control}</td>
                  {FRAMEWORK_COLUMNS.map((framework) => (
                    <td key={`${row.control}-${framework}`} className="px-3 py-2">
                      <button
                        type="button"
                        className="rounded-full border border-blue-800/50 bg-blue-900/30 px-2 py-0.5 text-[9px] text-blue-400"
                      >
                        {row.mappings[framework]}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
