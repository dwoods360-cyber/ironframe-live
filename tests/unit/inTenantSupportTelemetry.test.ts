import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  buildInTenantSupportTelemetry,
  formatInTenantSupportTelemetryForCrm,
} from "@/app/lib/server/inTenantSupportTelemetry";

vi.mock("@/lib/prisma", () => ({
  default: {
    tenant: {
      findUnique: vi.fn(),
    },
    tenantBilling: {
      findUnique: vi.fn(),
    },
    company: {
      count: vi.fn(),
    },
    userRoleAssignment: {
      findMany: vi.fn(),
    },
    ironguardViolation: {
      count: vi.fn(),
    },
    systemHealthLog: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/app/lib/ironquery/resolveIronqueryExportScope", () => ({
  resolveIronqueryExportScope: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { resolveIronqueryExportScope } from "@/app/lib/ironquery/resolveIronqueryExportScope";

const TENANT_UUID = "7a45465a-0905-4868-abcf-7ccac06939c1";

describe("inTenantSupportTelemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: TENANT_UUID,
      slug: "run4b",
      name: "Run 4B Golden Path",
      ale_baseline: 1000000000000n,
      isUnderTargetedSiege: false,
    } as never);
    vi.mocked(resolveIronqueryExportScope).mockResolvedValue({
      tenantId: TENANT_UUID,
      exportKey: "run4b",
      aleBaselineCents: 1000000000000n,
    });
    vi.mocked(prisma.tenantBilling.findUnique).mockResolvedValue({ status: "ACTIVE" } as never);
    vi.mocked(prisma.company.count).mockResolvedValue(1);
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([{ role: "ANALYST" }] as never);
    vi.mocked(prisma.ironguardViolation.count).mockResolvedValue(0);
    vi.mocked(prisma.systemHealthLog.count).mockResolvedValue(2);
  });

  it("builds tenant-scoped forensic telemetry with export and billing state", async () => {
    const telemetry = await buildInTenantSupportTelemetry({
      tenantUuid: TENANT_UUID,
      userId: "user_01",
      userEmail: "operator@example.com",
      clientContext: { surface: "export-scope", path: "/exports" },
    });

    expect(telemetry).not.toBeNull();
    expect(telemetry?.tenant.slug).toBe("run4b");
    expect(telemetry?.billing.exportEntitled).toBe(true);
    expect(telemetry?.profileScope.exportScopeReady).toBe(true);
    expect(telemetry?.client.surface).toBe("export-scope");
    expect(telemetry?.client.path).toBe("/exports");
  });

  it("formats CRM summary with slug and forensic fields", async () => {
    const telemetry = await buildInTenantSupportTelemetry({
      tenantUuid: TENANT_UUID,
      userEmail: "operator@example.com",
    });
    expect(telemetry).not.toBeNull();

    const summary = formatInTenantSupportTelemetryForCrm(telemetry!);
    expect(summary).toContain("Forensic Telemetry");
    expect(summary).toContain("run4b");
    expect(summary).toContain("exportEntitled=true");
  });
});
