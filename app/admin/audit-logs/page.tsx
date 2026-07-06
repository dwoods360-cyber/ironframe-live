import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  IRONFRAME_HOST_TENANT_SLUG_HEADER,
  tenantSlugFromHost,
} from "@/app/lib/tenantSubdomain";

interface Props {
  searchParams: Promise<{ tenant?: string }>;
}

/** Legacy alias — security audit logs live under the boardroom namespace. */
export default async function AdminAuditLogsAliasPage({ searchParams }: Props) {
  const { tenant: tenantParam } = await searchParams;
  const h = await headers();
  const hostSlug =
    tenantParam?.trim() ||
    h.get(IRONFRAME_HOST_TENANT_SLUG_HEADER)?.trim() ||
    tenantSlugFromHost(h.get("host")) ||
    "";

  const destination = hostSlug
    ? `/boardroom/admin/audit-logs?tenant=${encodeURIComponent(hostSlug)}`
    : "/boardroom/admin/audit-logs";

  redirect(destination);
}
