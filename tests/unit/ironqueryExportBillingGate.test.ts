import { beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    tenant: { findUnique: vi.fn() },
    tenantBilling: { findUnique: vi.fn() },
    evidenceArtifact: { findMany: vi.fn() },
  } as any,
}));

const { getSupabaseSessionUser, userHasTenantRoleAssignment } = vi.hoisted(() => ({
  getSupabaseSessionUser: vi.fn(),
  userHasTenantRoleAssignment: vi.fn(),
}));

Object.assign(prismaMock, {
  $transaction: vi.fn(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock)),
  $queryRaw: vi.fn(async () => [{ present: true }]),
  $executeRaw: vi.fn(async () => 1),
});

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/app/utils/serverTenantContext", () => ({
  getActiveTenantUuidFromCookies: vi.fn(),
  isValidTenantUuid: vi.fn((id: string) => /^[0-9a-f-]{36}$/i.test(id)),
}));

vi.mock("@/app/utils/tenantIsolation", () => ({
  tenantKeyFromUuid: vi.fn((id: string) => (id.startsWith("11111111") ? "medshield" : null)),
}));

vi.mock("@/app/lib/auth/platformAdminAccess", () => ({
  canUsePlatformAdminTools: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/app/utils/serverAuth", () => ({ getSupabaseSessionUser }));
vi.mock("@/app/lib/security/tenantMembershipGuard", () => ({ userHasTenantRoleAssignment }));

vi.mock("@/app/services/ironbloom/rateEngine", () => ({
  fetchUtilityRateForAnalystExport: vi.fn().mockResolvedValue({
    unitType: "kWh",
    rateUsdPerUnit: 0.118,
    source: "forensic-estimate",
    jurisdiction: "US",
    polledAt: "2026-06-29T00:00:00.000Z",
  }),
  getLatestUtilityRateForTenant: vi.fn().mockResolvedValue({
    unitType: "kWh",
    rateUsdPerUnit: 0.12,
    source: "mock",
    jurisdiction: "US",
    polledAt: "2026-06-29T00:00:00.000Z",
  }),
}));

import {
  downloadIronqueryAnalystPack,
  getIronqueryExportDashboardContext,
} from "@/app/actions/ironqueryExportActions";
import { TENANT_BILLING_STATUS } from "@/app/lib/billing/constants";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import { fetchUtilityRateForAnalystExport } from "@/app/services/ironbloom/rateEngine";

describe("ironquery export billing perimeter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveTenantUuidFromCookies).mockResolvedValue(TENANT_A);
    getSupabaseSessionUser.mockResolvedValue({ id: "user-1", email: "user@example.test" });
    userHasTenantRoleAssignment.mockResolvedValue(true);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      slug: "abc-co",
      ale_baseline: 0n,
    } as never);
    vi.mocked(prisma.evidenceArtifact.findMany).mockResolvedValue([]);
    vi.mocked(canUsePlatformAdminTools).mockResolvedValue(false);
  });

  it("returns BILLING_HOLD when tenant billing is PENDING", async () => {
    vi.mocked(prisma.tenantBilling.findUnique).mockResolvedValue({
      status: TENANT_BILLING_STATUS.PENDING,
    } as never);

    const context = await getIronqueryExportDashboardContext();
    expect(context).toMatchObject({
      ok: false,
      code: "BILLING_HOLD",
      tenantSlug: "abc-co",
      billingStatus: TENANT_BILLING_STATUS.PENDING,
    });
  });

  it("allows dashboard context when billing is ACTIVE", async () => {
    vi.mocked(prisma.tenantBilling.findUnique).mockResolvedValue({
      status: TENANT_BILLING_STATUS.ACTIVE,
    } as never);

    const context = await getIronqueryExportDashboardContext();
    expect(context).toMatchObject({ ok: true, tenantId: TENANT_A });
    expect(prismaMock.$executeRaw).toHaveBeenCalled();
    expect(prismaMock.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(prisma.evidenceArtifact.findMany).mock.invocationCallOrder[0],
    );
  });

  it("allows provisioned workspace slug when billing is ACTIVE", async () => {
    vi.mocked(getActiveTenantUuidFromCookies).mockResolvedValue(TENANT_B);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      slug: "run2",
      ale_baseline: 100000000n,
    } as never);
    vi.mocked(prisma.tenantBilling.findUnique).mockResolvedValue({
      status: TENANT_BILLING_STATUS.ACTIVE,
    } as never);

    const context = await getIronqueryExportDashboardContext();
    expect(context).toMatchObject({ ok: true, tenantId: TENANT_B });

    const download = await downloadIronqueryAnalystPack("csv");
    expect(download).toMatchObject({
      ok: true,
      filename: "ironquery-analyst-export-run2.csv",
    });
    expect(fetchUtilityRateForAnalystExport).toHaveBeenCalled();
  });

  it("blocks downloadIronqueryAnalystPack under PENDING billing", async () => {
    vi.mocked(prisma.tenantBilling.findUnique).mockResolvedValue({
      status: TENANT_BILLING_STATUS.PENDING,
    } as never);

    const result = await downloadIronqueryAnalystPack("csv");
    expect(result).toMatchObject({
      ok: false,
      code: "BILLING_HOLD",
    });
  });

  it("returns SCOPE_REQUIRED when tenant cookie is missing", async () => {
    vi.mocked(getActiveTenantUuidFromCookies).mockResolvedValue(null);

    const context = await getIronqueryExportDashboardContext();
    expect(context).toMatchObject({
      ok: false,
      code: "SCOPE_REQUIRED",
    });
  });

  it("rejects an unauthenticated export request even when the tenant cookie is valid", async () => {
    getSupabaseSessionUser.mockResolvedValue(null);

    const context = await getIronqueryExportDashboardContext();
    expect(context).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    expect(prisma.evidenceArtifact.findMany).not.toHaveBeenCalled();
  });

  it("rejects an authenticated user without membership in the cookie tenant", async () => {
    userHasTenantRoleAssignment.mockResolvedValue(false);

    const context = await getIronqueryExportDashboardContext();
    expect(context).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    expect(prisma.evidenceArtifact.findMany).not.toHaveBeenCalled();
  });

  it("returns SCOPE_REQUIRED when provisioned tenant has no ALE baseline", async () => {
    vi.mocked(getActiveTenantUuidFromCookies).mockResolvedValue(TENANT_B);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      slug: "run2",
      ale_baseline: 0n,
    } as never);

    const context = await getIronqueryExportDashboardContext();
    expect(context).toMatchObject({
      ok: false,
      code: "SCOPE_REQUIRED",
    });
  });

  it("bypasses billing hold for platform admin operators", async () => {
    vi.mocked(canUsePlatformAdminTools).mockResolvedValue(true);
    vi.mocked(prisma.tenantBilling.findUnique).mockResolvedValue({
      status: TENANT_BILLING_STATUS.PENDING,
    } as never);

    const context = await getIronqueryExportDashboardContext();
    expect(context).toMatchObject({ ok: true, tenantId: TENANT_A });
  });
});
