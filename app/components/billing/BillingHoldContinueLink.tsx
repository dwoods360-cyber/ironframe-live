"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  className?: string;
  onRefresh?: () => void | Promise<void>;
};

/**
 * After Stripe checkout in another tab, the original Get Started tab can keep stale
 * billing props. Same-route navigation is a no-op — force a full reload after sync.
 */
export default function BillingHoldContinueLink({ className, onRefresh }: Props) {
  const pathname = usePathname() ?? "";
  const [busy, setBusy] = useState(false);
  const onGetStarted =
    pathname === "/get-started" || pathname.startsWith("/get-started/");

  const handleRefresh = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onRefresh?.();
      window.location.reload();
    } catch {
      setBusy(false);
    }
  };

  if (onGetStarted) {
    return (
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={() => void handleRefresh()}
      >
        {busy ? "Refreshing…" : "Refresh to continue onboarding"}
      </button>
    );
  }

  return (
    <Link href="/get-started?billingRefresh=1" className={className}>
      Return to Get Started
    </Link>
  );
}
