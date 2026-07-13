import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

import { INVITE_PENDING_SUCCESS_MESSAGE } from "@/app/lib/server/corporateTenantInviteDelivery";

vi.mock("@/app/lib/billing/tenantBillingEntitlement", () => ({
  findTenantBillingByStripeCustomerId: vi.fn(async () => null),
  upsertTenantBillingFromStripe: vi.fn(async () => undefined),
}));

vi.mock("@/app/lib/server/prospectLedger", () => ({
  recordProspectLead: vi.fn(async () => undefined),
}));

vi.mock("@/app/lib/server/corporateTenantProvisionCore", () => ({
  provisionCorporateTenantCore: vi.fn(async () => ({
    ok: true,
    success: true,
    id: "tenant-uuid",
    slug: "stripe-e2e-corp",
    name: "Stripe E2E Corp",
    workspaceUrl: "http://stripe-e2e-corp.lvh.me:3000",
    redirectUrl: "http://stripe-e2e-corp.lvh.me:3000/login",
    activationCheckoutUrl: null,
  })),
  inviteCorporateTenantUserCore: vi.fn(async () => ({
    ok: false,
    error: "email rate limit exceeded",
    deferrable: true,
  })),
}));

import { fulfillStripeInstantCheckout } from "@/app/lib/server/stripeInstantProvisionCore";
import { inviteCorporateTenantUserCore } from "@/app/lib/server/corporateTenantProvisionCore";

describe("stripeInstantProvisionCore", () => {
  it("returns invitePending success when Supabase email delivery is rate-limited", async () => {
    const result = await fulfillStripeInstantCheckout({
      email: "buyer@ironframe.test",
      slug: "stripe-e2e-corp",
      companyName: "Stripe E2E Corp",
      amountTotalCents: 499_900n,
      stripeCustomerId: "cus_rate_limit_case",
      checkoutSessionId: "cs_rate_limit_case",
      invitationToken: "invite-token",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invitePending).toBe(true);
    expect(result.message).toBe(INVITE_PENDING_SUCCESS_MESSAGE);
    expect(result.tenantSlug).toBe("stripe-e2e-corp");
    expect(inviteCorporateTenantUserCore).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "buyer@ironframe.test",
        tenantSlugRaw: "stripe-e2e-corp",
        role: UserRole.GRC_MANAGER,
      }),
    );
  });
});
