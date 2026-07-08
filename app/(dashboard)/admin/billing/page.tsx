import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import TenantBillingAdminClient from "@/app/(dashboard)/admin/billing/TenantBillingAdminClient";
import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";
import { fetchTenantDeploymentRows } from "@/app/lib/server/adminOnboardingDeployments";
import { resolveStripeCommandTierCheckoutUrl } from "@/config/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tenant Billing Console | Ironframe Admin",
  description:
    "GLOBAL_ADMIN and BUSINESS_ADMIN console to test billing holds, mark tenants paid, and open Stripe checkout.",
};

export default async function AdminBillingPage() {
  noStore();

  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  const [tenants, stripeCheckoutUrl] = await Promise.all([
    fetchTenantDeploymentRows(),
    Promise.resolve(resolveStripeCommandTierCheckoutUrl()),
  ]);

  return (
    <div className="relative min-h-full bg-[#020617] p-4 text-slate-100 selection:bg-cyan-500/30 sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <main className="relative z-10 mx-auto max-w-6xl space-y-6">
        <p className="font-mono text-[10px] text-slate-500">
          <Link href="/dashboard/operations" className="text-cyan-400 hover:underline">
            ← Operations hub
          </Link>
          <span className="mx-2 text-slate-700">·</span>
          <Link href="/admin/onboarding" className="text-cyan-400 hover:underline">
            Tenant onboarding
          </Link>
        </p>

        <TenantBillingAdminClient tenants={tenants} stripeCheckoutUrl={stripeCheckoutUrl} />
      </main>
    </div>
  );
}
