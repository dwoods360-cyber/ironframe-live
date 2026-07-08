import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  seedTenantBillingPendingAction,
  updateTenantBillingStatusAction,
} from "@/app/actions/admin/tenantBillingAdminActions";
import { TENANT_BILLING_STATUS } from "@/app/lib/billing/constants";

const mockRequirePerimeter = vi.hoisted(() => vi.fn());
const mockSetTenantBillingStatus = vi.hoisted(() => vi.fn());
const mockEnsureTenantBillingPending = vi.hoisted(() => vi.fn());
const mockAuditLogCreateLoose = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/app/lib/auth/perimeterWorkforceAccess", () => ({
  requirePerimeterWorkforceOperator: mockRequirePerimeter,
}));

vi.mock("@/app/lib/billing/tenantBillingEntitlement", () => ({
  setTenantBillingStatus: mockSetTenantBillingStatus,
  ensureTenantBillingPending: mockEnsureTenantBillingPending,
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
    mockRequirePerimeter.mockResolvedValue({ userId: "admin-user" });
    mockSetTenantBillingStatus.mockResolvedValue(undefined);
    mockEnsureTenantBillingPending.mockResolvedValue(undefined);
    mockAuditLogCreateLoose.mockResolvedValue(undefined);
  });

  it("denies operators without perimeter workforce access", async () => {
    mockRequirePerimeter.mockResolvedValue({
      error: "GLOBAL_ADMIN or designated BUSINESS_ADMIN role required for perimeter workforce access.",
    });

    const result = await updateTenantBillingStatusAction("bwc", TENANT_BILLING_STATUS.ACTIVE);
    expect(result).toEqual({
      ok: false,
      error:
        "GLOBAL_ADMIN or designated BUSINESS_ADMIN role required for perimeter workforce access.",
    });
    expect(mockSetTenantBillingStatus).not.toHaveBeenCalled();
  });

  it("marks a tenant billing row as ACTIVE", async () => {
    const result = await updateTenantBillingStatusAction("bwc", TENANT_BILLING_STATUS.ACTIVE);
    expect(result.ok).toBe(true);
    expect(mockSetTenantBillingStatus).toHaveBeenCalledWith("bwc", TENANT_BILLING_STATUS.ACTIVE);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/billing");
  });

  it("seeds a tenant into PENDING hold for gate testing", async () => {
    const result = await seedTenantBillingPendingAction("gridcore");
    expect(result.ok).toBe(true);
    expect(mockEnsureTenantBillingPending).toHaveBeenCalledWith("gridcore");
  });
});
