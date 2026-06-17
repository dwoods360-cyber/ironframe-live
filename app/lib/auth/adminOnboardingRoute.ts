/** Internal GLOBAL_ADMIN onboarding console (not public). */
export const ADMIN_ONBOARDING_PATH = "/admin/onboarding";

export function isAdminOnboardingPath(pathname: string): boolean {
  return pathname === ADMIN_ONBOARDING_PATH || pathname.startsWith(`${ADMIN_ONBOARDING_PATH}/`);
}
