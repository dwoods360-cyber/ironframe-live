import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");
const API_ROOT = join(REPO_ROOT, "app", "api");

/** Routes that resolve tenant scope from session/header/cookie for operator or bot traffic. */
const TENANT_SCOPE_MARKERS = [
  "getActiveTenantUuidFromCookies",
  "getCompanyIdForActiveTenant",
  'headers.get("x-tenant-id")',
  "headers.get('x-tenant-id')",
  "assertIronguardApiTenantOr403",
] as const;

/** Satisfies tenant RBAC without per-route assignment lookup (service / owner / admin paths). */
const MEMBERSHIP_ALTERNATIVE_MARKERS = [
  "assertAuthenticatedIronguardTenantOr403",
  "requirePlatformAdministrator",
  "requireSystemOwnerSession",
  "checkCronBearerAuth",
  "checkBoardFeedAuth",
  "authorizeRequest",
  "assertInternalGatewayAuth",
  "authorizeRequest",
  "requireSystemOwnerSession",
] as const;

const EXEMPT_ROUTE_SUFFIXES = [
  `${sep}internal${sep}cron${sep}`,
  `${sep}internal${sep}ironquery${sep}`,
  `${sep}internal${sep}platform-admin-gate${sep}`,
  `${sep}internal${sep}quarantine-evaluate${sep}`,
  `${sep}internal${sep}operational-freeze-status${sep}`,
  `${sep}internal${sep}stale-lockdown-status${sep}`,
  `${sep}internal${sep}ironguard-violation${sep}`,
  `${sep}webhooks${sep}`,
  `${sep}billing${sep}webhook${sep}`,
  `${sep}auth${sep}`,
  `${sep}register${sep}`,
  `${sep}public${sep}`,
  `${sep}health${sep}route.ts`,
  `${sep}admin${sep}purge${sep}`,
  `${sep}admin${sep}approvals${sep}`,
  `${sep}board${sep}feed${sep}`,
  `${sep}cron${sep}narrate${sep}`,
  `${sep}ironquery${sep}export${sep}`,
  `${sep}test-email${sep}`,
] as const;

function collectRouteFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectRouteFiles(full, acc);
      continue;
    }
    if (entry === "route.ts" || entry.endsWith("Route.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

function isExemptRoute(filePath: string): boolean {
  const normalized = filePath.split("/").join(sep);
  return EXEMPT_ROUTE_SUFFIXES.some((suffix) => normalized.includes(suffix));
}

function isTenantScopedRoute(source: string): boolean {
  if (source.includes("assertAuthenticatedIronguardTenantOr403")) {
    return false;
  }
  return TENANT_SCOPE_MARKERS.some((marker) => source.includes(marker));
}

function hasMembershipGateOrAlternative(source: string): boolean {
  return MEMBERSHIP_ALTERNATIVE_MARKERS.some((marker) => source.includes(marker));
}

describe("Tenant membership guard — API route policy", () => {
  it("requires assertAuthenticatedIronguardTenantOr403 or approved service auth on tenant-scoped routes", () => {
    const routeFiles = collectRouteFiles(API_ROOT);
    expect(routeFiles.length).toBeGreaterThan(10);

    const violations: string[] = [];

    for (const file of routeFiles) {
      if (isExemptRoute(file)) continue;

      const source = readFileSync(file, "utf8");
      if (!isTenantScopedRoute(source)) continue;
      if (hasMembershipGateOrAlternative(source)) continue;

      violations.push(relative(REPO_ROOT, file));
    }

    expect(
      violations,
      `Tenant-scoped API routes must call assertAuthenticatedIronguardTenantOr403 (or approved service auth):\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});
