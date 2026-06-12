"use server";

import { resolvePublicAppUrl } from "@/app/lib/auth/publicAppUrl";
import { createServerSessionClient } from "@/lib/supabase/serverSession";

const GENERIC_SUCCESS =
  "If that email is registered with Ironframe, a password reset link has been sent.";

export type RequestResetPasswordResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function requestResetPasswordAction(
  formData: FormData,
): Promise<RequestResetPasswordResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid corporate email address." };
  }

  try {
    const supabase = await createServerSessionClient();
    const appUrl = resolvePublicAppUrl();
    const redirectTo = `${appUrl}/api/auth/callback?next=/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      console.error("[requestResetPasswordAction]", error.message);
    }

    // Uniform response — do not disclose whether the account exists.
    return { ok: true, message: GENERIC_SUCCESS };
  } catch (e) {
    console.error("[requestResetPasswordAction]", e);
    return { ok: true, message: GENERIC_SUCCESS };
  }
}
