export const TENANT_BILLING_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
} as const;

export type TenantBillingStatus =
  (typeof TENANT_BILLING_STATUS)[keyof typeof TENANT_BILLING_STATUS];

export function isBillingGateActiveStatus(status: string): boolean {
  return (
    status === TENANT_BILLING_STATUS.PENDING || status === TENANT_BILLING_STATUS.PAST_DUE
  );
}

export function manualStripeCustomerIdForSlug(slug: string): string {
  return `manual_pending_${slug.trim().toLowerCase()}`;
}
