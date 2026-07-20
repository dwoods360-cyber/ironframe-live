import { afterEach, describe, expect, it } from "vitest";

import {
  redactOperationsHubSnapshot,
  redactSuccessTeamPortalSnapshot,
  resolveOperationsCrmScopeSlug,
} from "@/app/lib/server/operationsApiRedaction";
import type { OperationsHubSnapshot } from "@/app/lib/server/operationsHubCore";

describe("operationsApiRedaction", () => {
  const originalCrmScope = process.env.IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalRequireScope = process.env.IRONFRAME_REQUIRE_OPERATIONS_CRM_SCOPE;

  afterEach(() => {
    if (originalCrmScope === undefined) delete process.env.IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG;
    else process.env.IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG = originalCrmScope;
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
    if (originalRequireScope === undefined) delete process.env.IRONFRAME_REQUIRE_OPERATIONS_CRM_SCOPE;
    else process.env.IRONFRAME_REQUIRE_OPERATIONS_CRM_SCOPE = originalRequireScope;
  });

  it("resolveOperationsCrmScopeSlug rejects malformed client-style slugs via env validation", () => {
    delete process.env.VERCEL_ENV;
    delete process.env.IRONFRAME_REQUIRE_OPERATIONS_CRM_SCOPE;
    delete process.env.IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG;
    const slug = resolveOperationsCrmScopeSlug();
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("resolveOperationsCrmScopeSlug requires env in production", () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG;
    expect(() => resolveOperationsCrmScopeSlug()).toThrow(/IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG/);
  });

  it("resolveOperationsCrmScopeSlug uses configured production slug", () => {
    process.env.VERCEL_ENV = "production";
    process.env.IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG = "pilot1";
    expect(resolveOperationsCrmScopeSlug()).toBe("pilot1");
  });

  it("redactOperationsHubSnapshot strips tenant ids and worker infra urls", () => {
    const snapshot = {
      generatedAt: "2026-07-07T00:00:00.000Z",
      approvals: { total: 0, byKind: { SUPPORT: 0, SALES: 0, CUSTOMER_SUCCESS: 0 } },
      crm: { totalDeals: 0, totalContacts: 0, byStage: {} as never, recentSuspects: [] },
      briefings: {
        queueDrafts: [],
        published: [
          {
            slug: "brief-1",
            title: "Brief",
            publishedAt: "2026-07-07T00:00:00.000Z",
            tenantId: "11111111-1111-4111-8111-111111111111",
          },
        ],
      },
      newsletters: {
        rssFeedUrl: "/rss.xml",
        rssItemCount: 0,
        compiledCount: 0,
        pendingSyndicationCount: 0,
        editions: [
          {
            slug: "edition-1",
            title: "Edition",
            publishedAt: "2026-07-07T00:00:00.000Z",
            syndicated: true,
            htmlPath: "/secret/path/edition-1.html",
            htmlModifiedAt: "2026-07-07T00:00:00.000Z",
          },
        ],
      },
      schedule: {
        activities: [],
        dueSoonCount: 0,
        overdueCount: 0,
        openCount: 0,
      },
      workforce: [
        {
          id: "ironboard",
          label: "Ironboard",
          port: 8082,
          healthUrl: "http://127.0.0.1:8082/health",
          consoleUrl: "http://127.0.0.1:8082/",
          portalUrl: "/dashboard/operations/ironboard",
          role: "boardroom",
          reachable: true,
          status: "OK",
          latencyMs: 12,
        },
      ],
      quickLinks: [
        { label: "Support portal", href: "/dashboard/support" },
        { label: "Ops hub", href: "/dashboard/operations" },
      ],
    } satisfies OperationsHubSnapshot;

    const redacted = redactOperationsHubSnapshot(snapshot);
    expect(redacted.briefings.published[0]).not.toHaveProperty("tenantId");
    expect(redacted.workforce[0]).not.toHaveProperty("healthUrl");
    expect(redacted.workforce[0]).not.toHaveProperty("consoleUrl");
    expect(redacted.newsletters.editions[0]?.htmlPath).toBe("[server-artifact]");
    expect(redacted.quickLinks.some((link) => link.href === "/dashboard/support")).toBe(false);
  });

  it("redactSuccessTeamPortalSnapshot removes tenant slug and tenant ids", () => {
    const redacted = redactSuccessTeamPortalSnapshot({
      generatedAt: "2026-07-07T00:00:00.000Z",
      tenantSlug: "medshield",
      worker: { reachable: true, healthUrl: "http://127.0.0.1:8085/health", status: "OK" },
      accounts: [
        {
          dealId: "deal-1",
          contactId: "contact-1",
          tenantId: "11111111-1111-4111-8111-111111111111",
          stage: "CLOSED_WON",
          dealTitle: "Deal",
          valueCents: "100",
          company: "Co",
          fullName: "Name",
          email: "a@b.com",
          phone: null,
          industrySector: null,
          updatedAt: "2026-07-07T00:00:00.000Z",
          lastInteractionAt: null,
          daysSinceInteraction: null,
        },
      ],
      healthByDealId: {
        "deal-1": {
          dealId: "deal-1",
          tenantId: "11111111-1111-4111-8111-111111111111",
          contactId: "contact-1",
          stage: "CLOSED_WON",
          valueCents: "100",
          industrySector: null,
          healthScore: 80,
          healthBand: "healthy",
          signals: [],
          pilotMetadata: null,
          lastInteractionAt: null,
          daysSinceInteraction: null,
          polledAt: "2026-07-07T00:00:00.000Z",
        },
      },
      polledAt: "2026-07-07T00:00:00.000Z",
    });

    expect(redacted).not.toHaveProperty("tenantSlug");
    expect(redacted.crmScope).toBe("platform-default");
    expect(redacted.accounts[0]).not.toHaveProperty("tenantId");
    expect(redacted.healthByDealId["deal-1"]).not.toHaveProperty("tenantId");
  });
});
