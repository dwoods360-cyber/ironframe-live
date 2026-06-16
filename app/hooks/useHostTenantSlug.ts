"use client";

import { useMemo } from "react";
import { tenantSlugFromHost } from "@/app/lib/tenantSubdomain";

/** Client-side tenant slug from subdomain host (null on apex localhost). */
export function useHostTenantSlug(): string | null {
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    return tenantSlugFromHost(window.location.host);
  }, []);
}
