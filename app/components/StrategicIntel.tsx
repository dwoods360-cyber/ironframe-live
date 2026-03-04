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
  const [activeRiskTooltip, setActiveRiskTooltip] = useState<'industry' | 'current' | 'potential' | 'gap' | null>(null);
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

  // Terminal command handler: kimbot | kimbotx | grcbot | grcbotx | purg
  const handleTerminalCommand = (raw: string) => {
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
  }, [intelligenceStream.length]);

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
      description: `Liability: $${threat.loss}M · Sector: ${selectedIndustry}`,
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

  // Synced with header: accepted impacts ($M) — simple sum of accepted liabilities only (no severity factor, no multi-tenant sum).
  const entries = Object.entries(acceptedThreatImpacts);
  const exactTotalCurrentRisk = entries.reduce((sum, [, v]) => sum + Number(v), 0);
  const totalActiveLoss = exactTotalCurrentRisk;

  // Debug: log which IDs are included in "Your Current Risk" so ghosts are visible (browser console).
  if (typeof window !== "undefined" && entries.length > 0) {
    console.log("[CURRENT RISK] IDs in sum:", Object.keys(acceptedThreatImpacts), "values ($M):", Object.fromEntries(entries), "sum:", exactTotalCurrentRisk.toFixed(1) + "M");
  }
  // Supply-chain impact (1–10) is a primary driver of Potential Impact:
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
  // Risk Gap = $Potential − $Current; updates in real time as users acknowledge/dismiss pipeline cards (riskStore).
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

        {/* Placeholder when idle — data-dependent sections hidden */}
        <div className="rounded border border-slate-800 bg-slate-950/40 p-4 text-center font-sans text-sm text-slate-500">
          [ WAITING FOR INTELLIGENCE STREAM... ]
        </div>

        {/* AI AGENTS — always display */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-white uppercase">AI Agents</span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'ironsight' as const, name: 'Ironsight', icon: <ShieldCheck size={16} />, color: 'text-red-500' },
              { key: 'coreintel' as const, name: 'Coreintel', icon: <Brain size={16} />, color: 'text-purple-500' },
              { key: 'agentManager' as const, name: 'Agent Manager', icon: <Shield size={16} />, color: 'text-slate-400' },
            ].map((agent) => {
              const status = agents[agent.key]?.status ?? 'HEALTHY';
              const isActiveDefense = status === 'ACTIVE_DEFENSE';
              const label = isActiveDefense ? 'Active Defense' : 'Healthy';
              return (
                <div key={agent.name} className="flex flex-col items-center justify-center py-3 px-1 bg-[#0f172a] border border-slate-800 rounded-lg">
                  <div className={`${agent.color} mb-2`}>{agent.icon}</div>
                  <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter mb-1.5 text-center">{agent.name}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[7px] font-bold uppercase tracking-widest text-emerald-500">{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COREINTEL // LIVE INTELLIGENCE STREAM — stream/placeholder only; command input is in Test Run Ingestion */}
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
              [ EXPERT MODE OFF — TELEMETRY STREAM HIDDEN ]
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-3" data-testid="test-run-ingestion">
          <div className="flex gap-1">
            <input
              type="text"
              value={terminalCommand}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTerminalCommand(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTerminalCommand(terminalCommand); }}
              placeholder="kimbot | kimbotx | grcbot [1-100] | grcbotx | purg"
              className="flex-1 bg-[#0f172a] border border-slate-700 px-2 py-1.5 rounded font-mono text-[14px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-600"
            />
            <button
              type="button"
              onClick={() => handleTerminalCommand(terminalCommand)}
              className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-[12px] font-bold uppercase tracking-widest text-white hover:bg-slate-700"
            >
              Run
            </button>
          </div>
        {/* TTL — always display */}
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

        {/* Run Sentinel Sweep — always display */}
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
    // Glass container: 50% opaque + backdrop blur
    <div className="flex flex-col gap-6 w-full px-2 pb-6 pt-6 bg-[#0f172a]/50 backdrop-blur-md font-sans">

      {/* --- COMPONENT HEADER (Pencil Removed) --- */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-[10.5px] font-bold uppercase tracking-wide text-white font-sans">Strategic Intel</span>
          <div className="flex items-center gap-1.5">
            {isAnalyzing ? (
              <>
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide animate-pulse">Analyzing...</span>
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              </>
            ) : (
              <>
                <span className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wide">Agent Manager: Healthy</span>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              </>
            )}
          </div>
        </div>
        <div className="w-full h-px bg-slate-800" />
      </div>

      {/* --- INDUSTRY PROFILE (Toggle + Dropdown) --- */}
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

        {/* Conditional Rendering for the Collapsible Section */}
        {isProfileVisible && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
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

      {/* --- RISK EXPOSURE (SCENARIO 2 LIVE) --- */}
      <div className="flex flex-col gap-4">
        <span className="text-[10px] font-bold text-white uppercase">Risk Exposure</span>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-300">
            <span className="flex items-center gap-1.5">
              Industry Average (Benchmark)
              <span
                className="relative inline-flex text-slate-500 hover:text-slate-400 cursor-help"
                style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
                onMouseEnter={() => setActiveRiskTooltip('industry')}
                onMouseLeave={() => setActiveRiskTooltip(null)}
                onFocus={() => setActiveRiskTooltip('industry')}
                onBlur={() => setActiveRiskTooltip(null)}
                onClick={(e) => { e.preventDefault(); setActiveRiskTooltip((v) => (v === 'industry' ? null : 'industry')); }}
                role="button"
                tabIndex={0}
                aria-label="Explain Industry Average"
              >
                <Info size={12} />
                {activeRiskTooltip === 'industry' && (
                  <span
                    className="absolute left-0 bottom-full mb-1 z-50 w-56 px-2.5 py-2 rounded border border-slate-600 bg-slate-900 text-[10px] font-normal normal-case text-left text-white shadow-xl"
                    style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
                  >
                    Sector-standard risk level based on your Healthcare profile.
                  </span>
                )}
              </span>
            </span>
            <span className="text-blue-400">
              {expertModeEnabled
                ? `$${formatRiskExposure(industryAverage * 1_000_000, currencyMagnitude)}`
                : "BENCHMARK"}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${avgWidth}%` }}></div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-300">
            <span className="flex items-center gap-1.5">
              Your Current Risk (Actual)
              <span
                className="relative inline-flex text-slate-500 hover:text-slate-400 cursor-help"
                style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
                onMouseEnter={() => setActiveRiskTooltip('current')}
                onMouseLeave={() => setActiveRiskTooltip(null)}
                onFocus={() => setActiveRiskTooltip('current')}
                onBlur={() => setActiveRiskTooltip(null)}
                onClick={(e) => { e.preventDefault(); setActiveRiskTooltip((v) => (v === 'current' ? null : 'current')); }}
                role="button"
                tabIndex={0}
                aria-label="Explain Your Current Risk"
              >
                <Info size={12} />
                {activeRiskTooltip === 'current' && (
                  <span
                    className="absolute left-0 bottom-full mb-1 z-50 w-56 px-2.5 py-2 rounded border border-slate-600 bg-slate-900 text-[10px] font-normal normal-case text-left text-white shadow-xl"
                    style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
                  >
                    Total liability from confirmed and active threats in your environment.
                  </span>
                )}
              </span>
            </span>
            <span
              className={`font-bold transition-all duration-300 ${
                expertModeEnabled
                  ? (riskReductionFlash ? 'text-emerald-400 animate-pulse' : 'text-amber-500')
                  : riskLevel(dynamicCurrentRisk).className
              }`}
            >
              {expertModeEnabled
                ? `$${formatRiskExposure(dynamicCurrentRisk * 1_000_000, currencyMagnitude)}`
                : riskLevel(dynamicCurrentRisk).label}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(245,158,11,0.4)]" style={{ width: `${riskWidth}%` }}></div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-300">
            <span className="flex items-center gap-1.5">
              Potential Impact (Ceiling)
              <span
                className="relative inline-flex text-slate-500 hover:text-slate-400 cursor-help"
                style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
                onMouseEnter={() => setActiveRiskTooltip('potential')}
                onMouseLeave={() => setActiveRiskTooltip(null)}
                onFocus={() => setActiveRiskTooltip('potential')}
                onBlur={() => setActiveRiskTooltip(null)}
                onClick={(e) => { e.preventDefault(); setActiveRiskTooltip((v) => (v === 'potential' ? null : 'potential')); }}
                role="button"
                tabIndex={0}
                aria-label="Explain Potential Impact"
              >
                <Info size={12} />
                {activeRiskTooltip === 'potential' && (
                  <span
                    className="absolute left-0 bottom-full mb-1 z-50 w-56 px-2.5 py-2 rounded border border-slate-600 bg-slate-900 text-[10px] font-normal normal-case text-left text-white shadow-xl"
                    style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
                  >
                    Total projected liability if all vulnerabilities and pending threats are exploited.
                  </span>
                )}
              </span>
            </span>
            <span
              className={`font-bold transition-all duration-300 ${
                expertModeEnabled
                  ? (riskReductionFlash ? 'text-emerald-400 animate-pulse' : 'text-red-500')
                  : riskLevel(dynamicPotentialImpact).className
              }`}
            >
              {expertModeEnabled
                ? `$${formatRiskExposure(dynamicPotentialImpact * 1_000_000, currencyMagnitude)}`
                : riskLevel(dynamicPotentialImpact).label}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(239,68,68,0.6)]" style={{ width: `${impactWidth}%` }}></div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-300">
            <span className="flex items-center gap-1.5">
              Unmitigated Risk (GAP) (Delta)
              <span
                className="relative inline-flex text-slate-500 hover:text-slate-400 cursor-help"
                style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
                onMouseEnter={() => setActiveRiskTooltip('gap')}
                onMouseLeave={() => setActiveRiskTooltip(null)}
                onFocus={() => setActiveRiskTooltip('gap')}
                onBlur={() => setActiveRiskTooltip(null)}
                onClick={(e) => { e.preventDefault(); setActiveRiskTooltip((v) => (v === 'gap' ? null : 'gap')); }}
                role="button"
                tabIndex={0}
                aria-label="Explain Unmitigated Risk (Gap)"
              >
                <Info size={12} />
                {activeRiskTooltip === 'gap' && (
                  <span
                    className="absolute left-0 bottom-full mb-1 z-50 w-56 px-2.5 py-2 rounded border border-slate-600 bg-slate-900 text-[10px] font-normal normal-case text-left text-white shadow-xl"
                    style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
                  >
                    The financial difference between current confirmed risk and total potential impact (Gap = Potential Impact − Current Risk).
                  </span>
                )}
              </span>
            </span>
            <span
              className={`font-bold transition-all duration-300 ${
                hasGapTelemetry ? "text-slate-300" : "text-slate-500"
              }`}
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
            >
              {hasGapTelemetry
                ? `$${formatRiskExposure(riskGap * 1_000_000, currencyMagnitude)}`
                : (expertModeEnabled ? '[ WAITING FOR TELEMETRY... ]' : '—')}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-500 transition-all duration-500 ease-out"
              style={{ width: `${hasGapTelemetry ? Math.min((riskGap / MAX_SCALE) * 100, 100) : 0}%` }}
            />
          </div>
        </div>

        {/* # RISK_TREND_INDICATORS */}
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
              Risk Trend (Synthetic)
            </span>
          </div>
          <div className="h-44 w-full bg-transparent">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskTrendChartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="rgb(51 65 85)" strokeDasharray="2 4" opacity={0.5} />
                <XAxis
                  dataKey="phase"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgb(51 65 85)' }}
                />
                <YAxis
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgb(51 65 85)' }}
                  width={58}
                  tickFormatter={(value: number) => `$${formatRiskExposure(Number(value), currencyScale)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(2, 6, 23, 0.92)',
                    border: '1px solid rgb(51 65 85)',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0',
                  }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                  formatter={(value, name) => [`$${formatRiskExposure(Number(value ?? 0), currencyScale)}`, String(name ?? '')]}
                />
                <Legend
                  wrapperStyle={{ color: '#cbd5e1', fontSize: '10px', paddingTop: '6px' }}
                />
                <Line
                  type="monotone"
                  dataKey="currentRiskActual"
                  name="Your Current Risk (Actual)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="industryAverageBenchmark"
                  name="Industry Average (Benchmark)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="potentialImpactCeiling"
                  name="Potential Impact (Ceiling)"
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="unmitigatedRiskGap"
                  name="Unmitigated Risk (GAP/Delta)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

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

      {/* --- AI AGENTS --- */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-white uppercase">AI Agents</span>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'ironsight' as const, name: 'Ironsight', icon: <ShieldCheck size={16} />, color: 'text-red-500' },
            { key: 'coreintel' as const, name: 'Coreintel', icon: <Brain size={16} />, color: 'text-purple-500' },
            { key: 'agentManager' as const, name: 'Agent Manager', icon: <Shield size={16} />, color: 'text-slate-400' },
          ].map((agent) => {
            const status = agents[agent.key]?.status ?? 'HEALTHY';
            const isProcessing = status === 'PROCESSING';
            const isOffline = status === 'OFFLINE';
            const isWarning = status === 'WARNING';
            const isActiveDefense = status === 'ACTIVE_DEFENSE';
            const isHighLoad =
              agent.key === 'agentManager' &&
              grcBotEnabled &&
              grcBotCompanyCount >= 100 &&
              systemLatencyMs != null &&
              systemLatencyMs > 100;

            let dotClass = 'bg-emerald-500 animate-pulse';
            let textClass = 'text-emerald-500';
            let label = 'Healthy';

            if (isHighLoad) {
              dotClass = 'bg-amber-500 animate-pulse';
              textClass = 'text-amber-400';
              label = 'High Load';
            } else if (isActiveDefense) {
              dotClass = 'bg-emerald-500 animate-pulse';
              textClass = 'text-emerald-400';
              label = 'Active Defense';
            } else if (isProcessing) {
              dotClass = 'bg-amber-400 animate-pulse';
              textClass = 'text-amber-300';
              label = 'Processing...';
            } else if (isOffline) {
              dotClass = 'bg-red-500';
              textClass = 'text-red-400';
              label = 'Offline';
            } else if (isWarning) {
              dotClass = 'bg-amber-500 animate-pulse';
              textClass = 'text-amber-400';
              label = 'Warning';
            }

            return (
              <div key={agent.name} className="flex flex-col items-center justify-center py-3 px-1 bg-[#0f172a] border border-slate-800 rounded-lg">
                <div className={`${agent.color} mb-2`}>{agent.icon}</div>
                <span className="text-[8px] font-bold text-slate-300 uppercase tracking-titter mb-1.5 text-center">
                  {agent.name}
                </span>
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                  <span className={`text-[7px] font-bold uppercase tracking-widest ${textClass}`}>{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- COREINTEL // LIVE INTELLIGENCE STREAM --- */}
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
              intelligenceStream
                .slice()
                .reverse()
                .map((msg, idx) => (
                  <div key={`${msg}-${idx}`}>{msg}</div>
                ))
            )}
          </div>
        ) : (
          <div className="rounded border border-slate-800 bg-slate-950/40 p-3 text-[10px] text-slate-500">
            [ EXPERT MODE OFF — TELEMETRY STREAM HIDDEN ]
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-3" data-testid="test-run-ingestion">
        <div className="flex gap-1">
          <input
            type="text"
            value={terminalCommand}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTerminalCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTerminalCommand(terminalCommand);
            }}
            placeholder="kimbot | kimbotx | grcbot [1-100] | grcbotx | purg"
            className="flex-1 bg-[#0f172a] border border-slate-700 px-2 py-1.5 rounded font-mono text-[14px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-600"
          />
          <button
            type="button"
            onClick={() => handleTerminalCommand(terminalCommand)}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-[12px] font-bold uppercase tracking-widest text-white hover:bg-slate-700"
          >
            Run
          </button>
        </div>
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
  );
}
