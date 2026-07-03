import "server-only";

import prisma from "@/lib/prisma";
import {
  isBillingGateActiveStatus,
  type TenantBillingStatus,
} from "@/app/lib/billing/constants";
import { resolveTenantBillingEntitlementByUuid } from "@/app/lib/billing/tenantBillingEntitlement";

export type PlanTier = "BASELINE" | "VAULT" | "SUSTAINABILITY";

export type EntitledFeature =
  | "GRC_DASHBOARD"
  | "IRONQUERY_EXPORT"
  | "EVIDENCE_LOCKER_WORM"
  | "SUSTAINABILITY_ANALYTICS"
  | "CARBON_PULSE"
  | "BOARDROOM_AUDIT_LOGS";

const TIER_BY_SLUG: Record<string, PlanTier> = {
  medshield: "BASELINE",
  defense: "BASELINE",
  acmecorp: "BASELINE",
  acorp: "BASELINE",
  vaultbank: "VAULT",
  gridcore: "SUSTAINABILITY",
};

const FEATURE_MATRIX: Record<PlanTier, ReadonlySet<EntitledFeature>> = {
  BASELINE: new Set(["GRC_DASHBOARD", "IRONQUERY_EXPORT"]),
  VAULT: new Set(["GRC_DASHBOARD", "IRONQUERY_EXPORT", "EVIDENCE_LOCKER_WORM", "BOARDROOM_AUDIT_LOGS"]),
  SUSTAINABILITY: new Set([
    "GRC_DASHBOARD",
    "IRONQUERY_EXPORT",
    "SUSTAINABILITY_ANALYTICS",
    "CARBON_PULSE",
  ]),
};

const EXPORT_QUOTA_BY_TIER: Record<PlanTier, number> = {
  BASELINE: 25,
  VAULT: 200,
  SUSTAINABILITY: 100,
};

export class TenantFeatureAccessDenied extends Error {
  readonly code = "TENANT_FEATURE_ACCESS_DENIED" as const;

  constructor(
    readonly feature: EntitledFeature,
    readonly tier: PlanTier,
    readonly billingStatus: TenantBillingStatus | "UNTRACKED",
  ) {
    super(
      `Feature "${feature}" is not entitled for plan tier ${tier} (billing=${billingStatus}).`,
    );
    this.name = "TenantFeatureAccessDenied";
  }
}

export function resolvePlanTierForSlug(tenantSlug: string): PlanTier {
  return TIER_BY_SLUG[tenantSlug.trim().toLowerCase()] ?? "BASELINE";
}

export function isFeatureEntitledForTier(tier: PlanTier, feature: EntitledFeature): boolean {
  return FEATURE_MATRIX[tier].has(feature);
}

export function exportQuotaForTier(tier: PlanTier): number {
  return EXPORT_QUOTA_BY_TIER[tier];
}

export async function resolveTenantPlanTier(tenantUuid: string): Promise<PlanTier> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantUuid },
    select: { slug: true },
  });
  if (!tenant) return "BASELINE";
  return resolvePlanTierForSlug(tenant.slug);
}

/**
 * Server-side entitlement gate — active billing required; tier matrix enforced.
 */
export async function assertTenantFeatureEntitled(
  tenantUuid: string,
  feature: EntitledFeature,
): Promise<{ tier: PlanTier; billingStatus: TenantBillingStatus | "UNTRACKED" }> {
  const entitlement = await resolveTenantBillingEntitlementByUuid(tenantUuid);
  const billingStatus = entitlement?.status ?? "UNTRACKED";

  if (entitlement?.blocked || isBillingGateActiveStatus(billingStatus)) {
    throw new TenantFeatureAccessDenied(feature, "BASELINE", billingStatus);
  }

  const tier = await resolveTenantPlanTier(tenantUuid);
  if (!isFeatureEntitledForTier(tier, feature)) {
    throw new TenantFeatureAccessDenied(feature, tier, billingStatus);
  }

  return { tier, billingStatus };
}
