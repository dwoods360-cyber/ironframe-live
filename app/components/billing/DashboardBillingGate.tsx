"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import BillingSuspensionNotice from "@/app/components/billing/BillingSuspensionNotice";

const BILLING_EXEMPT_PREFIXES = [
  "/admin/onboarding",
  "/admin/billing",
  "/account/billing-hold",
  "/get-started",
  "/integrity",
  "/profile",
] as const;

type Props = {
  blocked: boolean;
  tenantSlug: string;
  billingStatus: string;
  checkoutUrl?: string | null;
  children: ReactNode;
};

export default function DashboardBillingGate({
  blocked,
  tenantSlug,
  billingStatus,
  checkoutUrl = null,
  children,
}: Props) {
  const pathname = usePathname() ?? "";

  if (!blocked) {
    return <>{children}</>;
  }

  const exempt = BILLING_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (exempt) {
    return <>{children}</>;
  }

  return (
    <BillingSuspensionNotice
      tenantSlug={tenantSlug}
      status={billingStatus}
      checkoutUrl={checkoutUrl}
    />
  );
}
