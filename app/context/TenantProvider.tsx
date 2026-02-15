"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { assertTenantAccess, detectTenantFromPath, TENANT_UUIDS, TenantKey } from "@/app/utils/tenantIsolation";

type TenantContextValue = {
  activeTenantKey: TenantKey | null;
  activeTenantUuid: string | null;
  isTenantRoute: boolean;
  setDevTenantOverride: (tenant: TenantKey | null) => void;
  tenantFetch: (input: RequestInfo | URL, init?: RequestInit, targetTenantUuid?: string) => Promise<Response>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [devTenantOverride, setDevTenantOverrideState] = useState<TenantKey | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const stored = window.localStorage.getItem("debug:tenant-override") as TenantKey | null;
    if (stored === "medshield" || stored === "vaultbank" || stored === "gridcore") {
      setDevTenantOverrideState(stored);
    }
  }, []);

  const setDevTenantOverride = (tenant: TenantKey | null) => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    setDevTenantOverrideState(tenant);

    if (tenant) {
      window.localStorage.setItem("debug:tenant-override", tenant);
    } else {
      window.localStorage.removeItem("debug:tenant-override");
    }
  };

  const value = useMemo<TenantContextValue>(() => {
    const routeTenantKey = detectTenantFromPath(pathname);
    const activeTenantKey =
      process.env.NODE_ENV === "development" && devTenantOverride ? devTenantOverride : routeTenantKey;
    const activeTenantUuid = activeTenantKey ? TENANT_UUIDS[activeTenantKey] : null;

    const tenantFetch: TenantContextValue["tenantFetch"] = async (input, init = {}, targetTenantUuid) => {
      const requestedTenantUuid = targetTenantUuid ?? activeTenantUuid ?? "";

      if (requestedTenantUuid && !assertTenantAccess(activeTenantUuid, requestedTenantUuid)) {
        throw new Error("Tenant isolation violation: attempted cross-tenant data access.");
      }

      const headers = new Headers(init.headers);

      if (activeTenantUuid) {
        headers.set("x-tenant-id", activeTenantUuid);
      }

      if (requestedTenantUuid) {
        headers.set("x-target-tenant-id", requestedTenantUuid);
      }

      return fetch(input, {
        ...init,
        headers,
      });
    };

    return {
      activeTenantKey,
      activeTenantUuid,
      isTenantRoute: Boolean(activeTenantKey),
      setDevTenantOverride,
      tenantFetch,
    };
  }, [pathname, devTenantOverride]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantContext() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenantContext must be used inside TenantProvider");
  }

  return context;
}
