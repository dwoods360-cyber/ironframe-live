import "server-only";

import { workspaceActivationNextParam } from "@/app/lib/auth/workspaceActivationLanding";
import {
  authorizeWorkspaceBootstrapMint,
  mintWorkspaceBootstrapTicket,
  userIdFromAccessToken,
} from "@/app/lib/auth/workspaceBootstrapTicket";
import { buildTenantSubdomainOrigin } from "@/app/lib/tenantSubdomain";

export function buildWorkspaceBootstrapRedeemUrl(input: {
  tenantSlug: string;
  token: string;
  nextPath?: string;
}): string {
  const tenantSlug = input.tenantSlug.trim().toLowerCase();
  const origin = buildTenantSubdomainOrigin(tenantSlug);
  const params = new URLSearchParams({
    token: input.token.trim(),
    next: input.nextPath?.trim() || workspaceActivationNextParam(),
  });
  return `${origin}/api/auth/session-bootstrap?${params.toString()}`;
}

/** Mints a single-use, tenant-bound bootstrap ticket and returns the redeem URL (no Supabase tokens in query). */
export async function mintWorkspaceBootstrapHandoffUrl(input: {
  tenantSlug: string;
  userId: string;
  userEmail?: string | null;
  accessToken: string;
  refreshToken: string;
  nextPath?: string;
}): Promise<string | null> {
  const accessToken = input.accessToken.trim();
  const refreshToken = input.refreshToken.trim();
  const userId = input.userId.trim() || userIdFromAccessToken(accessToken);
  if (!userId || !accessToken || !refreshToken) return null;

  const authorized = await authorizeWorkspaceBootstrapMint(
    userId,
    input.userEmail,
    input.tenantSlug,
  );
  if ("error" in authorized) return null;

  const token = mintWorkspaceBootstrapTicket({
    userId,
    userEmail: input.userEmail,
    tenantSlug: authorized.tenantSlug,
    tenantUuid: authorized.tenantUuid,
    accessToken,
    refreshToken,
    nextPath: input.nextPath?.trim() || workspaceActivationNextParam(),
  });

  return buildWorkspaceBootstrapRedeemUrl({
    tenantSlug: authorized.tenantSlug,
    token,
    nextPath: input.nextPath,
  });
}

/**
 * @deprecated Use `mintWorkspaceBootstrapHandoffUrl` — raw tokens in URLs are forbidden for GRC bootstrap.
 */
export function buildTenantWorkspaceSessionBootstrapUrl(input: {
  tenantSlug: string;
  accessToken: string;
  refreshToken: string;
  nextPath?: string;
}): string {
  throw new Error(
    "buildTenantWorkspaceSessionBootstrapUrl is retired — call mintWorkspaceBootstrapHandoffUrl instead.",
  );
}
