"use client";

import type { ReactNode } from "react";
import AppShell from "@/app/components/AppShell";

/**
 * Dashboard route-group command center frame — TopNav, airlock banner, and telemetry polls.
 * Kept out of root `app/layout.tsx` so public `/login` never mounts workspace chrome.
 */
export default function DashboardCommandCenterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--bg-primary)]">
      <AppShell>{children}</AppShell>
    </div>
  );
}
