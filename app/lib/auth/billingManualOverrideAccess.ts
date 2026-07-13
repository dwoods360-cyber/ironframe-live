import "server-only";

import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";

const MANUAL_ACTIVE_DENIED =
  "GLOBAL_ADMIN role required to manually activate billing without a verified Stripe payment.";

/** Manual PENDING → ACTIVE overrides are platform-owner only (MSSP partners use Stripe Path A/B). */
export async function requireManualBillingActivationAuthority(): Promise<
  { userId: string } | { error: string }
> {
  const gate = await requirePlatformAdministrator();
  if ("error" in gate) {
    return { error: MANUAL_ACTIVE_DENIED };
  }
  return gate;
}

export { MANUAL_ACTIVE_DENIED };
