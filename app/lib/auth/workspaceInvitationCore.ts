import "server-only";

import prisma from "@/lib/prisma";
import {
  DEFAULT_INVITATION_TTL_DAYS,
  generateWorkspaceInvitationToken,
  hashWorkspaceInvitationToken,
  WORKSPACE_INVITATION_STATUS,
  type WorkspaceInvitationStatus,
} from "@/app/utils/invitation-core";

export {
  DEFAULT_INVITATION_TTL_DAYS,
  generateWorkspaceInvitationToken,
  hashWorkspaceInvitationToken,
  WORKSPACE_INVITATION_STATUS,
  type WorkspaceInvitationStatus,
};

export type CreateWorkspaceInvitationInput = {
  operatorId: string;
  email?: string | null;
  tenantSlug?: string | null;
  ttlDays?: number;
};

export type CreateWorkspaceInvitationResult =
  | {
      ok: true;
      token: string;
      invitationId: string;
      expiresAt: string;
      email: string | null;
      tenantSlug: string | null;
    }
  | { ok: false; error: string };

export async function createWorkspaceInvitation(
  input: CreateWorkspaceInvitationInput,
): Promise<CreateWorkspaceInvitationResult> {
  const operatorId = input.operatorId.trim();
  if (!operatorId) {
    return { ok: false, error: "Operator id is required to mint invitations." };
  }

  const email = input.email?.trim().toLowerCase() || null;
  const tenantSlug = input.tenantSlug?.trim().toLowerCase() || null;
  const ttlDays = input.ttlDays ?? DEFAULT_INVITATION_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const token = generateWorkspaceInvitationToken();
  const tokenHash = hashWorkspaceInvitationToken(token);

  const row = await prisma.tenantWorkspaceInvitation.create({
    data: {
      tokenHash,
      email,
      tenantSlug,
      status: WORKSPACE_INVITATION_STATUS.ACTIVE,
      expiresAt,
      createdByOperator: operatorId,
    },
    select: { id: true, expiresAt: true },
  });

  return {
    ok: true,
    token,
    invitationId: row.id,
    expiresAt: row.expiresAt.toISOString(),
    email,
    tenantSlug,
  };
}

export type ValidateWorkspaceInvitationInput = {
  token: string;
  email?: string | null;
  tenantSlug?: string | null;
  consume?: boolean;
};

export type ValidateWorkspaceInvitationResult =
  | { ok: true; invitationId: string }
  | { ok: false; error: string };

export async function validateWorkspaceInvitation(
  input: ValidateWorkspaceInvitationInput,
): Promise<ValidateWorkspaceInvitationResult> {
  const token = input.token.trim();
  if (!token) {
    return { ok: false, error: "Invitation token is required." };
  }

  const tokenHash = hashWorkspaceInvitationToken(token);
  const row = await prisma.tenantWorkspaceInvitation.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      email: true,
      tenantSlug: true,
    },
  });

  if (!row) {
    return { ok: false, error: "Invitation token not recognized." };
  }

  if (row.status !== WORKSPACE_INVITATION_STATUS.ACTIVE) {
    return { ok: false, error: `Invitation token is ${row.status.toLowerCase()}.` };
  }

  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Invitation token has expired." };
  }

  const email = input.email?.trim().toLowerCase() || null;
  if (row.email && email && row.email !== email) {
    return { ok: false, error: "Invitation token is bound to a different email address." };
  }

  const tenantSlug = input.tenantSlug?.trim().toLowerCase() || null;
  if (row.tenantSlug && tenantSlug && row.tenantSlug !== tenantSlug) {
    return { ok: false, error: "Invitation token is bound to a different workspace slug." };
  }

  if (input.consume) {
    await prisma.tenantWorkspaceInvitation.update({
      where: { id: row.id },
      data: {
        status: WORKSPACE_INVITATION_STATUS.CONSUMED,
        consumedAt: new Date(),
      },
    });
  }

  return { ok: true, invitationId: row.id };
}
