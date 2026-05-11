"use client";

import Link from "next/link";
import { Folder } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTenantContext } from "@/app/context/TenantProvider";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";
import { useAgentStore } from "@/app/store/agentStore";

/**
 * Primary workspace sidebar rail — Evidence Vault entry + version-manifest kill tally (tenant-scoped).
 */
export default function Sidebar() {
  const { activeTenantUuid } = useTenantContext();
  const tenantScopeForKills = resolveDashboardTenantUuid(activeTenantUuid);

  useEffect(() => {
    useAgentStore.getState().hydrateAgentKillsFromStorage();
  }, [tenantScopeForKills]);

  const agentKills = useAgentStore((s) => s.agentKills);
  const { total, tooltip } = useMemo(() => {
    const entries = Object.entries(agentKills) as [string, number][];
    const t = entries.reduce((sum, [, n]) => sum + n, 0);
    const top3 = [...entries].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const tip =
      t === 0 ? "Resolved-threat kills (top 3 hover)" : top3.map(([n, c]) => `${n.toUpperCase()}: ${c}`).join(" | ");
    return { total: t, tooltip: tip };
  }, [agentKills]);

  return (
    <nav
      className="flex min-h-0 shrink-0 flex-col items-center gap-2 border-b border-slate-800/80 bg-slate-950/95 px-2 py-3"
      aria-label="Workspace shortcuts"
    >
      <Link
        href="/vault"
        title="Evidence Vault"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-teal-600/50 bg-teal-950/45 text-teal-100 transition-colors hover:border-teal-400 hover:bg-teal-900/55"
      >
        <Folder className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="sr-only">Evidence Vault</span>
      </Link>
      <div
        className="mt-auto max-w-[10rem] cursor-help text-center font-mono text-[7px] leading-tight tracking-tight text-cyan-400/90"
        title={tooltip}
      >
        AGENT_KILLS: {total}
      </div>
    </nav>
  );
}
