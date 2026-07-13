import "server-only";

import prisma from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TENANT_BILLING_STATUS, type TenantBillingStatus } from "@/app/lib/billing/constants";
import { listSupabaseAuthEmailsByUserId } from "@/app/lib/server/supabaseAuthAdminHelpers";
import { buildTenantSubdomainOrigin } from "@/app/lib/tenantSubdomain";
import { formatCentsToAccountingUSD } from "@/app/utils/formatCentsToUSD";
import { WORKSPACE_INVITATION_STATUS } from "@/app/utils/invitation-core";
import { IRONFRAME_PRIVACY_VERSION, IRONFRAME_TERMS_VERSION } from "@/config/legal";

export type TenantInfrastructureStatus = "PROVISIONED" | "STAGED";
export type TenantLegalSignoffStatus =
  | "COMPLETE"
  | "PENDING_SIGNATURE"
  | "AWAITING_INITIALIZATION";

export type TenantInvitationSnapshot = {
  email: string | null;
  status: string;
  createdAt: Date;
};

export type TenantDeploymentRow = {
  id: string;
  tenantUuid: string;
  company: string;
  slug: string;
  allocatedBaseline: string;
  infrastructureStatus: TenantInfrastructureStatus;
  billingStatus: TenantBillingStatus | null;
  inviteEmail: string | null;
  inviteStatus: string | null;
  activatedOperatorEmails: string[];
  legalSignoff: TenantLegalSignoffStatus;
  tokenLabel: string;
  workspaceUrl: string;
};

function buildTenantDisplayId(slug: string, tenantUuid: string): string {
  const prefix = slug.replace(/[^a-z0-9]/gi, "").slice(0, 3).toLowerCase() || "tnt";
  const suffix = tenantUuid.replace(/-/g, "").slice(0, 4).toLowerCase();
  return `tnt_${prefix}_${suffix}`;
}

function buildTokenLabel(slug: string): string {
  const abbrev =
    slug
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.slice(0, 2))
      .join("")
      .slice(0, 2)
      .toLowerCase() || slug.slice(0, 2).toLowerCase();
  let hash = 0;
  for (const char of slug) {
    hash = (hash + char.charCodeAt(0)) % 997;
  }
  return `${abbrev}-${(hash + 100).toString(16)}`;
}

export function resolveInfrastructureStatus(
  billingStatus: string | null | undefined,
): TenantInfrastructureStatus {
  return billingStatus === TENANT_BILLING_STATUS.ACTIVE ? "PROVISIONED" : "STAGED";
}

export function resolvePrimaryInviteEmail(
  invitations: TenantInvitationSnapshot[],
): { email: string | null; status: string | null } {
  if (invitations.length === 0) {
    return { email: null, status: null };
  }

  const sorted = [...invitations].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const withEmail = sorted.find((row) => row.email?.trim());
  if (withEmail?.email?.trim()) {
    return { email: withEmail.email.trim(), status: withEmail.status };
  }

  return { email: null, status: sorted[0]?.status ?? null };
}

export function resolveActivatedOperatorEmails(
  userIds: string[],
  emailByUserId: ReadonlyMap<string, string | null | undefined>,
): string[] {
  const emails = userIds
    .map((id) => emailByUserId.get(id)?.trim())
    .filter((email): email is string => Boolean(email));

  return [...new Set(emails)].sort((a, b) => a.localeCompare(b));
}

async function loadSupabaseAuthEmailIndex(): Promise<Map<string, string>> {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    return await listSupabaseAuthEmailsByUserId(supabaseAdmin);
  } catch (error) {
    console.warn(
      "[adminOnboardingDeployments] Supabase auth email index unavailable:",
      error instanceof Error ? error.message : error,
    );
    return new Map();
  }
}

function resolveLegalSignoff(input: {
  tenantUserIds: string[];
  invitations: Array<{ status: string }>;
  consents: Array<{ userId: string; termsVersion: string; privacyVersion: string }>;
}): TenantLegalSignoffStatus {
  const { tenantUserIds, invitations, consents } = input;

  const currentConsentCount = consents.filter(
    (row) =>
      row.termsVersion === IRONFRAME_TERMS_VERSION &&
      row.privacyVersion === IRONFRAME_PRIVACY_VERSION &&
      tenantUserIds.includes(row.userId),
  ).length;

  if (tenantUserIds.length > 0 && currentConsentCount >= tenantUserIds.length) {
    return "COMPLETE";
  }

  const hasActiveInvite = invitations.some(
    (row) => row.status === WORKSPACE_INVITATION_STATUS.ACTIVE,
  );
  const hasConsumedInvite = invitations.some(
    (row) => row.status === WORKSPACE_INVITATION_STATUS.CONSUMED,
  );

  if (hasActiveInvite || hasConsumedInvite || currentConsentCount > 0) {
    return "PENDING_SIGNATURE";
  }

  return "AWAITING_INITIALIZATION";
}

export async function fetchTenantDeploymentRows(options?: {
  tenantIds?: string[];
}): Promise<TenantDeploymentRow[]> {
  const port = Number(process.env.PORT?.trim() || "3000") || 3000;
  const tenantIdFilter = options?.tenantIds?.length
    ? { id: { in: options.tenantIds } }
    : undefined;

  const tenants = await prisma.tenant.findMany({
    where: tenantIdFilter,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      ale_baseline: true,
    },
  });

  if (tenants.length === 0) {
    return [];
  }

  const tenantIds = tenants.map((tenant) => tenant.id);
  const slugs = tenants.map((tenant) => tenant.slug);

  const [billingRows, invitationRows, roleAssignments, authEmailByUserId] = await Promise.all([
    prisma.tenantBilling.findMany({
      where: { tenantSlug: { in: slugs } },
      select: { tenantSlug: true, status: true },
    }),
    prisma.tenantWorkspaceInvitation.findMany({
      where: { tenantSlug: { in: slugs } },
      select: { tenantSlug: true, email: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userRoleAssignment.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { tenantId: true, userId: true },
    }),
    loadSupabaseAuthEmailIndex(),
  ]);

  const userIds = [...new Set(roleAssignments.map((row) => row.userId))];
  const consentRows =
    userIds.length > 0
      ? await prisma.userLegalConsent.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, termsVersion: true, privacyVersion: true },
        })
      : [];

  const billingBySlug = new Map(billingRows.map((row) => [row.tenantSlug, row.status]));
  const invitationsBySlug = new Map<string, TenantInvitationSnapshot[]>();
  for (const row of invitationRows) {
    if (!row.tenantSlug) continue;
    const bucket = invitationsBySlug.get(row.tenantSlug) ?? [];
    bucket.push({
      email: row.email,
      status: row.status,
      createdAt: row.createdAt,
    });
    invitationsBySlug.set(row.tenantSlug, bucket);
  }

  const userIdsByTenantId = new Map<string, string[]>();
  for (const row of roleAssignments) {
    const bucket = userIdsByTenantId.get(row.tenantId) ?? [];
    bucket.push(row.userId);
    userIdsByTenantId.set(row.tenantId, bucket);
  }

  return tenants.map((tenant) => {
    const tenantUserIds = userIdsByTenantId.get(tenant.id) ?? [];
    const invitations = invitationsBySlug.get(tenant.slug) ?? [];
    const tenantConsents = consentRows.filter((row) => tenantUserIds.includes(row.userId));
    const billingStatus = billingBySlug.get(tenant.slug) ?? null;
    const { email: inviteEmail, status: inviteStatus } = resolvePrimaryInviteEmail(invitations);

    return {
      id: buildTenantDisplayId(tenant.slug, tenant.id),
      tenantUuid: tenant.id,
      company: tenant.name,
      slug: tenant.slug,
      allocatedBaseline: formatCentsToAccountingUSD(tenant.ale_baseline),
      infrastructureStatus: resolveInfrastructureStatus(billingStatus),
      billingStatus:
        billingStatus === TENANT_BILLING_STATUS.ACTIVE ||
        billingStatus === TENANT_BILLING_STATUS.PENDING ||
        billingStatus === TENANT_BILLING_STATUS.PAST_DUE
          ? billingStatus
          : null,
      inviteEmail,
      inviteStatus,
      activatedOperatorEmails: resolveActivatedOperatorEmails(tenantUserIds, authEmailByUserId),
      legalSignoff: resolveLegalSignoff({
        tenantUserIds,
        invitations,
        consents: tenantConsents,
      }),
      tokenLabel: buildTokenLabel(tenant.slug),
      workspaceUrl: buildTenantSubdomainOrigin(tenant.slug, port),
    };
  });
}
