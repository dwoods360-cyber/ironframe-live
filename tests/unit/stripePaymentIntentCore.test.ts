import { describe, expect, it, vi, beforeEach } from "vitest";

import { TENANT_BILLING_STATUS } from "@/app/lib/billing/constants";
import { fulfillStripePaymentIntentSucceeded } from "@/app/lib/server/stripePaymentIntentCore";

const mockTenantFindUnique = vi.fn();
const mockBillingFindUnique = vi.fn();
const mockFindBillingByCustomer = vi.fn();
const mockUpsertBilling = vi.fn();
const mockAudit = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    tenant: { findUnique: (...args: unknown[]) => mockTenantFindUnique(...args) },
    tenantBilling: { findUnique: (...args: unknown[]) => mockBillingFindUnique(...args) },
  },
}));

vi.mock("@/app/lib/billing/tenantBillingEntitlement", () => ({
  findTenantBillingByStripeCustomerId: (...args: unknown[]) =>
    mockFindBillingByCustomer(...args),
  upsertTenantBillingFromStripe: (...args: unknown[]) => mockUpsertBilling(...args),
}));

vi.mock("@/lib/auditLogLoose", () => ({
  auditLogCreateLoose: (...args: unknown[]) => mockAudit(...args),
}));

describe("fulfillStripePaymentIntentSucceeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when Stripe customer does not match provisioned billing row", async () => {
    mockTenantFindUnique.mockResolvedValueOnce({ id: "uuid-1", slug: "acmecorp" });
    mockBillingFindUnique.mockResolvedValueOnce({
      tenantSlug: "acmecorp",
      status: TENANT_BILLING_STATUS.PENDING,
      stripeCustomerId: "cus_provisioned",
    });

    const result = await fulfillStripePaymentIntentSucceeded({
      tenantSlug: "acmecorp",
      tenantUuid: "uuid-1",
      stripeCustomerId: "cus_wrong_checkout",
      paymentIntentId: "pi_1",
      amountReceivedCents: 499900n,
      email: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("does not match the workspace billing record");
    expect(mockUpsertBilling).not.toHaveBeenCalled();
  });

  it("activates billing when UUID and customer match provisioned row", async () => {
    mockTenantFindUnique.mockResolvedValueOnce({ id: "uuid-1", slug: "acmecorp" });
    mockBillingFindUnique.mockResolvedValueOnce({
      tenantSlug: "acmecorp",
      status: TENANT_BILLING_STATUS.PENDING,
      stripeCustomerId: "cus_provisioned",
    });
    mockFindBillingByCustomer.mockResolvedValueOnce(null);
    mockUpsertBilling.mockResolvedValueOnce(undefined);
    mockAudit.mockResolvedValueOnce(undefined);

    const result = await fulfillStripePaymentIntentSucceeded({
      tenantSlug: "acmecorp",
      tenantUuid: "uuid-1",
      stripeCustomerId: "cus_provisioned",
      paymentIntentId: "pi_1",
      amountReceivedCents: 499900n,
      email: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tenantSlug).toBe("acmecorp");
    expect(mockUpsertBilling).toHaveBeenCalledWith({
      tenantSlug: "acmecorp",
      stripeCustomerId: "cus_provisioned",
      status: TENANT_BILLING_STATUS.ACTIVE,
    });
  });
});
