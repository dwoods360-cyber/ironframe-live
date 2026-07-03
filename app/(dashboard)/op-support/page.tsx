import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import OpSupportWorkspace from "../opsupport/OpSupportWorkspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Alias route: `/op-support` — same workspace as `/opsupport` (platform administrators only). */
export default async function OpSupportAliasPage() {
  noStore();
  const allowed = await canUsePlatformAdminTools();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return <OpSupportWorkspace />;
}
