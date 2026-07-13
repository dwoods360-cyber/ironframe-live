import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  seedTenantBillingPendingAction,
  updateTenantBillingStatusAction,
} from "@/app/actions/admin/tenantBillingAdminActions";
import { TENANT_BILLING_STATUS } from "@/app/lib/billing/constants";

const mockRequirePartner = vi.hoisted(() => vi.fn());
const mockAssertScope = vi.hoisted(() => vi.fn());
const mockRequireManualActive = vi.hoisted(() => vi.fn());
const mockSetTenantBillingStatus = vi.hoisted(() => vi.fn());
const mockAuditLogCreateLoose = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/app/lib/auth/partnerProvisionerAccess", () => ({
  requirePartnerProvisioner: mockRequirePartner,
  assertTenantSlugInPartnerScope: mockAssertScope,
}));

vi.mock("@/app/lib/auth/billingManualOverrideAccess", () => ({
  requireManualBillingActivationAuthority: mockRequireManualActive,
}));

vi.mock("@/app/lib/billing/tenantBillingEntitlement", () => ({
  setTenantBillingStatus: mockSetTenantBillingStatus,
}));

vi.mock("@/lib/auditLogLoose", () => ({
  auditLogCreateLoose: mockAuditLogCreateLoose,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

describe("tenantBillingAdminActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePartner.mockResolvedValue({
      userId: "admin-user",
      scope: { kind: "all" },
    });
    mockAssertScope.mockResolvedValue({ ok: true });
    mockRequireManualActive.mockResolvedValue({ userId: "admin-user" });
    mockSetTenantBillingStatus.mockResolvedValue(undefined);
    mockAuditLogCreateLoose.mockResolvedValue(undefined);
  });

  it("denies operators without partner provisioner access", async () => {
    mockRequirePartner.mockResolvedValue({
      error:
        "GLOBAL_ADMIN or designated BUSINESS_ADMIN role required to manage client workspaces.",
    });

    const result = await updateTenantBillingStatusAction("acorp", TENANT_BILLING_STATUS.ACTIVE);
    expect(result).toEqual({
      ok: false,
      error:
        "GLOBAL_ADMIN or designated BUSINESS_ADMIN role required to manage client workspaces.",
    });
    expect(mockSetTenantBillingStatus).not.toHaveBeenCalled();
  });

  it("marks a tenant billing row as ACTIVE", async () => {
    const result = await updateTenantBillingStatusAction("acorp", TENANT_BILLING_STATUS.ACTIVE);
    expect(result.ok).toBe(true);
    expect(mockRequireManualActive).toHaveBeenCalled();
    expect(mockSetTenantBillingStatus).toHaveBeenCalledWith("acorp", TENANT_BILLING_STATUS.ACTIVE);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/billing");
  });

  it("denies manual ACTIVE activation for non-platform operators", async () => {
    mockRequireManualActive.mockResolvedValue({
      error: "GLOBAL_ADMIN role required to manually activate billing without a verified Stripe payment.",
    });

    const result = await updateTenantBillingStatusAction("acorp", TENANT_BILLING_STATUS.ACTIVE);
    expect(result).toEqual({
      ok: false,
      error:
        "GLOBAL_ADMIN role required to manually activate billing without a verified Stripe payment.",
    });
    expect(mockSetTenantBillingStatus).not.toHaveBeenCalled();
  });

  it("seeds a tenant into PENDING hold for gate testing", async () => {
    const result = await seedTenantBillingPendingAction("gridcore");
    expect(result.ok).toBe(true);
    expect(mockSetTenantBillingStatus).toHaveBeenCalledWith(
      "gridcore",
      TENANT_BILLING_STATUS.PENDING,
    );
  });
});
