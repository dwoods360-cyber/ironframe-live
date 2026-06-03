"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import {
  listCommandCenterTenants,
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
  const [rows, setRows] = useState<CommandCenterTenantRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Bumps after cookie writes so `selectedValue` recomputes before refresh completes. */
  const [cookieRevision, setCookieRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listCommandCenterTenants()
      .then((list) => {
        if (!cancelled) {
          setRows(list);
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
    applyCommandCenterScopeFromCookie(rows, { setSelectedTenantName, setSelectedIndustry });
  }, [rows, cookieRevision, setSelectedTenantName, setSelectedIndustry]);

  const selectedValue = useMemo(() => {
    void cookieRevision;
    const raw = readIronframeTenantCookie();
    if (!raw) return "global";
    const lower = raw.toLowerCase();
    const bySlug = rows.find((r) => r.slug.toLowerCase() === lower);
    if (bySlug) return bySlug.id;
    if (UUID_RE.test(raw)) {
      const byId = rows.find((r) => r.id.toLowerCase() === lower);
      return byId ? byId.id : "global";
    }
    return "global";
  }, [rows, cookieRevision]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    const prevToken = normalizeScopeToken(readIronframeTenantCookie());
    const prevUuid = prevToken ?? "global";

    await purgeClientTenantScopeAfterSwitch();

    if (v === "global") {
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
      router.push("/");
      router.refresh();
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
    router.push("/");
    router.refresh();
  };

  const selectValue =
    selectedValue === "global" ? "global" : rows.some((r) => r.id === selectedValue) ? selectedValue : "global";

  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 transition-colors hover:border-slate-700">
      <Building2 className="h-4 w-4 shrink-0 text-cyan-500" />
      <select
        value={selectValue}
        onChange={(ev) => void handleChange(ev)}
        className="max-w-[min(22rem,72vw)] cursor-pointer appearance-none bg-transparent pr-4 text-sm font-medium text-slate-200 outline-none focus:ring-0"
        aria-label="Global Command Center tenant scope"
      >
        <option value="global" className="bg-slate-900 text-slate-200">
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
        title="Command Center Dropdown Menu"
        location="Located at the top-left corner of the primary dashboard view canvas, right beneath the master header."
        purpose="Swaps the underlying client database context to verify zero data cross-bleed between enterprise tenants."
        steps={[
          "Click the active dropdown box showing the current company name.",
          "Select a different corporation from the options list.",
          "Verify that all central data grids briefly flash a loading skeleton and redraw with the new company's numbers.",
        ]}
      />
    </div>
  );
}
