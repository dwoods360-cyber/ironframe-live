import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import { formatLocalTenantWorkspaceUrl } from "@/app/lib/tenantSubdomain";
import {
  DEMO_ACTIVE_COOKIE,
  DEMO_ALE_BASELINE_CENTS,
  DEMO_ALE_BASELINE_DISPLAY,
  DEMO_ENCLAVE_UUID,
  DEMO_INDUSTRY_UUIDS,
  DEMO_ORG_NAME,
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_STORAGE_KEY,
  DEMO_WORKSPACE_SLUG,
  isDemoPath,
  isDemoPublicPath,
  isDemoRegistrationPath,
  isDemoSandboxSlug,
} from "@/app/lib/demo/demoModeConstants";
import { seedDemoClientState } from "@/app/lib/demo/seedDemoClientState";

export {
  DEMO_ACTIVE_COOKIE,
  DEMO_ALE_BASELINE_CENTS,
  DEMO_ALE_BASELINE_DISPLAY,
  DEMO_ENCLAVE_UUID,
  DEMO_INDUSTRY_UUIDS,
  DEMO_ORG_NAME,
  DEMO_SESSION_STORAGE_KEY,
  DEMO_WORKSPACE_SLUG,
  isDemoPath,
  isDemoPublicPath,
  isDemoRegistrationPath,
  isDemoSandboxSlug,
};

export type CommandCenterTenantRow = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  aleBaselineCents: string;
};

export type DemoCommandCenterScope = {
  tenants: CommandCenterTenantRow[];
  canAccessGlobal: boolean;
  hostTenantSlug: string | null;
  canSwitchTenantsOnSubdomain: boolean;
};

export type DemoSession = {
  token: string;
  createdAt: string;
  orgName: typeof DEMO_ORG_NAME;
  workspaceSlug: typeof DEMO_WORKSPACE_SLUG;
};

function resolveDemoCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname.toLowerCase();
  if (host === "lvh.me" || host.endsWith(".lvh.me")) return ".lvh.me";
  if (host.endsWith(".localtest.me")) return ".localtest.me";
  return undefined;
}

function setCrossOriginCookie(name: string, value: string, maxAge: number): void {
  const domain = resolveDemoCookieDomain();
  const domainAttr = domain ? `; domain=${domain}` : "";
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${domainAttr}`;
}

function readDemoSessionCookie(): DemoSession | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${DEMO_SESSION_COOKIE}=`));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match.slice(DEMO_SESSION_COOKIE.length + 1));
    return JSON.parse(raw) as DemoSession;
  } catch {
    return null;
  }
}

function isValidDemoToken(token: string | undefined): boolean {
  if (!token?.trim()) return false;
  return token === DEMO_WORKSPACE_SLUG || token.startsWith("demo-");
}

export function readDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Partial<DemoSession>)
      : (readDemoSessionCookie() as Partial<DemoSession> | null);
    if (!parsed || !isValidDemoToken(parsed.token)) return null;
    return {
      token: parsed.token!,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      orgName: DEMO_ORG_NAME,
      workspaceSlug: DEMO_WORKSPACE_SLUG,
    };
  } catch {
    return readDemoSessionCookie();
  }
}

export function writeDemoSession(session: DemoSession): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(session);
  window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, payload);
  const maxAge = 60 * 60 * 24 * 7;
  setCrossOriginCookie(DEMO_ACTIVE_COOKIE, "1", maxAge);
  setCrossOriginCookie(DEMO_SESSION_COOKIE, encodeURIComponent(payload), maxAge);
}

/**
 * Mock-authenticated sandbox bootstrap — bypasses Supabase invite + DB provision.
 */
export function initializeDemoSandbox(): DemoSession {
  const session: DemoSession = {
    token: DEMO_WORKSPACE_SLUG,
    createdAt: new Date().toISOString(),
    orgName: DEMO_ORG_NAME,
    workspaceSlug: DEMO_WORKSPACE_SLUG,
  };
  writeDemoSession(session);
  seedDemoClientState();
  return session;
}

export function ensureDemoSession(): DemoSession {
  const existing = readDemoSession();
  if (existing) return existing;
  return initializeDemoSandbox();
}

export function isDemoModeActive(): boolean {
  if (typeof window === "undefined") return false;
  if (readDemoSession()) return true;
  return document.cookie.includes(`${DEMO_ACTIVE_COOKIE}=1`);
}

export function clearDemoSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
  const domain = resolveDemoCookieDomain();
  const domainAttr = domain ? `; domain=${domain}` : "";
  document.cookie = `${DEMO_ACTIVE_COOKIE}=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
  document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
}

/** Dev: tenant subdomain dashboard; localhost: same-origin demo route. */
export function buildDemoDashboardUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
      return "/demo/dashboard";
    }
  }
  return `${formatLocalTenantWorkspaceUrl(DEMO_WORKSPACE_SLUG)}/dashboard`;
}

export function getDemoCommandCenterScope(): DemoCommandCenterScope {
  const medshieldCents = TENANT_INDUSTRY_BASELINE_ALE_CENTS.medshield;
  const vaultbankCents = TENANT_INDUSTRY_BASELINE_ALE_CENTS.vaultbank;
  const gridcoreCents = TENANT_INDUSTRY_BASELINE_ALE_CENTS.gridcore;
  const aggregateCents = medshieldCents + vaultbankCents + gridcoreCents;

  return {
    tenants: [
      {
        id: DEMO_ENCLAVE_UUID,
        name: DEMO_ORG_NAME,
        slug: DEMO_WORKSPACE_SLUG,
        industry: "Corporate",
        aleBaselineCents: aggregateCents.toString(),
      },
      {
        id: DEMO_INDUSTRY_UUIDS.medshield,
        name: "Medshield",
        slug: "medshield",
        industry: "Healthcare",
        aleBaselineCents: medshieldCents.toString(),
      },
      {
        id: DEMO_INDUSTRY_UUIDS.vaultbank,
        name: "Vaultbank",
        slug: "vaultbank",
        industry: "Finance",
        aleBaselineCents: vaultbankCents.toString(),
      },
      {
        id: DEMO_INDUSTRY_UUIDS.gridcore,
        name: "Gridcore",
        slug: "gridcore",
        industry: "Infrastructure",
        aleBaselineCents: gridcoreCents.toString(),
      },
    ],
    canAccessGlobal: false,
    hostTenantSlug: null,
    canSwitchTenantsOnSubdomain: true,
  };
}

export const DEMO_API_BLOCK_MESSAGE =
  "[ DEMO MODE ] | Production telemetry isolated — API call blocked.";
