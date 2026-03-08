'use client';

import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, CheckCircle2, ShieldCheck, Brain, Shield, Search, ChevronDown, Info } from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useRiskStore, type PipelineThreat } from '@/app/store/riskStore';
import { appendAuditLog } from '@/app/utils/auditLogger';
import { useAgentStore } from '@/app/store/agentStore';
import { useKimbotStore } from '@/app/store/kimbotStore';
import { useGrcBotStore } from '@/app/store/grcBotStore';
import { useSystemConfigStore } from '@/app/store/systemConfigStore';
import { getDbQueryMs } from '@/app/actions/simulation';
import { wakeBlueTeam, sleepBlueTeam } from '@/app/utils/blueTeamSync';
import { purgeSimulation } from '@/app/actions/purgeSimulation';
import { clearAllAuditLogs, purgeSimulationAuditLogs } from '@/app/utils/auditLogger';
import { formatRiskExposure } from "@/app/utils/riskFormatting";

/** Formats BigInt cents into a readable USD string (e.g. $10.9M). */
function formatCurrency(cents: bigint): string {
  const dollars = Number(cents) / 100;
  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
}

/** Reverted baseline: Vaultbank 5.9M, Medshield 11.1M */
const CURRENT_RISK_CENTS = BigInt(1090000000); // $10,900,000.00
const POTENTIAL_IMPACT_CENTS = BigInt(1520000000); // $15,200,000.00

type ThreatItem = { id: string; name: string; loss: number };

const INDUSTRY_THREAT_DATA: Record<string, ThreatItem[]> = {
  Healthcare: [
    { id: 'ransomware', name: 'RANSOMWARE', loss: 4.9 },
    { id: 'breach', name: 'DATA BREACH', loss: 3.5 },
    { id: 'phishing', name: 'PHISHING ATTACK', loss: 2.1 },
  ],
  Finance: [
    { id: 'swift-fraud', name: 'SWIFT FRAUD', loss: 12.2 },
    { id: 'insider-trading', name: 'INSIDER TRADING', loss: 8.4 },
    { id: 'card-skimming', name: 'CARD SKIMMING', loss: 5.1 },
  ],
  Energy: [
    { id: 'grid-destabilization', name: 'GRID DESTABILIZATION', loss: 18.5 },
    { id: 'scada-breach', name: 'SCADA BREACH', loss: 12.0 },
    { id: 'physical-sabotage', name: 'PHYSICAL SABOTAGE', loss: 9.2 },
  ],
  Technology: [
    { id: 'ip-theft', name: 'IP THEFT', loss: 15.0 },
    { id: 'supply-chain-injection', name: 'SUPPLY CHAIN INJECTION', loss: 9.8 },
    { id: 'zero-day-exploit', name: 'ZERO-DAY EXPLOIT', loss: 7.5 },
  ],
  Defense: [
    { id: 'espionage', name: 'ESPIONAGE', loss: 22.1 },
    { id: 'comms-jamming', name: 'COMMS JAMMING', loss: 14.3 },
    { id: 'satellite-takeover', name: 'SATELLITE TAKEOVER', loss: 11.0 },
  ],
};

export default function StrategicIntel() {
  const [mounted, setMounted] = useState(false);
  const [ttlSeconds, setTtlSeconds] = useState(72 * 60 * 60); // default 72h
  const [ttlInput, setTtlInput] = useState('72:00:00');
  const [ttlRunning, setTtlRunning] = useState(false);
  const [agentInstruction, setAgentInstruction] = useState('');
  const [terminalCommand, setTerminalCommand] = useState('');
  const [terminalInput, setTerminalInput] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [activeRiskTooltip, setActiveRiskTooltip] = useState<'industry' | 'current' | 'potential' | 'gap' | null>(null);
  const [isExpertMode, setIsExpertMode] = useState(true);
  const intelStreamRef = useRef<HTMLDivElement | null>(null);

  // Global risk store: sidebar threats + dashboard liabilities + Scenario 3 risk reduction
  const dashboardLiabilities = useRiskStore((state) => state.dashboardLiabilities);
  const activeSidebarThreats = useRiskStore((state) => state.activeSidebarThreats);
  const toggleSidebarThreat = useRiskStore((state) => state.toggleSidebarThreat);
  const clearActiveSidebarThreats = useRiskStore((state) => state.clearActiveSidebarThreats);
  const riskOffset = useRiskStore((state) => state.riskOffset);
  const riskReductionFlash = useRiskStore((state) => state.riskReductionFlash);
  const clearRiskReductionFlash = useRiskStore((state) => state.clearRiskReductionFlash);
  const pipelineThreats = useRiskStore((state) => state.pipelineThreats);
  const acceptedThreatImpacts = useRiskStore((state) => state.acceptedThreatImpacts);
  const upsertPipelineThreat = useRiskStore((state) => state.upsertPipelineThreat);
  const removeThreatFromPipeline = useRiskStore((state) => state.removeThreatFromPipeline);
  const selectedIndustry = useRiskStore((state) => state.selectedIndustry);
  const setSelectedIndustry = useRiskStore((state) => state.setSelectedIndustry);
  const currencyMagnitude = useRiskStore((state) => state.currencyMagnitude);

  // Agent / Coreintel state
  const agents = useAgentStore((s) => s.agents);
  const intelligenceStream = useAgentStore((s) => s.intelligenceStream);
  const addStreamMessage = useAgentStore((s) => s.addStreamMessage);
  const runSentinelSweep = useAgentStore((s) => s.runSentinelSweep);
  const setAgentStatus = useAgentStore((s) => s.setAgentStatus);
  const systemLatencyMs = useAgentStore((s) => s.systemLatencyMs);
  const setSystemLatencyMs = useAgentStore((s) => s.setSystemLatencyMs);

  const isKimbotActive = useKimbotStore((s) => s.enabled);
  const grcBotCompanyCount = useGrcBotStore((s) => s.companyCount);
  const grcBotEnabled = useGrcBotStore((s) => s.enabled);
  const expertModeEnabled = useSystemConfigStore().expertModeEnabled;

  // Agent status: Healthy (green) or Alerting (red) when Kimbot is active for Ironsight/Coreintel
  const getAgentStatus = (agentName: string) => {
    if (isKimbotActive && (agentName === 'Ironsight' || agentName === 'Coreintel')) {
      return { label: 'Alerting', color: 'text-red-500', dot: 'bg-red-500 shadow-[0_0_8px_#ef4444]' };
    }
    return { label: 'Healthy', color: 'text-emerald-500', dot: 'bg-emerald-500 shadow-[0_0_8px_#10b981]' };
  };

  // Industry pivot: display metrics per sector (Industry Average & Potential Impact)
  const industryMetrics: Record<string, { avg: string; impact: string; wAvg: string; wImpact: string }> = {
    Healthcare: { avg: '$8.5M', impact: '$15.2M', wAvg: '60%', wImpact: '95%' },
    Finance: { avg: '$12.1M', impact: '$22.8M', wAvg: '75%', wImpact: '85%' },
    Energy: { avg: '$9.4M', impact: '$18.3M', wAvg: '65%', wImpact: '90%' },
  };
  const currentMetrics = industryMetrics[selectedIndustry] ?? industryMetrics.Healthcare;

  const router = useRouter();

  const riskLevel = (m: number) => {
    if (m >= 20) return { label: "CRITICAL", className: "text-red-400" };
    if (m >= 10) return { label: "ELEVATED", className: "text-amber-400" };
    return { label: "NORMAL", className: "text-emerald-400" };
  };

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

  // Terminal command handler: form submit ? local logs + kimbot | grcbot [n] | purg
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
          setLogs((prev) => [...prev, '[SYSTEM] KIMBOT_START: Initiating Adversarial Stress Test']);
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
            const purgedAuditEntries = clearAllAuditLogs();
            useKimbotStore.getState().resetSimulationCounters();
            useGrcBotStore.getState().stop();
            useRiskStore.getState().clearAllRiskStateForPurge();
            useRiskStore.getState().setSelectedThreatId(null);
            sleepBlueTeam();
            setLogs((prev) => [...prev, `[AUDIT] Cleared ${purgedAuditEntries} local audit entr${purgedAuditEntries === 1 ? 'y' : 'ies'}.`]);
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
          agentSource: 'Coreintel',
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
          const purgedAuditEntries = clearAllAuditLogs();
          useKimbotStore.getState().resetSimulationCounters();
          useGrcBotStore.getState().stop();
          useRiskStore.getState().clearAllRiskStateForPurge();
          useRiskStore.getState().setSelectedThreatId(null);
          sleepBlueTeam();
          addStreamMessage(`> [AUDIT] Cleared ${purgedAuditEntries} local audit entr${purgedAuditEntries === 1 ? 'y' : 'ies'}.`);
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

  // New States for the Industry Profile UX
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isFirstIndustryMount = useRef(true);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Wake up Agent Manager: when KIMBOT is active, set all agents to ACTIVE_DEFENSE (green pulsing).
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
    if (!grcBotEnabled || grcBotCompanyCount < 100) return;
    let mounted = true;
    const poll = async () => {
      try {
        const { ms } = await getDbQueryMs();
        if (mounted) setSystemLatencyMs(ms);
      } catch {
        if (mounted) setSystemLatencyMs(null);
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [grcBotEnabled, grcBotCompanyCount, setSystemLatencyMs]);

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

  // Threat list for current industry (from map)
  const threats = INDUSTRY_THREAT_DATA[selectedIndustry] ?? INDUSTRY_THREAT_DATA.Healthcare;

  const toggleThreat = (threatId: string) => {
    const threat = threats.find((t) => t.id === threatId);
    if (!threat) return;

    const isAccepted = activeSidebarThreats.includes(threatId);
    const isInPipeline = pipelineThreats.some((t) => t.id === threatId);

    // Selection lock: once registered or accepted, cannot be toggled off from Strategic Intel.
    if (isAccepted || isInPipeline) return;
    // Register: add to pipeline for triage (do not apply risk until Accept in pipeline)
    const pipelineThreat: PipelineThreat = {
      id: threat.id,
      name: threat.name,
      loss: threat.loss,
      score: threat.loss,
      industry: selectedIndustry,
      source: "Top Sector Threats",
      description: `Liability: $${threat.loss}M ? Sector: ${selectedIndustry}`,
      calculatedRiskScore: Math.round(threat.loss * 10),
    };
    upsertPipelineThreat(pipelineThreat);
  };

  if (!mounted) return <div className="p-4 bg-slate-900/50 animate-pulse rounded border border-slate-800 m-2">Initializing Command Center...</div>;

  // --- INDUSTRY BENCHMARKS (per-sector averages and base risk) ---
  const INDUSTRY_BENCHMARKS: Record<string, { average: number; baseRisk: number; baseImpact: number }> = {
    Healthcare: { average: 8.5, baseRisk: 10.9, baseImpact: 15.2 },
    Finance: { average: 12.2, baseRisk: 11.5, baseImpact: 18.0 },
    Energy: { average: 10.0, baseRisk: 11.0, baseImpact: 17.0 },
    Technology: { average: 6.0, baseRisk: 9.0, baseImpact: 12.0 },
    Defense: { average: 9.0, baseRisk: 10.5, baseImpact: 16.0 },
  };
  const benchmarks = INDUSTRY_BENCHMARKS[selectedIndustry] ?? INDUSTRY_BENCHMARKS.Healthcare;

  // --- SCENARIO 2: LIVE VULNERABILITY MATH ---
  const industryAverage = benchmarks.average;
  const baseCurrentRisk = benchmarks.baseRisk;
  const basePotentialImpact = benchmarks.baseImpact;

  // Synced with header: accepted impacts ($M) ? simple sum of accepted liabilities only (no severity factor, no multi-tenant sum).
  const entries = Object.entries(acceptedThreatImpacts);
  const exactTotalCurrentRisk = entries.reduce((sum, [, v]) => sum + Number(v), 0);
  const totalActiveLoss = exactTotalCurrentRisk;

  // Debug: log which IDs are included in "Your Current Risk" so ghosts are visible (browser console).
  if (typeof window !== "undefined" && entries.length > 0) {
    console.log("[CURRENT RISK] IDs in sum:", Object.keys(acceptedThreatImpacts), "values ($M):", Object.fromEntries(entries), "sum:", exactTotalCurrentRisk.toFixed(1) + "M");
  }
  // Supply-chain impact (1?10) is a primary driver of Potential Impact:
  const pipelinePendingTotal = pipelineThreats.reduce((sum, t) => {
    const base = t.score ?? t.loss;
    const impact = supplyChainImpactScore(t);
    const multiplier = impact != null ? Math.max(1, impact / 7) : 1;
    return sum + base * multiplier;
  }, 0);

  // Your Current Risk: strictly sum of ACTIVE (acknowledged) threat impacts only. Format to 1 decimal for UI so gauge mirrors cards.
  const rawCurrentRisk = totalActiveLoss;
  // Potential Impact: base + accepted + pipeline pending - riskOffset (100% synced with Liability Exposure)
  const rawPotentialImpact = basePotentialImpact + totalActiveLoss + pipelinePendingTotal;
  // Subtract remediation risk reduction (never go below 0)
  const dynamicCurrentRisk = Math.max(0, rawCurrentRisk - riskOffset);
  const dynamicPotentialImpact = Math.max(0, rawPotentialImpact - riskOffset);
  // Risk Gap = $Potential ? $Current; updates in real time as users acknowledge/dismiss pipeline cards (riskStore).
  const riskGap = Math.max(0, dynamicPotentialImpact - dynamicCurrentRisk);
  const hasGapTelemetry =
    pipelineThreats.length > 0 ||
    Object.keys(acceptedThreatImpacts).length > 0 ||
    Object.keys(dashboardLiabilities).length > 0;

  const MAX_SCALE = 30.0;
  const avgWidth = Math.min((industryAverage / MAX_SCALE) * 100, 100);
  const riskWidth = Math.min((dynamicCurrentRisk / MAX_SCALE) * 100, 100);
  const impactWidth = Math.min((dynamicPotentialImpact / MAX_SCALE) * 100, 100);

  // # RISK_TREND_INDICATORS
  const currencyScale = currencyMagnitude;
  const trendPhases = ['T-4', 'T-3', 'T-2', 'T-1', 'Now'] as const;
  const industryAverageUsd = Math.max(0, industryAverage * 1_000_000);
  const currentRiskUsd = Math.max(0, dynamicCurrentRisk * 1_000_000);
  const potentialImpactUsd = Math.max(0, dynamicPotentialImpact * 1_000_000);
  const riskTrendChartData = trendPhases.map((phase, index) => {
    const progress = index / Math.max(1, trendPhases.length - 1);
    const currentRiskActual = Math.max(0, currentRiskUsd * (0.55 + progress * 0.45));
    const potentialImpactCeiling = Math.max(
      currentRiskActual,
      currentRiskActual + (potentialImpactUsd - currentRiskActual) * (0.5 + progress * 0.5),
    );
    const unmitigatedRiskGap = Math.max(0, potentialImpactCeiling - currentRiskActual);
    return {
      phase,
      currentRiskActual,
      industryAverageBenchmark: industryAverageUsd,
      potentialImpactCeiling,
      unmitigatedRiskGap,
    };
  });

  // Dark Start: when no active stream, only Risk Exposure and Top Sector Threats show placeholders.
  // AI Agents, Coreintel stream, TTL, and Run Sentinel Sweep always display (not data-stream reliant).
  const hasActiveIntelligenceStream =
    pipelineThreats.length > 0 ||
    activeSidebarThreats.length > 0 ||
    isKimbotActive ||
    grcBotEnabled;

  if (!hasActiveIntelligenceStream) {
    return (
      <div className="flex flex-col gap-6 w-full px-2 pb-6 pt-6 bg-[#0f172a]/50 backdrop-blur-md font-sans">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-white">Strategic Intel</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wide">Agent Manager: Healthy</span>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="w-full h-px bg-slate-800" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-white uppercase">Industry Profile</span>
            <button
              onClick={() => setIsProfileVisible(!isProfileVisible)}
              className="text-[10px] text-blue-500 cursor-pointer hover:underline transition-all bg-transparent border-none outline-none"
            >
              {isProfileVisible ? 'Hide' : 'Show'}
            </button>
          </div>
          {isProfileVisible && (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-800 p-2.5 rounded text-sm text-slate-200 appearance-none outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Energy">Energy / Grid</option>
                  <option value="Technology">Technology</option>
                  <option value="Defense">Defense</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Placeholder when idle ? data-dependent sections hidden */}
        <div className="rounded border border-slate-800 bg-slate-950/40 p-4 text-center font-sans text-sm text-slate-500">
          [ WAITING FOR INTELLIGENCE STREAM... ]
        </div>

        {/* 3. RISK EXPOSURE METRICS */}
        <section className="space-y-4 border-b border-zinc-900 bg-black/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Risk Exposure</h3>
            <span className="font-mono text-[9px] font-bold text-zinc-600">ID: 0x8F22</span>
          </div>
          <div className="space-y-4">
            {[
              { label: "Industry Average", val: "$8.5M", color: "bg-blue-600", text: "text-blue-400", w: "60%" },
              { label: "Your Current Risk", val: "$10.9M", color: "bg-amber-500", text: "text-amber-500", w: "80%" },
              { label: "Potential Impact", val: "$15.2M", color: "bg-red-600", text: "text-red-500", w: "95%" },
            ].map((metric) => (
              <div key={metric.label} className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                  <span className="text-zinc-400">{metric.label}</span>
                  <span className={metric.text}>{metric.val}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full border border-zinc-800/50 bg-zinc-900">
                  <div
                    className={`h-full shadow-[0_0_10px_rgba(0,0,0,0.8)] transition-all duration-1000 ease-out ${metric.color}`}
                    style={{ width: metric.w }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. AI AGENT STATUS GRID ? Active Agents // 19-Agent Workforce */}
        <section className="bg-[#050509] p-4">
          <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Active Agents // 19-Agent Workforce
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: 'Ironsight', icon: '\u25ce' },
              { name: 'Coreintel', icon: '\uD83E\uDDE0' },
              { name: 'Agent Manager', icon: '\uD83D\uDEE1\uFE0F' },
            ].map((agent) => {
              const status = getAgentStatus(agent.name);
              return (
                <div
                  key={agent.name}
                  className="group flex flex-col items-center gap-1 rounded-sm border border-zinc-900 bg-black p-2.5 transition-colors hover:border-zinc-700"
                >
                  <span className={`mb-1 text-xl transition-transform group-hover:scale-110 ${status.color}`}>
                    {agent.icon}
                  </span>
                  <span className="text-center text-[8px] font-black uppercase leading-none tracking-tighter text-zinc-500">
                    {agent.name}
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className={`h-1 w-1 rounded-full ${status.dot} ${status.label === 'Alerting' ? 'animate-ping' : ''}`} />
                    <span className={`text-[7px] font-bold uppercase tracking-widest ${status.color}`}>{status.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* COREINTEL // LIVE INTELLIGENCE STREAM ? stream/placeholder only; command input is in Test Run Ingestion */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-white uppercase">Coreintel // Live Intelligence Stream</span>
          {expertModeEnabled ? (
            <div
              ref={intelStreamRef}
              className="bg-black border border-slate-800 p-3 rounded font-mono text-[14px] leading-relaxed space-y-1 max-h-40 overflow-y-auto"
              style={{ color: '#00FF00' }}
            >
              {intelligenceStream.length === 0 ? (
                <>
                  <div>System Online. Core Vault synced.</div>
                  <div>Zero-Trust Architecture enforced.</div>
                </>
              ) : (
                intelligenceStream.slice().reverse().map((msg, idx) => (
                  <div key={`${msg}-${idx}`}>{msg}</div>
                ))
              )}
            </div>
          ) : (
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3 text-[10px] text-slate-500">
              [ EXPERT MODE OFF ? TELEMETRY STREAM HIDDEN ]
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-3" data-testid="test-run-ingestion">
          <div className="flex gap-1">
            <input
              type="text"
              value={terminalCommand}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTerminalCommand(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLegacyTerminalCommand(terminalCommand); }}
              placeholder="kimbot | kimbotx | grcbot [1-100] | grcbotx | purg"
              className="flex-1 bg-[#0f172a] border border-slate-700 px-2 py-1.5 rounded font-mono text-[14px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-600"
            />
            <button
              type="button"
              onClick={() => handleLegacyTerminalCommand(terminalCommand)}
              className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-[12px] font-bold uppercase tracking-widest text-white hover:bg-slate-700"
            >
              Run
            </button>
          </div>
        {/* TTL ? always display */}
        <div className="flex w-full gap-2">
          <div className="flex h-10 flex-1 items-center gap-1 rounded border border-slate-800 bg-[#0f172a] px-1">
            <button type="button" onClick={() => { const h = Number.parseInt(ttlInput.split(':')[0] || '0', 10) || 0; const next = Math.max(0, h - 1); setTtlInput(`${next.toString().padStart(2, '0')}:00:00`); setTtlRunning(false); }} className="h-6 w-6 rounded border border-slate-700 bg-slate-900 text-[10px] font-bold text-white hover:text-slate-200">-</button>
            <input type="number" min={0} className="h-full w-full appearance-none bg-transparent text-center text-xs font-bold text-white outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" placeholder="Hours" value={ttlInput.split(':')[0]} onChange={(e: ChangeEvent<HTMLInputElement>) => { const raw = e.target.value; if (raw === '') { setTtlInput(''); return; } const h = Math.max(0, Number.parseInt(raw, 10) || 0); setTtlInput(`${h.toString().padStart(2, '0')}:00:00`); setTtlRunning(false); }} />
            <button type="button" onClick={() => { const h = Number.parseInt(ttlInput.split(':')[0] || '0', 10) || 0; setTtlInput(`${(h + 1).toString().padStart(2, '0')}:00:00`); setTtlRunning(false); }} className="h-6 w-6 rounded border border-slate-700 bg-slate-900 text-[10px] font-bold text-white hover:text-slate-200">+</button>
          </div>
          <button type="button" className="h-10 flex-1 rounded bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-500" onClick={() => { const [hStr = '0', mStr = '0', sStr = '0'] = ttlInput.split(':'); let total = (Number.parseInt(hStr, 10) || 0) * 3600 + (Number.parseInt(mStr, 10) || 0) * 60 + (Number.parseInt(sStr, 10) || 0); if (!Number.isFinite(total) || total <= 0) total = 72 * 3600; if (total < 30 * 60) total = 30 * 60; setTtlSeconds(total); const hh = Math.floor(total / 3600).toString().padStart(2, '0'); const mm = Math.floor((total % 3600) / 60).toString().padStart(2, '0'); const ss = (total % 60).toString().padStart(2, '0'); setTtlInput(`${hh}:${mm}:${ss}`); setTtlRunning(true); appendAuditLog({ action_type: 'GRC_SET_TTL', log_type: 'GRC', description: `Set TTL to ${hh}:${mm}:${ss}` }); }}>
            SET
          </button>
          <div className="flex h-10 flex-1 items-center justify-center rounded border border-slate-800 bg-slate-900 px-2 text-[10px] font-mono font-bold tracking-widest text-amber-500">
            <span className="mr-1">TTL:</span>
            <input type="text" value={ttlInput} onChange={(e: ChangeEvent<HTMLInputElement>) => { setTtlInput(e.target.value); setTtlRunning(false); }} className="h-full w-full bg-transparent text-center outline-none" placeholder="72:00:00" />
          </div>
        </div>
        </div>

        {/* Run Sentinel Sweep ? always display */}
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-[16px] text-white">Enter Agent Instruction...</label>
          <input type="text" placeholder="Enter Agent Instruction..." value={agentInstruction} onChange={(e: ChangeEvent<HTMLInputElement>) => setAgentInstruction(e.target.value)} className="bg-[#0f172a] border border-slate-800 p-2.5 rounded text-[16px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500" />
          <button type="button" onClick={() => { const instruction = agentInstruction.trim(); if (!instruction) return; runSentinelSweep(instruction); appendAuditLog({ action_type: 'GRC_SENTINEL_SWEEP', log_type: 'GRC', description: `Sentinel sweep dispatched: ${instruction}` }); setAgentInstruction(''); }} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-3 rounded text-[11px] transition-colors flex items-center justify-center gap-2 mt-2">
            <div className="bg-black/80 text-white w-5 h-5 flex items-center justify-center rounded-full text-[9px]">N</div>
            <Search size={14} strokeWidth={3} /> RUN SENTINEL SWEEP
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#050509] text-white font-sans border-r border-zinc-900 overflow-hidden">

      {/* 1. CONTROL ROOM PANEL */}
      <div className="p-4 border-b border-zinc-900 bg-black/20">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Control Room</h2>

        {/* Top Navigation Grid */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          {['Dashboard', 'Reports', 'Audit Trail', 'Settings'].map((btn) => (
            <button key={btn} className="text-[9px] font-bold py-1.5 border border-zinc-800 rounded bg-zinc-900/40 text-zinc-400 uppercase hover:text-white transition-all">
              {btn}
            </button>
          ))}
        </div>

        {/* Adversarial & System Toggles */}
        <div className="grid grid-cols-2 gap-2">
          <button className="text-[10px] font-black py-2 bg-zinc-900/60 border border-zinc-800 rounded text-zinc-500 uppercase hover:border-zinc-600">
            Kimbot Off
          </button>
          <button className="text-[10px] font-black py-2 bg-zinc-900/60 border border-zinc-800 rounded text-zinc-500 uppercase hover:border-zinc-600">
            Grcbot Off
          </button>
          <button
            onClick={() => setIsExpertMode(!isExpertMode)}
            className={`text-[10px] font-black py-2 border border-zinc-800 rounded uppercase transition-colors ${isExpertMode ? 'text-emerald-500 bg-emerald-950/10' : 'text-zinc-500 bg-zinc-900/60'}`}
          >
            Expert {isExpertMode ? 'On' : 'Off'}
          </button>
          <button className="text-[10px] font-black py-2 bg-red-950/20 border border-red-900/40 rounded text-red-500 uppercase hover:bg-red-900/30">
            Master Purge
          </button>
        </div>
      </div>

      {/* Subsequent sections (Risk Exposure, Agents, Terminal) */}
      <div className="flex flex-col gap-6 w-full px-2 pb-6 pt-6 overflow-y-auto">
      {/* --- INDUSTRY PROFILE (Toggle + Dropdown + Load Strategy) --- */}
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
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Energy">Energy</option>
              <option value="Technology">Technology</option>
              <option value="Defense">Defense</option>
            </select>
            <button
              type="button"
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded uppercase transition-all active:scale-95"
            >
              Load Strategy
            </button>
          </div>
        )}
      </section>

      {/* 2. RISK EXPOSURE METRICS */}
      <section className="p-4 space-y-4 border-b border-zinc-900 bg-black/40">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Risk Exposure</h3>
          {/* Bug Fix: Restored the missing monospace ID from the 168-hour review */}
          <span className="text-[9px] font-bold text-zinc-600 font-mono">ID: 0x8F22</span>
        </div>

        {/* Bug Fix: Strictly limited to 3 metric rows. Legacy GAP/Trend rows are wiped. */}
        <div className="space-y-4">
          {[
            { label: 'Industry Average', val: '$8.5M', color: 'bg-blue-600', text: 'text-blue-400', w: '60%' },
            { label: 'Your Current Risk', val: '$10.9M', color: 'bg-amber-500', text: 'text-amber-500', w: '80%' },
            { label: 'Potential Impact', val: '$15.2M', color: 'bg-red-600', text: 'text-red-500', w: '95%' }
          ].map((metric) => (
            <div key={metric.label} className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                <span className="text-zinc-400">{metric.label}</span>
                <span className={metric.text}>{metric.val}</span>
              </div>
              <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
                <div className={`h-full ${metric.color} shadow-[0_0_10px_rgba(0,0,0,0.8)]`} style={{ width: metric.w }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- TOP SECTOR THREATS --- */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-white uppercase">
          Top Sector Threats (Click to Register)
        </span>
        <div key={selectedIndustry} className="space-y-1.5 threat-list-fade-in">
          {threats.map((threat) => {
            const isAccepted = activeSidebarThreats.includes(threat.id);
            const isInPipeline = pipelineThreats.some((t) => t.id === threat.id);
            const statusClass = isAccepted
              ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
              : isInPipeline
                ? "border-amber-500/70 bg-amber-500/10 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                : "border-slate-800 bg-[#0f172a] hover:bg-slate-800";
            return (
              <button
                key={threat.id}
                type="button"
                onClick={() => toggleThreat(threat.id)}
                className={`w-full flex justify-between items-center px-3 py-2.5 rounded border cursor-pointer transition-all duration-300 active:scale-95 ${statusClass}`}
              >
                <div className="flex items-center gap-2 pointer-events-none">
                  {isAccepted ? <CheckCircle2 className="text-emerald-400" size={14} /> : <Zap className={isInPipeline ? "text-amber-400" : "text-blue-500"} size={14} />}
                  <span className={`font-bold text-[10px] uppercase ${isAccepted ? 'text-emerald-400' : isInPipeline ? 'text-amber-400' : 'text-slate-300'}`}>
                    {threat.name}
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-bold ${isAccepted ? 'text-emerald-400' : isInPipeline ? 'text-amber-400' : 'text-emerald-500'}`}>
                  ${threat.loss}M
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. AI AGENT STATUS GRID (Encoding Bug Fixed) */}
      <section className="p-4 bg-[#050509] border-b border-zinc-900">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Active Agents // 19-Agent Workforce</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: 'Ironsight', icon: '\u25ce', color: 'text-red-500' },
            { name: 'Coreintel', icon: '\uD83E\uDDE0', color: 'text-emerald-500' },
            { name: 'Agent Manager', icon: '\uD83D\uDEE1\uFE0F', color: 'text-blue-500' }
          ].map((agent) => {
            // Using explicit return to prevent Turbopack bracket parsing errors
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
      <div className="flex-1 flex flex-col min-h-0 bg-black border-b border-zinc-900">
        <div className="h-48 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed text-emerald-500/60 custom-scrollbar">
          <div className="space-y-1">
            {/* Bug Fix: Replaced the broken '?' encoding with the proper em dash '?' */}
            {isExpertMode ? (
              <>
                <p className="text-zinc-500 opacity-50 italic">Awaiting command input (kimbot, grcbot, purg)...</p>
                <p className="text-emerald-500/40 animate-pulse">_</p>
              </>
            ) : (
              <p className="text-zinc-600 font-black tracking-widest">[ EXPERT MODE OFF ? TELEMETRY STREAM HIDDEN ]</p>
            )}
          </div>
        </div>

        {/* 5. 'N' AVATAR COMMAND INPUT */}
        <form onSubmit={handleTerminalCommand} className="mt-auto p-4 bg-zinc-950/20" data-testid="test-run-ingestion">
          <div className="flex items-center gap-3 py-1.5 px-3 border border-zinc-800/50 rounded-full bg-black/40 shadow-inner group focus-within:border-emerald-500/50 transition-all">
            <div className="h-6 w-6 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-[10px] font-black text-zinc-600 group-focus-within:text-emerald-500 transition-colors">
              N
            </div>
            <input
              type="text"
              value={terminalInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTerminalInput(e.target.value)}
              className="bg-transparent border-none outline-none text-zinc-400 font-mono text-xs w-full placeholder:text-zinc-700 selection:bg-emerald-500/30"
              placeholder="kimbot | kimbotx | grcbot [1-100] | grcbotx |"
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
      </div>

      {/* --- TIMER CONTROLS (TTL) --- */}
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

      {/* --- SENTINEL SWEEP --- */}
      <div className="flex flex-col gap-2 mt-2">
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
          onClick={() => {
            const instruction = agentInstruction.trim();
            if (!instruction) return;
            runSentinelSweep(instruction);
            appendAuditLog({
              action_type: 'GRC_SENTINEL_SWEEP',
              log_type: 'GRC',
              description: `Sentinel sweep dispatched with instruction: ${instruction}`,
            });
            setAgentInstruction('');
          }}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-3 rounded text-[11px] transition-colors flex items-center justify-center gap-2 mt-2"
        >
          <div className="bg-black/80 text-white w-5 h-5 flex items-center justify-center rounded-full text-[9px]">N</div>
          <Search size={14} strokeWidth={3} /> RUN SENTINEL SWEEP
        </button>
      </div>

      </div>
    </div>
  );
}
