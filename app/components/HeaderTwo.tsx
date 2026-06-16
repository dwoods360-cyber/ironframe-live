"use client";

import Link from "next/link";
import { Folder, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import GlobalViewportOverlay from "@/app/components/layout/GlobalViewportOverlay";
import { LAYOUT_SUBNAV_HEADER_Z_CLASS } from "@/app/config/layoutConstants";
import UploadArtifactModal from "@/app/components/vendor-risk/UploadArtifactModal";
import StagedNavLink from "@/app/components/nav/StagedNavLink";
import { useAuditConsoleAccess } from "@/app/hooks/useAuditConsoleAccess";
import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";
import { buildHeaderRouteMatrix } from "@/app/utils/grcRouteMatch";

type HeaderTwoProps = {
  onVendorDownload: () => void;
};

const NAV_LINK_PREFETCH = true;

export default function HeaderTwo({ onVendorDownload }: HeaderTwoProps) {
  const pathname = usePathname();
  const hostTenantSlug = useHostTenantSlug();
  const routes = useMemo(
    () => buildHeaderRouteMatrix(pathname, hostTenantSlug),
    [pathname, hostTenantSlug],
  );
  const { isVendorsRoute, isConfigRoute, currentTenant, prefix } = routes;
  const { canViewAudit } = useAuditConsoleAccess();

  const chipBarRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isPortalOpen, setIsPortalOpen] = useState(false);

  useEffect(() => {
    const updateOverflowState = () => {
      const element = chipBarRef.current;
      if (!element) return;
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
  }, [isVendorsRoute, isConfigRoute, canViewAudit]);

  const scrollChipBar = useCallback((direction: "left" | "right") => {
    chipBarRef.current?.scrollBy({
      left: direction === "left" ? -180 : 180,
      behavior: "smooth",
    });
  }, []);

  const openSummary = useCallback(() => {
    window.dispatchEvent(new CustomEvent("vendors:open-summary"));
  }, []);

  const openAddVendor = useCallback(() => {
    setIsPortalOpen(true);
    window.dispatchEvent(new CustomEvent("vendors:open-add-vendor"));
  }, []);

  const vendorsHref = prefix ? `${prefix}/vendors` : "/vendors";
  const supplyChainHref = prefix ? `${prefix}/vendors/supply-chain` : "/vendors/supply-chain";

  return (
    <div
      className={`relative ${LAYOUT_SUBNAV_HEADER_Z_CLASS} flex h-10 items-center justify-start bg-[#1f6feb] px-4`}
    >
      <div className="relative min-w-0 flex-1">
        {isOverflowing ? (
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
        ) : null}

        <div
          ref={chipBarRef}
          data-testid="header-two-chip-bar"
          className={`flex w-full justify-start overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            isOverflowing ? "pr-16 pb-4" : "pr-0 pb-0"
          }`}
        >
          <div className="flex w-full min-w-max flex-nowrap items-center gap-x-2">
            <Link
              href="/"
              prefetch={NAV_LINK_PREFETCH}
              data-testid="header-command-post-chip"
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-teal-600/60 bg-teal-950/40 px-3 py-2 text-[10px] font-bold text-teal-100 transition-all hover:border-teal-400 hover:bg-teal-900/50"
            >
              COMMAND POST
            </Link>
            {isVendorsRoute ? (
              <>
                <button
                  type="button"
                  onClick={openAddVendor}
                  data-testid="header-add-vendor-chip"
                  className="flex shrink-0 animate-pulse items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-[10px] font-bold text-white transition-all hover:border-blue-500"
                >
                  + ADD VENDOR
                </button>
                <button
                  type="button"
                  onClick={openSummary}
                  data-testid="header-summary-chip"
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-[10px] font-bold text-white transition-all hover:border-blue-500"
                >
                  SUMMARY
                </button>
                <button
                  type="button"
                  onClick={onVendorDownload}
                  data-testid="header-vendor-download-chip"
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-[10px] font-bold text-white transition-all hover:border-blue-500"
                >
                  DOWNLOAD
                </button>
              </>
            ) : null}

            <Link
              href={vendorsHref}
              prefetch={NAV_LINK_PREFETCH}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-[10px] font-bold text-white transition-all hover:bg-blue-500"
            >
              VENDOR LIST
            </Link>
            <StagedNavLink
              href={supplyChainHref}
              prefetch={NAV_LINK_PREFETCH}
              data-testid="header-supply-chain-graph-chip"
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-[10px] font-bold text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-800/90"
              title="Vendor Supply Chain Deep Graph (Ironmap blast-radius preview)"
            >
              SUPPLY CHAIN GRAPH
            </StagedNavLink>
            <Link
              href="/config"
              prefetch={NAV_LINK_PREFETCH}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-[10px] font-bold text-white transition-all hover:bg-blue-500"
            >
              SYSTEM CONFIG
            </Link>
            <Link
              href="/profile"
              prefetch={NAV_LINK_PREFETCH}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-600/50 bg-emerald-950/35 px-3 py-2 text-[10px] font-bold text-emerald-100 transition-all hover:border-emerald-400 hover:bg-emerald-900/45"
              data-testid="header-security-profile-link"
              title="Security profile"
            >
              <UserRound className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              SECURITY PROFILE
            </Link>
            <Link
              href="/vault"
              prefetch={NAV_LINK_PREFETCH}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-teal-600/60 bg-teal-950/40 px-3 py-2 text-[10px] font-bold text-teal-100 transition-all hover:border-teal-400 hover:bg-teal-900/45"
              title="Evidence Vault"
            >
              <Folder className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              EVIDENCE VAULT
            </Link>
            <Link
              href="/reports/audit-trail"
              prefetch={NAV_LINK_PREFETCH}
              data-testid="header-audit-trail-chip"
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-[10px] font-bold text-white transition-all hover:bg-blue-500"
            >
              AUDIT TRAIL
            </Link>
            <Link
              href="/integrity"
              prefetch={NAV_LINK_PREFETCH}
              data-testid="header-integrity-hub-chip"
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-500/60 bg-slate-900/80 px-4 py-2 text-[10px] font-bold text-slate-100 transition-all hover:border-blue-500 hover:bg-slate-800/80"
            >
              INTEGRITY HUB
            </Link>
            {canViewAudit ? (
              <Link
                href="/audit"
                prefetch={NAV_LINK_PREFETCH}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-600/70 bg-emerald-950/45 px-4 py-2 text-[10px] font-black text-emerald-100 transition-all hover:border-emerald-400 hover:bg-emerald-900/50"
              >
                <span aria-hidden>🛡️</span>
                INTEGRITY & AUDIT
              </Link>
            ) : null}
            <Link
              href="/board-report"
              prefetch={NAV_LINK_PREFETCH}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-violet-600/50 bg-violet-950/40 px-4 py-2 text-[10px] font-bold text-violet-100 transition-all hover:border-violet-400 hover:bg-violet-900/50"
            >
              BOARD REPORT
            </Link>
            <Link
              href="/opsupport"
              prefetch={NAV_LINK_PREFETCH}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-cyan-700/60 bg-cyan-950/50 px-4 py-2 text-[10px] font-bold text-cyan-100 transition-all hover:border-cyan-500 hover:bg-cyan-900/50"
              data-testid="header-opsupport-chip"
            >
              OP SUPPORT
            </Link>
            <Link
              href="/admin/clearance"
              prefetch={NAV_LINK_PREFETCH}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-[10px] font-medium text-white transition-all hover:bg-red-700"
              data-testid="header-dmz-quarantine-chip"
            >
              🚨 DMZ QUARANTINE
            </Link>
            <Link
              href="/reports"
              prefetch={NAV_LINK_PREFETCH}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-[10px] font-bold text-white transition-all hover:bg-blue-500"
            >
              QUICK REPORTS
            </Link>
            {isConfigRoute ? (
              <Link
                href="/"
                prefetch={NAV_LINK_PREFETCH}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-[10px] font-bold text-white transition-all hover:border-blue-500"
              >
                BACK TO COMMAND POST
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <GlobalViewportOverlay
        open={isPortalOpen}
        onClose={() => setIsPortalOpen(false)}
        backdropClassName="bg-slate-950/80 backdrop-blur-sm"
        panelClassName="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        <UploadArtifactModal
          isOpen={isPortalOpen}
          onClose={() => setIsPortalOpen(false)}
          onUploadComplete={() => setIsPortalOpen(false)}
          tenantId={currentTenant ?? ""}
        />
      </GlobalViewportOverlay>
    </div>
  );
}
