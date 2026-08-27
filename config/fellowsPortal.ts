/** Academic Fellowship portal (Tier 2) — fellows.ironframegrc.com */

export const FELLOWS_PORTAL_ORIGIN =
  process.env.FELLOWS_PORTAL_PUBLIC_ORIGIN?.trim().replace(/\/$/, "") ||
  "https://fellows.ironframegrc.com";

const DEFAULT_FELLOWS_HOSTS = new Set([
  "fellows.ironframegrc.com",
  "lab.ironframegrc.com",
  "fellows.localhost",
  "lab.localhost",
]);

function hostnameFromHostHeader(host: string | null | undefined): string {
  return (host ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
}

export function isFellowsPortalHost(host: string | null | undefined): boolean {
  const hostname = hostnameFromHostHeader(host);
  if (!hostname) return false;
  if (DEFAULT_FELLOWS_HOSTS.has(hostname)) return true;
  const extra = process.env.FELLOWS_PORTAL_HOSTS?.trim();
  if (!extra) return false;
  return extra
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .includes(hostname);
}

/** App Router prefix for apex paths; fellows host rewrites pretty paths here. */
export const FELLOWS_INTERNAL_PREFIX = "/fellows" as const;

/** Shared Phase-1 academic sandbox enclave id (not a production tenant). */
export const FELLOWS_ACADEMIC_SANDBOX_ID = "ironframe-academic-sandbox" as const;

export const FELLOWS_LAB_CLIENT_A = "mssp-client-001" as const;
export const FELLOWS_LAB_CLIENT_B = "mssp-client-002" as const;

export const FELLOWS_SESSION_COOKIE = "ironframe_fellow_session" as const;
