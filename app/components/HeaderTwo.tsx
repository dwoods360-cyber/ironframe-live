"use client";

import Link from "next/link";
import IngestionForm from "@/app/components/vendor-risk/IngestionForm";
import { useEffect, useRef, useState } from "react";
// ---> NEW: Import your Enclave components
import UploadArtifactModal from "@/app/components/vendor-risk/UploadArtifactModal";

type HeaderTwoProps = {
  isVendorOverviewRoute: boolean;
  isVendorsRoute: boolean;
  isConfigRoute: boolean;
  showPrimaryActionChips: boolean;
  onVendorDownload: () => void;
  currentTenant?: string | null;
};

export default function HeaderTwo({
  isVendorOverviewRoute,
  isVendorsRoute,
  isConfigRoute,
  showPrimaryActionChips,
  onVendorDownload,
  currentTenant,
}: HeaderTwoProps) {
  const chipBarRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  
  // ---> NEW: Portal State
  const [isPortalOpen, setIsPortalOpen] = useState(false);

  const prefix = currentTenant ? `/${currentTenant}` : "";
  const homeLink = prefix || "/";

  useEffect(() => {
    const updateOverflowState = () => {
      const element = chipBarRef.current;
      if (!element) {
        return;
      }
      setIsOverflowing(element.scrollWidth > element.clientWidth + 1);
    };

    updateOverflowState();
    window.addEventListener("resize", updateOverflowState);

    let observer: ResizeObserver | null = null;
    if (chipBarRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => updateOverflowState());
      observer.observe(chipBarRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateOverflowState);
      observer?.disconnect();
    };
  }, [isVendorOverviewRoute, isVendorsRoute, isConfigRoute, showPrimaryActionChips]);

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

  const openAddVendor = () => {
    // ---> NEW: Trigger the portal instead of firing into the void!
    setIsPortalOpen(true);
    
    // Keeping the original event just in case other parts of your app listen to it
    if (typeof window === "undefined") {
      return;
    }
    window.dispatchEvent(new CustomEvent("vendors:open-add-vendor"));
  };

  return (
    <div className={`h-10 bg-[#1f6feb] flex items-center px-4 ${isVendorOverviewRoute ? "justify-start" : "justify-between"}`}>
      {!isVendorOverviewRoute ? (
        <div className="flex items-center gap-2">
          <Link
            href={`${prefix}/vendors`}
            className={`rounded px-3 py-1 text-[10px] font-bold text-white ${
              isVendorsRoute ? "bg-slate-800 border-t-2 border-blue-500" : "bg-white/15 hover:bg-white/25"
            }`}
          >
            VENDOR LIST
          </Link>
          <Link
            href={`${prefix}/config`}
            className={`rounded px-3 py-1 text-[10px] font-bold text-white ${
              isConfigRoute ? "bg-slate-800 border-t-2 border-blue-500" : "bg-white/15 hover:bg-white/25"
            }`}
          >
            SYSTEM CONFIG
          </Link>
        </div>
      ) : null}

      <div className="relative flex-1 min-w-0">
        {isOverflowing && (
          <>
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
          </>
        )}

        <div
          ref={chipBarRef}
          data-testid="header-two-chip-bar"
          className={`flex w-full ${isVendorOverviewRoute ? "justify-start" : "justify-end"} overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            isOverflowing ? "pr-16 pb-4" : "pr-0 pb-0"
          }`}
        >
          <div className="flex min-w-max flex-nowrap items-center gap-x-2 w-full">
            {isVendorOverviewRoute ? (
              <>
              <button
                type="button"
                onClick={openAddVendor}
                data-testid="header-add-vendor-chip"
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-[10px] font-bold text-white transition-all hover:border-blue-500 animate-pulse"
              >
                <span className="text-[10px] font-bold text-white">+ ADD VENDOR</span>
              </button>
              <div className="ml-auto flex items-center gap-x-2">
                <button
                  type="button"
                  onClick={openSummary}
                  data-testid="header-summary-chip"
                  className="flex shrink-0 items-center gap-1.5 px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-full hover:border-blue-500 transition-all"
                >
                  <span className="text-[10px] font-bold text-white">SUMMARY</span>
                </button>
                <Link
                  href={homeLink}
                  className="flex shrink-0 items-center gap-1.5 px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-full hover:border-blue-500 transition-all"
                >
                  <span className="text-[10px] font-bold text-white">BACK</span>
                </Link>
              </div>
              </>
            ) : showPrimaryActionChips ? (
              <>
              <Link
                href={`${prefix}/reports/audit-trail`}
                className="flex shrink-0 items-center gap-1.5 px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-full hover:border-blue-500 transition-all"
              >
                <span className="text-[10px] font-bold text-white">AUDIT TRAIL</span>
              </Link>
              <Link
                href={`${prefix}/reports/quick`}
                className="flex shrink-0 items-center gap-1.5 px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-full hover:border-blue-500 transition-all"
              >
                <span className="text-[10px] font-bold text-white">QUICK REPORTS</span>
              </Link>
              </>
            ) : (
              <Link
                href={homeLink}
                className="flex shrink-0 items-center gap-1.5 px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-full hover:border-blue-500 transition-all"
              >
                <span className="text-[10px] font-bold text-white">BACK</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ---> NEW: THE INGESTION PORTAL MODAL INSTALLED AT Z-[9999] <--- */}
      {isPortalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl border border-slate-800 bg-slate-900 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
            <UploadArtifactModal 
              isOpen={isPortalOpen} 
              onClose={() => setIsPortalOpen(false)}
              onUploadComplete={(data) => {
                console.log("Upload complete:", data);
                setIsPortalOpen(false);
              }}
              tenantId={currentTenant ?? ""}
            />
          </div>
        </div>
      )}

    </div>
  );
}