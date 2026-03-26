/** Fired after ledger writes so client dashboards refetch merged public + DMZ audit data. */
export const DASHBOARD_AUDIT_REFRESH_EVENT = "ironframe:dashboard-refresh" as const;

export function requestDashboardAuditRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DASHBOARD_AUDIT_REFRESH_EVENT));
}
