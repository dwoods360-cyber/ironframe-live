"use server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { revokeOrderFormAgreedHandoff } from "@/app/lib/server/orderFormAgreedHandoffCore";

export type RevokeOrderFormAgreedHandoffResult =
  | { ok: true; revoked: number }
  | { ok: false; error: string };

/** Unlock-for-edit: revoke the active AGREED admin handoff so stale Quick provision cannot proceed. */
export async function revokeOrderFormAgreedHandoffAction(input: {
  token?: string | null;
  workspaceSlug?: string | null;
  reason: string;
}): Promise<RevokeOrderFormAgreedHandoffResult> {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return { ok: false, error: auth.error };
  }

  const reason = String(input.reason ?? "").trim();
  if (reason.length < 4) {
    return { ok: false, error: "Unlock requires a short reason (audit)." };
  }

  try {
    const { revoked } = await revokeOrderFormAgreedHandoff({
      token: input.token,
      workspaceSlug: input.workspaceSlug,
      reason,
    });
    return { ok: true, revoked };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to revoke AGREED handoff.",
    };
  }
}
