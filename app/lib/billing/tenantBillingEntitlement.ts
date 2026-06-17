import "server-only";

import prisma from "@/lib/prisma";
import {
  isBillingGateActiveStatus,
  TENANT_BILLING_STATUS,
  type TenantBillingStatus,
} from "@/app/lib/billing/constants";

export type TenantBillingEntitlement = {
  tenantSlug: string;
  status: TenantBillingStatus | "UNTRACKED";
  blocked: boolean;
};

export async function resolveTenantBillingEntitlementBySlug(
  tenantSlug: string,
): Promise<TenantBillingEntitlement> {
  const slug = tenantSlug.trim().toLowerCase();
  const row = await prisma.tenantBilling.findUnique({
    where: { tenantSlug: slug },
    select: { status: true },
  });

  if (!row) {
    return { tenantSlug: slug, status: "UNTRACKED", blocked: false };
  }

  const status = row.status as TenantBillingStatus;
  return {
    tenantSlug: slug,
    status,
    blocked: isBillingGateActiveStatus(status),
  };
}

export async function resolveTenantBillingEntitlementByUuid(
  tenantUuid: string,
): Promise<TenantBillingEntitlement | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantUuid },
    select: { slug: true },
  });
  if (!tenant) return null;
  return resolveTenantBillingEntitlementBySlug(tenant.slug);
}

export async function ensureTenantBillingPending(slug: string): Promise<void> {
  const tenantSlug = slug.trim().toLowerCase();
  const { manualStripeCustomerIdForSlug } = await import("@/app/lib/billing/constants");
  await prisma.tenantBilling.upsert({
    where: { tenantSlug },
    create: {
      tenantSlug,
      stripeCustomerId: manualStripeCustomerIdForSlug(tenantSlug),
      status: TENANT_BILLING_STATUS.PENDING,
    },
    update: {},
  });
}

export async function setTenantBillingStatus(
  tenantSlug: string,
  status: TenantBillingStatus,
): Promise<void> {
  const slug = tenantSlug.trim().toLowerCase();
  const { manualStripeCustomerIdForSlug } = await import("@/app/lib/billing/constants");
  await prisma.tenantBilling.upsert({
    where: { tenantSlug: slug },
    create: {
      tenantSlug: slug,
      stripeCustomerId: manualStripeCustomerIdForSlug(slug),
      status,
    },
    update: { status },
  });
}

export async function upsertTenantBillingFromStripe(input: {
  tenantSlug: string;
  stripeCustomerId: string;
  status?: TenantBillingStatus;
}): Promise<void> {
  const tenantSlug = input.tenantSlug.trim().toLowerCase();
  const stripeCustomerId = input.stripeCustomerId.trim();
  const status = input.status ?? TENANT_BILLING_STATUS.ACTIVE;

  await prisma.tenantBilling.upsert({
    where: { tenantSlug },
    create: { tenantSlug, stripeCustomerId, status },
    update: { stripeCustomerId, status },
  });
}

export async function findTenantBillingByStripeCustomerId(stripeCustomerId: string) {
  return prisma.tenantBilling.findUnique({
    where: { stripeCustomerId: stripeCustomerId.trim() },
    select: { tenantSlug: true, status: true },
  });
}
