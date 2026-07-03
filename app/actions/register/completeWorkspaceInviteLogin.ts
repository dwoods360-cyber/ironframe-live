"use server";

import { headers } from "next/headers";

import {
  completeWorkspaceInviteLoginCore,
  type CompleteWorkspaceInviteLoginResult,
} from "@/app/lib/server/workspaceInviteLoginCore";
import { tenantSlugFromHost } from "@/app/lib/tenantSubdomain";

export type CompleteWorkspaceInviteLoginActionResult = CompleteWorkspaceInviteLoginResult;

export async function completeWorkspaceInviteLoginAction(
  token: string,
): Promise<CompleteWorkspaceInviteLoginActionResult> {
  const h = await headers();
  const tenantSlug = tenantSlugFromHost(h.get("host"));
  return completeWorkspaceInviteLoginCore({ token: token.trim(), tenantSlug });
}
