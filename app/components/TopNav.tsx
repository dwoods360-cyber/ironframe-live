"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { LogOut, Lock, Unlock, CheckCircle2 } from "lucide-react";
import HeaderTwo from "@/app/components/HeaderTwo";
import TenantSwitcher from "./TenantSwitcher";
import { useRiskStore } from "@/app/store/riskStore";
import { useLayoutStore } from "@/app/store/useLayoutStore";
import CommandPostFreezeControl from "@/app/components/commandPost/CommandPostFreezeControl";
import { createClient } from "@/lib/supabase/client";
import { mapSupabaseMetadataRoleToDisplay } from "@/app/lib/grcRoles";
import { isLegacyAuditTrailRedirectPath, isReportsAuditTrailPath } from "@/app/utils/grcRouteMatch";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user);
        setUserLoading(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setUserLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);
  
  // 1. Detect if we are inside a tenant enclave (e.g., /medshield)
  const segments = pathname.split('/').filter(Boolean);
  const VALID_TENANTS = ["medshield", "vaultbank", "gridcore", "defense"];
  const currentTenant = VALID_TENANTS.includes(segments[0]?.toLowerCase()) ? segments[0].toLowerCase() : null;
  
  // 2. Create the dynamic prefix (will be empty on the global dashboard)
  const prefix = currentTenant ? `/${currentTenant}` : "";

  // 3. Make all route checks tenant-aware
  const isAuditTrailRoute = pathname === `${prefix}/reports/audit-trail` || pathname.startsWith(`${prefix}/reports/audit-trail/`);
  const isVendorOverviewRoute = pathname === `${prefix}/vendors` || pathname.startsWith(`${prefix}/vendors/`);
  const showPrimaryActionChips = !isAuditTrailRoute;
  const isConfigRoute = pathname === `${prefix}/config` || pathname.startsWith(`${prefix}/config/`);
  const isEvidenceRoute =
    pathname === "/evidence" ||
    pathname.startsWith("/evidence/") ||
    pathname === "/vault" ||
    pathname.startsWith("/vault/") ||
    pathname === `${prefix}/evidence` ||
    pathname.startsWith(`${prefix}/evidence/`);
  const isFrameworksRoute = pathname === `${prefix}/compliance/frameworks` || pathname.startsWith(`${prefix}/compliance/frameworks/`);
  const isVendorsRoute = pathname === `${prefix}/vendors` || pathname.startsWith(`${prefix}/vendors/`);
  const isIntegrityHubRoute = pathname === "/integrity" || pathname.startsWith("/integrity/");
  const isBoardReportRoute = pathname === "/board-report" || pathname.startsWith("/board-report/");
  const isOpSupportRoute =
    pathname === "/opsupport" ||
    pathname.startsWith("/opsupport/") ||
    pathname === "/op-support" ||
    pathname.startsWith("/op-support/");

  const playbookRouteMatch = pathname.match(/^\/(medshield|vaultbank|gridcore|defense)\/playbooks(\/|$)/);
  const playbookEntity = playbookRouteMatch?.[1]?.toUpperCase();
  const isPlaybookRoute = Boolean(playbookEntity);

  const liveMonitoringCount = useRiskStore((s) => s.liveMonitoringCount);
  const currencyScale = useRiskStore((s) => s.currencyScale);
  const setCurrencyScale = useRiskStore((s) => s.setCurrencyScale);

  const isUiLocked = useLayoutStore((s) => s.isUiLocked);
  const lockToast = useLayoutStore((s) => s.lockToast);
  const ironcastToast = useLayoutStore((s) => s.ironcastToast);
  const dismissLockToast = useLayoutStore((s) => s.dismissLockToast);
  const dismissIroncastToast = useLayoutStore((s) => s.dismissIroncastToast);

  const headerContextTitle = isPlaybookRoute
    ? `${playbookEntity} // INCIDENT RESPONSE PLAYBOOK`
    : isVendorsRoute
      ? "SUPPLY CHAIN // GLOBAL VENDOR INTELLIGENCE"
    : isFrameworksRoute
      ? "GRC CORE // CONTROL MAPPING & CROSSWALK"
    : isEvidenceRoute
      ? "EVIDENCE VAULT // BULK EXPORT"
    : isIntegrityHubRoute
      ? "INTEGRITY HUB // AUDIT LEDGER"
    : isAuditTrailRoute
      ? "REPORTS // AUDIT TRAIL INTELLIGENCE"
    : isBoardReportRoute
      ? "EXECUTIVE // BOARD REPORT"
    : isOpSupportRoute
      ? "OP SUPPORT // INGRESS & SANITIZATION"
      : "ACTIVE GRC";

  const handleVendorDownload = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.dispatchEvent(new CustomEvent("vendors:download", { detail: { format: "both" } }));
  };

  const identityName =
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    user?.email?.trim() ||
    "UNAUTHENTICATED";

  const identityRole = mapSupabaseMetadataRoleToDisplay(
    typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : undefined,
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    if (!lockToast) return;
    const id = window.setTimeout(() => dismissLockToast(), 6000);
    return () => window.clearTimeout(id);
  }, [lockToast, dismissLockToast]);

  useEffect(() => {
    if (!ironcastToast) return;
    const id = window.setTimeout(() => dismissIroncastToast(), 7000);
    return () => window.clearTimeout(id);
  }, [ironcastToast, dismissIroncastToast]);

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

        <div className="pointer-events-none absolute left-1/2 z-[60] -translate-x-1/2">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-tighter text-white">LIVE MONITORING</span>
            <span className="text-[10px] font-bold text-slate-700">|</span>
            <span className="text-[10px] font-bold text-emerald-500">SIGNALS: {liveMonitoringCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-slate-800 rounded flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-400">
              <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" fill="currentColor"/>
              <path d="M6 21V19C6 16.7909 7.79086 15 10 15H14C16.2091 15 18 16.7909 18 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-[10px] font-bold text-white">
            {userLoading ? "Loading operator..." : `${identityName} (${identityRole})`}
          </span>
          <Link
            href="/cockpit"
            className="text-[9px] font-bold uppercase tracking-wide text-cyan-400/90 underline-offset-2 hover:text-cyan-300 hover:underline"
          >
            Command post
          </Link>
          <span className="h-3 w-px bg-slate-700" />
          <Link
            href="/profile"
            className="text-[9px] font-bold uppercase tracking-wide text-emerald-400/90 underline-offset-2 hover:text-emerald-300 hover:underline"
            data-testid="topnav-security-profile-link"
          >
            Security profile
          </Link>
          <span className="h-3 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
              <path d="M7 10V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V10" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
              <rect x="5" y="10" width="14" height="12" rx="2" fill="#eab308" stroke="#ca8a04" strokeWidth="2"/>
              <path d="M12 14V18" stroke="#a16207" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-[9px] font-bold uppercase text-emerald-500">SECURE SESSION</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={userLoading}
            className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-200 transition hover:border-rose-400/60 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
            title="Logout"
          >
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </div>

      <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex h-full items-center gap-3">
          <TenantSwitcher />
          {/* # MAGNITUDE_SELECTOR — global currency scale toggle (AUTO, K, M, B, T) */}
          {/* # GLOBAL_CURRENCY_SELECTOR — tenant-scoped currency scaling control */}
          <div className="relative z-50 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-300">
            <span className="text-slate-400">Scale</span>
            <div className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 px-1 py-0.5">
              {(["AUTO", "K", "M", "B", "T"] as const).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => setCurrencyScale(scale)}
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    currencyScale === scale
                      ? "bg-emerald-500 text-black"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {scale}
                </button>
              ))}
            </div>
          </div>
          <CommandPostFreezeControl variant="topnav" />
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

      {(lockToast || ironcastToast) ? (
        <div className="fixed bottom-5 right-5 z-[500] flex max-w-sm flex-col gap-2">
          {lockToast ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-start gap-2 rounded-lg border border-amber-500/70 bg-amber-950/95 px-3 py-2.5 text-amber-50 shadow-[0_0_24px_rgba(245,158,11,0.25)]"
            >
              <Lock size={14} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
              <p className="text-[10px] leading-snug">{lockToast}</p>
              <button
                type="button"
                onClick={() => dismissLockToast()}
                className="shrink-0 rounded border border-amber-700/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-200 hover:bg-amber-900/50"
              >
                Dismiss
              </button>
            </div>
          ) : null}
          {ironcastToast ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-start gap-2 rounded-lg border border-emerald-500/70 bg-emerald-950/95 px-3 py-2.5 text-emerald-50 shadow-[0_0_22px_rgba(16,185,129,0.22)]"
            >
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden />
              <p className="text-[10px] leading-snug">{ironcastToast}</p>
              <button
                type="button"
                onClick={() => dismissIroncastToast()}
                className="shrink-0 rounded border border-emerald-700/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-200 hover:bg-emerald-900/50"
              >
                Dismiss
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}