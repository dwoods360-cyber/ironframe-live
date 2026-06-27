import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  assertTenantBillingActive,
  assertTenantBillingActiveForCompanyProfileIngress,
  TenantBillingHoldError,
  tenantBillingHoldJsonResponse,
} from "@/app/lib/billing/tenantBillingEntitlement";
import { TENANT_BILLING_STATUS } from "@/app/lib/billing/constants";

vi.mock("@/lib/prisma", () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    tenantBilling: { findUnique: vi.fn() },
    company: { findFirst: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";

describe("assertTenantBillingActive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ slug: "bwc" } as never);
    vi.mocked(prisma.company.findFirst).mockResolvedValue(null);
  });

  it("allows ACTIVE billing without throwing", async () => {
    vi.mocked(prisma.tenantBilling.findUnique).mockResolvedValue({
      status: TENANT_BILLING_STATUS.ACTIVE,
    } as never);

    await expect(assertTenantBillingActive("tenant-uuid-1")).resolves.toBeUndefined();
  });

  it("throws TenantBillingHoldError when billing is PENDING", async () => {
    vi.mocked(prisma.tenantBilling.findUnique).mockResolvedValue({
      status: TENANT_BILLING_STATUS.PENDING,
    } as never);

    await expect(assertTenantBillingActive("tenant-uuid-1")).rejects.toBeInstanceOf(
      TenantBillingHoldError,
    );
  });

  it("bypasses the gate for platform admin callers", async () => {
    vi.mocked(prisma.tenantBilling.findUnique).mockResolvedValue({
      status: TENANT_BILLING_STATUS.PENDING,
    } as never);

    await expect(
      assertTenantBillingActive("tenant-uuid-1", { platformAdminBypass: true }),
    ).resolves.toBeUndefined();
  });

  it("allows primary company bootstrap under PENDING billing", async () => {
    vi.mocked(prisma.tenantBilling.findUnique).mockResolvedValue({
      status: TENANT_BILLING_STATUS.PENDING,
    } as never);

    await expect(
      assertTenantBillingActive("tenant-uuid-1", { allowPrimaryCompanyBootstrap: true }),
    ).resolves.toBeUndefined();
  });
});

describe("assertTenantBillingActiveForCompanyProfileIngress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ slug: "bwc" } as never);
    vi.mocked(prisma.company.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.tenantBilling.findUnique).mockResolvedValue({
      status: TENANT_BILLING_STATUS.PENDING,
    } as never);
  });

  it("allows first primary company while billing is PENDING", async () => {
    await expect(
      assertTenantBillingActiveForCompanyProfileIngress("tenant-uuid-1"),
    ).resolves.toBeUndefined();
  });

  it("blocks updates when primary company exists and billing is PENDING", async () => {
    vi.mocked(prisma.company.findFirst).mockResolvedValue({ id: 1n } as never);

    await expect(
      assertTenantBillingActiveForCompanyProfileIngress("tenant-uuid-1"),
    ).rejects.toBeInstanceOf(TenantBillingHoldError);
  });
});

describe("tenantBillingHoldJsonResponse", () => {
  it("returns 402 with billing hold metadata", () => {
    const response = tenantBillingHoldJsonResponse(
      new TenantBillingHoldError(TENANT_BILLING_STATUS.PENDING),
    );
    expect(response.status).toBe(402);
  });
});
