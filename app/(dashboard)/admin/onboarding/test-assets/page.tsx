"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function TestAssetsPage() {
  useEffect(() => {
    document.body.classList.add("onboarding-test-assets-print-mode");
    return () => document.body.classList.remove("onboarding-test-assets-print-mode");
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="ironframe-ingestion-test-suite mx-auto min-h-screen max-w-4xl bg-slate-900 p-8 font-mono text-slate-100">
      <div className="mb-4 print:hidden">
        <Link
          href="/admin/onboarding"
          className="text-[10px] text-cyan-400 hover:underline"
        >
          ← Corporate onboarding
        </Link>
      </div>

      <div className="mb-8 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 print:hidden">
        <div>
          <h1 className="text-sm font-bold text-emerald-400">
            IRONFRAME GRC INGESTION SUITE GENERATOR
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Generate print-ready PDFs to test the Acme Corp onboarding pipeline.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="rounded bg-emerald-600 px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-emerald-500"
        >
          Download PDF Suite
        </button>
      </div>

      <div className="space-y-16 print:space-y-0 print:bg-white print:text-slate-900">
        <section className="page-break-after rounded-xl border border-slate-800 bg-slate-950/50 p-8 print:border-none print:bg-white print:p-0">
          <div className="mb-6 flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs font-bold tracking-widest text-emerald-500">
                INTERNAL POLICIES // AC-WISP-2026
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-100 print:text-black">
                Written Information Security Policy (WISP)
              </h2>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>Effective: June 14, 2026</div>
              <div>Scope: Acme Corp Entirety</div>
            </div>
          </div>
          <div className="space-y-4 text-xs leading-relaxed text-slate-300 print:text-slate-800">
            <p>
              <strong>1.1 Purpose:</strong> This document establishes the formal information security
              standard for Acme Corp. Access controls are managed under strict least-privilege models to
              satisfy SOC 2 CC6.1 criteria.
            </p>
            <p>
              <strong>1.2 Access Provisioning Matrix:</strong> User authorization profiles are managed
              exclusively via the corporate role-mapping database system. The default operational profile
              for localized workspace administration is designated as{" "}
              <code>GRC_MANAGER</code>.
            </p>
            <p>
              <strong>1.3 Governance Ownership:</strong> The administration, annual review, and
              operational enforcement of these parameters are assigned directly to the alternate corporate
              identity manager account (<code>acme-manager@example.com</code>).
            </p>
          </div>
        </section>

        <section className="page-break-after rounded-xl border border-slate-800 bg-slate-950/50 p-8 print:border-none print:bg-white print:p-0">
          <div className="mb-6 flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs font-bold tracking-widest text-amber-500">
                NETWORK OPERATIONS // AC-NET-SEC
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-100 print:text-black">
                Tenant Isolation &amp; Boundary Control Directive
              </h2>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>Version: v1.0.4</div>
              <div>Classification: RESTRICTED</div>
            </div>
          </div>
          <div className="space-y-4 text-xs leading-relaxed text-slate-300 print:text-slate-800">
            <p>
              <strong>2.1 Host Routing Isolation Architecture:</strong> To enforce structural logical
              boundaries, company data processing tunnels route strictly using host-implied addressing
              vectors. The verified routing space for local staging validation is pinned exclusively to{" "}
              <code>http://acmecorp.lvh.me:3000</code>.
            </p>
            <p>
              <strong>2.2 Cross-Tenant Isolation Parameters:</strong> The edge middleware layer checks
              incoming request headers against the centralized authorization matrix. Any cross-tenant
              directory sniffing or data leakage attempts across neighboring workspace structures will
              trigger an instant <code>403 Forbidden</code> boundary block.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-8 print:border-none print:bg-white print:p-0">
          <div className="mb-6 flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs font-bold tracking-widest text-rose-500">
                FINANCIAL LEDGERS // AC-ALE-2026
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-100 print:text-black">
                Asset Risk Register &amp; ALE Baseline Parameters
              </h2>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>Audit Ref: LOG-FIN-09</div>
              <div>Currency Unit: USD (BIGINT CENTS)</div>
            </div>
          </div>

          <table className="mb-6 w-full border-collapse text-left text-xs text-slate-300 print:text-slate-800">
            <thead>
              <tr className="border-b border-slate-800 print:border-slate-300">
                <th className="py-2 font-bold">Asset ID</th>
                <th className="py-2 font-bold">Asset Target Scope</th>
                <th className="py-2 text-right font-bold">Exposure Value (Integer Cents)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800/50 print:border-slate-200">
                <td className="py-2 font-mono">AST-001</td>
                <td className="py-2">Production Datastore Encryption Container</td>
                <td className="py-2 text-right font-mono">150,000,000</td>
              </tr>
              <tr className="border-b border-slate-800/50 print:border-slate-200">
                <td className="py-2 font-mono">AST-002</td>
                <td className="py-2">Operational Infrastructure Availability Bounds</td>
                <td className="py-2 text-right font-mono">100,000,000</td>
              </tr>
              <tr className="bg-slate-900/50 font-bold text-emerald-400 print:bg-slate-100 print:text-emerald-700">
                <td className="px-2 py-3" colSpan={2}>
                  AGGREGATE DETERMINISTIC ALE BASELINE
                </td>
                <td className="px-2 py-3 text-right font-mono text-sm">250,000,000</td>
              </tr>
            </tbody>
          </table>

          <div className="rounded border border-dashed border-slate-800 p-3 font-mono text-[10px] leading-normal text-slate-400 print:border-slate-300 print:text-slate-600">
            SYSTEMIC VERIFICATION INGEST CHECK: The aggregate Annual Loss Expectancy baseline for this
            profile maps directly to exactly 2,500,000.00 USD. Floating-point representations are
            completely prohibited to maintain financial ledger alignment.
          </div>
        </section>
      </div>
    </div>
  );
}
