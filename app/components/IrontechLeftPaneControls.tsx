"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Folder } from "lucide-react";
import IrontechChaosDeploy from "@/app/(dashboard)/opsupport/IrontechChaosDeploy";
import ControlRoom from "@/app/components/ControlRoom";
import { LeftPanelFeatureTitle } from "@/app/components/leftPanel/LeftPanelFeatureIndex";
import { LP_FEATURE } from "@/app/config/leftPanelFeatureIndex";
import { useTenantContext } from "@/app/context/TenantProvider";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import {
  dispatchSimNavFocus,
  isDashboardHomePath,
  prepareSimulationNavTransition,
  queueSimNavFocus,
  resolveSettingsConfigHref,
  type SimNavFocusTarget,
} from "@/app/utils/simulationNavFocus";

type LeftPaneNavItem = {
  key: string;
  href: string;
  labelLive: string;
  labelShadow: string;
  titleLive?: string;
  titleShadow?: string;
  showFolderIcon?: boolean;
  shadowFocusTarget?: SimNavFocusTarget;
  /** Route used when shadow focus must navigate before scrolling. */
  shadowFallbackHref?: string;
};

const LEFT_PANE_NAV: readonly LeftPaneNavItem[] = [
  {
    key: "dashboard",
    href: "/",
    labelLive: "Dashboard",
    labelShadow: "Sim-Deck",
    shadowFocusTarget: "sim-deck",
    shadowFallbackHref: "/",
  },
  {
    key: "reports",
    href: "/reports/ops",
    labelLive: "Reports",
    labelShadow: "Drill Metrics",
    shadowFocusTarget: "drill-metrics",
    shadowFallbackHref: "/",
  },
  {
    key: "vault",
    href: "/vault",
    labelLive: "Vault",
    labelShadow: "Sandbox Vault",
    titleLive: "Evidence Vault",
    titleShadow: "Sandbox Vault",
    showFolderIcon: true,
  },
  {
    key: "integrity",
    href: "/integrity",
    labelLive: "Integrity hub",
    labelShadow: "Chaos Validator",
    titleLive: "LKG workforce inventory and BigInt ALE hero metrics",
    titleShadow: "Chaos Deploy and synthetic target registries",
    shadowFocusTarget: "chaos-validator",
    shadowFallbackHref: "/",
  },
  {
    key: "settings",
    href: "/settings/config",
    labelLive: "Settings",
    labelShadow: "Simulation Config",
    titleLive: "System configuration and notification registry",
    titleShadow: "Simulation automation and endpoint registry",
  },
] as const;

function navLinkClass(isSimulationActive: boolean): string {
  return isSimulationActive
    ? "transition-colors text-orange-500 hover:text-orange-400"
    : "transition-colors text-emerald-400 hover:text-emerald-500";
}

function folderIconClass(isSimulationActive: boolean): string {
  return isSimulationActive
    ? "h-3.5 w-3.5 shrink-0 text-orange-500/90"
    : "h-3.5 w-3.5 shrink-0 text-emerald-400/90";
}

/**
 * Dashboard left-rail control deck: quick links (always) + chaos deploy when simulation mode is on.
 */
export default function IrontechLeftPaneControls() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { activeTenantKey } = useTenantContext();
  const isSimulationActive = useSystemConfigStore().isSimulationMode;
  const linkClass = navLinkClass(isSimulationActive);
  const statusDotClass = isSimulationActive
    ? "h-2 w-2 animate-pulse rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"
    : "h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]";

  const settingsHref = resolveSettingsConfigHref(activeTenantKey);

  function resolveNavHref(item: LeftPaneNavItem): string {
    if (item.key === "settings") return settingsHref;
    return item.href;
  }

  function beginSimulationNav(event?: MouseEvent<HTMLAnchorElement>): void {
    prepareSimulationNavTransition();
    event?.preventDefault();
  }

  function handleShadowFocusNav(
    event: MouseEvent<HTMLAnchorElement>,
    focusTarget: SimNavFocusTarget,
    fallbackHref: string,
  ): void {
    beginSimulationNav(event);
    if (isDashboardHomePath(pathname)) {
      dispatchSimNavFocus(focusTarget);
      return;
    }
    queueSimNavFocus(focusTarget);
    router.push(fallbackHref);
  }

  function handleSimulationRouteNav(event: MouseEvent<HTMLAnchorElement>, href: string): void {
    if (!isSimulationActive) return;
    beginSimulationNav(event);
    router.push(href);
  }

  return (
    <section
      className="border-b border-zinc-900 bg-[#050509] p-4"
      data-simulation-nav={isSimulationActive ? "shadow" : "live"}
    >
      <div className="mb-3 flex items-center justify-between">
        <LeftPanelFeatureTitle
          index={LP_FEATURE.CONTROL_ROOM_HEADER}
          as="h2"
          className="text-[11px] font-black uppercase tracking-widest text-zinc-300"
        >
          CONTROL ROOM
        </LeftPanelFeatureTitle>
        <span className={statusDotClass} aria-hidden />
      </div>
      <div className="mb-1">
        <LeftPanelFeatureTitle
          index={LP_FEATURE.QUICK_NAV}
          className="text-[7px] font-black uppercase tracking-[0.16em] text-zinc-600"
        >
          Quick nav
        </LeftPanelFeatureTitle>
      </div>
      <nav
        className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[9px] font-black uppercase tracking-widest"
        aria-label={isSimulationActive ? "Simulation deck navigation" : "Command deck navigation"}
      >
        {LEFT_PANE_NAV.map((item) => {
          const label = isSimulationActive ? item.labelShadow : item.labelLive;
          const displayLabel = isSimulationActive ? `[ ${label} ]` : label;
          const title = isSimulationActive ? item.titleShadow : item.titleLive;
          const href = resolveNavHref(item);
          const focusTarget = item.shadowFocusTarget;
          const useShadowFocus = isSimulationActive && focusTarget != null;

          const onClick = useShadowFocus
            ? (event: MouseEvent<HTMLAnchorElement>) => {
                handleShadowFocusNav(
                  event,
                  focusTarget,
                  item.shadowFallbackHref ?? item.href,
                );
              }
            : isSimulationActive
              ? (event: MouseEvent<HTMLAnchorElement>) => {
                  handleSimulationRouteNav(event, href);
                }
              : undefined;

          return (
            <Link
              key={item.key}
              href={href}
              className={item.showFolderIcon ? `inline-flex items-center gap-1 ${linkClass}` : linkClass}
              title={title}
              onClick={onClick}
            >
              {item.showFolderIcon ? (
                <Folder className={folderIconClass(isSimulationActive)} aria-hidden />
              ) : null}
              {displayLabel}
            </Link>
          );
        })}
      </nav>

      <div className="mt-1 w-full min-w-0 max-w-full">
        <ControlRoom>
          {isSimulationActive ? (
            <div data-sim-nav-target="chaos-validator" tabIndex={-1} className="outline-none">
              <IrontechChaosDeploy embedded featureIndex={LP_FEATURE.CHAOS_DEPLOY} />
            </div>
          ) : null}
        </ControlRoom>
      </div>
    </section>
  );
}
