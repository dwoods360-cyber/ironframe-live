import { redirect } from "next/navigation";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import {
  canUsePartnerProvisionerFromSession,
  requirePartnerProvisioner,
} from "@/app/lib/auth/partnerProvisionerAccess";
import { tenantIdsFromPartnerScope } from "@/app/lib/auth/partnerProvisionerScopeFilter";
import { fetchTenantDeploymentRows } from "@/app/lib/server/adminOnboardingDeployments";

import AdminOnboardingDashboardHeader from "./AdminOnboardingDashboardHeader";
import AdminOnboardingDeployments from "./AdminOnboardingDeployments";
import CorporateOnboardingClient from "./CorporateOnboardingClient";
import RevokeAccessControlPanel from "@/app/components/admin/RevokeAccessControlPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Client Workspaces | Ironframe",
  description:
    "Provision isolated client enclaves, manage billing activation, and mint invite-only operator access.",
};

export default async function AdminOnboardingDashboardPage() {
  noStore();

  const allowed = await canUsePartnerProvisionerFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  const [platformAdmin, partnerGate] = await Promise.all([
    canUsePlatformAdminTools(),
    requirePartnerProvisioner(),
  ]);

  const scopedTenantIds =
    "error" in partnerGate ? undefined : tenantIdsFromPartnerScope(partnerGate.scope);

  const deployments = await fetchTenantDeploymentRows(
    scopedTenantIds ? { tenantIds: scopedTenantIds } : undefined,
  );

  return (
    <div className="relative min-h-full bg-[#020617] p-4 text-slate-100 selection:bg-cyan-500/30 sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <main className="relative z-10 mx-auto max-w-6xl space-y-8">
        <p className="font-mono text-[10px] text-slate-500">
          <Link href="/settings/config" className="text-cyan-400 hover:underline">
            ← System configuration
          </Link>
          {platformAdmin ? (
            <>
              <span className="mx-2 text-slate-700">·</span>
              <Link href="/admin/onboarding/test-assets" className="text-cyan-400 hover:underline">
                Acme Corp ingestion test PDF suite →
              </Link>
            </>
          ) : null}
          <span className="mx-2 text-slate-700">·</span>
          <Link href="/admin/billing" className="text-cyan-400 hover:underline">
            Tenant billing console →
          </Link>
        </p>

        <AdminOnboardingDashboardHeader
          deploymentCount={deployments.length}
          partnerMode={!platformAdmin}
        />
        <AdminOnboardingDeployments
          deployments={deployments}
          canManualActivateBilling={platformAdmin}
        />

        <section id="onboarding-controls" className="scroll-mt-8">
          <CorporateOnboardingClient />
          {platformAdmin ? <RevokeAccessControlPanel /> : null}
        </section>
      </main>
    </div>
  );
}
