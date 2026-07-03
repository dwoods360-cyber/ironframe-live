import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import OpSupportWorkspace from "./OpSupportWorkspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Operational support — platform administrators only (GLOBAL_ADMIN / constitutional dev authority). */
export default async function OpSupportPage() {
  noStore();
  const allowed = await canUsePlatformAdminTools();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <OpSupportWorkspace />;
}
