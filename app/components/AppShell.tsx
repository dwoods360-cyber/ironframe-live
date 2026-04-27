"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import TopNav from "@/app/components/TopNav";
import AirlockBanner from "@/app/components/ui/AirlockBanner";
import { hydrateSystemConfig, useSystemConfigStore } from "@/app/store/systemConfigStore";
import { useKimbotPersistLoop } from "@/app/hooks/useKimbotPersistLoop";
import { useResilienceIntelPoll } from "@/app/hooks/useResilienceIntelPoll";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isThreatDetailPage = pathname.startsWith("/threats/");
  const isBoardReport = pathname === "/board-report" || pathname.startsWith("/board-report/");
  const isSimulationMode = useSystemConfigStore().isSimulationMode;

  useKimbotPersistLoop();
  useResilienceIntelPoll();

  useEffect(() => {
    hydrateSystemConfig();
  }, []);

  if (isThreatDetailPage) {
    return (
      <>
        <AirlockBanner />
        <main
          className={`command-center-surface mt-0 h-screen overflow-y-auto ${isSimulationMode ? "pt-9" : ""}`}
        >
          {children}
        </main>
      </>
    );
  }

  return (
    <>
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
      <main
        className={`command-center-surface overflow-y-auto ${
          isSimulationMode ? "mt-[144px] h-[calc(100vh-144px)]" : "mt-[108px] h-[calc(100vh-108px)]"
        } ${isBoardReport ? "print:mt-0 print:h-auto print:min-h-screen print:overflow-visible" : ""}`}
      >
        {children}
      </main>
    </>
  );
}
