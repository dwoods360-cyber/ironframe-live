"use client";

import { useEffect } from "react";
import type { TenantBrand } from "@/app/lib/brand/tenantBrandTypes";

/** Applies tenant accent CSS variables to the document root while mounted. */
export default function TenantBrandAccent({ brand }: { brand: TenantBrand | null }) {
  useEffect(() => {
    const root = document.documentElement;
    if (!brand) {
      root.removeAttribute("data-tenant");
      root.style.removeProperty("--tenant-accent");
      return;
    }

    root.setAttribute("data-tenant", brand.slug);
    root.style.setProperty("--tenant-accent", brand.accentColor);

    return () => {
      root.removeAttribute("data-tenant");
      root.style.removeProperty("--tenant-accent");
    };
  }, [brand]);

  return null;
}
