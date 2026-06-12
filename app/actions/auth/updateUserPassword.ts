"use server";

import { redirect } from "next/navigation";
import { createServerSessionClient } from "@/lib/supabase/serverSession";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";

const MIN_PASSWORD_LENGTH = 8;

export type UpdateUserPasswordResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateUserPasswordAction(
  formData: FormData,
): Promise<UpdateUserPasswordResult> {
  const sessionUser = await getSupabaseSessionUser();
  if (!sessionUser) {
    return { ok: false, error: "Active session required. Open the link from your reset email." };
  }

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "Passwords do not match." };
  }

  try {
    const supabase = await createServerSessionClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error("[updateUserPasswordAction]", error.message);
      return { ok: false, error: error.message || "Unable to update password." };
    }

    return { ok: true };
  } catch (e) {
    console.error("[updateUserPasswordAction]", e);
    return { ok: false, error: "Unable to update password." };
  }
}

/** Server-side gate for `/reset-password` — requires recovery session from auth callback. */
export async function requirePasswordRecoverySession(): Promise<void> {
  const user = await getSupabaseSessionUser();
  if (!user) {
    redirect("/forgot-password?reason=session_required");
  }
}
