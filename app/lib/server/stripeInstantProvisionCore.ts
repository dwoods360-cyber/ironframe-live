import "server-only";

import { UserRole } from "@prisma/client";

import { TENANT_BILLING_STATUS } from "@/app/lib/billing/constants";
import type { ParsedCheckoutSessionMetadata } from "@/app/lib/billing/parseCheckoutSession";
import {
  findTenantBillingByStripeCustomerId,
  upsertTenantBillingFromStripe,
} from "@/app/lib/billing/tenantBillingEntitlement";
import {
  inviteCorporateTenantUserCore,
  provisionCorporateTenantCore,
} from "@/app/lib/server/corporateTenantProvisionCore";
import { recordProspectLead } from "@/app/lib/server/prospectLedger";
import { STRIPE_INSTANT_CHECKOUT_OPERATOR_ID } from "@/config/stripe";

export type StripeInstantProvisionResult =
  | {
      ok: true;
      tenantSlug: string;
      workspaceUrl: string;
      email: string;
      idempotent: boolean;
    }
  | { ok: false; error: string; retryable: boolean };

export async function fulfillStripeInstantCheckout(
  parsed: ParsedCheckoutSessionMetadata,
): Promise<StripeInstantProvisionResult> {
  const existingBilling = await findTenantBillingByStripeCustomerId(parsed.stripeCustomerId);
  if (existingBilling?.status === TENANT_BILLING_STATUS.ACTIVE) {
    return {
      ok: true,
      tenantSlug: existingBilling.tenantSlug,
      workspaceUrl: "",
      email: parsed.email,
      idempotent: true,
    };
  }

  const provision = await provisionCorporateTenantCore({
    name: parsed.companyName,
    slugRaw: parsed.slug,
    industry: null,
    aleBaselineCentsRaw: parsed.amountTotalCents.toString(),
    operatorId: STRIPE_INSTANT_CHECKOUT_OPERATOR_ID,
    auditAction: "STRIPE_CHECKOUT_TENANT_PROVISIONED",
  });

  if (!provision.ok) {
    const duplicate = provision.error.includes("already provisioned");
    return {
      ok: false,
      error: provision.error,
      retryable: !duplicate,
    };
  }

  try {
    await recordProspectLead({
      orgName: parsed.companyName,
      slug: provision.slug,
      email: parsed.email,
      reportedAle: parsed.amountTotalCents,
    });

    await upsertTenantBillingFromStripe({
      tenantSlug: provision.slug,
      stripeCustomerId: parsed.stripeCustomerId,
      status: TENANT_BILLING_STATUS.ACTIVE,
    });

    const invite = await inviteCorporateTenantUserCore({
      email: parsed.email,
      tenantSlugRaw: provision.slug,
      operatorId: STRIPE_INSTANT_CHECKOUT_OPERATOR_ID,
      role: UserRole.GRC_MANAGER,
      auditAction: "STRIPE_CHECKOUT_USER_INVITED",
    });

    if (!invite.ok) {
      return {
        ok: false,
        error: invite.error,
        retryable: true,
      };
    }

    return {
      ok: true,
      tenantSlug: provision.slug,
      workspaceUrl: provision.workspaceUrl,
      email: parsed.email,
      idempotent: false,
    };
  } catch (e) {
    console.error("[fulfillStripeInstantCheckout]", e);
    return {
      ok: false,
      error: "Post-provision ingestion failed.",
      retryable: true,
    };
  }
}
