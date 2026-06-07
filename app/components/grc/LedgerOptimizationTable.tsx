'use client';

import React, { useState } from 'react';
import { useAgentStore } from '@/app/store/agentStore';

interface LedgerRow {
  metric_key: string;
  unit: string;
  amount_cents: bigint;
  amount_usd: string;
  bps_value: number;
  text_value: string;
  carrier_key: string;
  framework: string;
}

export function LedgerOptimizationTable() {
  const activeAgentId = useAgentStore((s) => s.activeAgentId);
  const [isExporting, setIsExporting] = useState(false);

  // Sovereign Asset Baseline Values Cast to Pure BigInt Whole Cents
  const [ledgerData] = useState<LedgerRow[]>([
    { metric_key: "medshield_baseline", unit: "USD_CENT", amount_cents: 1110000000n, amount_usd: "11100000.00", bps_value: 4500, text_value: "Core Asset Reserve", carrier_key: "MED-01", framework: "SOC2" },
    { metric_key: "vaultbank_baseline", unit: "USD_CENT", amount_cents: 590000000n, amount_usd: "5900000.00", bps_value: 2300, text_value: "Liquidity Reserve", carrier_key: "VB-09", framework: "ISO27001" },
    { metric_key: "gridcore_baseline", unit: "USD_CENT", amount_cents: 470000000n, amount_usd: "4700000.00", bps_value: 1800, text_value: "Infrastructure Pool", carrier_key: "GC-04", framework: "CSRD" }
  ]);

  const handleExportTabularCSV = async () => {
    setIsExporting(true);
    try {
      console.log("[EXPORT ENGINE] Commencing Feature 8 compliance tabular compilation...");
      
      // Strict 8-column header serialization mapping contract
      const headers = "metric_key,unit,amount_cents,amount_usd,bps_value,text_value,carrier_key,framework";
      
      const csvRows = ledgerData.map(row => 
        `${row.metric_key},${row.unit},${row.amount_cents.toString()},${row.amount_usd},${row.bps_value},"${row.text_value}",${row.carrier_key},${row.framework}`
      );
      
      const completeCsvPayload = [headers, ...csvRows].join('\n');
      
      // Generate secure local text stream trigger
      const blob = new Blob([completeCsvPayload], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `feature8_tabular_ledger_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log("[EXPORT ENGINE] Feature 8 CSV printed successfully with pure whole-integer BigInt cents.");
    } catch (err) {
      console.error("[EXPORT ENGINE] Critical failure compiling export payload:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-4 p-4 bg-slate-900 border border-slate-800 rounded-lg select-text">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-bold font-mono text-slate-100">Systemic Optimization Ledger Canvas</h2>
          <p className="text-xs text-slate-500 font-mono">Active Focus Context: {activeAgentId || 'None (Idle)'}</p>
        </div>
        
        
        <button
          type="button"
          data-testid="export-tabular-ledger-csv"
          onClick={handleExportTabularCSV}
          disabled={isExporting}
          className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 text-xs font-mono font-black py-2 px-4 rounded transition duration-150 shadow-md uppercase tracking-wider"
        >
          {isExporting ? "Printing..." : "💾 Export Tabular Ledger CSV"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono text-slate-300">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase">
              <th className="pb-2">Key</th>
              <th className="pb-2">Cents (BigInt)</th>
              <th className="pb-2">USD Reference</th>
              <th className="pb-2">Framework</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {ledgerData.map((row) => (
              <tr key={row.metric_key} className="hover:bg-slate-950/40 transition">
                <td className="py-2.5 text-slate-400 font-bold">{row.metric_key}</td>
                <td className="py-2.5 text-emerald-400">{row.amount_cents.toString()}¢</td>
                <td className="py-2.5 text-slate-200">${row.amount_usd}</td>
                <td className="py-2.5 text-cyan-400"><span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded">{row.framework}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
