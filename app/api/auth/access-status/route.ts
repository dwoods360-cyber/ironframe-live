import { NextResponse } from "next/server";
import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";
import { tenantCookieValueForUuid } from "@/app/lib/auth/dashboardTenantSession";
import { getHostBoundTenantUuid } from "@/app/utils/serverTenantContext";

export const dynamic = "force-dynamic";

/** Lightweight session + RBAC probe for client redirects after sign-in. */
export async function GET() {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());
  const response = NextResponse.json(
    {
      status: access.status,
      tenantUuid:
        access.status === "allowed"
          ? access.tenantUuid
          : access.status === "pending"
            ? access.tenantUuid
            : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );

  if (access.status === "allowed") {
    const hostBound = await getHostBoundTenantUuid();
    if (access.tenantFallbackApplied || hostBound) {
      const token = await tenantCookieValueForUuid(access.tenantUuid);
      response.cookies.set("ironframe-tenant", token, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 180,
      });
    }
  }

  return response;
}
