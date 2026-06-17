import { headers } from "next/headers";
import { tenantSlugFromHost } from "@/app/lib/tenantSubdomain";
import { resolveTenantBrand } from "@/app/lib/brand/resolveTenantBrand";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const h = await headers();
  const hostSlug = tenantSlugFromHost(h.get("host"));
  const initialBrand = hostSlug ? await resolveTenantBrand(hostSlug) : null;

  return <LoginClient initialBrand={initialBrand} />;
}
