"use client";

import Link from "next/link";

import DocsSidebar from "./DocsSidebar";
import type { DocNavSection } from "@/lib/docsNavigation";

interface DocsChromeProps {
  currentSlug: string[];
  navSections: DocNavSection[];
  children: React.ReactNode;
  audience?: "operator" | "publisher";
  embedded?: boolean;
}

export default function DocsChrome({
  currentSlug,
  navSections,
  children,
  audience = "publisher",
  embedded = false,
}: DocsChromeProps) {
  const navLabel = audience === "operator" ? "USER GUIDE" : "REFERENCE MANUALS";

  return (
    <div
      className="ironframe-docs-shell flex min-h-screen flex-col bg-[#020617] text-slate-100 selection:bg-cyan-500/30"
      data-ironframe-public="true"
      data-ironframe-surface="docs-reader"
    >
      {embedded ? null : (
        <nav className="sticky top-0 z-50 flex h-14 w-full shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 bg-[#020617]/95 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/" className="flex min-w-0 items-center gap-2 transition hover:opacity-90 sm:gap-3">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" aria-hidden />
              <span className="truncate font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-xs">
                IRONFRAME CORE <span className="text-slate-700">|</span>{" "}
                <span className="text-teal-400">{navLabel}</span>
              </span>
            </Link>
          </div>
          <Link
            href={audience === "operator" ? "/get-started" : "/"}
            className="shrink-0 rounded border border-teal-900/50 bg-teal-950/30 px-3 py-2 font-mono text-[10px] font-bold tracking-wider text-teal-400 transition-all hover:bg-teal-500 hover:text-slate-950 sm:px-4 sm:py-2.5 sm:text-xs"
          >
            <span className="sm:hidden">{audience === "operator" ? "GET STARTED" : "DASHBOARD"}</span>
            <span className="hidden sm:inline">
              {audience === "operator" ? "RETURN TO GET STARTED" : "RETURN TO OPERATIONS DASHBOARD"}
            </span>
          </Link>
        </nav>
      )}

      <div className="flex min-h-0 min-w-0 flex-1">
        {embedded ? null : (
          <DocsSidebar currentSlug={currentSlug} navSections={navSections} />
        )}
        <main
          className={`min-h-0 min-w-0 flex-1 overflow-y-auto ${
            embedded ? "px-4 py-4 sm:px-6" : "px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-12"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
