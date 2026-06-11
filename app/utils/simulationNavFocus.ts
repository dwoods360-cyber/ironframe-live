import { useAgentRiskStore } from "@/app/store/agentRiskStore";
import { useAgentStore } from "@/app/store/agentStore";
import type { TenantKey } from "@/app/utils/tenantIsolation";
import { abortActiveSimulationFetches } from "@/app/utils/simulationNavAbort";

export type SimNavFocusTarget = "sim-deck" | "chaos-validator" | "drill-metrics";

const WORKSPACE_TENANT_KEYS: readonly TenantKey[] = [
  "medshield",
  "vaultbank",
  "gridcore",
  "defense",
];

export const SIM_NAV_FOCUS_EVENT = "ironframe:sim-nav-focus" as const;
const SIM_NAV_PENDING_FOCUS_KEY = "ironframe:sim-nav-pending-focus";

export function isDashboardHomePath(pathname: string): boolean {
  return pathname === "/" || pathname === "/dashboard";
}

/**
 * Tenant workspace config — nested org prefix (`/medshield/config`), never flat `/settings`.
 * Falls back to global `/config` when no tenant is bound.
 */
export function resolveSettingsConfigHref(tenantKey: TenantKey | null): string {
  if (tenantKey && WORKSPACE_TENANT_KEYS.includes(tenantKey)) {
    return `/${tenantKey}/config`;
  }
  return "/config";
}

/** Abort in-flight sim fetches and drop Ironintel (Agent 11) BURDENED backpressure on nav. */
export function prepareSimulationNavTransition(): void {
  abortActiveSimulationFetches();
  useAgentRiskStore.getState().flushBurdenedExecutionBuffers();
  useAgentStore.getState().flushIronintelNavigationBuffers();
}

export function dispatchSimNavFocus(target: SimNavFocusTarget): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SIM_NAV_FOCUS_EVENT, { detail: { target } }),
  );
}

export function queueSimNavFocus(target: SimNavFocusTarget): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SIM_NAV_PENDING_FOCUS_KEY, target);
  } catch {
    /* sessionStorage unavailable */
  }
}

export function consumeQueuedSimNavFocus(): SimNavFocusTarget | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SIM_NAV_PENDING_FOCUS_KEY);
    sessionStorage.removeItem(SIM_NAV_PENDING_FOCUS_KEY);
    if (raw === "sim-deck" || raw === "chaos-validator" || raw === "drill-metrics") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function scrollSimNavTargetIntoView(target: SimNavFocusTarget): boolean {
  if (typeof document === "undefined") return false;

  const selectorByTarget: Record<SimNavFocusTarget, string> = {
    "sim-deck": '[data-sim-nav-target="sim-deck"]',
    "chaos-validator": '[data-sim-nav-target="chaos-validator"]',
    "drill-metrics": '[data-sim-nav-target="drill-metrics"]',
  };

  const el = document.querySelector(selectorByTarget[target]);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (el instanceof HTMLElement) {
    el.focus({ preventScroll: true });
  }
  return true;
}
