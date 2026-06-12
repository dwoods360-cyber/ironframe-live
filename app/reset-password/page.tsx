import { ResetPasswordForm } from "@/app/reset-password/ResetPasswordForm";
import { requirePasswordRecoverySession } from "@/app/actions/auth/updateUserPassword";

export default async function ResetPasswordPage() {
  await requirePasswordRecoverySession();
  return <ResetPasswordForm />;
}
