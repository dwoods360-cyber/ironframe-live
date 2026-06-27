import "server-only";

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
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

export class TenantBillingHoldError extends Error {
  readonly code = "BILLING_HOLD" as const;

  constructor(readonly billingStatus: TenantBillingStatus | "UNTRACKED") {
    super(`Commercial entitlement required (billing=${billingStatus}).`);
    this.name = "TenantBillingHoldError";
  }
}

/**
 * Hard commercial stop before corpus or agent orchestration reads tenant IP surfaces.
 * Platform operators bypass for provisioning and QA.
 */
export async function assertTenantBillingActive(
  tenantUuid: string,
  options?: { platformAdminBypass?: boolean },
): Promise<void> {
  if (options?.platformAdminBypass) {
    return;
  }

  const entitlement = await resolveTenantBillingEntitlementByUuid(tenantUuid);
  const billingStatus = entitlement?.status ?? "UNTRACKED";

  if (entitlement?.blocked || isBillingGateActiveStatus(billingStatus)) {
    throw new TenantBillingHoldError(billingStatus);
  }
}

export function tenantBillingHoldJsonResponse(error: TenantBillingHoldError): NextResponse {
  return NextResponse.json(
    {
      error: "Commercial entitlement required.",
      code: error.code,
      billingStatus: error.billingStatus,
    },
    { status: 402 },
  );
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
