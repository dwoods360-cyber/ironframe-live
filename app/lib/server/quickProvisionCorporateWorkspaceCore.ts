import "server-only";

import { createWorkspaceInvitation } from "@/app/lib/auth/workspaceInvitationCore";
import { normalizeProvisionedTenantSlug } from "@/app/lib/tenantSlugRegistry";
import { buildTenantSubdomainOrigin } from "@/app/lib/tenantSubdomain";
import { provisionCorporateTenantCore } from "@/app/lib/server/corporateTenantProvisionCore";
import prisma from "@/lib/prisma";
import {
  buildRegisterInvitationUrl,
  buildWorkspaceInviteLoginUrl,
  sendWorkspaceInviteEmailCore,
  summarizeWorkspaceInviteEmailDelivery,
} from "@/app/lib/server/workspaceInviteEmailDelivery";

export type QuickProvisionCorporateWorkspaceInput = {
  operatorId: string;
  email: string;
  name: string;
  slugRaw: string;
};

export type QuickProvisionCorporateWorkspaceResult =
  | {
      ok: true;
      slug: string;
      name: string;
      email: string;
      workspaceUrl: string;
      registerUrl: string;
      activationCheckoutUrl: string | null;
      token: string;
      invitationId: string;
      expiresAt: string;
      tenantAlreadyExisted: boolean;
      inviteEmail?: {
        sent: boolean;
        deliveryChannel?: "resend" | "dev-browser-handoff";
        error?: string;
      };
    }
  | { ok: false; error: string };

export async function quickProvisionCorporateWorkspaceCore(
  input: QuickProvisionCorporateWorkspaceInput,
): Promise<QuickProvisionCorporateWorkspaceResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const slug = normalizeProvisionedTenantSlug(input.slugRaw.trim());

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid operator email address." };
  }

  if (!name || name.length < 2) {
    return { ok: false, error: "Enter a business display name (at least 2 characters)." };
  }

  if (!slug) {
    return {
      ok: false,
      error:
        "Slug must be 2–63 lowercase letters, numbers, or hyphens — not a reserved host label (www, api, login, etc.).",
    };
  }

  const provision = await provisionCorporateTenantCore({
    name,
    slugRaw: slug,
    industry: null,
    aleBaselineCentsRaw: "0",
    operatorId: input.operatorId,
    auditAction: "QUICK_PROVISION_CORPORATE_WORKSPACE",
    skipInvitationGate: true,
  });

  let tenantAlreadyExisted = false;
  let workspaceUrl: string;
  let activationCheckoutUrl: string | null = null;

  if (provision.ok) {
    workspaceUrl = provision.workspaceUrl;
    activationCheckoutUrl = provision.activationCheckoutUrl;
  } else if (provision.error.includes("already provisioned")) {
    tenantAlreadyExisted = true;
    const port = Number(process.env.PORT?.trim() || "3000") || 3000;
    workspaceUrl = buildTenantSubdomainOrigin(slug, port);
    const { resolveTenantActivationCheckoutUrlForUuid } = await import(
      "@/app/lib/billing/resolveTenantActivationCheckoutUrl.server"
    );
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    activationCheckoutUrl = existingTenant
      ? await resolveTenantActivationCheckoutUrlForUuid(existingTenant.id)
      : null;
  } else {
    return { ok: false, error: provision.error };
  }

  const invitation = await createWorkspaceInvitation({
    operatorId: input.operatorId,
    email,
    tenantSlug: slug,
  });

  if (!invitation.ok) {
    return { ok: false, error: invitation.error };
  }

  const registerUrl = buildWorkspaceInviteLoginUrl(invitation.token, slug);
  const inviteEmailResult = await sendWorkspaceInviteEmailCore({
    email,
    tenantSlug: slug,
    registerToken: invitation.token,
    tenantDisplayName: name,
    inviteExpiresAt: invitation.expiresAt,
  });

  return {
    ok: true,
    slug,
    name,
    email,
    workspaceUrl,
    registerUrl,
    activationCheckoutUrl,
    token: invitation.token,
    invitationId: invitation.invitationId,
    expiresAt: invitation.expiresAt,
    tenantAlreadyExisted,
    inviteEmail: summarizeWorkspaceInviteEmailDelivery(inviteEmailResult),
  };
}
