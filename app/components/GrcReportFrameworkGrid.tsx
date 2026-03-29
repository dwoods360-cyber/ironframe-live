"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { GRC_FRAMEWORK_CATEGORIES } from "@/app/config/grcFrameworks";
import { useRiskStore } from "@/app/store/riskStore";

/**
 * Reports hub: compliance framework chips driven by `grcFrameworks` config.
 * Click toggles selection in `useRiskStore.activeFrameworkIds`; navigation follows `href`.
 */
export default function GrcReportFrameworkGrid() {
  const activeFrameworkIds = useRiskStore((s) => s.activeFrameworkIds);
  const toggleFramework = useRiskStore((s) => s.toggleFramework);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {GRC_FRAMEWORK_CATEGORIES.map((group) => (
        <section
          key={group.id}
          className="rounded border border-slate-800 bg-slate-900/50 p-4"
        >
          <div className="mb-3 border-b border-slate-800 pb-2">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-white">
              {group.title}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.frameworks.map((report) => {
              const active = activeFrameworkIds.includes(report.id);
              return (
                <Link
                  key={report.id}
                  href={report.href}
                  onClick={() => toggleFramework(report.id)}
                  className={
                    active
                      ? "flex items-center gap-2 rounded-full border border-blue-500 bg-blue-500/15 px-3 py-1.5 text-[10px] text-white transition-all hover:border-blue-400"
                      : "flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-[10px] text-slate-300 transition-all hover:border-blue-500 hover:text-white"
                  }
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  {report.label}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
