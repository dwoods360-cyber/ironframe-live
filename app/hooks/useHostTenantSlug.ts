"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { tenantSlugFromHost } from "@/app/lib/tenantSubdomain";
import { useHostTenantSlugServerSnapshot } from "@/app/context/HostTenantSlugContext";

/**
 * Tenant slug from subdomain host — SSR snapshot from middleware header, then client host after mount.
 */
export function useHostTenantSlug(): string | null {
  const serverSlug = useHostTenantSlugServerSnapshot();
  const pathname = usePathname();
  const [clientSlug, setClientSlug] = useState<string | null>(null);

  useEffect(() => {
    setClientSlug(tenantSlugFromHost(window.location.host));
  }, [pathname]);

  return clientSlug ?? serverSlug;
}
