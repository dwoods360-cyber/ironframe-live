"use server";

import {
  activateWorkspaceInvitationCore,
  type ActivateWorkspaceInvitationResult,
} from "@/app/lib/server/workspaceInvitationActivationCore";

export type ActivateWorkspaceInvitationActionResult = ActivateWorkspaceInvitationResult;

export async function activateWorkspaceInvitationAction(
  formData: FormData,
): Promise<ActivateWorkspaceInvitationActionResult> {
  return activateWorkspaceInvitationCore({
    token: String(formData.get("token") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    msaAccepted: formData.get("msaAccepted") === "on",
    dpaAccepted: formData.get("dpaAccepted") === "on",
  });
}
