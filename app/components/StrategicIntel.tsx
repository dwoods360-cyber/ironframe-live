'use client';

import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import Link from 'next/link';
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
import { useShallow } from 'zustand/react/shallow';
import { useKimbotStore } from '@/app/store/kimbotStore';
import { useGrcBotStore } from '@/app/store/grcBotStore';
import { useSystemConfigStore } from '@/app/store/systemConfigStore';
import { triggerAttbotSimulation } from '@/app/actions/attbotActions';
import ControlRoom from '@/app/components/ControlRoom';
import { getDbQueryMs } from '@/app/actions/simulation';
import { wakeBlueTeam, sleepBlueTeam } from '@/app/utils/blueTeamSync';
import { purgeSimulation } from '@/app/actions/purgeSimulation';
import { clearAllAuditLogs, purgeSimulationAuditLogs } from '@/app/utils/auditLogger';
import { formatRiskExposure } from "@/app/utils/riskFormatting";
import { generateKimbotSignal, kimbotIntervalMs } from "@/app/utils/kimbotEngine";
import { createKimbotThreatServer } from "@/app/actions/simulationActions";
import { pollResilienceIntelStreamLines } from "@/app/actions/resilienceIntelStreamActions";

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
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const intelStreamRef = useRef<HTMLDivElement | null>(null);
  const resilienceStreamCursorRef = useRef<string | null>(null);

  // Global risk store: sidebar threats + dashboard liabilities + Scenario 3 risk reduction
  const dashboardLiabilities = useRiskStore((state) => state.dashboardLiabilities);
  const activeSidebarThreats = useRiskStore((state) => state.activeSidebarThreats);
  const toggleSidebarThreat = useRiskStore((state) => state.toggleSidebarThreat);
  const clearActiveSidebarThreats = useRiskStore((state) => state.clearActiveSidebarThreats);
  const riskOffset = useRiskStore((state) => state.riskOffset);
  const riskReductionFlash = useRiskStore((state) => state.riskReductionFlash);
  const clearRiskReductionFlash = useRiskStore((state) => state.clearRiskReductionFlash);
  const pipelineThreats = useRiskStore((state) => state.pipelineThreats ?? (state as { threats?: PipelineThreat[] }).threats ?? (state as { pipeline?: PipelineThreat[] }).pipeline ?? []);
  const acceptedThreatImpacts = useRiskStore((state) => state.acceptedThreatImpacts);
  const setDraftTemplate = useRiskStore((state) => state.setDraftTemplate);
  const removeThreatFromPipeline = useRiskStore((state) => state.removeThreatFromPipeline);
  const selectedIndustry = useRiskStore((state) => state.selectedIndustry);
  const setSelectedIndustry = useRiskStore((state) => state.setSelectedIndustry);
  const currencyScale = useRiskStore((state) => state.currencyScale);
  const getTotalCurrentRiskCents = useRiskStore((state) => state.getTotalCurrentRiskCents);
  const getGrcGapCents = useRiskStore((state) => state.getGrcGapCents);

  // Agent / Coreintel state
  const agents = useAgentStore((s) => s.agents);
  const intelligenceStream = useAgentStore((s) => s.intelligenceStream);
  const addStreamMessage = useAgentStore((s) => s.addStreamMessage);
  const runSentinelSweep = useAgentStore((s) => s.runSentinelSweep);
  const setAgentStatus = useAgentStore((s) => s.setAgentStatus);
  const systemLatencyMs = useAgentStore((s) => s.systemLatencyMs);
  const setSystemLatencyMs = useAgentStore((s) => s.setSystemLatencyMs);

  const isKimbotActive = useKimbotStore((s) => s.enabled);
  const kimbotIntensity = useKimbotStore((s) => s.intensity);
  const kimbotAttackType = useKimbotStore((s) => s.attackType);
  const addKimbotInjectedSignal = useKimbotStore((s) => s.addInjectedSignal);
  const setKimbotEnabled = useKimbotStore((s) => s.setEnabled);
  const grcBotCompanyCount = useGrcBotStore((s) => s.companyCount);
  const isGrcbotActive = useGrcBotStore((s) => s.enabled);
  const setGrcbotEnabled = useGrcBotStore((s) => s.setEnabled);
  const expertModeEnabled = useSystemConfigStore().expertModeEnabled;
  const router = useRouter();

  const toggleKimbot = () => setKimbotEnabled(!isKimbotActive);
  const toggleGrcbot = () => setGrcbotEnabled(!isGrcbotActive);

  async function handleMasterPurge() {
    const result = await purgeSimulation();
    if (result.ok) {
      clearAllAuditLogs();
      useKimbotStore.getState().resetSimulationCounters();
      useGrcBotStore.getState().stop();
      useRiskStore.getState().clearAllRiskStateForPurge();
      useRiskStore.getState().setSelectedThreatId(null);
      addStreamMessage("> [SYSTEM] Simulation environment wiped. System status: CLEAN.");
      sleepBlueTeam();
      router.refresh();
    }
  }

  // Ironbloom (sim) engine loop: when enabled (chip or terminal), generate simulated attacks + terminal logs.
  const kimbotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isKimbotActive) {
      if (kimbotIntervalRef.current) {
        clearInterval(kimbotIntervalRef.current);
        kimbotIntervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      const signal = generateKimbotSignal(selectedIndustry, kimbotAttackType, kimbotIntensity);
      (async () => {
        try {
          const created = await createKimbotThreatServer({
            title: signal.title,
            sector: signal.targetSector ?? selectedIndustry,
            liability: signal.liability,
            source: "IRONBLOOM",
            severity: Math.min(10, Math.max(1, Math.round(signal.severityScore / 10))),
          });
          useRiskStore.getState().upsertPipelineThreat({
            id: created.id,
            name: created.title,
            loss: created.financialRisk_cents / 100_000_000,
            score: created.score,
            industry: created.targetEntity,
            source: created.sourceAgent,
            description: `Red Team Attack - $${(created.financialRisk_cents / 100_000_000).toFixed(1)}M - ${created.sourceAgent}`,
          });
          useKimbotStore.getState().addInjectedSignal({
            ...signal,
            id: created.id,
          });
          addStreamMessage(`> [${new Date().toISOString()}] IRONBLOOM: ${signal.title} (${signal.severity})`);
        } catch (e) {
          addStreamMessage(`> [IRONBLOOM] Failed to persist: ${e instanceof Error ? e.message : "Unknown"}`);
        }
      })();
    };

    tick();
    const ms = kimbotIntervalMs(kimbotIntensity);
    kimbotIntervalRef.current = setInterval(tick, ms);

    return () => {
      if (kimbotIntervalRef.current) {
        clearInterval(kimbotIntervalRef.current);
        kimbotIntervalRef.current = null;
      }
    };
  }, [isKimbotActive, kimbotIntensity, kimbotAttackType, selectedIndustry, addKimbotInjectedSignal, addStreamMessage]);

  // Server-persisted Irontech / Ironintel resilience lines → Intelligence Stream (see `irontechResilience` + AuditLog).
  useEffect(() => {
    resilienceStreamCursorRef.current = new Date().toISOString();
    const id = setInterval(() => {
      void (async () => {
        const since = resilienceStreamCursorRef.current;
        const rows = await pollResilienceIntelStreamLines(since);
        if (rows.length === 0) return;
        const add = useAgentStore.getState().addStreamMessage;
        for (const r of rows) {
          add(r.line);
        }
        resilienceStreamCursorRef.current = rows[rows.length - 1]!.createdAt;
      })();
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Agent status: Healthy (green) or Alerting (red) when Ironbloom sim is active for Ironsight / Ironintel
  const getAgentStatus = (agentName: string) => {
    if (isKimbotActive && (agentName === 'Ironsight' || agentName === 'Ironintel')) {
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

  // Terminal command handler: form submit — ironbloom | grcbot [n] | purg (kimbot aliases retained)
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
        case 'ironbloom':
          setLogs((prev) => [...prev, '[SYSTEM] IRONBLOOM_START: Initiating adversarial stress test (19-agent Iron roster)']);
          useKimbotStore.getState().setEnabled(true);
          wakeBlueTeam();
          addStreamMessage('> [CMD] IRONBLOOM_START: Defensive agents deployed.');
          break;

        case 'kimbotx':
        case 'ironbloomx':
          setLogs((prev) => [...prev, '[SYSTEM] IRONBLOOM_STOP: Agents reset']);
          useKimbotStore.getState().setEnabled(false);
          sleepBlueTeam();
          addStreamMessage('> [CMD] IRONBLOOM_STOP: Agents reset to Healthy.');
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

    if (cmd === 'kimbot' || cmd === 'ironbloom') {
      useKimbotStore.getState().setEnabled(true);
      wakeBlueTeam();
      addStreamMessage('> [CMD] IRONBLOOM_START: Defensive agents deployed.');
    } else if (cmd === 'kimbotx' || cmd === 'ironbloomx') {
      useKimbotStore.getState().setEnabled(false);
      sleepBlueTeam();
      addStreamMessage('> [CMD] IRONBLOOM_STOP: Agents reset to Healthy.');
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
      addStreamMessage(`> [CMD] UNKNOWN: "${cmd}". Use: ironbloom | ironbloomx | grcbot [1-100] | grcbotx | purg`);
    }
    setTerminalCommand('');
  };

  // New States for the Industry Profile UX (isProfileVisible kept at top with isExpertMode)
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

  // Wake up instrumented agents: when Ironbloom sim is active, set core trio to ACTIVE_DEFENSE (green pulsing).
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
    useRiskStore.getState().upsertPipelineThreat(pipelineThreat);
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

  // # RISK_TREND_INDICATORS
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

  // --- Live financial aggregation: current risk and GRC gap from store (cents as string), scaled by currency selector ---
  const totalCurrentRiskCents = getTotalCurrentRiskCents();
  const grcGapCents = getGrcGapCents();
  const currentRiskFormatted = formatRiskExposure(totalCurrentRiskCents, currencyScale);
  const grcGapFormatted = formatRiskExposure(grcGapCents, currencyScale);

  // Dynamic pipeline risk: sum of threat losses in $M (for bar widths and potential impact display)
  const totalRiskMillions = pipelineThreats.reduce((sum: number, threat: PipelineThreat) => sum + Number(threat.loss ?? threat.score ?? 0), 0);
  const potentialImpactMillions = totalRiskMillions * 1.4;
  const potentialImpactDisplay = totalRiskMillions === 0 ? '$0M' : `$${potentialImpactMillions.toFixed(1)}M`;

  const currentRiskWidth = totalCurrentRiskCents === '0' ? '0%' : '80%';
  const impactWidth = totalRiskMillions === 0 ? '0%' : '95%';

  // Single sidebar layout: always show the master block (Industry Profile, 4-bar Risk Exposure, Dynamic Top Sector Threats, Unicode Agent Grid).
  // Previously a "Dark Start" branch ran when !hasActiveIntelligenceStream and showed different/older UI, so edits were not visible.
  return (
    <div className="flex h-full flex-col bg-[#050509] text-white font-sans border-r border-zinc-900 overflow-hidden">

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

      <section className="p-4 border-b border-zinc-900 bg-[#050509]">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-300">Control Room</h2>
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
        </div>
        <div className="flex justify-between text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4">
          <Link href="/" className="hover:text-emerald-500 transition-colors">Dashboard</Link>
          <Link href="/reports/ops" className="hover:text-emerald-500 transition-colors">Reports</Link>
          <Link href="/integrity" className="hover:text-emerald-500 transition-colors">Audit Trail</Link>
          <Link href="/settings" className="hover:text-emerald-500 transition-colors">Settings</Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={toggleKimbot}
            className={`py-1.5 border text-[9px] font-black uppercase tracking-widest rounded-sm transition-colors ${isKimbotActive ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}
          >
            Ironbloom {isKimbotActive ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            onClick={toggleGrcbot}
            className={`py-1.5 border text-[9px] font-black uppercase tracking-widest rounded-sm transition-colors ${isGrcbotActive ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}
          >
            Grcbot {isGrcbotActive ? 'On' : 'Off'}
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 items-start">
          <form action={triggerAttbotSimulation} className="min-w-0">
            <button
              type="submit"
              className="w-full min-w-0 py-1.5 border border-amber-900/40 bg-amber-950/20 text-[9px] font-black uppercase tracking-widest rounded-sm text-amber-300 hover:bg-amber-900/30 transition-colors"
            >
              ATTBOT
            </button>
          </form>
          <button
            type="button"
            onClick={() => void handleMasterPurge()}
            className="min-w-0 w-full py-1.5 bg-red-950/30 border border-red-900/50 text-[9px] font-black text-red-500 rounded-sm hover:bg-red-900/50 hover:text-red-400 transition-colors uppercase tracking-widest self-start"
          >
            Master Purge
          </button>
          <div className="col-span-2">
            <ControlRoom />
          </div>
        </div>
      </section>

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
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Energy">Energy</option>
              <option value="Technology">Technology</option>
              <option value="Defense">Defense</option>
            </select>
          </div>
        )}
      </section>

      {/* 2. RISK EXPOSURE METRICS (4-Bar Layout & Hover Pop-up) ? driven by selected industry */}
      <section className="p-4 space-y-4 border-b border-zinc-900 bg-[#050509] relative group cursor-help">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Risk Exposure</h3>
          <span className="text-[10px] font-bold text-zinc-600 font-mono tracking-widest">ID: 0x8F22</span>
        </div>
        
        <div className="space-y-3.5">
          {[
            { label: 'INDUSTRY AVERAGE', val: currentMetrics.avg, color: 'bg-[#3b82f6]', text: 'text-[#3b82f6]', w: '60%' },
            { label: 'YOUR CURRENT RISK', val: `$${currentRiskFormatted}`, color: 'bg-[#f59e0b]', text: 'text-[#f59e0b]', w: currentRiskWidth },
            { label: 'POTENTIAL IMPACT', val: potentialImpactDisplay, color: 'bg-[#ef4444]', text: 'text-[#ef4444]', w: impactWidth },
            { label: 'GRC GAP', val: `$${grcGapFormatted}`, color: 'bg-[#a855f7]', text: 'text-[#a855f7]', w: '30%' }
          ].map((metric) => (
            <div key={metric.label} className="space-y-1.5">
              <div className="flex justify-between items-end">
                <span className="text-[11px] font-black font-sans uppercase tracking-wide text-zinc-300">{metric.label}</span>
                <span className={`text-[12px] font-black font-sans ${metric.text}`}>{metric.val}</span>
              </div>
              <div className="h-[3px] w-full bg-zinc-900/80 rounded-full overflow-hidden transition-all duration-500">
                <div className={`h-full ${metric.color} transition-all duration-500`} style={{ width: metric.w }} />
              </div>
            </div>
          ))}
        </div>

        {/* Hover Definition Pop-up Modal ? above section */}
        <div className="absolute z-50 left-4 right-4 bottom-full mb-2 translate-y-[2in] p-3 bg-zinc-950 border border-zinc-700 shadow-2xl rounded-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2 border-b border-zinc-800/50 pb-1">Exposure Definitions</p>
          <ul className="space-y-2">
            <li className="text-[9px] leading-tight text-zinc-400 font-sans"><strong className="text-zinc-200 font-black tracking-wide mr-1">Industry Average:</strong>Baseline financial exposure for peer organizations in this sector.</li>
            <li className="text-[9px] leading-tight text-zinc-400 font-sans"><strong className="text-zinc-200 font-black tracking-wide mr-1">Your Current Risk:</strong>Calculated real-time exposure based on active telemetry.</li>
            <li className="text-[9px] leading-tight text-zinc-400 font-sans"><strong className="text-zinc-200 font-black tracking-wide mr-1">Potential Impact:</strong>Maximum localized blast radius if vulnerabilities are exploited.</li>
            <li className="text-[9px] leading-tight text-zinc-400 font-sans"><strong className="text-zinc-200 font-black tracking-wide mr-1">GRC Gap:</strong>Delta between current controls and compliance mandates.</li>
          </ul>
        </div>
      </section>

      {/* 3. TOP SECTOR THREATS (Dynamic Boxed Cards) */}
      <section className="p-4 border-b border-zinc-900 bg-[#050509]">
        <p className="text-[10px] font-black text-[#3b82f6] uppercase tracking-widest mb-3 border-b border-zinc-800/50 pb-1.5">Top Sector Threats (Click to Register)</p>
        <div className="space-y-2">
          {(function getTopRisks() {
            switch(selectedIndustry) {
              case 'Healthcare': return [{ title: 'RANSOMWARE / PHI EXTORTION', val: '$4.9M', loss: 4.9 }, { title: 'MEDICAL DEVICE (IOMT) HIJACK', val: '$3.5M', loss: 3.5 }, { title: 'THIRD-PARTY VENDOR BREACH', val: '$2.1M', loss: 2.1 }];
              case 'Finance': return [{ title: 'SWIFT/WIRE FRAUD INJECTION', val: '$8.2M', loss: 8.2 }, { title: 'API DATA EXFILTRATION', val: '$5.4M', loss: 5.4 }, { title: 'INSIDER THREAT (PRIVILEGE)', val: '$3.1M', loss: 3.1 }];
              case 'Technology': return [{ title: 'SOURCE CODE / IP THEFT', val: '$9.5M', loss: 9.5 }, { title: 'CLOUD CRYPTOJACKING', val: '$4.2M', loss: 4.2 }, { title: 'ZERO-DAY SUPPLY CHAIN', val: '$7.8M', loss: 7.8 }];
              case 'Defense': return [{ title: 'NATION-STATE APT ESPIONAGE', val: '$12.4M', loss: 12.4 }, { title: 'CLASSIFIED DATA SPILLAGE', val: '$8.9M', loss: 8.9 }, { title: 'WEAPON SYSTEMS EXPLOITATION', val: '$15.1M', loss: 15.1 }];
              default: return [{ title: 'ICS/SCADA GRID TAKEOVER', val: '$11.2M', loss: 11.2 }, { title: 'SUPPLY CHAIN COMPROMISE', val: '$6.5M', loss: 6.5 }, { title: 'RANSOMWARE (OT)', val: '$4.8M', loss: 4.8 }];
            }
          })().map((risk, index) => (
            <button 
              key={index}
              type="button"
              onClick={() => {
                setDraftTemplate({
                  title: risk.title,
                  source: 'Strategic Intel Profile',
                  target: selectedIndustry || 'Healthcare',
                  loss: String(Math.round(risk.loss * 100_000_000)),
                });
              }}
              className="w-full flex justify-between items-center bg-[#050509] border border-zinc-800 p-2.5 rounded hover:border-zinc-500 transition-colors group"
            >
              <span className="text-[11px] font-black font-sans text-white tracking-wide">{risk.title}</span>
              <span className="text-[11px] font-black font-sans text-[#10b981]">{risk.val}</span>
            </button>
          ))}
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
              placeholder="ironbloom | ironbloomx | grcbot [1-100] | grcbotx |"
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
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-3 rounded text-[11px] transition-colors flex items-center justify-center gap-2"
            >
              <div className="bg-black/80 text-white w-5 h-5 flex items-center justify-center rounded-full text-[9px]">N</div>
              <Search size={14} strokeWidth={3} /> RUN SENTINEL SWEEP
            </button>
          </div>
        </div>

      </div>

      </div>
    </div>
  );
}
