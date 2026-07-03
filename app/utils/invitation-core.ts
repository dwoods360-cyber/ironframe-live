import { createHash, randomBytes } from "node:crypto";

export const WORKSPACE_INVITATION_STATUS = {
  ACTIVE: "ACTIVE",
  CONSUMED: "CONSUMED",
  REVOKED: "REVOKED",
} as const;

export type WorkspaceInvitationStatus =
  (typeof WORKSPACE_INVITATION_STATUS)[keyof typeof WORKSPACE_INVITATION_STATUS];

export const DEFAULT_INVITATION_TTL_DAYS = 14;

export function hashWorkspaceInvitationToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function generateWorkspaceInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}
