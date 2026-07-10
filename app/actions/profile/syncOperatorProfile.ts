"use server";

import { revalidatePath } from "next/cache";

import {
  OPERATOR_PROFILE_SCHEMA_VERSION,
  operatorProfileIngressSchema,
} from "@/app/lib/ingress/operatorProfileIngressSchema";
import { syncOperatorProfileFromIngress } from "@/app/lib/ingress/syncOperatorProfileFromIngress";
import {
  ensureDashboardTenantSession,
  resolveDashboardAccess,
} from "@/app/lib/auth/dashboardRoleAccess";

export type SyncOperatorProfileActionResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

export async function syncOperatorProfileAction(input: {
  title?: string;
  phone?: string;
  avatarUrl?: string;
}): Promise<SyncOperatorProfileActionResult> {
  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());
  if (access.status !== "allowed") {
    return { ok: false, error: "Sign in to update your operator profile." };
  }

  const operatorId = access.userId.trim();
  if (!operatorId) {
    return { ok: false, error: "Signed-in operator identity is missing." };
  }

  const parsed = operatorProfileIngressSchema.safeParse({
    schemaVersion: OPERATOR_PROFILE_SCHEMA_VERSION,
    operatorId,
    title: input.title,
    phone: input.phone,
    avatarUrl: input.avatarUrl,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Operator profile validation failed.",
    };
  }

  try {
    const result = await syncOperatorProfileFromIngress(operatorId, parsed.data);
    revalidatePath("/profile");
    return { ok: true, created: result.created };
  } catch (error) {
    console.error("[syncOperatorProfileAction]", error);
    return { ok: false, error: "Could not save operator profile. Retry in a moment." };
  }
}
