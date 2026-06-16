"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import {
  listCommandCenterTenantScope,
  logTenantScopeChangeAction,
  type CommandCenterTenantRow,
} from "@/app/actions/tenantActions";
import { tenantIndustryCodeToProfileLabel } from "@/app/utils/tenantIndustryProfile";
import { useRiskStore } from "@/app/store/riskStore";
import { purgeClientTenantScopeAfterSwitch } from "@/app/utils/purgeClientTenantScope";
import { setIronguardEffectiveTenant } from "@/app/utils/ironguardSession";
import {
  applyCommandCenterScopeFromCookie,
  readIronframeTenantCookie,
  syncIronguardForRedTeamLane,
} from "@/app/utils/commandCenterScopeSync";
import ContextualHelpTrigger from "@/app/components/HelpSystem/ContextualHelpTrigger";
import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";
import { buildTenantSubdomainOrigin } from "@/app/lib/tenantSubdomain";
import { resolvePublicAppUrl } from "@/app/lib/auth/publicAppUrl";
import { getDemoCommandCenterScope, isDemoModeActive } from "@/app/lib/demo/demoMode";
import { Loader2 } from "lucide-react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatAleBaselineShort(centsStr: string): string {
  try {
    const cents = BigInt(centsStr || "0");
    const usd = Number(cents) / 100;
    if (!Number.isFinite(usd)) return "—";
    const m = usd / 1_000_000;
    if (m >= 0.1) return `$${m >= 10 ? m.toFixed(0) : m.toFixed(1)}M`;
    const k = usd / 1000;
    if (k >= 1) return `$${k.toFixed(1)}K`;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
      usd,
    );
  } catch {
    return "—";
  }
}

function setIronframeTenantCookie(value: string | null): void {
  const path = "/";
  const maxAge = 60 * 60 * 24 * 180;
  if (value == null || value === "") {
    document.cookie = `ironframe-tenant=; path=${path}; max-age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `ironframe-tenant=${value}; path=${path}; max-age=${maxAge}; SameSite=Lax`;
}

function normalizeScopeToken(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  return raw.trim().toLowerCase();
}

export default function TenantSwitcher() {
  const router = useRouter();
  const setSelectedIndustry = useRiskStore((s) => s.setSelectedIndustry);
  const setSelectedTenantName = useRiskStore((s) => s.setSelectedTenantName);
  const isContextSwitching = useRiskStore((s) => s.isContextSwitching);
  const setContextSwitching = useRiskStore((s) => s.setContextSwitching);
  const [rows, setRows] = useState<CommandCenterTenantRow[]>([]);
  const [canAccessGlobal, setCanAccessGlobal] = useState(false);
  const [hostTenantSlug, setHostTenantSlug] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const clientHostSlug = useHostTenantSlug();
  const isSubdomainLocked = Boolean(hostTenantSlug ?? clientHostSlug);
  /** Bumps after cookie writes so `selectedValue` recomputes before refresh completes. */
  const [cookieRevision, setCookieRevision] = useState(0);

  useEffect(() => {
    if (isDemoModeActive()) {
      const scope = getDemoCommandCenterScope();
      setRows(scope.tenants);
      setCanAccessGlobal(scope.canAccessGlobal);
      setHostTenantSlug(scope.hostTenantSlug);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    listCommandCenterTenantScope()
      .then((scope) => {
        if (!cancelled) {
          setRows(scope.tenants);
          setCanAccessGlobal(scope.canAccessGlobal);
          setHostTenantSlug(scope.hostTenantSlug);
          setLoadError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("Tenants unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const syncIndustryFromTenant = useCallback(
    (tenant: CommandCenterTenantRow | undefined) => {
      if (!tenant) return;
      setSelectedIndustry(tenantIndustryCodeToProfileLabel(tenant.industry));
    },
    [setSelectedIndustry],
  );

  /** Align Industry Profile + header with restored cookie once tenant rows load. */
  useEffect(() => {
    if (rows.length === 0) return;
    if (!canAccessGlobal) {
      const raw = readIronframeTenantCookie();
      const allowed = rows.some(
        (r) =>
          r.id === raw ||
          r.slug.toLowerCase() === (raw ?? "").toLowerCase(),
      );
      if (!allowed && rows.length === 1) {
        const only = rows[0]!;
        setIronframeTenantCookie(only.id);
        setIronguardEffectiveTenant(only.id);
        setSelectedTenantName(only.name?.trim() ? only.name.trim() : null);
        syncIndustryFromTenant(only);
        setCookieRevision((n) => n + 1);
      }
    }
    applyCommandCenterScopeFromCookie(rows, { setSelectedTenantName, setSelectedIndustry });
  }, [rows, cookieRevision, canAccessGlobal, setSelectedTenantName, setSelectedIndustry, syncIndustryFromTenant]);

  const selectedValue = useMemo(() => {
    void cookieRevision;
    const raw = readIronframeTenantCookie();
    if (!raw) return canAccessGlobal ? "global" : rows[0]?.id ?? "global";
    const lower = raw.toLowerCase();
    const bySlug = rows.find((r) => r.slug.toLowerCase() === lower);
    if (bySlug) return bySlug.id;
    if (UUID_RE.test(raw)) {
      const byId = rows.find((r) => r.id.toLowerCase() === lower);
      if (byId) return byId.id;
    }
    return canAccessGlobal ? "global" : rows[0]?.id ?? "global";
  }, [rows, cookieRevision, canAccessGlobal]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isSubdomainLocked) return;
    if (isDemoModeActive()) {
      const v = e.target.value;
      const tenant = rows.find((r) => r.id === v);
      setSelectedTenantName(tenant?.name?.trim() ? tenant.name.trim() : null);
      if (tenant) syncIndustryFromTenant(tenant);
      setIronframeTenantCookie(v);
      setIronguardEffectiveTenant(v);
      setCookieRevision((n) => n + 1);
      window.dispatchEvent(new CustomEvent("ironframe-tenant-changed"));
      return;
    }
    const v = e.target.value;
    setContextSwitching(true);
    const prevToken = normalizeScopeToken(readIronframeTenantCookie());
    const prevUuid = prevToken ?? "global";

    await purgeClientTenantScopeAfterSwitch();

    if (v === "global") {
      if (!canAccessGlobal) return;
      setIronframeTenantCookie(null);
      syncIronguardForRedTeamLane(true);
      setSelectedTenantName(null);
      setCookieRevision((n) => n + 1);
      try {
        const logRes = await logTenantScopeChangeAction({ prevUuid, nextUuid: "global" });
        if (!logRes.ok) console.error("[TenantSwitcher] audit log rejected:", logRes.error);
      } catch (err) {
        console.error("[TenantSwitcher] audit log failed", err);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ironframe-tenant-changed"));
      }
      window.location.assign(resolvePublicAppUrl());
      return;
    }
    const tenant = rows.find((r) => r.id === v);
    setIronframeTenantCookie(v);
    setIronguardEffectiveTenant(v);
    setSelectedTenantName(tenant?.name?.trim() ? tenant.name.trim() : null);
    if (tenant) syncIndustryFromTenant(tenant);
    setCookieRevision((n) => n + 1);
    try {
      const logRes = await logTenantScopeChangeAction({ prevUuid, nextUuid: v });
      if (!logRes.ok) console.error("[TenantSwitcher] audit log rejected:", logRes.error);
    } catch (err) {
      console.error("[TenantSwitcher] audit log failed", err);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ironframe-tenant-changed"));
    }
    if (tenant?.slug) {
      window.location.assign(buildTenantSubdomainOrigin(tenant.slug));
      return;
    }
    router.push("/");
    router.refresh();
  };

  const selectValue =
    selectedValue === "global"
      ? canAccessGlobal
        ? "global"
        : rows[0]?.id ?? "global"
      : rows.some((r) => r.id === selectedValue)
        ? selectedValue
        : canAccessGlobal
          ? "global"
          : rows[0]?.id ?? "global";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center gap-2 rounded-md border bg-slate-900 px-3 py-1.5 transition-colors ${
          isContextSwitching
            ? "border-amber-700/70 bg-amber-950/20"
            : "border-slate-800 hover:border-slate-700"
        }`}
        data-testid="tenant-context-switcher"
      >
        {isContextSwitching ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-400" aria-hidden />
        ) : (
          <Building2 className="h-4 w-4 shrink-0 text-cyan-500" />
        )}
        <select
          value={selectValue}
          onChange={(ev) => void handleChange(ev)}
          disabled={isContextSwitching || isSubdomainLocked}
          data-audit-target="Command Post Dropdown Activated"
          data-audit-section="Global Nav Header"
          className={`max-w-[min(22rem,72vw)] appearance-none bg-transparent pr-4 text-sm font-medium outline-none focus:ring-0 disabled:cursor-wait ${
            isSubdomainLocked
              ? "cursor-default text-slate-400"
              : "cursor-pointer"
          } ${
            isContextSwitching ? "text-amber-300" : "text-slate-200"
          }`}
          aria-label={
            isSubdomainLocked
              ? `Tenant locked to subdomain ${hostTenantSlug ?? clientHostSlug}`
              : "Global Command Center tenant scope"
          }
          aria-busy={isContextSwitching}
          title={
            isSubdomainLocked
              ? `Tenant scope is locked to the ${hostTenantSlug ?? clientHostSlug} subdomain`
              : undefined
          }
        >
        <option value="global" className="bg-slate-900 text-slate-200" disabled={!canAccessGlobal || isSubdomainLocked} hidden={!canAccessGlobal || isSubdomainLocked}>
          Global Command Center — Aggregate Dashboard
        </option>
        {loadError ? (
          <option value="_err" disabled className="bg-slate-900 text-amber-400">
            {loadError}
          </option>
        ) : null}
        {rows.map((t) => (
          <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
            {t.name} — {formatAleBaselineShort(t.aleBaselineCents)}
          </option>
        ))}
      </select>
      <ContextualHelpTrigger
        featureId="tenant-001"
        title="Multi-Tenant Context Switcher"
        location="Pinned to the far left edge of the global sub-header toolline, sitting directly above the Left Panel boundary."
        purpose="Swaps your complete display dashboard between separate corporate profiles to audit multi-tenant dataset boundaries."
        steps={[
          "Click the active tenant dropdown switcher and select an alternative company profile.",
          "Observe the amber dropdown indicator and the full-width ECG sweep across the top of your screen.",
          "Verify the sweep clears automatically once all left, center, and right panel data rows finish painting.",
        ]}
      />
      </div>
    </div>
  );
}
