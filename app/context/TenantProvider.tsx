"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import { assertTenantAccess, detectTenantFromPath, TENANT_UUIDS, TenantKey } from "@/app/utils/tenantIsolation";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";
import { setIronguardEffectiveTenant } from "@/app/utils/ironguardSession";
import { ironguardFetch } from "@/app/utils/apiClient";
import { appendAuditLog } from "@/app/utils/auditLogger";
import { resetAllStores } from "@/app/store/resetAllStores";
import { tenantScopeCache } from "@/app/utils/apiCacheCoordinator";
import { devTenantHandshakeAle, devTenantHandshakeLabel } from "@/app/constants/devTenantRoster";

type TenantContextValue = {
  activeTenantKey: TenantKey | null;
  activeTenantUuid: string | null;
  isTenantRoute: boolean;
  setDevTenantOverride: (tenant: TenantKey | null) => void;
  /** Dev / staging: cold-boot memory + cache before applying override (TAS clean-slate). */
  switchDevTenantColdBoot: (next: TenantKey | null) => void;
  tenantFetch: (input: RequestInfo | URL, init?: RequestInit, targetTenantUuid?: string) => Promise<Response>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

/** While true, `useEffect` does not re-apply the ironframe-tenant cookie over an explicit null Ironguard session (dev cold-boot). */
let devIronguardCookieSyncSuppressed = false;

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [devTenantOverride, setDevTenantOverrideState] = useState<TenantKey | null>(null);

  const routeTenantKey = detectTenantFromPath(pathname);
  const activeTenantKey =
    process.env.NODE_ENV === "development" && devTenantOverride ? devTenantOverride : routeTenantKey;
  const activeTenantUuid = activeTenantKey ? TENANT_UUIDS[activeTenantKey] : null;

  useEffect(() => {
    if (devIronguardCookieSyncSuppressed) return;
    setIronguardEffectiveTenant(resolveDashboardTenantUuid(activeTenantUuid));
  }, [activeTenantUuid]);

  const setDevTenantOverride = useCallback((tenant: TenantKey | null) => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    setDevTenantOverrideState(tenant);

    if (tenant) {
      window.localStorage.setItem("debug:tenant-override", tenant);
    } else {
      window.localStorage.removeItem("debug:tenant-override");
    }
  }, []);

  const switchDevTenantColdBoot = useCallback((next: TenantKey | null) => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    devIronguardCookieSyncSuppressed = true;
    try {
      // 1. Null tenant binding + dev override (committed before purge).
      flushSync(() => {
        setIronguardEffectiveTenant(null);
        setDevTenantOverrideState(null);
      });

      // 2. Forensic ledger persists across tenant switches — Master Purge (Audit Intelligence) clears local buffer.

      // 3. Insurance / forensic / command RAM + dashboard cache
      resetAllStores();
      tenantScopeCache.clear();

      // 4. Bind next tenant; re-assert Ironguard before fetches (useEffect is blocked until finally).
      flushSync(() => {
        if (next) {
          window.localStorage.setItem("debug:tenant-override", next);
        } else {
          window.localStorage.removeItem("debug:tenant-override");
        }
        setDevTenantOverrideState(next);
      });

      setIronguardEffectiveTenant(
        next ? TENANT_UUIDS[next] : resolveDashboardTenantUuid(null),
      );
    } finally {
      devIronguardCookieSyncSuppressed = false;
    }

    const tenantLabel = devTenantHandshakeLabel(next);
    const aleText = devTenantHandshakeAle(next);

    Promise.resolve().then(() => {
      appendAuditLog({
        action_type: "SYSTEM_WARNING",
        log_type: "GRC",
        user_id: "Ironguard",
        description: `[ 🤝 HANDSHAKE ] | CONTEXT SWITCH: ${tenantLabel}. BASELINE RESET TO ${aleText}.`,
        metadata_tag: "IRONGUARD|TENANT_HANDSHAKE",
      });
    });
  }, []);

  const value = useMemo<TenantContextValue>(() => {
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

      return ironguardFetch(input, {
        ...init,
        headers,
      });
    };

    return {
      activeTenantKey,
      activeTenantUuid,
      isTenantRoute: Boolean(activeTenantKey),
      setDevTenantOverride,
      switchDevTenantColdBoot,
      tenantFetch,
    };
  }, [activeTenantKey, activeTenantUuid, setDevTenantOverride, switchDevTenantColdBoot]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantContext() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenantContext must be used inside TenantProvider");
  }

  return context;
}
