"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import TopNav from "@/app/components/TopNav";
import AgentInspectShell from "@/app/components/grc/AgentInspectShell";
import AirlockBanner from "@/app/components/ui/AirlockBanner";
import { layoutContentShellClass } from "@/app/config/layoutConstants";
import { hydrateSystemConfig, useSystemConfigStore } from "@/app/store/systemConfigStore";
import { useKimbotPersistLoop } from "@/app/hooks/useKimbotPersistLoop";
import { useResilienceIntelPoll } from "@/app/hooks/useResilienceIntelPoll";
import { useIronwatchTelemetryFeed } from "@/app/hooks/useIronwatchTelemetryFeed";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isThreatDetailPage = pathname.startsWith("/threats/");
  const isBoardReport = pathname === "/board-report" || pathname.startsWith("/board-report/");
  const isDocsPage = pathname === "/docs" || pathname.startsWith("/docs/");
  const isSimulationMode = useSystemConfigStore().isSimulationMode;
  const contentShell = layoutContentShellClass(isSimulationMode);

  useKimbotPersistLoop();
  useResilienceIntelPoll();
  useIronwatchTelemetryFeed(true);

  useEffect(() => {
    hydrateSystemConfig();
  }, []);

  if (isThreatDetailPage) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AirlockBanner />
        <div
          className={`command-center-surface flex min-h-0 flex-1 flex-col overflow-y-auto ${isSimulationMode ? "pt-9" : ""}`}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={isBoardReport ? "print:hidden" : undefined}>
        <AirlockBanner />
      </div>
      <div
        className={`fixed inset-x-0 z-50 ${isSimulationMode ? "top-9" : "top-0"} ${
          isBoardReport ? "print:hidden" : ""
        }`}
      >
        <TopNav />
      </div>
      <div
        className={`command-center-surface flex min-h-0 flex-col overflow-x-hidden ${
          isBoardReport
            ? "mt-0 min-h-screen flex-1 print:mt-0 print:h-auto print:min-h-screen print:overflow-visible"
            : `${contentShell.marginTop} ${contentShell.height}`
        }`}
      >
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${
            isDocsPage || isBoardReport ? "overflow-y-auto" : "overflow-hidden"
          } ${isBoardReport ? "print:overflow-visible print:overflow-y-visible" : ""}`}
        >
          {children}
        </div>
      </div>
      <AgentInspectShell />
    </div>
  );
}
