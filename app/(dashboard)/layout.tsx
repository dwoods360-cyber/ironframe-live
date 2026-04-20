import type { ReactNode } from "react";

/**
 * Route group for dashboard-adjacent pages. URL paths are unchanged (groups are not segments).
 * Root `app/layout.tsx` applies `AppShell` to all routes; simulation airlock + TopNav offset live there
 * so `/`, tenant routes, and `(dashboard)/*` share one master toggle (`systemConfigStore.isSimulationMode`).
 */
export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return children;
}
