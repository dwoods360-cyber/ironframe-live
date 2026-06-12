"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, CheckCircle2 } from "lucide-react";
import HeaderTwo from "@/app/components/HeaderTwo";
import TenantSwitcher from "./TenantSwitcher";
import { useRiskStore } from "@/app/store/riskStore";
import { useLayoutStore } from "@/app/store/useLayoutStore";
import CommandPostFreezeControl from "@/app/components/commandPost/CommandPostFreezeControl";
import ContextualHelpTrigger from "@/app/components/HelpSystem/ContextualHelpTrigger";
import { useOperatorIdentity } from "@/app/hooks/useOperatorIdentity";
import { buildHeaderRouteMatrix } from "@/app/utils/grcRouteMatch";
import { LAYOUT_MASTER_HEADER_Z_CLASS, LAYOUT_SUBNAV_HEADER_Z_CLASS } from "@/app/config/layoutConstants";
import { createClient } from "@/lib/supabase/client";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { displayName, displayRole, isLoading: userLoading, isGuest } = useOperatorIdentity();
  const routes = useMemo(() => buildHeaderRouteMatrix(pathname), [pathname]);
  const {
    isAuditTrailRoute,
    isEvidenceRoute,
    isFrameworksRoute,
    isVendorsRoute,
    isIntegrityHubRoute,
    isBoardReportRoute,
    isOpSupportRoute,
    isPlaybookRoute,
    playbookEntity,
  } = routes;

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

  const identityName = displayName;
  const identityRole = displayRole;

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
      <div className={`${LAYOUT_MASTER_HEADER_Z_CLASS} relative flex h-16 shrink-0 items-center justify-between border-b border-slate-900 bg-slate-950 px-6`}>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-black tracking-widest text-white">IRONFRAME CORE</span>
            <span className="text-sm text-slate-800">|</span>
            <span
              className={`rounded border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-widest shadow-sm ${
                isEvidenceRoute || isPlaybookRoute || isFrameworksRoute
                  ? "border-slate-700 bg-slate-900/40 text-slate-200"
                  : "border-teal-900/50 bg-teal-950/40 text-teal-400"
              }`}
            >
              {headerContextTitle}
            </span>
          </div>

          <nav className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest">
            <Link
              href="/"
              className="rounded border border-teal-900/40 bg-teal-950/30 px-3 py-1.5 text-teal-400 shadow-sm shadow-teal-950/10 transition-all duration-150 hover:bg-teal-500 hover:text-slate-950"
            >
              COMMAND POST
            </Link>
            <Link
              href="/profile"
              className="rounded border border-slate-900 bg-slate-900/20 px-3 py-1.5 text-slate-400 transition-all duration-150 hover:border-slate-800 hover:bg-slate-900 hover:text-white"
              data-testid="topnav-security-profile-link"
            >
              SECURITY PROFILE
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
              LIVE MONITORING
            </span>
            <span className="font-mono text-[9px] font-bold text-slate-700">|</span>
            <span className="font-mono text-[9px] font-bold uppercase text-emerald-500">
              SIGNALS: {liveMonitoringCount}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded border border-slate-900/60 bg-slate-900/40 px-3 py-1">
            <span className="font-mono text-[10px] text-slate-500" aria-hidden>
              👤
            </span>
            <span className="font-mono text-[10px] font-medium tracking-wide text-slate-300">
              {userLoading ? (
                "Resolving operator…"
              ) : (
                <>
                  {identityName}{" "}
                  <span className="font-normal text-slate-600">
                    ({identityRole}
                    {isGuest ? " · local session" : ""})
                  </span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5 rounded border border-emerald-900/50 bg-emerald-950/50 px-2 py-1 text-emerald-400">
              <span aria-hidden>🔒</span>
              <span>SECURE SESSION</span>
              <ContextualHelpTrigger
                featureId="auth-001"
                title="Dynamic Access Badge & Header Router"
                location="Pinned permanently to the slate bar running across the very top margin of your screen."
                purpose="Authenticates user keys, provides single-click dashboard routing, and ensures security tokens remain isolated."
                steps={[
                  "Look at the top left header to confirm the green pulsing indicator is active.",
                  "Click '➔ BACK TO DASHBOARD' from any documentation page to instantly return to your active workspace layout.",
                ]}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={userLoading}
              className="px-1 py-1 text-slate-500 transition-colors hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              title="Logout"
            >
              LOGOUT ➔
            </button>
          </div>
        </div>
      </div>

      <div className={`relative ${LAYOUT_SUBNAV_HEADER_Z_CLASS} flex h-10 items-center justify-between border-b border-slate-800 bg-slate-900 px-4`}>
        <div className="flex h-full items-center gap-3">
          <TenantSwitcher />
          {/* # MAGNITUDE_SELECTOR — global currency scale toggle (AUTO, K, M, B, T) */}
          {/* # GLOBAL_CURRENCY_SELECTOR — tenant-scoped currency scaling control */}
          <div className={`relative ${LAYOUT_SUBNAV_HEADER_Z_CLASS} flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-300`}>
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

      <HeaderTwo onVendorDownload={handleVendorDownload} />

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