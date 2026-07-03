import "server-only";

import { redirect } from "next/navigation";

import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import { resolveTenantBillingEntitlementByUuid } from "@/app/lib/billing/tenantBillingEntitlement";
import { isOperatorFacingReadingLevel } from "@/lib/docsContentDecoupling";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import {
  getHostBoundTenantUuid,
  getScopedTenantUuidFromCookies,
} from "@/app/utils/serverTenantContext";

export type CommercialCorpusGateResult =
  | { status: "allowed" }
  | { status: "public_publisher" }
  | { status: "unauthenticated"; loginNextPath: string }
  | { status: "billing_hold"; billingStatus: string };

export function requiresCommercialCorpusEntitlement(readingLevel: string): boolean {
  return isOperatorFacingReadingLevel(readingLevel);
}

export async function resolveCommercialCorpusGate(
  readingLevel: string,
  loginNextPath: string,
): Promise<CommercialCorpusGateResult> {
  if (!requiresCommercialCorpusEntitlement(readingLevel)) {
    return { status: "public_publisher" };
  }

  const user = await getSupabaseSessionUser();
  if (!user) {
    return { status: "unauthenticated", loginNextPath };
  }

  const platformAdmin = await canUsePlatformAdminTools();
  if (platformAdmin) {
    return { status: "allowed" };
  }

  const tenantUuid =
    (await getHostBoundTenantUuid()) ?? (await getScopedTenantUuidFromCookies());
  if (!tenantUuid) {
    return { status: "billing_hold", billingStatus: "PENDING" };
  }

  const billing = await resolveTenantBillingEntitlementByUuid(tenantUuid);
  if (billing?.blocked) {
    return { status: "billing_hold", billingStatus: billing.status };
  }

  return { status: "allowed" };
}

export async function enforceCommercialCorpusGateOrRedirect(
  readingLevel: string,
  loginNextPath: string,
): Promise<CommercialCorpusGateResult> {
  const gate = await resolveCommercialCorpusGate(readingLevel, loginNextPath);
  if (gate.status === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(gate.loginNextPath)}`);
  }
  return gate;
}
