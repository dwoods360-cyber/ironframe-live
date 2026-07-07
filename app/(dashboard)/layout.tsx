import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import DashboardCommandCenterLayout from "@/app/(dashboard)/DashboardCommandCenterLayout";
import DashboardGroupShell from "@/app/(dashboard)/DashboardGroupShell";
import DashboardBillingGate from "@/app/components/billing/DashboardBillingGate";
import CommandPostWorkspaceShell from "@/app/components/CommandPostWorkspaceShell";
import { TenantBillingGateProvider } from "@/app/context/TenantBillingGateContext";
import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";
import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import { resolveServerCommandPostTarget } from "@/app/lib/auth/resolveCommandPostTarget.server";
import {
  type CommandPostWorkspaceTarget,
  resolveApexCommandPostWorkspaceTarget,
} from "@/app/lib/commandPostNavigation";
import { resolveTenantBillingEntitlementByUuid } from "@/app/lib/billing/tenantBillingEntitlement";
import prisma from "@/lib/prisma";
import { IRONFRAME_PATHNAME_HEADER } from "@/lib/supabase/middleware";

export const dynamic = "force-dynamic";

/** When RBAC session resolved a workspace but slug inference failed, bind Command Post to that tenant. */
function enrichCommandPostTargetFromDashboardAccess(
  target: CommandPostWorkspaceTarget,
  fallbackSlug: string,
): CommandPostWorkspaceTarget {
  if (target.workspaceSlug?.trim()) return target;
  const slug = fallbackSlug.trim().toLowerCase();
  if (!slug) return target;
  return resolveApexCommandPostWorkspaceTarget([], null, slug, true);
}

async function resolveDashboardLoginRedirectPath(): Promise<string> {
  const pathname = (await headers()).get(IRONFRAME_PATHNAME_HEADER)?.trim() || "/";
  const safePath =
    pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
  const next = encodeURIComponent(safePath);
  if (safePath === "/get-started" || safePath.startsWith("/get-started/")) {
    return `/login?next=${next}&fresh=1`;
  }
  return `/login?next=${next}`;
}

export default async function DashboardGroupLayout({ children }: { children: ReactNode }) {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());

  if (access.status === "unauthenticated") {
    const loginPath = await resolveDashboardLoginRedirectPath();
    redirect(loginPath);
  }

  if (access.status === "pending") {
    redirect("/unauthorized");
  }

  const platformAdmin = await canUsePlatformAdminTools();
  const billing = await resolveTenantBillingEntitlementByUuid(access.tenantUuid);
  const tenant = await prisma.tenant.findUnique({
    where: { id: access.tenantUuid },
    select: { slug: true },
  });
  const tenantSlug = tenant?.slug ?? "workspace";
  const billingBlocked = Boolean(billing?.blocked && !platformAdmin);
  const commandPostTarget = enrichCommandPostTargetFromDashboardAccess(
    await resolveServerCommandPostTarget(),
    tenantSlug,
  );

  return (
    <CommandPostWorkspaceShell initialTarget={commandPostTarget}>
      <TenantBillingGateProvider
        billingBlocked={billingBlocked}
        billingStatus={billing?.status ?? "UNTRACKED"}
      >
        <DashboardCommandCenterLayout>
          <DashboardGroupShell initialTenantUuid={access.tenantUuid}>
            <DashboardBillingGate
              blocked={billingBlocked}
              tenantSlug={tenantSlug}
              billingStatus={billing?.status ?? "UNTRACKED"}
            >
              {children}
            </DashboardBillingGate>
          </DashboardGroupShell>
        </DashboardCommandCenterLayout>
      </TenantBillingGateProvider>
    </CommandPostWorkspaceShell>
  );
}
