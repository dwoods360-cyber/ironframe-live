"use client";

import Link from "next/link";
import { Folder, ShieldCheck, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LAYOUT_SUBNAV_HEADER_Z_CLASS } from "@/app/config/layoutConstants";
import StagedNavLink from "@/app/components/nav/StagedNavLink";
import CommandPostNavLink from "@/app/components/nav/CommandPostNavLink";
import { usePilotStubExportGate } from "@/app/hooks/usePilotStubExportGate";
import { useAuditConsoleAccess } from "@/app/hooks/useAuditConsoleAccess";
import { useBoardroomSecurityAuditAccess } from "@/app/hooks/useBoardroomSecurityAuditAccess";
import { usePlatformAdminToolsAccess } from "@/app/hooks/usePlatformAdminToolsAccess";
import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";
import { buildHeaderRouteMatrix } from "@/app/utils/grcRouteMatch";

type HeaderTwoProps = {
  onVendorDownload: () => void;
};

const NAV_LINK_PREFETCH = true;
const CHIP_CLASS =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 font-sans text-[10px] font-bold leading-none";

export default function HeaderTwo({ onVendorDownload }: HeaderTwoProps) {
  const pathname = usePathname();
  const { suppressed: vendorExportSuppressed, blockedMessage: vendorExportBlockedMessage } =
    usePilotStubExportGate();
  const hostTenantSlug = useHostTenantSlug();
  const routes = useMemo(
    () => buildHeaderRouteMatrix(pathname, hostTenantSlug),
    [pathname, hostTenantSlug],
  );
  const { isVendorsRoute, isConfigRoute, isIntegrityHubRoute, prefix } = routes;
  const { canViewAudit } = useAuditConsoleAccess();
  const { canViewSecurityAuditLogs } = useBoardroomSecurityAuditAccess();
  const { canUsePlatformAdminTools } = usePlatformAdminToolsAccess();

  const chipBarRef = useRef<HTMLDivElement>(null);
  const [chipBarMounted, setChipBarMounted] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    setChipBarMounted(true);

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
  }, [isVendorsRoute, isConfigRoute, canViewAudit, canViewSecurityAuditLogs, canUsePlatformAdminTools]);

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
    window.dispatchEvent(new CustomEvent("vendors:open-add-vendor"));
  }, []);

  const vendorsHref = prefix ? `${prefix}/vendors` : "/vendors";
  const supplyChainHref = prefix ? `${prefix}/vendors/supply-chain` : "/vendors/supply-chain";
  const securityAuditLogsHref = hostTenantSlug
    ? `/boardroom/admin/audit-logs?tenant=${encodeURIComponent(hostTenantSlug)}`
    : "/boardroom/admin/audit-logs";
  const showOverflowControls = chipBarMounted && isOverflowing;

  const integrityHubChipClass = `${CHIP_CLASS} border px-4 transition-all ${
    isIntegrityHubRoute
      ? "border-blue-400 bg-blue-600 text-white hover:bg-blue-500"
      : "border-slate-500/60 bg-slate-900/80 text-slate-100 hover:border-blue-500 hover:bg-slate-800/80"
  }`;

  return (
    <div
      className={`relative ${LAYOUT_SUBNAV_HEADER_Z_CLASS} flex h-10 items-center bg-[#1f6feb] px-4`}
    >
      <div className="relative h-full min-w-0 w-full">
        {showOverflowControls ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[#1f6feb] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#1f6feb] to-transparent" />
            <div className="absolute right-0 top-1/2 z-20 flex -translate-y-1/2 gap-1 pr-0.5">
              <button
                type="button"
                onClick={() => scrollChipBar("left")}
                data-testid="chip-scroll-left"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-[10px] font-bold text-white"
                aria-label="Scroll action bar left"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => scrollChipBar("right")}
                data-testid="chip-scroll-right"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-[10px] font-bold text-white"
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
          className={`ironframe-chip-bar flex h-full w-full items-center justify-start overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            showOverflowControls ? "px-10 pr-[4.75rem] sm:px-12 sm:pr-20" : "px-0"
          }`}
        >
          <div className="flex min-w-max flex-nowrap items-center justify-start gap-x-2">
            <CommandPostNavLink
              prefetch={NAV_LINK_PREFETCH}
              data-testid="header-command-post-chip"
              className={`${CHIP_CLASS} border border-teal-600/60 bg-teal-950/40 text-teal-100 transition-all hover:border-teal-400 hover:bg-teal-900/50`}
            >
              COMMAND POST
            </CommandPostNavLink>
            <Link
              href="/integrity"
              data-testid="header-integrity-hub-chip"
              className={integrityHubChipClass}
            >
              INTEGRITY HUB
            </Link>
            {isVendorsRoute ? (
              <>
                <button
                  type="button"
                  onClick={openAddVendor}
                  data-testid="header-add-vendor-chip"
                  className={`${CHIP_CLASS} animate-pulse rounded-full border border-slate-800 bg-slate-900/80 px-4 text-white transition-all hover:border-blue-500`}
                >
                  + ADD VENDOR
                </button>
                <button
                  type="button"
                  onClick={openSummary}
                  data-testid="header-summary-chip"
                  className={`${CHIP_CLASS} rounded-full border border-slate-800 bg-slate-900/80 px-4 text-white transition-all hover:border-blue-500`}
                >
                  SUMMARY
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (vendorExportSuppressed) return;
                    onVendorDownload();
                  }}
                  disabled={vendorExportSuppressed}
                  title={vendorExportSuppressed ? vendorExportBlockedMessage : "Download pilot registry CSV"}
                  data-testid="header-vendor-download-chip"
                  className={`${CHIP_CLASS} rounded-full border border-slate-800 bg-slate-900/80 px-4 text-white transition-all hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  DOWNLOAD
                </button>
              </>
            ) : null}

            <StagedNavLink
              href={vendorsHref}
              prefetch={NAV_LINK_PREFETCH}
              data-testid="header-vendor-list-chip"
              className={`${CHIP_CLASS} bg-blue-600 px-4 text-white transition-all hover:bg-blue-500`}
            >
              VENDOR LIST
            </StagedNavLink>
            <StagedNavLink
              href={supplyChainHref}
              prefetch={NAV_LINK_PREFETCH}
              data-testid="header-supply-chain-graph-chip"
              className={`${CHIP_CLASS} border border-slate-700/80 bg-slate-900/80 px-4 text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-800/90`}
              title="Vendor Supply Chain Deep Graph (Ironmap blast-radius preview)"
            >
              SUPPLY CHAIN GRAPH
            </StagedNavLink>
            <Link
              href="/config"
              prefetch={NAV_LINK_PREFETCH}
              className={`${CHIP_CLASS} bg-blue-600 px-4 text-white transition-all hover:bg-blue-500`}
            >
              SYSTEM CONFIG
            </Link>
            <Link
              href="/profile"
              prefetch={NAV_LINK_PREFETCH}
              className={`${CHIP_CLASS} border border-emerald-600/50 bg-emerald-950/35 text-emerald-100 transition-all hover:border-emerald-400 hover:bg-emerald-900/45`}
              data-testid="header-security-profile-link"
              title="Security profile"
            >
              <UserRound className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              SECURITY PROFILE
            </Link>
            <Link
              href="/vault"
              prefetch={NAV_LINK_PREFETCH}
              className={`${CHIP_CLASS} border border-teal-600/60 bg-teal-950/40 text-teal-100 transition-all hover:border-teal-400 hover:bg-teal-900/45`}
              title="Evidence Vault"
            >
              <Folder className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              EVIDENCE VAULT
            </Link>
            <Link
              href="/reports/audit-trail"
              prefetch={NAV_LINK_PREFETCH}
              data-testid="header-audit-trail-chip"
              className={`${CHIP_CLASS} bg-blue-600 px-4 text-white transition-all hover:bg-blue-500`}
            >
              AUDIT TRAIL
            </Link>
            {canViewAudit ? (
              <Link
                href="/audit"
                prefetch={NAV_LINK_PREFETCH}
                className={`${CHIP_CLASS} border border-emerald-600/70 bg-emerald-950/45 px-4 font-black text-emerald-100 transition-all hover:border-emerald-400 hover:bg-emerald-900/50`}
              >
                <span aria-hidden>🛡️</span>
                INTEGRITY & AUDIT
              </Link>
            ) : null}
            {canViewSecurityAuditLogs ? (
              <Link
                href={securityAuditLogsHref}
                prefetch={NAV_LINK_PREFETCH}
                data-testid="header-security-audit-logs-chip"
                className={`${CHIP_CLASS} border border-zinc-600/70 bg-zinc-950/60 px-4 text-emerald-100 transition-all hover:border-emerald-400 hover:bg-zinc-900/70`}
                title="Boardroom Security Audit Logs"
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                SECURITY AUDIT LOGS
              </Link>
            ) : null}
            <Link
              href="/board-report"
              prefetch={NAV_LINK_PREFETCH}
              className={`${CHIP_CLASS} border border-violet-600/50 bg-violet-950/40 px-4 text-violet-100 transition-all hover:border-violet-400 hover:bg-violet-900/50`}
            >
              BOARD REPORT
            </Link>
            {canUsePlatformAdminTools ? (
            <Link
              href="/opsupport"
              prefetch={NAV_LINK_PREFETCH}
              className={`${CHIP_CLASS} border border-cyan-700/60 bg-cyan-950/50 px-4 text-cyan-100 transition-all hover:border-cyan-500 hover:bg-cyan-900/50`}
              data-testid="header-opsupport-chip"
            >
              OP SUPPORT
            </Link>
            ) : null}
            <Link
              href="/admin/clearance"
              prefetch={NAV_LINK_PREFETCH}
              className={`${CHIP_CLASS} bg-red-600 px-4 font-medium text-white transition-all hover:bg-red-700`}
              data-testid="header-dmz-quarantine-chip"
            >
              🚨 DMZ QUARANTINE
            </Link>
            <Link
              href="/reports"
              prefetch={NAV_LINK_PREFETCH}
              className={`${CHIP_CLASS} bg-blue-600 px-4 text-white transition-all hover:bg-blue-500`}
            >
              QUICK REPORTS
            </Link>
            {isConfigRoute ? (
              <CommandPostNavLink
                prefetch={NAV_LINK_PREFETCH}
                className={`${CHIP_CLASS} rounded-full border border-slate-800 bg-slate-900/80 px-4 text-white transition-all hover:border-blue-500`}
              >
                BACK TO COMMAND POST
              </CommandPostNavLink>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
