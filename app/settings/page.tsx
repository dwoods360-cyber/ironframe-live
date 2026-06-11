import { redirect } from "next/navigation";

/** `/settings` root is unprovisioned — canonical config lives at `/settings/config`. */
export default function SettingsRootRedirect() {
  redirect("/settings/config");
}
