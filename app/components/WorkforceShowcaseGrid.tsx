"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAgentRiskStore } from "@/app/store/agentRiskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { useGrcBotStore } from "@/app/store/grcBotStore";
import { useKimbotStore } from "@/app/store/kimbotStore";
import { useRiskStore } from "@/app/store/riskStore";
import {
  buildShowcaseAgentTelemetry,
  statusSurface,
  type ShowcaseAgentTelemetry,
} from "@/app/utils/workforceShowcaseTelemetry";
import { LeftPanelFeatureTitle } from "@/app/components/leftPanel/LeftPanelFeatureIndex";
import { LP_FEATURE } from "@/app/config/leftPanelFeatureIndex";

type WorkforceShowcaseGridProps = {
  tenantUuid: string | null;
};

function formatAgentIndex(index: number): string {
  return String(index).padStart(2, "0");
}

function ShowcaseCard({
  agent,
  onHover,
  onLeave,
}: {
  agent: ShowcaseAgentTelemetry;
  onHover: (agent: ShowcaseAgentTelemetry, rect: DOMRect) => void;
  onLeave: () => void;
}) {
  const surface = statusSurface(agent.status);
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      className="group flex flex-col items-center gap-1 rounded-sm border border-zinc-900 bg-black p-2.5 transition-colors hover:border-zinc-700"
      data-testid={`workforce-showcase-${agent.name.toLowerCase()}`}
      onMouseEnter={() => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (rect) onHover(agent, rect);
      }}
      onFocus={() => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (rect) onHover(agent, rect);
      }}
      onMouseLeave={onLeave}
      onBlur={onLeave}
      tabIndex={0}
      role="group"
      aria-label={`Agent ${formatAgentIndex(agent.index)} ${agent.name} — ${agent.status}`}
    >
      <span
        className={`mb-1 text-xl transition-transform group-hover:scale-110 ${agent.accentClass} ${surface.iconGlowClass}`}
      >
        {agent.icon}
      </span>
      <span className="text-[7px] font-black uppercase tracking-widest text-zinc-600">
        Agent {formatAgentIndex(agent.index)}
      </span>
      <span className="text-center text-[8px] font-black uppercase leading-none tracking-tighter text-zinc-500">
        {agent.name}
      </span>
      <div className="mt-1 flex items-center gap-1.5">
        <div
          className={`h-1 w-1 rounded-full ${surface.dotClass} ${surface.pulseDot ? "animate-pulse" : ""}`}
        />
        <span className={`text-[7px] font-bold uppercase tracking-widest ${surface.textClass}`}>
          {surface.label}
        </span>
      </div>
    </div>
  );
}

function ShowcaseTooltip({
  agent,
  anchorRect,
}: {
  agent: ShowcaseAgentTelemetry;
  anchorRect: DOMRect;
}) {
  const left = Math.min(Math.max(anchorRect.left, 12), window.innerWidth - 240);
  const top = anchorRect.bottom + 8;

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[220] max-w-[15rem] rounded border border-zinc-700 bg-zinc-950/98 px-2.5 py-2 shadow-lg"
      style={{ left, top }}
    >
      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">
        Agent {formatAgentIndex(agent.index)} — {agent.name}
      </p>
      <p className="mt-0.5 text-[9px] leading-snug text-zinc-300">{agent.role}</p>
      <ul className="mt-2 space-y-0.5 font-mono text-[9px] text-zinc-400">
        <li>
          Status: <span className={statusSurface(agent.status).textClass}>{agent.status}</span>
        </li>
        <li>
          Events/sec:{" "}
          <span className="text-sky-300">{agent.tenantBound ? agent.eventsPerSec.toFixed(2) : "—"}</span>
        </li>
        <li>
          Health:{" "}
          <span className="text-emerald-300/90">
            {agent.healthScore != null ? agent.healthScore : "—"}
          </span>{" "}
          · Risk: <span className="text-zinc-300">{agent.riskLevel}</span>
        </li>
        <li>
          Pulse: <span className="text-zinc-300">{agent.pulse}</span>
          {agent.telemetryActive ? (
            <span className="text-emerald-400"> · LIVE</span>
          ) : null}
        </li>
        <li>
          Tenant scope:{" "}
          <span className={agent.tenantBound ? "text-emerald-400" : "text-amber-400"}>
            {agent.tenantBound ? "bound" : "awaiting bind"}
          </span>
        </li>
      </ul>
    </div>
  );
}

export default function WorkforceShowcaseGrid({ tenantUuid }: WorkforceShowcaseGridProps) {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<{
    agent: ShowcaseAgentTelemetry;
    rect: DOMRect;
  } | null>(null);

  const pipelineThreats = useRiskStore((s) => s.pipelineThreats ?? []);
  const activeThreats = useRiskStore((s) => s.activeThreats ?? []);
  const intelligenceStream = useAgentStore((s) => s.intelligenceStream);
  const agentTelemetryPulseUntil = useAgentStore((s) => s.agentTelemetryPulseUntil);
  const telemetryTenantScope = useAgentStore((s) => s.telemetryTenantScope);
  const systemLatencyMs = useAgentStore((s) => s.systemLatencyMs);
  const setTelemetryTenantScope = useAgentStore((s) => s.setTelemetryTenantScope);
  const agentRiskByIndex = useAgentRiskStore((s) => s.byIndex);
  const executionStrainByIndex = useAgentRiskStore((s) => s.executionStrainByIndex);
  const instrumentedAgents = useAgentStore((s) => s.agents);
  const agentProcessingSince = useAgentStore((s) => s.agentProcessingSince);
  const [strainClock, setStrainClock] = useState(0);
  const isKimbotActive = useKimbotStore((s) => s.enabled);
  const isGrcbotActive = useGrcBotStore((s) => s.enabled);
  const grcBotCompanyCount = useGrcBotStore((s) => s.companyCount);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTelemetryTenantScope(tenantUuid);
  }, [tenantUuid, setTelemetryTenantScope]);

  useEffect(() => {
    const id = window.setInterval(() => setStrainClock((t) => t + 1), 3000);
    return () => window.clearInterval(id);
  }, []);

  const agents = useMemo(
    () =>
      buildShowcaseAgentTelemetry({
        activeTenantUuid: tenantUuid,
        telemetryTenantScope,
        activeThreats,
        pipelineThreats,
        intelligenceStream,
        agentTelemetryPulseUntil,
        agentRiskByIndex,
        executionStrainByIndex,
        agentProcessingSince,
        instrumentedAgentStatus: instrumentedAgents,
        systemLatencyMs,
        isKimbotActive,
        isGrcbotActive,
        grcBotCompanyCount,
        nowMs: Date.now(),
      }),
    [
      tenantUuid,
      telemetryTenantScope,
      activeThreats,
      pipelineThreats,
      intelligenceStream,
      agentTelemetryPulseUntil,
      agentRiskByIndex,
      executionStrainByIndex,
      agentProcessingSince,
      instrumentedAgents,
      systemLatencyMs,
      isKimbotActive,
      isGrcbotActive,
      grcBotCompanyCount,
      strainClock,
    ],
  );

  const handleHover = useCallback((agent: ShowcaseAgentTelemetry, rect: DOMRect) => {
    setHovered({ agent, rect });
  }, []);

  const handleLeave = useCallback(() => {
    setHovered(null);
  }, []);

  return (
    <section className="border-b border-zinc-900 bg-[#050509] p-4" aria-label="Active Agents workforce showcase">
      <LeftPanelFeatureTitle
        index={LP_FEATURE.ACTIVE_AGENTS_SHOWCASE}
        as="h3"
        className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500"
      >
        Active Agents // 19-Agent Workforce
      </LeftPanelFeatureTitle>
      <div className="grid grid-cols-3 gap-2" data-testid="workforce-showcase-grid">
        {agents.map((agent) => (
          <ShowcaseCard key={agent.name} agent={agent} onHover={handleHover} onLeave={handleLeave} />
        ))}
      </div>
      {mounted && hovered
        ? createPortal(
            <ShowcaseTooltip agent={hovered.agent} anchorRect={hovered.rect} />,
            document.body,
          )
        : null}
    </section>
  );
}
