"use client";

import { useEffect, useState } from "react";
import { resolveTenantBrandAction } from "@/app/actions/brand/resolveTenantBrandAction";
import type { TenantBrand } from "@/app/lib/brand/tenantBrandTypes";
import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";

export function useTenantBrand(initialBrand?: TenantBrand | null) {
  const hostTenantSlug = useHostTenantSlug();
  const [brand, setBrand] = useState<TenantBrand | null>(initialBrand ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hostTenantSlug) {
      setBrand(null);
      return;
    }
    if (initialBrand?.slug === hostTenantSlug) {
      setBrand(initialBrand);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void resolveTenantBrandAction(hostTenantSlug).then((row) => {
      if (cancelled) return;
      setBrand(row);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [hostTenantSlug, initialBrand]);

  return {
    brand,
    hostTenantSlug,
    loading,
    isCoBranded: Boolean(hostTenantSlug && brand),
  };
}
