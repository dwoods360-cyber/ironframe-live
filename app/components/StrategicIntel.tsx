'use client';

import React, { useState, useEffect, useRef, useMemo, ChangeEvent, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, CheckCircle2, ShieldCheck, Brain, Shield, Search, ChevronDown, Info } from 'lucide-react';
import { useRiskStore, type PipelineThreat } from '@/app/store/riskStore';
import { appendAuditLog } from '@/app/utils/auditLogger';
import { useAgentStore } from '@/app/store/agentStore';
import { useShallow } from 'zustand/react/shallow';
import { useKimbotStore } from '@/app/store/kimbotStore';
import { useGrcBotStore } from '@/app/store/grcBotStore';
import { useSystemConfigStore } from '@/app/store/systemConfigStore';
import { getDbQueryMs } from '@/app/actions/simulation';
import { wakeBlueTeam, sleepBlueTeam } from '@/app/utils/blueTeamSync';
import { purgeSimulation } from '@/app/actions/purgeSimulation';
import { GRC_RESOLUTION_GATE_ADMIN_BYPASS_DETAIL } from '@/src/constants/grcManualPurge';
import { syncThreatBoardsClient } from '@/app/utils/syncThreatBoardsClient';
import { formatRiskExposure } from "@/app/utils/riskFormatting";
import { triggerLiveThreatSimulation } from "@/app/actions/attbotActions";
import { applyManualSimulationStandDownResumeFeed } from "@/app/utils/manualSimulationStandDownFeed";
import { ThreatDetailModal } from "@/app/components/ThreatDetailModal";
import {
  THREAT_MAP,
  mapUiIndustryToThreatEnum,
  type ThreatIntelEntry,
  threatImpactToLossM,
} from "@/lib/simulation/threatLibrary";
import { useTenantContext } from "@/app/context/TenantProvider";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";
import { getIndustryTrendData, type IndustryTrendPayload } from "@/app/actions/benchmarkActions";
import { getTenantGovernanceMultiplierBps } from "@/app/actions/complianceActions";
import { triggerMarketVolatilityAutoHardening } from "@/app/actions/agentActions";
import RiskExposureTrend from "@/components/RiskExposureTrend";
import PublicSectorProgress from "@/components/PublicSectorProgress";
import MarketVolatilityAlert from "@/components/MarketVolatilityAlert";
import { ExposureDefinitionHint } from "@/components/ExposureDefinitions";
import SentinelSweepModal from "@/components/SentinelSweepModal";
import {
  DEFENSE_REGULATORY_SHIELD_BADGE_LABEL,
  IRONWATCH_HISTORICAL_CHAPTER_HREF,
  IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL,
  IRONWATCH_SHADOW_DISSENT_LABEL,
} from "@/lib/constants/grcGovernance";
import { INDUSTRY_PROFILE_SELECT_OPTIONS } from "@/app/utils/omniBenchmarkIndustries";

export default function StrategicIntel() {
  const [mounted, setMounted] = useState(false);
  const [ttlSeconds, setTtlSeconds] = useState(72 * 60 * 60); // default 72h
  const [ttlInput, setTtlInput] = useState('72:00:00');
  const [ttlRunning, setTtlRunning] = useState(false);
  const [agentInstruction, setAgentInstruction] = useState('');
  const [terminalCommand, setTerminalCommand] = useState('');
  const [terminalInput, setTerminalInput] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const [activeDrillThreatId, setActiveDrillThreatId] = useState<string | null>(null);
  const [deepDiveEntry, setDeepDiveEntry] = useState<ThreatIntelEntry | null>(null);
  const [sentinelSweepModalOpen, setSentinelSweepModalOpen] = useState(false);
  const [ironwatchSidebarAlert, setIronwatchSidebarAlert] = useState<string | null>(null);
  const [isDrillPending, startDrillTransition] = useTransition();
  const [trendPayload, setTrendPayload] = useState<IndustryTrendPayload | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [tenantGovernanceMultX, setTenantGovernanceMultX] = useState<number | null>(null);
  const intelStreamRef = useRef<HTMLDivElement | null>(null);
  const { activeTenantUuid } = useTenantContext();
  const dashboardTenantUuid = useMemo(
    () => resolveDashboardTenantUuid(activeTenantUuid),
    [activeTenantUuid],
  );

  // Global risk store: sidebar threats + dashboard liabilities + Scenario 3 risk reduction
  const dashboardLiabilities = useRiskStore((state) => state.dashboardLiabilities);
  const activeSidebarThreats = useRiskStore((state) => state.activeSidebarThreats);
  const toggleSidebarThreat = useRiskStore((state) => state.toggleSidebarThreat);
  const clearActiveSidebarThreats = useRiskStore((state) => state.clearActiveSidebarThreats);
  const riskOffset = useRiskStore((state) => state.riskOffset);
  const riskReductionFlash = useRiskStore((state) => state.riskReductionFlash);
  const clearRiskReductionFlash = useRiskStore((state) => state.clearRiskReductionFlash);
  const pipelineThreats = useRiskStore((state) => state.pipelineThreats ?? (state as { threats?: PipelineThreat[] }).threats ?? (state as { pipeline?: PipelineThreat[] }).pipeline ?? []);
  const activeThreats = useRiskStore((state) => state.activeThreats ?? []);
  const acceptedThreatImpacts = useRiskStore((state) => state.acceptedThreatImpacts);
  const removeThreatFromPipeline = useRiskStore((state) => state.removeThreatFromPipeline);
  const upsertPipelineThreat = useRiskStore((state) => state.upsertPipelineThreat);
  const selectedIndustry = useRiskStore((state) => state.selectedIndustry);
  const setSelectedIndustry = useRiskStore((state) => state.setSelectedIndustry);
  const completedDeepDives = useRiskStore((state) => state.completedDeepDives);
  const markDeepDiveCompleted = useRiskStore((state) => state.markDeepDiveCompleted);
  const lastSimulationStartedAt = useRiskStore((state) => state.lastSimulationStartedAt);
  const setLastSimulationStartedAt = useRiskStore((state) => state.setLastSimulationStartedAt);
  const currencyScale = useRiskStore((state) => state.currencyScale);
  const getTotalCurrentRiskCents = useRiskStore((state) => state.getTotalCurrentRiskCents);
  const getGrcGapCents = useRiskStore((state) => state.getGrcGapCents);

  // Agent / Coreintel state
  const agents = useAgentStore((s) => s.agents);
  const intelligenceStream = useAgentStore((s) => s.intelligenceStream);
  const addStreamMessage = useAgentStore((s) => s.addStreamMessage);
  const setAgentStatus = useAgentStore((s) => s.setAgentStatus);
  const systemLatencyMs = useAgentStore((s) => s.systemLatencyMs);
  const setSystemLatencyMs = useAgentStore((s) => s.setSystemLatencyMs);

  const isKimbotActive = useKimbotStore((s) => s.enabled);
  const grcBotCompanyCount = useGrcBotStore((s) => s.companyCount);
  const isGrcbotActive = useGrcBotStore((s) => s.enabled);
  const expertModeEnabled = useSystemConfigStore().expertModeEnabled;
  const router = useRouter();

  useEffect(() => {
    if (!dashboardTenantUuid) {
      setTenantGovernanceMultX(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const g = await getTenantGovernanceMultiplierBps(dashboardTenantUuid);
      if (cancelled) return;
      if (g.ok) setTenantGovernanceMultX(g.bps / 100);
    })();
    return () => {
      cancelled = true;
    };
  }, [dashboardTenantUuid]);

  useEffect(() => {
    let cancelled = false;
    if (!dashboardTenantUuid) {
      setTrendLoading(false);
      setTrendPayload(null);
      return;
    }
    setTrendLoading(true);
    void (async () => {
      const res = await getIndustryTrendData(dashboardTenantUuid, selectedIndustry);
      if (cancelled) return;
      setTrendLoading(false);
      if (!res.ok) {
        setTrendPayload(null);
        return;
      }
      setTrendPayload(res.payload);
      if (res.payload.isMarketVolatile && res.payload.volatilityEpisodeKey) {
        const hr = await triggerMarketVolatilityAutoHardening(
          dashboardTenantUuid,
          res.payload.volatilityEpisodeKey,
          res.payload.marketVolatilityDeltaV,
        );
        if (!cancelled && hr.ok && hr.created > 0) {
          addStreamMessage(
            `> [MARKET] Auto-hardening: ${hr.created} priority validation event(s) · Ironsight/Ironlock 4h window.`,
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dashboardTenantUuid, selectedIndustry, addStreamMessage]);

  // Agent status: Healthy (green) or Alerting (red) when Kimbot sim is active for Ironsight / Ironintel
  const getAgentStatus = (agentName: string) => {
    if (isKimbotActive && (agentName === 'Ironsight' || agentName === 'Ironintel')) {
      return { label: 'Alerting', color: 'text-red-500', dot: 'bg-red-500 shadow-[0_0_8px_#ef4444]' };
    }
    return { label: 'Healthy', color: 'text-emerald-500', dot: 'bg-emerald-500 shadow-[0_0_8px_#10b981]' };
  };

  const { strategicStatusLabel, strategicStatusClass, activeSimulationCount } = useMemo(() => {
    const isSimThreat = (t: PipelineThreat): boolean => {
      const s = (t.source ?? "").toUpperCase();
      const n = (t.name ?? "").toUpperCase();
      return (
        s.includes("PHISHBOT") ||
        s.includes("INFILBOT") ||
        s.includes("IRONSIGHT") ||
        s.includes("IRONMAP") ||
        s.includes("SIMULATION") ||
        n.includes("STRATEGIC INTEL") ||
        n.includes("SIMULATED")
      );
    };
    const seen = new Set<string>();
    let count = 0;
    for (const t of pipelineThreats) {
      if (!isSimThreat(t) || seen.has(t.id)) continue;
      seen.add(t.id);
      count += 1;
    }
    for (const t of activeThreats) {
      if (!isSimThreat(t) || seen.has(t.id)) continue;
      seen.add(t.id);
      count += 1;
    }
    const label = count === 0 ? "STABLE" : count <= 2 ? "ELEVATED" : "CRITICAL";
    const cls =
      count === 0 ? "text-emerald-400" : count <= 2 ? "text-amber-400" : "text-red-400";
    return {
      strategicStatusLabel: label,
      strategicStatusClass: cls,
      activeSimulationCount: count,
    };
  }, [pipelineThreats, activeThreats]);

  const [timerNowMs, setTimerNowMs] = useState<number>(() => Date.now());
  const [frozenElapsedMs, setFrozenElapsedMs] = useState<number>(0);

  const liveElapsedMs = useMemo(() => {
    if (!lastSimulationStartedAt) return 0;
    const startMs = Date.parse(lastSimulationStartedAt);
    if (Number.isNaN(startMs)) return 0;
    return Math.max(0, timerNowMs - startMs);
  }, [lastSimulationStartedAt, timerNowMs]);

  useEffect(() => {
    if (strategicStatusLabel !== "STABLE") {
      setFrozenElapsedMs(liveElapsedMs);
      return;
    }
    setTimerNowMs(Date.now());
    const id = window.setInterval(() => setTimerNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [strategicStatusLabel, liveElapsedMs]);

  function formatStabilityDuration(ms: number): string {
    const clamped = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(clamped / 86400);
    const hours = Math.floor((clamped % 86400) / 3600);
    const minutes = Math.floor((clamped % 3600) / 60);
    return `${days.toString().padStart(2, "0")}d : ${hours.toString().padStart(2, "0")}h : ${minutes.toString().padStart(2, "0")}m`;
  }

  const stabilityDisplay = strategicStatusLabel === "STABLE"
    ? formatStabilityDuration(liveElapsedMs)
    : formatStabilityDuration(frozenElapsedMs);

  const supplyChainImpactScore = (t: PipelineThreat): number | null => {
    const src = (t.source ?? "").toLowerCase();
    const name = (t.name ?? "").toLowerCase();
    const desc = (t.description ?? "").toLowerCase();
    const isSupplyChain =
      src.includes("vendor") ||
      src.includes("nth-party") ||
      src.includes("third") ||
      desc.includes("vendor artifact") ||
      desc.includes("nth-party") ||
      name.includes("vendor") ||
      name.includes("third-party") ||
      name.includes("third party") ||
      name.includes("artifact");
    if (!isSupplyChain) return null;

    const hasCriticalAccess =
      name.includes("patient records") ||
      name.includes("core infrastructure") ||
      desc.includes("patient records") ||
      desc.includes("core infrastructure");
    return hasCriticalAccess ? 9.2 : 8.6;
  };

  // Terminal: kimbot | grcbot | purg — Kimbot is the red-team injector (Ironbloom is production CSRD; not toggled here).
  const handleTerminalCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = terminalInput.trim();
    if (!input) return;
    const lower = input.toLowerCase();
    const [cmd, value] = lower.split(/\s+/);

    setLogs((prev) => [...prev, `> [CMD] ${input.toUpperCase()}`]);
    setTerminalInput('');

    try {
      switch (cmd) {
        case 'kimbot':
          setLogs((prev) => [...prev, '[SYSTEM] KIMBOT_START: Red-team adversary injector (SIM)']);
          useKimbotStore.getState().setEnabled(true);
          wakeBlueTeam();
          addStreamMessage('> [CMD] KIMBOT_START: Defensive agents deployed.');
          break;

        case 'kimbotx':
          setLogs((prev) => [...prev, '[SYSTEM] KIMBOT_STOP: Agents reset']);
          useKimbotStore.getState().setEnabled(false);
          sleepBlueTeam();
          addStreamMessage('> [CMD] KIMBOT_STOP: Agents reset to Healthy.');
          break;

        case 'grcbot': {
          const n = Math.min(100, Math.max(1, parseInt(value, 10) || 1));
          setLogs((prev) => [...prev, `[SYSTEM] GRCBOT_START: Scaling to ${n} ingestions`]);
          useGrcBotStore.getState().setCompanyCount(n);
          useGrcBotStore.getState().setEnabled(true);
          addStreamMessage(`> [CMD] GRCBOT_START: ${n}-company load simulation active.`);
          break;
        }

        case 'grcbotx':
          setLogs((prev) => [...prev, '[SYSTEM] GRCBOT_STOP: Simulation halted']);
          useGrcBotStore.getState().setEnabled(false);
          addStreamMessage('> [CMD] GRCBOT_STOP: Simulation halted.');
          break;

        case 'purg':
          setLogs((prev) => [...prev, '[SYSTEM] DATA_PURGE: Wiping simulation records']);
          const result = await purgeSimulation();
          if (result.ok) {
            useKimbotStore.getState().resetSimulationCounters();
            useGrcBotStore.getState().stop();
            useRiskStore.getState().clearAllRiskStateForPurge();
            useRiskStore.getState().setSelectedThreatId(null);
            sleepBlueTeam();
            await syncThreatBoardsClient(
              useRiskStore.getState().replacePipelineThreats,
              useRiskStore.getState().replaceActiveThreats,
            ).catch(() => {});
            addStreamMessage(
              `> [GRC] ${GRC_RESOLUTION_GATE_ADMIN_BYPASS_DETAIL} — Bank Vault MANUAL_BOARD_PURGE recorded.`,
            );
            setLogs((prev) => [
              ...prev,
              '[AUDIT] Forensic ledger preserved — use Audit Intelligence → Master Purge to wipe local buffer.',
            ]);
            setLogs((prev) => [...prev, '[SYSTEM] DATABASE PURGE COMPLETE. STANDING BY.']);
            addStreamMessage('> [SYSTEM] DATABASE PURGE COMPLETE. STANDING BY.');
            router.refresh();
          } else {
            setLogs((prev) => [...prev, `[CMD] PURGE_ERROR: ${result.message}`]);
          }
          break;

        default:
          setLogs((prev) => [...prev, `[ERROR] Unknown command: ${cmd}`]);
      }
    } catch (error) {
      setLogs((prev) => [...prev, `[CRITICAL] Execution failed: ${error instanceof Error ? error.message : 'Unknown'}`]);
    }
  };

  /**
   * Restored: Stakeholder Notification Routing
   * Dispatches verified threats to primary business contact [cite: 2025-12-18]
   */
  const dispatchStakeholderAlert = async (threatId: string, severity: 'HIGH' | 'CRITICAL') => {
    const stakeholderEmail = 'blackwoodscoffee@gmail.com'; // [cite: 2025-12-18]

    setLogs((prev) => [
      ...prev,
      `[NOTIFY] Alert queued for ${stakeholderEmail} [cite: 2025-12-18]`,
      '[SYSTEM] Routing via Ironcast agent...',
    ]);

    try {
      const response = await fetch('/api/alerts/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: stakeholderEmail,
          threatId,
          severity,
          agentSource: 'Ironintel',
        }),
      });

      if (response.ok) {
        setLogs((prev) => [...prev, `[SUCCESS] Alert delivered to ${stakeholderEmail} [cite: 2025-12-18]`]);
      } else {
        setLogs((prev) => [...prev, `[ERROR] Dispatch failed: ${response.status}`]);
      }
    } catch {
      setLogs((prev) => [...prev, '[ERROR] Dispatch failed: Stakeholder offline']);
    }
  };

  // Legacy terminal handler (expert panel): still uses terminalCommand + addStreamMessage
  const handleLegacyTerminalCommand = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;

    if (cmd === 'kimbot') {
      useKimbotStore.getState().setEnabled(true);
      wakeBlueTeam();
      addStreamMessage('> [CMD] KIMBOT_START: Defensive agents deployed.');
    } else if (cmd === 'kimbotx') {
      useKimbotStore.getState().setEnabled(false);
      sleepBlueTeam();
      addStreamMessage('> [CMD] KIMBOT_STOP: Agents reset to Healthy.');
    } else if (cmd === 'grcbotx') {
      useGrcBotStore.getState().setEnabled(false);
      addStreamMessage('> [CMD] GRCBOT_STOP: Simulation halted.');
    } else if (cmd.startsWith('grcbot')) {
      const parts = cmd.split(/\s+/);
      const countArg = parts[1] != null ? parseInt(parts[1], 10) : NaN;
      const count = Number.isFinite(countArg) && countArg >= 1
        ? Math.min(100, Math.max(1, countArg))
        : 100;
      useGrcBotStore.getState().setCompanyCount(count);
      useGrcBotStore.getState().setEnabled(true);
      addStreamMessage(`> [CMD] GRCBOT_START: ${count}-company load simulation active.`);
    } else if (cmd === 'purg') {
      addStreamMessage('> [CMD] PURGE: Initiating deep wipe (DB + uploads + audit)...');
      purgeSimulation().then((result) => {
        if (result.ok) {
          useKimbotStore.getState().resetSimulationCounters();
          useGrcBotStore.getState().stop();
          useRiskStore.getState().clearAllRiskStateForPurge();
          useRiskStore.getState().setSelectedThreatId(null);
          sleepBlueTeam();
          void syncThreatBoardsClient(
            useRiskStore.getState().replacePipelineThreats,
            useRiskStore.getState().replaceActiveThreats,
          ).catch(() => {});
          addStreamMessage(
            `> [GRC] ${GRC_RESOLUTION_GATE_ADMIN_BYPASS_DETAIL} — Bank Vault MANUAL_BOARD_PURGE recorded.`,
          );
          addStreamMessage(
            '> [AUDIT] Forensic ledger preserved — Master Purge (Audit Intelligence) clears local buffer.',
          );
          addStreamMessage('> [SYSTEM] DATABASE PURGE COMPLETE. STANDING BY.');
          router.refresh();
        } else {
          addStreamMessage(`> [CMD] PURGE_ERROR: ${result.message}`);
        }
      });
    } else {
      addStreamMessage(`> [CMD] UNKNOWN: "${cmd}". Use: kimbot | kimbotx | grcbot [1-100] | grcbotx | purg`);
    }
    setTerminalCommand('');
  };

  // New States for the Industry Profile UX (isProfileVisible kept at top with isExpertMode)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isFirstIndustryMount = useRef(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validProfileIndustries = [
    "Defense",
    "Federal Government",
    "Aerospace",
    "State & Local",
    "Public Sector",
    "Healthcare",
    "Finance",
    "Technology",
  ] as const;
  useEffect(() => {
    if (!validProfileIndustries.includes(selectedIndustry as (typeof validProfileIndustries)[number])) {
      setSelectedIndustry("Healthcare");
    }
  }, [selectedIndustry, setSelectedIndustry]);

  // When user changes industry: show "Analyzing..." visual state (skip on first mount). Data arrays remain persisted in stores.
  useEffect(() => {
    if (isFirstIndustryMount.current) {
      isFirstIndustryMount.current = false;
      return;
    }
    setIsAnalyzing(true);
    const t = setTimeout(() => setIsAnalyzing(false), 1500);
    return () => clearTimeout(t);
  }, [selectedIndustry]);

  // Scenario 3: clear green flash after brief display
  useEffect(() => {
    if (!riskReductionFlash) return;
    const t = setTimeout(() => clearRiskReductionFlash(), 800);
    return () => clearTimeout(t);
  }, [riskReductionFlash, clearRiskReductionFlash]);

  // Auto-scroll Coreintel stream to bottom when new messages arrive
  useEffect(() => {
    if (!intelStreamRef.current) return;
    const el = intelStreamRef.current;
    el.scrollTop = el.scrollHeight;
  }, [intelligenceStream.length, logs.length]);

  // Wake up instrumented agents: when Kimbot sim is active, set core trio to ACTIVE_DEFENSE (green pulsing).
  useEffect(() => {
    if (isKimbotActive) {
      setAgentStatus('ironsight', 'ACTIVE_DEFENSE');
      setAgentStatus('coreintel', 'ACTIVE_DEFENSE');
      setAgentStatus('agentManager', 'ACTIVE_DEFENSE');
    } else {
      setAgentStatus('ironsight', 'HEALTHY');
      setAgentStatus('coreintel', 'HEALTHY');
      setAgentStatus('agentManager', 'HEALTHY');
    }
  }, [isKimbotActive, setAgentStatus]);

  // When GRCBOT is simulating 100 companies, poll system latency for High Load warning.
  useEffect(() => {
    if (!isGrcbotActive || grcBotCompanyCount < 100) return;
    let mounted = true;
    const poll = async () => {
      try {
        const { ms } = await getDbQueryMs();
        if (!mounted) return;
        const cur = useAgentStore.getState().systemLatencyMs;
        if (ms !== cur) setSystemLatencyMs(ms);
      } catch {
        if (!mounted) return;
        const cur = useAgentStore.getState().systemLatencyMs;
        if (cur !== null) setSystemLatencyMs(null);
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [isGrcbotActive, grcBotCompanyCount, setSystemLatencyMs]);

  // Countdown loop: once SET starts the timer, tick down to 0.
  useEffect(() => {
    if (!ttlRunning) return;
    if (ttlSeconds <= 0) {
      setTtlRunning(false);
      setTtlInput('00:00:00');
      return;
    }

    const intervalId = setInterval(() => {
      setTtlSeconds((prev) => {
        const next = Math.max(0, prev - 1);
        const hh = Math.floor(next / 3600).toString().padStart(2, '0');
        const mm = Math.floor((next % 3600) / 60).toString().padStart(2, '0');
        const ss = (next % 60).toString().padStart(2, '0');
        setTtlInput(`${hh}:${mm}:${ss}`);

        if (next === 0) {
          setTtlRunning(false);
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [ttlRunning, ttlSeconds]);

  const sectorThreatLibrary = THREAT_MAP[mapUiIndustryToThreatEnum(selectedIndustry)];
  const totalThreatCount = sectorThreatLibrary.length;
  const masteredThreatCount = sectorThreatLibrary.filter((entry) =>
    completedDeepDives.includes(entry.id),
  ).length;
  const maturationPercent = totalThreatCount <= 0
    ? 0
    : Math.round((masteredThreatCount / totalThreatCount) * 100);
  const isSectorCertified =
    totalThreatCount > 0 && masteredThreatCount === totalThreatCount;

  if (!mounted) return <div className="p-4 bg-slate-900/50 animate-pulse rounded border border-slate-800 m-2">Initializing Command Center...</div>;

  /** Peer ALE baselines (USD millions) — GRC-Gold Strategic Intel strip. */
  const industryMetrics: Record<string, number> = {
    Defense: 25,
    "Federal Government": 20,
    Aerospace: 17,
    "State & Local": 11,
    "Public Sector": 15,
    Healthcare: 12.1,
    Finance: 18,
    Technology: 9.5,
  };
  const industryAverageMillions = industryMetrics[selectedIndustry] ?? 12.1;
  const totalCurrentRiskCents = getTotalCurrentRiskCents();
  const grcGapCents = getGrcGapCents();
  const currentRiskFormatted = formatRiskExposure(totalCurrentRiskCents, currencyScale);
  const grcGapFormatted = formatRiskExposure(grcGapCents, currencyScale);
  const currentRiskCentsBig = BigInt(totalCurrentRiskCents || "0");
  const totalVipCount = pipelineThreats.filter((t) => (t.target ?? "").toLowerCase().includes("vip")).length;
  const currentRiskMillions = Number(currentRiskCentsBig) / 100_000_000;
  const readinessProxy = Math.max(0, Math.min(100, 100 - Math.round(currentRiskMillions)));
  const premiumMultiplierPercent = Math.max(
    0,
    100 + (100 - readinessProxy) * 2 - totalVipCount * 5,
  );
  const premiumCents = (10_000_000n * BigInt(premiumMultiplierPercent)) / 100n;
  const deductibleCents = (() => {
    const tenPercent = currentRiskCentsBig / 10n;
    return tenPercent > 2_500_000n ? tenPercent : 2_500_000n;
  })();
  const potentialImpactCents = premiumCents + deductibleCents;
  const potentialImpactDisplay = `$${formatRiskExposure(potentialImpactCents.toString(), currencyScale)}`;

  function agentLabel(agentId: ThreatIntelEntry["agentId"]): string {
    switch (agentId) {
      case "IRON_PHISH":
        return "PhishBot";
      case "IRON_INFIL":
        return "InfilBot";
      case "IRON_SIGHT":
        return "Ironsight";
      default:
        return agentId;
    }
  }

  function impactBadgeClass(impact: ThreatIntelEntry["impact"]): string {
    switch (impact) {
      case "CRITICAL":
        return "text-red-400";
      case "HIGH":
        return "text-amber-400";
      case "MEDIUM":
      default:
        return "text-zinc-400";
    }
  }

  function threatSourceHref(source: string): string | null {
    if (source.includes("Verizon")) return "https://www.verizon.com/business/resources/reports/dbir/";
    if (source.includes("IBM")) return "https://www.ibm.com/reports/data-breach";
    return null;
  }

  async function handleLiveThreatClick(entry: ThreatIntelEntry) {
    setActiveDrillThreatId(entry.id);
    setLastSimulationStartedAt(new Date().toISOString());
    startDrillTransition(() => {
      void triggerLiveThreatSimulation(entry.id).then((res) => {
        if (res.ok) {
          upsertPipelineThreat(res.pipelineThreat);
          applyManualSimulationStandDownResumeFeed();
          addStreamMessage(
            `> [STRATEGIC INTEL] Blue-team response computed · ${agentLabel(entry.agentId)} · ${entry.title}`,
          );
          router.refresh();
        } else {
          addStreamMessage(`> [STRATEGIC INTEL] Drill failed: ${res.error}`);
          setActiveDrillThreatId(null);
        }
      });
    });
    window.setTimeout(
      () => setActiveDrillThreatId((prev) => (prev === entry.id ? null : prev)),
      4000,
    );
  }

  function handleCloseDeepDiveModal() {
    if (deepDiveEntry) {
      markDeepDiveCompleted(deepDiveEntry.id);
    }
    setDeepDiveEntry(null);
  }

  // Single sidebar layout: master block (Industry Profile, Risk Exposure trend chart, Top Sector Threats, Agent grid).
  // Previously a "Dark Start" branch ran when !hasActiveIntelligenceStream and showed different/older UI, so edits were not visible.
  return (
    <div className="flex h-full flex-col bg-[#050509] text-white font-sans border-r border-zinc-900 overflow-hidden">

      {/* STRATEGIC STATUS — live simulation load from risk store */}
      <section
        className="shrink-0 border-b border-zinc-800 bg-zinc-950/90 px-4 py-2.5"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          <span className="text-zinc-400">STRATEGIC STATUS</span>
          <span
            className={`font-bold tracking-[0.18em] animate-pulse ${strategicStatusClass}`}
          >
            {strategicStatusLabel}
          </span>
          <span className="text-zinc-600 normal-case tracking-tight">
            {activeSimulationCount} active simulation{activeSimulationCount === 1 ? "" : "s"}
          </span>
          <span
            className={`font-mono text-[10px] tracking-widest ${
              strategicStatusLabel === "STABLE"
                ? "text-emerald-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.45)]"
                : "text-zinc-500"
            }`}
          >
            STABILITY DURATION: {stabilityDisplay}
          </span>
        </div>
      </section>

      {ironwatchSidebarAlert ? (
        <div
          role="alert"
          className={`shrink-0 border-b px-4 py-2.5 ${
            ironwatchSidebarAlert.includes(IRONWATCH_SHADOW_DISSENT_LABEL) ||
            ironwatchSidebarAlert.includes(IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL)
              ? "border-red-600/70 bg-red-950/40"
              : "border-emerald-700/50 bg-emerald-950/35"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={`text-[10px] leading-snug ${
                  ironwatchSidebarAlert.includes(IRONWATCH_SHADOW_DISSENT_LABEL) ||
                  ironwatchSidebarAlert.includes(IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL)
                    ? "text-red-100/95"
                    : "text-emerald-100/95"
                }`}
              >
                {ironwatchSidebarAlert}
              </p>
              <Link
                href={IRONWATCH_HISTORICAL_CHAPTER_HREF}
                className={`mt-1.5 inline-block text-[9px] font-bold uppercase tracking-wide underline underline-offset-2 ${
                  ironwatchSidebarAlert.includes(IRONWATCH_SHADOW_DISSENT_LABEL) ||
                  ironwatchSidebarAlert.includes(IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL)
                    ? "text-red-300 decoration-red-500/60 hover:text-red-200"
                    : "text-emerald-400 decoration-emerald-500/60 hover:text-emerald-300"
                }`}
              >
                Open evidence gap index (Evidence Vault)
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setIronwatchSidebarAlert(null)}
              className={`shrink-0 rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                ironwatchSidebarAlert.includes(IRONWATCH_SHADOW_DISSENT_LABEL) ||
                ironwatchSidebarAlert.includes(IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL)
                  ? "border-red-700/60 text-red-200 hover:bg-red-950/80"
                  : "border-emerald-700/60 text-emerald-200 hover:bg-emerald-950/80"
              }`}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {/* STRATEGIC INTEL / AGENT MANAGER header */}
      <div className="flex flex-col gap-3 p-4 border-b border-zinc-900 bg-black/20">
        <div className="flex justify-between items-center">
          <span className="text-[10.5px] font-bold uppercase tracking-wide text-white">Strategic Intel</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wide">Agent Manager: Healthy</span>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="w-full h-px bg-zinc-800" />
      </div>

      {/* Subsequent sections (Risk Exposure, Agents, Terminal) */}
      <div className="flex flex-col gap-0 w-full px-2 overflow-y-auto">
      {/* --- INDUSTRY PROFILE (Toggle + Dropdown) --- */}
      <section className="p-4 border-b border-zinc-900">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Industry Profile</h3>
          <button
            type="button"
            onClick={() => setIsProfileVisible(!isProfileVisible)}
            className="text-[10px] text-blue-500 cursor-pointer hover:text-blue-400 transition-colors bg-transparent border-none outline-none"
          >
            {isProfileVisible ? 'Hide' : 'Show'}
          </button>
        </div>

        {isProfileVisible && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-sm mb-2 text-white outline-none focus:border-blue-600 transition-colors appearance-none cursor-pointer"
            >
              {INDUSTRY_PROFILE_SELECT_OPTIONS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            {selectedIndustry === "Defense" ? (
              <p
                className="mb-2 inline-flex rounded border border-emerald-700/45 bg-emerald-950/35 px-2 py-1 text-[9px] font-bold tracking-wide text-emerald-100/95"
                title={`Defense ALE uses the governed ${(tenantGovernanceMultX ?? 1.6).toFixed(1)}× CMMC Level 3 multiplier on Sentinel ingest (tenant governance bps)`}
              >
                {DEFENSE_REGULATORY_SHIELD_BADGE_LABEL}
              </p>
            ) : null}
          </div>
        )}
      </section>

      {/* 2. RISK EXPOSURE — benchmark trend (local ALE vs industry mean) + volatility alert */}
      <section className="p-4 space-y-3 border-b border-zinc-900 bg-[#050509] relative">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Risk Exposure</h3>
          <span className="text-[10px] font-bold text-zinc-600 font-mono tracking-widest">ID: 0x8F22</span>
        </div>

        <div className="space-y-1">
          {trendLoading ? (
            <p className="py-8 text-center text-[10px] text-zinc-500 animate-pulse">Loading benchmark trend…</p>
          ) : (
            <>
              <MarketVolatilityAlert isMarketVolatile={trendPayload?.isMarketVolatile ?? false} />
              <PublicSectorProgress activeIndustry={selectedIndustry} />
              <div className="mb-2 rounded border border-amber-500/20 bg-zinc-950/90 px-2.5 py-2 ring-1 ring-violet-500/10">
                <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest text-amber-500/70">
                  GRC-Gold exposure pivot
                </p>
                <div className="grid grid-cols-1 gap-2 text-[10px]">
                  <div className="flex items-start justify-between gap-2 border-b border-amber-500/10 pb-2">
                    <span className="flex min-w-0 items-center gap-1 font-black uppercase tracking-wide text-zinc-400">
                      Industry Average
                      <ExposureDefinitionHint definitionId="industryAverage" industryLabel={selectedIndustry} />
                    </span>
                    <span className="shrink-0 font-mono font-bold text-blue-400">
                      ${industryAverageMillions.toFixed(1)}M
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2 border-b border-amber-500/10 pb-2">
                    <span className="flex min-w-0 items-center gap-1 font-black uppercase tracking-wide text-zinc-400">
                      Your Current Risk
                      <ExposureDefinitionHint definitionId="currentRisk" industryLabel={selectedIndustry} />
                    </span>
                    <span className="shrink-0 font-mono font-bold text-amber-400">${currentRiskFormatted}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2 border-b border-amber-500/10 pb-2">
                    <span className="flex min-w-0 items-center gap-1 font-black uppercase tracking-wide text-zinc-400">
                      Potential Impact
                      <ExposureDefinitionHint definitionId="potentialImpact" industryLabel={selectedIndustry} />
                    </span>
                    <span className="shrink-0 font-mono font-bold text-red-400">{potentialImpactDisplay}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1 font-black uppercase tracking-wide text-zinc-400">
                      GRC Gap
                      <ExposureDefinitionHint definitionId="grcGap" industryLabel={selectedIndustry} />
                    </span>
                    <span className="shrink-0 font-mono font-bold text-violet-400">${grcGapFormatted}</span>
                  </div>
                </div>
              </div>
              <RiskExposureTrend
                points={trendPayload?.points ?? []}
                currencyScale={currencyScale}
                activeIndustry={selectedIndustry}
                weekOverWeekChangePct={trendPayload?.weekOverWeekChangePct ?? null}
                isGenesisTrend={Boolean(trendPayload?.genesisTrend)}
              />
            </>
          )}
        </div>
      </section>

      <section className="p-4 border-b border-zinc-900 bg-[#050509]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Analyst Maturation
          </h3>
          <span className="font-mono text-[10px] text-zinc-400 tracking-widest">
            {masteredThreatCount} / {totalThreatCount} Threats Mastered
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, maturationPercent))}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-500 tracking-wider">
            {maturationPercent}% completed
          </span>
          {isSectorCertified ? (
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-900/30 border border-emerald-500/30 px-2 py-1 rounded">
              Certified Sector Analyst
            </span>
          ) : null}
        </div>
      </section>

      {/* 3. TOP SECTOR THREATS (Dynamic Boxed Cards) */}
      <section className="p-4 border-b border-zinc-900 bg-[#050509]">
        <p className="text-[10px] font-black text-[#3b82f6] uppercase tracking-widest mb-3 border-b border-zinc-800/50 pb-1.5">
          Threat library (click to launch live drill)
        </p>
        <div className="space-y-2">
          {sectorThreatLibrary.map((entry) => {
            const refVal = `$${threatImpactToLossM(entry.impact).toFixed(1)}M`;
            const isActive = activeDrillThreatId === entry.id;
            const isBusy = isActive && isDrillPending;
            const cite = threatSourceHref(entry.source);
            const citeClass =
              "block text-[10px] uppercase tracking-widest opacity-50 text-zinc-400";
            return (
              <div
                key={entry.id}
                className={`flex flex-col rounded border border-zinc-800 bg-[#050509] overflow-hidden transition-colors ${
                  isActive ? "border-rose-500 bg-rose-950/25 animate-pulse" : "hover:border-zinc-600"
                }`}
              >
                <div className="flex min-h-[3.5rem]">
                  <button
                    type="button"
                    onClick={() => void handleLiveThreatClick(entry)}
                    className="min-w-0 flex-1 text-left p-2.5 transition-colors hover:bg-zinc-900/40"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[11px] font-black font-sans text-white tracking-wide leading-snug">
                        {entry.title}
                      </span>
                      <span className="shrink-0 text-[11px] font-black font-sans text-[#10b981]">
                        {isBusy ? "ACTIVE" : refVal}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest ${impactBadgeClass(entry.impact)}`}
                      >
                        {entry.impact}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                        {agentLabel(entry.agentId)} · {entry.lureType}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={`Deep dive: ${entry.title}`}
                    title="Deep dive"
                    onClick={() => setDeepDiveEntry(entry)}
                    className="shrink-0 border-l border-zinc-800 px-3 flex items-center justify-center text-zinc-500 hover:text-sky-400 hover:bg-zinc-900/80 transition-colors"
                  >
                    <Info size={18} strokeWidth={2} />
                  </button>
                </div>
                <div className="px-2.5 pb-2.5 pt-0 border-t border-zinc-800/60">
                  {cite ? (
                    <a
                      href={cite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${citeClass} mt-2 hover:opacity-70 underline-offset-2 hover:underline`}
                    >
                      Source: {entry.source}
                    </a>
                  ) : (
                    <span className={`${citeClass} mt-2 cursor-default`} title={entry.source}>
                      Source: {entry.source}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. AI AGENT STATUS GRID (Restoring Unicode Fix) */}
      <section className="p-4 bg-[#050509] border-b border-zinc-900">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Active Agents // 19-Agent Workforce</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: 'Ironsight', icon: '\u25ce', color: 'text-red-500' },
            { name: 'Ironintel', icon: '\uD83E\uDDE0', color: 'text-emerald-500' },
            { name: 'Ironcore', icon: '\uD83D\uDEE1\uFE0F', color: 'text-blue-500' },
          ].map((agent) => {
            return (
              <div key={agent.name} className="bg-black border border-zinc-900 p-2.5 rounded-sm flex flex-col items-center gap-1 hover:border-zinc-700 transition-colors group">
                <span className={`${agent.color} text-xl mb-1 group-hover:scale-110 transition-transform`}>
                  {agent.icon}
                </span>
                <span className="text-[8px] font-black uppercase text-zinc-500 text-center tracking-tighter leading-none">
                  {agent.name}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981]" />
                  <span className="text-[7px] text-emerald-500 font-bold uppercase tracking-widest">
                    Healthy
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. LIVE INTELLIGENCE STREAM TERMINAL */}
      <div className="flex-1 flex flex-col min-h-0 bg-black border-b border-zinc-900 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed text-emerald-500/60 custom-scrollbar">
          <div className="space-y-1">
            {expertModeEnabled ? (
              <>
                <p className="text-zinc-500 opacity-50 italic">Stream idle.</p>
                <p className="text-emerald-500/40 animate-pulse">_</p>
              </>
            ) : (
              <p className="text-zinc-600 font-black tracking-widest">[ EXPERT MODE OFF ? TELEMETRY STREAM HIDDEN ]</p>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS WRAPPER (Prevents Overlap) */}
      <div className="shrink-0 flex flex-col bg-[#050509] border-t border-zinc-900 z-10 relative">

        {/* 'N' AVATAR COMMAND INPUT */}
        <form onSubmit={handleTerminalCommand} className="p-4 bg-zinc-950/20 border-b border-zinc-900/50" data-testid="test-run-ingestion">
          <div className="flex items-center gap-3 py-1.5 px-3 border border-zinc-800/50 rounded-full bg-black/40 shadow-inner group focus-within:border-emerald-500/50 transition-all">
            <div className="h-6 w-6 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-[10px] font-black text-zinc-600 group-focus-within:text-emerald-500 transition-colors">
              N
            </div>
            <input
              type="text"
              value={terminalInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTerminalInput(e.target.value)}
              className="bg-transparent border-none outline-none text-zinc-400 font-mono text-xs w-full placeholder:text-zinc-700 selection:bg-emerald-500/30"
              placeholder="kimbot | kimbotx | grcbot [1-100] | grcbotx | purg"
            />
            <button type="submit" className="flex items-center gap-2 pr-1 outline-none">
              <span className="text-[10px] font-bold text-white uppercase tracking-tighter bg-zinc-800 px-3 py-1 rounded hover:bg-emerald-600 transition-colors">RUN</span>
            </button>
          </div>
          <div className="mt-2 flex justify-between px-2">
            <span className="text-[7px] text-zinc-700 uppercase font-black tracking-widest">Secure Terminal Link // 0xCC44</span>
            <div className="flex gap-3">
              <div className="h-1 w-1 rounded-full bg-zinc-800" />
              <div className="h-1 w-1 rounded-full bg-zinc-800" />
              <div className="h-1 w-1 rounded-full bg-zinc-800" />
            </div>
          </div>
        </form>

        {/* TTL CONTROLS */}
        <div className="p-4 border-b border-zinc-900/50">
          <p className="text-zinc-500 opacity-80 italic text-[10px] mb-2">Set TTL (hours) below and press SET to start the clock.</p>
          <div className="flex w-full gap-2">
            <div className="flex h-10 flex-1 items-center gap-1 rounded border border-slate-800 bg-[#0f172a] px-1">
              <button
                type="button"
                onClick={() => {
                  const hours = Number.parseInt(ttlInput.split(':')[0] || "0", 10) || 0;
                  const next = Math.max(0, hours - 1);
                  const hh = next.toString().padStart(2, '0');
                  const normalized = `${hh}:00:00`;
                  setTtlInput(normalized);
                  setTtlRunning(false);
                }}
                className="h-6 w-6 rounded border border-slate-700 bg-slate-900 text-[10px] font-bold text-white hover:text-slate-200 active:text-blue-400"
              >
                -
              </button>
              <input
                type="number"
                min={0}
                className="h-full w-full appearance-none [appearance:textfield] bg-transparent text-center text-xs font-bold text-white outline-none focus:border-blue-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="Hours"
                value={ttlInput.split(':')[0]}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setTtlInput("");
                    return;
                  }
                  const hours = Number.parseInt(raw, 10) || 0;
                  const minutes = 0;
                  const seconds = 0;
                  const hh = Math.max(0, hours).toString().padStart(2, '0');
                  const normalized = `${hh}:${minutes.toString().padStart(2, '0')}:${seconds
                    .toString()
                    .padStart(2, '0')}`;
                  setTtlInput(normalized);
                  setTtlRunning(false);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const hours = Number.parseInt(ttlInput.split(':')[0] || "0", 10) || 0;
                  const next = hours + 1;
                  const hh = next.toString().padStart(2, '0');
                  const normalized = `${hh}:00:00`;
                  setTtlInput(normalized);
                  setTtlRunning(false);
                }}
                className="h-6 w-6 rounded border border-slate-700 bg-slate-900 text-[10px] font-bold text-white hover:text-slate-200 active:text-blue-400"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="h-10 flex-1 rounded bg-blue-600 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500"
              onClick={() => {
                const parts = ttlInput.split(':');
                const [hStr = '0', mStr = '0', sStr = '0'] = parts;
                const hours = Number.parseInt(hStr || '0', 10) || 0;
                const minutes = Number.parseInt(mStr || '0', 10) || 0;
                const seconds = Number.parseInt(sStr || '0', 10) || 0;
                let totalSeconds = hours * 3600 + minutes * 60 + seconds;
                if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
                  totalSeconds = 72 * 60 * 60;
                }
                if (totalSeconds < 30 * 60) {
                  totalSeconds = 30 * 60;
                }
                setTtlSeconds(totalSeconds);
                const hh = Math.floor(totalSeconds / 3600)
                  .toString()
                  .padStart(2, '0');
                const mm = Math.floor((totalSeconds % 3600) / 60)
                  .toString()
                  .padStart(2, '0');
                const ss = (totalSeconds % 60).toString().padStart(2, '0');
                const normalized = `${hh}:${mm}:${ss}`;
                setTtlInput(normalized);
                setTtlRunning(true);
                appendAuditLog({
                  action_type: 'GRC_SET_TTL',
                  log_type: 'GRC',
                  description: `Set TTL to ${normalized}`,
                });
              }}
            >
              SET
            </button>
            <div className="flex h-10 flex-1 items-center justify-center rounded border border-slate-800 bg-slate-900 px-2 text-[10px] font-mono font-bold tracking-widest text-amber-500">
              <span className="mr-1">TTL:</span>
              <input
                type="text"
                value={ttlInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setTtlInput(e.target.value);
                  setTtlRunning(false);
                }}
                className="h-full w-full bg-transparent text-center outline-none"
                placeholder="72:00:00"
              />
            </div>
          </div>
        </div>

        {/* SENTINEL SWEEP */}
        <div className="p-4 bg-[#050509]">
          <div className="flex flex-col gap-2">
            <label className="text-[16px] text-white">Enter Agent Instruction...</label>
            <input
              type="text"
              placeholder="Enter Agent Instruction..."
              value={agentInstruction}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAgentInstruction(e.target.value)}
              className="bg-[#0f172a] border border-slate-800 p-2.5 rounded text-[16px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setSentinelSweepModalOpen(true)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-3 rounded text-[11px] transition-colors flex items-center justify-center gap-2"
            >
              <div className="bg-black/80 text-white w-5 h-5 flex items-center justify-center rounded-full text-[9px]">N</div>
              <Search size={14} strokeWidth={3} /> RUN SENTINEL SWEEP
            </button>
          </div>
        </div>

      </div>

      </div>

      <SentinelSweepModal
        open={sentinelSweepModalOpen}
        onClose={() => setSentinelSweepModalOpen(false)}
        initialAgentInstruction={agentInstruction}
        onGovernanceIntelAlert={(msg) => {
          if (msg) setIronwatchSidebarAlert(msg);
        }}
        onCompleted={() => setAgentInstruction("")}
      />

      <ThreatDetailModal
        open={deepDiveEntry != null}
        entry={deepDiveEntry}
        onClose={handleCloseDeepDiveModal}
        onLaunchDrill={(e) => {
          handleCloseDeepDiveModal();
          void handleLiveThreatClick(e);
        }}
        resolveSourceHref={threatSourceHref}
        isLaunching={
          deepDiveEntry != null &&
          activeDrillThreatId === deepDiveEntry.id &&
          isDrillPending
        }
      />
    </div>
  );
}
