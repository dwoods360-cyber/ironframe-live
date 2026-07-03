import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");
const API_ROOT = join(REPO_ROOT, "app", "api");

/** Mandatory Irongate DMZ sanitization / tenant guard markers. */
const IRONGATE_DMZ_MARKERS = [
  "ingressGateway",
  "validateIngressContext",
  "irongateShield",
  "IronGate",
  "sanitizeThreatIngressPayload",
  "sanitizeIngressPayload",
  "assertIronguardApiTenantOr403",
  "assertAuthenticatedIronguardTenantOr403",
  "ironguardApiGuard",
  "tenantMembershipGuard",
  "checkCronBearerAuth",
  "cronBearerUnauthorizedResponse",
  "threatIngressSchema",
  "cronRouteShell",
  "ingressSanitizerFailureResponse",
  "readSimulationPlaneEnabled",
  "ingressUsesRiskEventTable",
  "getActiveTenantUuidFromCookies",
  "getCompanyIdForActiveTenant",
  "checkBoardFeedAuth",
  "runAuditedThreatEventWormBypass",
  "assertTenantFeatureEntitled",
  "requirePlatformAdministrator",
  "platformAdminAccess",
  "authorizeRequest",
  "requireSystemOwnerSession",
] as const;

/** Routes exempt from DMZ marker requirement (token-gated cron, webhooks, auth callbacks). */
const EXEMPT_ROUTE_SUFFIXES = [
  `${sep}internal${sep}cron${sep}`,
  `${sep}webhooks${sep}`,
  `${sep}billing${sep}webhook${sep}`,
  `${sep}auth${sep}`,
  `${sep}internal${sep}platform-admin-gate${sep}`,
  `${sep}internal${sep}quarantine-evaluate${sep}`,
  `${sep}internal${sep}operational-freeze-status${sep}`,
  `${sep}internal${sep}stale-lockdown-status${sep}`,
  `${sep}internal${sep}ironguard-violation${sep}`,
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

function usesPrismaClient(source: string): boolean {
  return (
    /from\s+['"]@\/lib\/prisma['"]/.test(source) ||
    /from\s+['"]@\/lib\/prisma\.js['"]/.test(source) ||
    /import\s+prisma\s+from\s+['"]@\/lib\/prisma['"]/.test(source)
  );
}

function hasIrongateDmzMarker(source: string): boolean {
  return IRONGATE_DMZ_MARKERS.some((marker) => source.includes(marker));
}

function isExemptRoute(filePath: string): boolean {
  const normalized = filePath.split("/").join(sep);
  return EXEMPT_ROUTE_SUFFIXES.some((suffix) => normalized.includes(suffix));
}

describe("Irongate gateway shield — API Prisma ingress policy", () => {
  it("requires DMZ sanitization markers on Prisma-importing API routes", () => {
    const routeFiles = collectRouteFiles(API_ROOT);
    expect(routeFiles.length).toBeGreaterThan(10);

    const violations: string[] = [];

    for (const file of routeFiles) {
      const source = readFileSync(file, "utf8");
      if (!usesPrismaClient(source)) continue;
      if (isExemptRoute(file)) continue;
      if (hasIrongateDmzMarker(source)) continue;

      violations.push(relative(REPO_ROOT, file));
    }

    expect(
      violations,
      `Prisma-importing API routes must pass through Irongate DMZ layers (or be cron/webhook exempt):\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});
