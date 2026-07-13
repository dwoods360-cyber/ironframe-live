"use client";

import Link from "next/link";

import BillingHoldContinueLink from "@/app/components/billing/BillingHoldContinueLink";
import {
  resolveBillingPendingHint,
  shouldShowLocalStripeWebhookHint,
} from "@/app/lib/billing/billingHoldGuidance";

type Props = {
  billingStatus?: string;
  compact?: boolean;
  /** Tenant-scoped Stripe Payment Link (Path B activation). */
  checkoutUrl?: string | null;
  onBillingRefresh?: () => void;
};

export default function CommercialEntitlementHoldPanel({
  billingStatus = "PENDING",
  compact = false,
  checkoutUrl = null,
  onBillingRefresh,
}: Props) {
  return (
    <div
      className={
        compact
          ? "rounded-xl border border-amber-500/30 bg-amber-950/15 px-4 py-5"
          : "mx-auto max-w-xl rounded-xl border border-amber-500/30 bg-amber-950/20 p-8 shadow-2xl"
      }
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/90">
        Awaiting subscription confirmation
      </p>
      <h2
        className={
          compact ? "mt-2 text-base font-semibold text-slate-50" : "mt-3 text-xl font-semibold text-slate-50"
        }
      >
        Training corpus sealed until billing is active
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Your workspace perimeter is active and isolated. Training modules, agent workforces, and
        documentation corpora unlock when your design-partner subscription payment clears
        {checkoutUrl ? " via Stripe checkout below" : " — contact sales for a payment link"}.
      </p>
      {billingStatus === "PENDING" && checkoutUrl ? (
        <p className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/40 px-3 py-2 text-xs leading-relaxed text-slate-400">
          {shouldShowLocalStripeWebhookHint() ? (
            <>
              Paid in Stripe but still see PENDING? Local dev needs webhook forwarding: run{" "}
              <code className="text-slate-300">npm run dev:stripe:multiplexer</code> and{" "}
              <code className="text-slate-300">stripe listen --forward-to http://127.0.0.1:4242</code>
              , then retry checkout or ask an operator to activate billing.
            </>
          ) : (
            resolveBillingPendingHint()
          )}
        </p>
      ) : null}
      {billingStatus ? (
        <p className="mt-2 font-mono text-[10px] text-slate-500">
          Billing status: <span className="text-amber-200/90">{billingStatus}</span>
        </p>
      ) : null}
      <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap ${compact ? "mt-4" : "mt-8"}`}>
        {checkoutUrl ? (
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-md border border-emerald-500/50 bg-emerald-950/30 px-4 font-mono text-xs font-bold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-950/50"
          >
            Complete subscription — Stripe Checkout
          </a>
        ) : null}
        <Link
          href="/register/contact"
          className="inline-flex h-11 items-center justify-center rounded-md border border-amber-500/50 bg-amber-950/30 px-4 font-mono text-xs font-bold uppercase tracking-wide text-amber-100 transition hover:bg-amber-950/50"
        >
          Contact sales
        </Link>
        <BillingHoldContinueLink
          className="inline-flex h-11 items-center justify-center rounded-md border border-slate-700 px-4 font-mono text-xs text-slate-300 transition hover:border-slate-500"
          onRefresh={onBillingRefresh}
        />
      </div>
    </div>
  );
}
