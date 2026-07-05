import "server-only";

import prisma from "@/lib/prisma";
import { TENANT_BILLING_STATUS } from "@/app/lib/billing/constants";
import { resolveIronqueryExportScope } from "@/app/lib/ironquery/resolveIronqueryExportScope";
import { DIAGNOSTIC_FETCH_ABORT_SERVICE_KEY } from "@/app/lib/opsupport/diagnosticAbortTypes";
import type {
  InTenantSupportClientContext,
  InTenantSupportTelemetry,
} from "@/app/types/inTenantSupportTelemetry";

export type { InTenantSupportClientContext, InTenantSupportTelemetry };

const MAX_SURFACE_CHARS = 128;
const MAX_PATH_CHARS = 512;
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

function sanitizeClientContext(input?: InTenantSupportClientContext): {
  surface: string | null;
  path: string | null;
} {
  const surface = input?.surface?.trim().slice(0, MAX_SURFACE_CHARS) || null;
  const path = input?.path?.trim().slice(0, MAX_PATH_CHARS) || null;
  return { surface, path };
}

export async function buildInTenantSupportTelemetry(input: {
  tenantUuid: string;
  userId?: string | null;
  userEmail?: string | null;
  clientContext?: InTenantSupportClientContext;
}): Promise<InTenantSupportTelemetry | null> {
  const tenantUuid = input.tenantUuid.trim();
  if (!tenantUuid) return null;

  const since = new Date(Date.now() - RECENT_WINDOW_MS);
  const client = sanitizeClientContext(input.clientContext);
  const userId = input.userId?.trim() || null;

  const [tenant, exportScope, billing, companyCount, roles, ironguardCount, abortCount] =
    await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantUuid },
        select: {
          id: true,
          slug: true,
          name: true,
          ale_baseline: true,
          isUnderTargetedSiege: true,
        },
      }),
      resolveIronqueryExportScope(tenantUuid),
      prisma.tenant.findUnique({
        where: { id: tenantUuid },
        select: { slug: true },
      }).then((row) => {
        if (!row?.slug) return null;
        return prisma.tenantBilling.findUnique({
          where: { tenantSlug: row.slug },
          select: { status: true },
        });
      }),
      prisma.company.count({ where: { tenantId: tenantUuid } }),
      userId
        ? prisma.userRoleAssignment.findMany({
            where: { userId, tenantId: tenantUuid },
            select: { role: true },
          })
        : Promise.resolve([]),
      prisma.ironguardViolation.count({
        where: {
          createdAt: { gte: since },
          OR: [{ sessionTenantUuid: tenantUuid }, { attemptedTenantUuid: tenantUuid }],
        },
      }),
      prisma.systemHealthLog.count({
        where: {
          serviceKey: DIAGNOSTIC_FETCH_ABORT_SERVICE_KEY,
          createdAt: { gte: since },
        },
      }),
    ]);

  if (!tenant) return null;

  const billingStatus = billing?.status?.trim() || null;
  const exportEntitled = billingStatus === TENANT_BILLING_STATUS.ACTIVE;

  return {
    capturedAt: new Date().toISOString(),
    tenant: {
      uuid: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
    },
    operator: {
      userId,
      email: input.userEmail?.trim().toLowerCase() || null,
      roles: roles.map((row) => String(row.role)),
    },
    billing: {
      status: billingStatus,
      exportEntitled,
    },
    profileScope: {
      aleBaselineCents: tenant.ale_baseline.toString(),
      exportScopeReady: exportScope !== null,
      exportKey: exportScope?.exportKey ?? null,
      companyProfilePresent: companyCount > 0,
    },
    systemState: {
      recentIronguardViolations: ironguardCount,
      recentDiagnosticAborts: abortCount,
      isUnderTargetedSiege: tenant.isUnderTargetedSiege,
    },
    client,
  };
}

export function formatInTenantSupportTelemetryForCrm(
  telemetry: InTenantSupportTelemetry,
): string {
  return [
    "--- Forensic Telemetry (auto-captured) ---",
    `Captured: ${telemetry.capturedAt}`,
    `Tenant: ${telemetry.tenant.slug} (${telemetry.tenant.uuid})`,
    `Operator: ${telemetry.operator.email ?? "unauthenticated"} | roles=${telemetry.operator.roles.join(",") || "none"}`,
    `Billing: ${telemetry.billing.status ?? "UNKNOWN"} | exportEntitled=${telemetry.billing.exportEntitled}`,
    `Profile: ALE=${telemetry.profileScope.aleBaselineCents} | exportScope=${telemetry.profileScope.exportScopeReady} | exportKey=${telemetry.profileScope.exportKey ?? "none"} | company=${telemetry.profileScope.companyProfilePresent}`,
    `System: ironguard24h=${telemetry.systemState.recentIronguardViolations} | aborts24h=${telemetry.systemState.recentDiagnosticAborts} | siege=${telemetry.systemState.isUnderTargetedSiege}`,
    `Client surface: ${telemetry.client.surface ?? "support-console"}`,
    `Client path: ${telemetry.client.path ?? "n/a"}`,
  ].join("\n");
}
