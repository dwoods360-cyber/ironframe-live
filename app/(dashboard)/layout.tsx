import type { ReactNode } from "react";

/**
 * Route group for dashboard-adjacent pages. URL paths are unchanged (groups are not segments).
 * Root `app/layout.tsx` already applies `AppShell` to all routes.
 */
export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return children;
}
