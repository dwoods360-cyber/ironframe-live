"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import {
  assertTenantAccess,
  detectTenantFromPath,
  TENANT_UUIDS,
  tenantKeyFromUuid,
  TenantKey,
} from "@/app/utils/tenantIsolation";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";
import { setIronguardEffectiveTenant } from "@/app/utils/ironguardSession";
import { ironguardFetch } from "@/app/utils/apiClient";
import { appendAuditLog } from "@/app/utils/auditLogger";
import { purgeClientTenantScopeAfterSwitch } from "@/app/utils/purgeClientTenantScope";
import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";
import { devTenantHandshakeAle, devTenantHandshakeLabel } from "@/app/constants/devTenantRoster";

type TenantContextValue = {
  activeTenantKey: TenantKey | null;
  activeTenantUuid: string | null;
  /** True when URL is `/medshield`-style; cookie-only scope still sets `activeTenantUuid`. */
  isTenantRoute: boolean;
  setDevTenantOverride: (tenant: TenantKey | null) => void;
  /** Dev / staging: cold-boot memory + cache before applying override (TAS clean-slate). */
  switchDevTenantColdBoot: (next: TenantKey | null) => Promise<void>;
  tenantFetch: (input: RequestInfo | URL, init?: RequestInit, targetTenantUuid?: string) => Promise<Response>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

/** While true, `useEffect` does not re-apply the ironframe-tenant cookie over an explicit null Ironguard session (dev cold-boot). */
let devIronguardCookieSyncSuppressed = false;

function subscribeIronframeTenantCookie(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("ironframe-tenant-changed", onStoreChange);
  window.addEventListener("focus", onStoreChange);
  return () => {
    window.removeEventListener("ironframe-tenant-changed", onStoreChange);
    window.removeEventListener("focus", onStoreChange);
  };
}

function snapshotIronframeTenantUuid(): string | null {
  if (typeof window === "undefined") return null;
  return resolveDashboardTenantUuid(null);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hostTenantSlug = useHostTenantSlug();
  const [devTenantOverride, setDevTenantOverrideState] = useState<TenantKey | null>(null);

  /** Dev Tenant Switcher (`ironframe-tenant` cookie) — Medshield UUID `5c420f5a-…` when that tenant is selected (see `TENANT_UUIDS`). */
  const cookieTenantUuid = useSyncExternalStore(
    subscribeIronframeTenantCookie,
    snapshotIronframeTenantUuid,
    () => null,
  );

  const routeTenantKey = detectTenantFromPath(pathname);
  const hostUuid = hostTenantSlug ? TENANT_UUIDS[hostTenantSlug as TenantKey] : null;
  const routeUuid = routeTenantKey ? TENANT_UUIDS[routeTenantKey] : null;
  const devUuid =
    process.env.NODE_ENV === "development" && devTenantOverride ? TENANT_UUIDS[devTenantOverride] : null;

  /** Host subdomain wins, then path prefix, then dev override, then cookie. */
  const activeTenantUuid = hostUuid ?? routeUuid ?? devUuid ?? cookieTenantUuid;

  const activeTenantKey =
    hostTenantSlug ??
    routeTenantKey ??
    (process.env.NODE_ENV === "development" ? devTenantOverride : null) ??
    tenantKeyFromUuid(cookieTenantUuid);

  useEffect(() => {
    if (devIronguardCookieSyncSuppressed) return;
    setIronguardEffectiveTenant(resolveDashboardTenantUuid(routeUuid ?? devUuid ?? null));
  }, [routeUuid, devUuid, cookieTenantUuid]);

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

  const switchDevTenantColdBoot = useCallback(async (next: TenantKey | null) => {
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

      // 3. Insurance / forensic / command RAM + dashboard cache + shadow-arm re-hydration
      await purgeClientTenantScopeAfterSwitch();

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
      isTenantRoute: Boolean(routeTenantKey || hostTenantSlug),
      setDevTenantOverride,
      switchDevTenantColdBoot,
      tenantFetch,
    };
  }, [activeTenantKey, activeTenantUuid, routeTenantKey, hostTenantSlug, setDevTenantOverride, switchDevTenantColdBoot]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantContext() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenantContext must be used inside TenantProvider");
  }

  return context;
}
