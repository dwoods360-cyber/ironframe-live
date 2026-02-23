"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderTwo from "@/app/components/HeaderTwo";
import TenantSwitcher from "./TenantSwitcher"; 

export default function TopNav() {
  const pathname = usePathname();
  
  // 1. Detect if we are inside a tenant enclave (e.g., /medshield)
  const segments = pathname.split('/').filter(Boolean);
  const VALID_TENANTS = ["medshield", "vaultbank", "gridcore"];
  const currentTenant = VALID_TENANTS.includes(segments[0]?.toLowerCase()) ? segments[0].toLowerCase() : null;
  
  // 2. Create the dynamic prefix (will be empty on the global dashboard)
  const prefix = currentTenant ? `/${currentTenant}` : "";

  // 3. Make all route checks tenant-aware
  const isAuditTrailRoute = pathname === `${prefix}/reports/audit-trail` || pathname.startsWith(`${prefix}/reports/audit-trail/`);
  const isVendorOverviewRoute = pathname === `${prefix}/vendors` || pathname.startsWith(`${prefix}/vendors/`);
  const showPrimaryActionChips = !isAuditTrailRoute;
  const isConfigRoute = pathname === `${prefix}/config` || pathname.startsWith(`${prefix}/config/`);
  const isEvidenceRoute = pathname === `${prefix}/evidence` || pathname.startsWith(`${prefix}/evidence/`);
  const isFrameworksRoute = pathname === `${prefix}/compliance/frameworks` || pathname.startsWith(`${prefix}/compliance/frameworks/`);
  const isVendorsRoute = pathname === `${prefix}/vendors` || pathname.startsWith(`${prefix}/vendors/`);
  
  const playbookRouteMatch = pathname.match(/^\/(medshield|vaultbank|gridcore)\/playbooks(\/|$)/);
  const playbookEntity = playbookRouteMatch?.[1]?.toUpperCase();
  const isPlaybookRoute = Boolean(playbookEntity);
  
  const headerContextTitle = isPlaybookRoute
    ? `${playbookEntity} // INCIDENT RESPONSE PLAYBOOK`
    : isVendorsRoute
      ? "SUPPLY CHAIN // GLOBAL VENDOR INTELLIGENCE"
    : isFrameworksRoute
      ? "GRC CORE // CONTROL MAPPING & CROSSWALK"
    : isEvidenceRoute
      ? "EVIDENCE LOCKER"
      : "ACTIVE GRC";

  const handleVendorDownload = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.dispatchEvent(new CustomEvent("vendors:download", { detail: { format: "both" } }));
  };

  return (
    <header className="w-full">
      <div className="relative h-10 bg-slate-950 flex items-center justify-between px-6 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold tracking-wider text-white uppercase">IRONFRAME CORE</span>
          <span className="h-3 w-px bg-slate-800" />
          <span
            className={`text-[11px] font-bold tracking-wider uppercase ${
              isEvidenceRoute || isPlaybookRoute || isFrameworksRoute ? "text-white" : "text-emerald-500"
            }`}
          >
            {headerContextTitle}
          </span>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-tighter text-white">LIVE MONITORING</span>
            <span className="text-[10px] font-bold text-slate-700">|</span>
            <span className="text-[10px] font-bold text-emerald-500">SYNC: 24ms</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-slate-800 rounded flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-400">
              <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" fill="currentColor"/>
              <path d="M6 21V19C6 16.7909 7.79086 15 10 15H14C16.2091 15 18 16.7909 18 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-[10px] font-bold text-white">J. DOE (CISO)</span>
          <span className="h-3 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
              <path d="M7 10V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V10" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
              <rect x="5" y="10" width="14" height="12" rx="2" fill="#eab308" stroke="#ca8a04" strokeWidth="2"/>
              <path d="M12 14V18" stroke="#a16207" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-[9px] font-bold uppercase text-emerald-500">SECURE SESSION</span>
          </div>
        </div>
      </div>

      <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex h-full items-center">
          <TenantSwitcher />
        </div>
        <div className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-2">
            AGENT MANAGER: ONLINE
        </div>
      </div>

      <HeaderTwo
        isVendorOverviewRoute={isVendorOverviewRoute}
        isVendorsRoute={isVendorsRoute}
        isConfigRoute={isConfigRoute}
        showPrimaryActionChips={showPrimaryActionChips}
        onVendorDownload={handleVendorDownload}
        currentTenant={currentTenant} // ---> NEW: Passing the isolated tenant to the sub-nav
      />
    </header>
  );
}