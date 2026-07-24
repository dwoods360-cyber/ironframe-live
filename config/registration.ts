/**
 * Invite-only onboarding gate — single source of truth for prospect-facing registration.
 * Override via env is intentionally NOT supported; sales-assisted intake uses `/api/register/sales-intake`.
 */

/** Hardcoded per Phase 1 sales-assisted architecture (not env-driven). */
export const IRONFRAME_PUBLIC_REGISTRATION_ENABLED = false as const;

export const SALES_CONTACT_PATH = "/register/contact";

export const PUBLIC_REGISTRATION_SETUP_PATH = "/register/setup";
export const PUBLIC_DEMO_REGISTRATION_PATH = "/register/demo";
export const PUBLIC_REGISTRATION_API_PATH = "/api/register/public-intake";
export const SALES_INTAKE_API_PATH = "/api/register/sales-intake";
export const PUBLIC_LEAD_API_PATH = "/api/register/public-lead";

/**
 * When public registration is off, keep self-serve workspace setup blocked.
 * `/register/demo` redirects to sales contact. Client-only `/demo/*` remains reachable only
 * after guided `/product-demo` initializes a mock session (no tenant provisioning).
 */
export const BLOCK_DEMO_SANDBOX_WHEN_REGISTRATION_DISABLED = false;

export function isPublicRegistrationEnabled(): boolean {
  return IRONFRAME_PUBLIC_REGISTRATION_ENABLED;
}

export function isBlockedProspectRegistrationPath(pathname: string): boolean {
  return pathname === PUBLIC_REGISTRATION_SETUP_PATH;
}

export function isPublicRegistrationIntakeApiPath(pathname: string): boolean {
  return pathname === PUBLIC_REGISTRATION_API_PATH;
}

export function isDemoSandboxAppPath(pathname: string): boolean {
  return pathname === "/demo" || pathname.startsWith("/demo/");
}

export function shouldBlockProspectIngress(pathname: string): boolean {
  if (isPublicRegistrationEnabled()) return false;
  if (isBlockedProspectRegistrationPath(pathname)) return true;
  if (isPublicRegistrationIntakeApiPath(pathname)) return true;
  if (BLOCK_DEMO_SANDBOX_WHEN_REGISTRATION_DISABLED && isDemoSandboxAppPath(pathname)) {
    return true;
  }
  return false;
}
