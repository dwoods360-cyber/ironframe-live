"use server";

import { revalidatePath } from "next/cache";

import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import {
  revokeOperatorAccessCore,
  type RevokeOperatorAccessResult,
} from "@/app/lib/server/revokeOperatorAccessCore";

export type RevokeOperatorAccessActionResult = RevokeOperatorAccessResult;

export async function revokeOperatorAccessAction(
  formData: FormData,
): Promise<RevokeOperatorAccessActionResult> {
  const admin = await requirePlatformAdministrator();
  if ("error" in admin) {
    return { ok: false, error: admin.error, code: "VALIDATION" };
  }

  const result = await revokeOperatorAccessCore({
    operatorId: admin.userId,
    email: String(formData.get("email") ?? ""),
    tenantSlugRaw: String(formData.get("tenantSlug") ?? ""),
  });

  if (result.ok) {
    revalidatePath("/admin/onboarding");
  }

  return result;
}
