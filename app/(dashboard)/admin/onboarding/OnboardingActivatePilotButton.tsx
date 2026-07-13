"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setTenantBillingStatusAction } from "@/app/actions/admin/setTenantBillingStatus";
import { TENANT_BILLING_STATUS } from "@/app/lib/billing/constants";

type Props = {
  tenantSlug: string;
  billingStatus: string | null;
  compact?: boolean;
};

export default function OnboardingActivatePilotButton({
  tenantSlug,
  billingStatus,
  compact = false,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (billingStatus === TENANT_BILLING_STATUS.ACTIVE) {
    return null;
  }

  async function handleActivate() {
    if (busy) return;
    setBusy(true);
    setFeedback(null);

    try {
      const result = await setTenantBillingStatusAction(
        tenantSlug,
        TENANT_BILLING_STATUS.ACTIVE,
      );
      if (result.ok) {
        setFeedback(`Billing ACTIVE for ${result.tenantSlug}.`);
        router.refresh();
      } else {
        setFeedback(result.error);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Activation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <button
        type="button"
        disabled={busy}
        onClick={handleActivate}
        className={
          compact
            ? "h-9 w-full rounded-lg border border-emerald-600/50 bg-emerald-950/30 px-2 font-mono text-[9px] font-bold uppercase tracking-wide text-emerald-200 disabled:opacity-40"
            : "inline-flex h-8 items-center rounded border border-emerald-600/50 bg-emerald-950/30 px-2 font-mono text-[9px] font-bold uppercase tracking-wide text-emerald-200 disabled:opacity-40"
        }
      >
        {busy ? "Activating…" : "Activate for pilot"}
      </button>
      {feedback ? (
        <p
          className={`font-mono text-[9px] leading-snug ${
            feedback.startsWith("Billing ACTIVE") ? "text-emerald-300" : "text-rose-300"
          }`}
          role={feedback.startsWith("Billing ACTIVE") ? "status" : "alert"}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
