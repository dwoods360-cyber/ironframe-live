import { redirect } from "next/navigation";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import { fetchTenantDeploymentRows } from "@/app/lib/server/adminOnboardingDeployments";

import AdminOnboardingDashboardHeader from "./AdminOnboardingDashboardHeader";
import AdminOnboardingDeployments from "./AdminOnboardingDeployments";
import CorporateOnboardingClient from "./CorporateOnboardingClient";
import RevokeAccessControlPanel from "@/app/components/admin/RevokeAccessControlPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Onboarding & Tenant Deployments | Ironframe Admin",
  description: "Supervisor command plane for B2B tenant provisioning and invite-only activation.",
};

export default async function AdminOnboardingDashboardPage() {
  noStore();

  const allowed = await canUsePlatformAdminTools();
  if (!allowed) {
    redirect("/unauthorized");
  }

  const deployments = await fetchTenantDeploymentRows();

  return (
    <div className="relative min-h-full bg-[#020617] p-4 text-slate-100 selection:bg-cyan-500/30 sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <main className="relative z-10 mx-auto max-w-6xl space-y-8">
        <p className="font-mono text-[10px] text-slate-500">
          <Link href="/settings/config" className="text-cyan-400 hover:underline">
            ← System configuration
          </Link>
          <span className="mx-2 text-slate-700">·</span>
          <Link href="/admin/onboarding/test-assets" className="text-cyan-400 hover:underline">
            Acme Corp ingestion test PDF suite →
          </Link>
          <span className="mx-2 text-slate-700">·</span>
          <Link href="/admin/billing" className="text-cyan-400 hover:underline">
            Tenant billing console →
          </Link>
        </p>

        <AdminOnboardingDashboardHeader deploymentCount={deployments.length} />
        <AdminOnboardingDeployments deployments={deployments} />

        <section id="onboarding-controls" className="scroll-mt-8">
          <CorporateOnboardingClient />
          <RevokeAccessControlPanel />
        </section>
      </main>
    </div>
  );
}
