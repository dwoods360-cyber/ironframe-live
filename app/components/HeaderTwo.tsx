"use client";

import Link from "next/link";
import { useRef } from "react";

type HeaderTwoProps = {
  isVendorOverviewRoute: boolean;
  isVendorsRoute: boolean;
  isConfigRoute: boolean;
  showPrimaryActionChips: boolean;
  onVendorDownload: () => void;
};

export default function HeaderTwo({
  isVendorOverviewRoute,
  isVendorsRoute,
  isConfigRoute,
  showPrimaryActionChips,
  onVendorDownload,
}: HeaderTwoProps) {
  const chipBarRef = useRef<HTMLDivElement>(null);

  const scrollChipBar = (direction: "left" | "right") => {
    if (!chipBarRef.current) {
      return;
    }

    chipBarRef.current.scrollBy({
      left: direction === "left" ? -180 : 180,
      behavior: "smooth",
    });
  };

  const openSummary = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(new CustomEvent("vendors:open-summary"));
  };

  return (
    <div className="h-8 bg-[#1f6feb] flex items-center justify-between px-4">
      {isVendorOverviewRoute ? (
        <div className="vendor-header-left-empty" data-print-hide="true" />
      ) : (
        <div className="flex items-center gap-2">
          <Link
            href="/vendors"
            className={`rounded px-3 py-1 text-[10px] font-bold text-white ${
              isVendorsRoute ? "bg-slate-800 border-t-2 border-blue-500" : "bg-white/15 hover:bg-white/25"
            }`}
          >
            VENDOR LIST
          </Link>
          <Link
            href="/config"
            className={`rounded px-3 py-1 text-[10px] font-bold text-white ${
              isConfigRoute ? "bg-slate-800 border-t-2 border-blue-500" : "bg-white/15 hover:bg-white/25"
            }`}
          >
            SYSTEM CONFIG
          </Link>
        </div>
      )}

      <div className="relative flex-1 min-w-0">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-[#1f6feb] to-transparent lg:hidden" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-[#1f6feb] to-transparent lg:hidden" />
        <div className="absolute right-0 top-1/2 z-10 flex -translate-y-1/2 gap-1 pr-1 lg:hidden">
          <button
            type="button"
            onClick={() => scrollChipBar("left")}
            data-testid="chip-scroll-left"
            className="h-6 w-6 rounded-full border border-slate-700 bg-slate-900/80 text-[10px] font-bold text-white"
            aria-label="Scroll action bar left"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollChipBar("right")}
            data-testid="chip-scroll-right"
            className="h-6 w-6 rounded-full border border-slate-700 bg-slate-900/80 text-[10px] font-bold text-white"
            aria-label="Scroll action bar right"
          >
            →
          </button>
        </div>

        <div
          ref={chipBarRef}
          data-testid="header-two-chip-bar"
          className="flex max-w-[220px] items-center justify-start gap-2 overflow-x-auto whitespace-nowrap scroll-smooth pr-16 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.4)_transparent] sm:max-w-[360px] lg:max-w-none lg:justify-end lg:overflow-visible lg:pr-0"
        >
          {isVendorOverviewRoute ? (
            <>
              <Link
                href="/reports/audit-trail?scope=vendor-changes"
                className="flex shrink-0 items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full hover:border-blue-500 transition-all"
              >
                <span className="text-[10px] font-bold text-white">ACTIVITY LOG</span>
              </Link>
              <button
                type="button"
                onClick={onVendorDownload}
                className="flex shrink-0 items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full hover:border-blue-500 transition-all"
              >
                <span className="text-[10px] font-bold text-white">DOWNLOAD</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex shrink-0 items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full hover:border-blue-500 transition-all"
              >
                <span className="text-[10px] font-bold text-white">PRINT</span>
              </button>
              <button
                type="button"
                onClick={openSummary}
                data-testid="header-summary-chip"
                className="flex shrink-0 items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full hover:border-blue-500 transition-all"
              >
                <span className="text-[10px] font-bold text-white">SUMMARY</span>
              </button>
              <Link
                href="/"
                className="flex shrink-0 items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full hover:border-blue-500 transition-all"
              >
                <span className="text-[10px] font-bold text-white">BACK</span>
              </Link>
            </>
          ) : showPrimaryActionChips ? (
            <>
              <Link
                href="/reports/audit-trail"
                className="flex shrink-0 items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full hover:border-blue-500 transition-all"
              >
                <span className="text-[10px] font-bold text-white">AUDIT TRAIL</span>
              </Link>
              <Link
                href="/reports/quick"
                className="flex shrink-0 items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full hover:border-blue-500 transition-all"
              >
                <span className="text-[10px] font-bold text-white">QUICK REPORTS</span>
              </Link>
            </>
          ) : (
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full hover:border-blue-500 transition-all"
            >
              <span className="text-[10px] font-bold text-white">BACK</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
