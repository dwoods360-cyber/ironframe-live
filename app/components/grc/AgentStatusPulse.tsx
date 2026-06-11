"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTenantContext } from "@/app/context/TenantProvider";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";
import { useAgentStore } from "@/app/store/agentStore";
import { LeftPanelFeatureIndex } from "@/app/components/leftPanel/LeftPanelFeatureIndex";

export interface AgentStatusPulseProps {
  /** Single left-click — toggle 19-agent overview overlay. */
  onSingleClick: () => void;
  /** Double left-click — flush system telemetry cache. */
  onDoubleClick: () => void;
  /** Right-click — open Agent Log Inspector (native context menu not blocked). */
  onRightClick: () => void;
}

/** Tenant-scoped THREATS_RESOLVED scoreboard — vault shortcut + portaled agent rank tooltip. */
export function AgentKillsInlineTag({ featureIndex }: { featureIndex?: number } = {}) {
  const { activeTenantUuid } = useTenantContext();
  const tenantScopeForKills = resolveDashboardTenantUuid(activeTenantUuid);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    useAgentStore.getState().hydrateAgentKillsFromStorage();
  }, [tenantScopeForKills]);

  const agentKills = useAgentStore((s) => s.agentKills);
  const { total, top3, tooltipLines } = useMemo(() => {
    const entries = Object.entries(agentKills) as [string, number][];
    const t = entries.reduce((sum, [, n]) => sum + n, 0);
    const ranked = [...entries].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const lines =
      t === 0
        ? ["No threats resolved yet.", "Top credited workforce agents appear here after card resolution."]
        : ranked.map(([n, c]) => `${n.toUpperCase()}: ${c}`);
    return { total: t, top3: ranked, tooltipLines: lines };
  }, [agentKills]);

  const repositionTooltip = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltipPos({
      left: Math.min(Math.max(rect.left, 12), window.innerWidth - 220),
      top: rect.bottom + 6,
    });
  }, []);

  useEffect(() => {
    if (!hovered) return;
    repositionTooltip();
    window.addEventListener("scroll", repositionTooltip, true);
    window.addEventListener("resize", repositionTooltip);
    return () => {
      window.removeEventListener("scroll", repositionTooltip, true);
      window.removeEventListener("resize", repositionTooltip);
    };
  }, [hovered, repositionTooltip]);

  const tooltipSummary = top3.length
    ? top3.map(([n, c]) => `${n.toUpperCase()}: ${c}`).join(" | ")
    : "Resolved-threat attribution (none yet)";

  return (
    <>
      <Link
        ref={anchorRef}
        href="/evidence-vault"
        className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap font-mono text-[9px] font-bold text-slate-400 transition-colors hover:text-teal-400"
        aria-label={`Threats resolved ${total} — open Evidence Vault. ${tooltipSummary}`}
        onMouseEnter={() => {
          setHovered(true);
          repositionTooltip();
        }}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => {
          setHovered(true);
          repositionTooltip();
        }}
        onBlur={() => setHovered(false)}
      >
        {featureIndex != null ? <LeftPanelFeatureIndex index={featureIndex} /> : null}
        THREATS_RESOLVED: {total}
      </Link>
      {mounted && hovered && tooltipPos
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[210] max-w-[14rem] rounded border border-zinc-700 bg-zinc-950/98 px-2.5 py-2 shadow-lg"
              style={{ left: tooltipPos.left, top: tooltipPos.top }}
            >
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">
                Top attributed agents
              </p>
              <ul className="mt-1 space-y-0.5 font-mono text-[9px] leading-snug text-slate-300">
                {tooltipLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export const AgentStatusPulse: React.FC<AgentStatusPulseProps> = ({
  onSingleClick,
  onDoubleClick,
  onRightClick,
}) => {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSingleClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={() => {
          onRightClick();
        }}
        className="relative flex h-4 w-4 items-center justify-center rounded-full bg-teal-500/20 focus:outline-none focus:ring-2 focus:ring-teal-400"
        title="Agent Status Pulse (Left-click: Status | Double-click: Flush | Right-click: Logs)"
        aria-label="Agent status pulse — left-click roster overlay, double-click flush telemetry, right-click agent logs"
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
      </button>
      <span className="select-none font-mono text-xs text-teal-400">PULSE-002</span>
    </div>
  );
};

export default AgentStatusPulse;
