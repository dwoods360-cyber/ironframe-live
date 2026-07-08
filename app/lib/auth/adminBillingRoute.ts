/** Internal billing entitlement console — GLOBAL_ADMIN or designated BUSINESS_ADMIN. */
export const ADMIN_BILLING_PATH = "/admin/billing";

export function isAdminBillingPath(pathname: string): boolean {
  return pathname === ADMIN_BILLING_PATH || pathname.startsWith(`${ADMIN_BILLING_PATH}/`);
}
