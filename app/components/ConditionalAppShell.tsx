"use client";

import { usePathname } from "next/navigation";
import AppShell from "@/app/components/AppShell";

/**
 * Docs hub ships its own reference-manual chrome; skip Command Center shell + telemetry polls.
 */
export default function ConditionalAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDocsHub = pathname === "/docs" || pathname.startsWith("/docs/");

  if (isDocsHub) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-slate-950">
        {children}
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
