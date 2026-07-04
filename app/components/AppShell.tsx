"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import TopNav from "@/app/components/TopNav";
import AgentInspectShell from "@/app/components/grc/AgentInspectShell";
import TrainerAgentDrawer from "@/app/components/trainer/TrainerAgentDrawer";
import VendorHeaderToolbarBridge from "@/app/components/vendor-risk/VendorHeaderToolbarBridge";
import AirlockBanner from "@/app/components/ui/AirlockBanner";
import { layoutContentShellClass } from "@/app/config/layoutConstants";
import { isScrollableStandalonePath } from "@/app/utils/grcRouteMatch";
import DemoSandboxBanner from "@/app/components/demo/DemoSandboxBanner";
import { isDemoModeActive } from "@/app/lib/demo/demoMode";
import { isDemoRouteGroupPath } from "@/app/utils/grcRouteMatch";
import { hydrateSystemConfig, useSystemConfigStore } from "@/app/store/systemConfigStore";
import { useKimbotPersistLoop } from "@/app/hooks/useKimbotPersistLoop";
import { useResilienceIntelPoll } from "@/app/hooks/useResilienceIntelPoll";
import { useIronwatchTelemetryFeed } from "@/app/hooks/useIronwatchTelemetryFeed";
import RouteNavigationProgress from "@/app/components/navigation/RouteNavigationProgress";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isThreatDetailPage = pathname.startsWith("/threats/");
  const isBoardReport = pathname === "/board-report" || pathname.startsWith("/board-report/");
  const isScrollableStandalonePage = isScrollableStandalonePath(pathname);
  const isSimulationMode = useSystemConfigStore().isSimulationMode;
  const demoSandbox = isDemoRouteGroupPath(pathname) || isDemoModeActive();
  const topBannerOffset = demoSandbox || isSimulationMode;
  const contentShell = layoutContentShellClass(topBannerOffset);

  useKimbotPersistLoop();
  useResilienceIntelPoll();
  useIronwatchTelemetryFeed(!demoSandbox);

  useEffect(() => {
    hydrateSystemConfig();
  }, []);

  if (isThreatDetailPage) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <RouteNavigationProgress />
        <div className={isBoardReport ? "print:hidden" : undefined}>
          {demoSandbox ? <DemoSandboxBanner /> : null}
          <AirlockBanner />
        </div>
        <div
          className={`fixed inset-x-0 z-50 ${
            demoSandbox && isSimulationMode
              ? "top-[4.5rem]"
              : demoSandbox || isSimulationMode
                ? "top-9"
                : "top-0"
          } ${isBoardReport ? "print:hidden" : ""}`}
        >
          <TopNav />
        </div>
        <div
          className={`command-center-surface flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--bg-primary)] ${contentShell.paddingTop} ${topBannerOffset ? (demoSandbox && isSimulationMode ? "pt-[4.5rem]" : "pt-9") : ""}`}
        >
          {children}
        </div>
        <AgentInspectShell />
        <TrainerAgentDrawer />
        <VendorHeaderToolbarBridge />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <RouteNavigationProgress />
      <div className={isBoardReport ? "print:hidden" : undefined}>
        {demoSandbox ? <DemoSandboxBanner /> : null}
        <AirlockBanner />
      </div>
      <div
        className={`fixed inset-x-0 z-50 ${
          demoSandbox && isSimulationMode
            ? "top-[4.5rem]"
            : demoSandbox || isSimulationMode
              ? "top-9"
              : "top-0"
        } ${isBoardReport ? "print:hidden" : ""}`}
      >
        <TopNav />
      </div>
      <div
        className={`command-center-surface flex min-h-0 flex-col overflow-x-hidden bg-[var(--bg-primary)] ${contentShell.paddingTop} ${contentShell.height} ${
          topBannerOffset ? (demoSandbox && isSimulationMode ? "pt-[4.5rem]" : "pt-9") : ""
        } ${isBoardReport ? "print:mt-0 print:h-auto print:min-h-screen print:overflow-visible" : ""}`}
      >
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${
            isScrollableStandalonePage
              ? "overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable] custom-scrollbar"
              : "overflow-hidden"
          } ${isBoardReport ? "print:overflow-visible print:overflow-y-visible" : ""}`}
        >
          {children}
        </div>
      </div>
      <AgentInspectShell />
      <TrainerAgentDrawer />
      <VendorHeaderToolbarBridge />
    </div>
  );
}
