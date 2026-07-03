"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileNav();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen, closeMobileNav]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const navLabel = audience === "operator" ? "USER GUIDE" : "REFERENCE MANUALS";

  return (
    <div
      className="ironframe-docs-shell flex min-h-screen flex-col bg-[#020617] text-slate-100 selection:bg-cyan-500/30"
      data-ironframe-public="true"
      data-ironframe-surface="docs-reader"
    >
      {embedded ? null : (
      <nav className="sticky top-0 z-50 flex h-14 w-full items-center justify-between gap-3 border-b border-slate-800/80 bg-[#020617]/95 px-4 backdrop-blur-md sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-900/80 text-slate-200 transition hover:border-teal-600 hover:text-teal-300 md:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls="docs-mobile-nav"
            aria-label={mobileNavOpen ? "Close documentation menu" : "Open documentation menu"}
          >
            {mobileNavOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
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

      {embedded || !mobileNavOpen ? null : (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Close documentation menu"
          onClick={closeMobileNav}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {embedded ? null : (
        <>
        <DocsSidebar
          currentSlug={currentSlug}
          navSections={navSections}
          variant="desktop"
        />
        <DocsSidebar
          id="docs-mobile-nav"
          currentSlug={currentSlug}
          navSections={navSections}
          variant="mobile"
          open={mobileNavOpen}
          onNavigate={closeMobileNav}
        />
        </>
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
