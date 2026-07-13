import Link from "next/link";

import { resolveTenantActivationCheckoutUrl } from "@/app/lib/billing/resolveTenantActivationCheckoutUrl.server";
import { resolveStripeCommandTierCheckoutUrl } from "@/config/stripe";

type SearchParams = Promise<{ tenant?: string; status?: string }>;

export default async function BillingHoldPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tenantParam = params.tenant?.trim() || "";
  const tenantSlug = tenantParam || "your workspace";
  const billingStatus = params.status?.trim() || "PENDING";
  const checkoutUrl =
    tenantParam.length >= 2
      ? (await resolveTenantActivationCheckoutUrl({ tenantSlug: tenantParam })) ??
        resolveStripeCommandTierCheckoutUrl()
      : resolveStripeCommandTierCheckoutUrl();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050509] px-6 py-16 text-slate-200">
      <div className="w-full max-w-lg rounded-xl border border-amber-500/30 bg-slate-900/80 p-8 shadow-2xl shadow-black/40">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/90">
          Account billing hold
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-50">Workspace access paused</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          The <span className="font-mono text-amber-200/90">{tenantSlug}</span> enclave is in{" "}
          <span className="font-mono text-slate-200">{billingStatus}</span> billing status. Live GRC
          command surfaces remain sealed until your design-partner subscription is confirmed.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          If subscription payment fails, a Billing Gate blocks the Command Center. Use{" "}
          <strong className="font-normal text-slate-400">Update Payment Method</strong> below or
          contact{" "}
          <a href="mailto:delivery@ironframegrc.com" className="text-cyan-400 hover:text-cyan-300">
            delivery@ironframegrc.com
          </a>{" "}
          to resolve provisioning holds.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {checkoutUrl ? (
            <a
              href={checkoutUrl}
              className="rounded-md border border-emerald-500/50 bg-emerald-950/30 px-4 py-2.5 text-center font-mono text-xs font-bold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-950/50"
            >
              Open checkout portal
            </a>
          ) : null}
          <Link
            href="/register/contact"
            className="rounded-md border border-amber-500/50 bg-amber-950/30 px-4 py-2.5 text-center font-mono text-xs font-bold uppercase tracking-wide text-amber-100 transition hover:bg-amber-950/50"
          >
            Contact sales
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-700 px-4 py-2.5 text-center font-mono text-xs text-slate-300 transition hover:border-slate-500"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
