"use client";

import { useEffect, useState } from "react";
import type { BotAuditLogRow } from "@/app/actions/auditActions";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import LogAnalyzer from "@/app/components/LogAnalyzer";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@tremor/react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

type BotAuditMetadata = {
  tenantName?: string;
  aleBaselineBeforeCents?: string | number;
  aleOutcomeAfterCents?: string | number;
  aleDeltaCents?: string | number;
  aleByTenantBeforeCents?: {
    medshield?: string | number;
    vaultbank?: string | number;
    gridcore?: string | number;
  };
  aleByTenantAfterCents?: {
    medshield?: string | number;
    vaultbank?: string | number;
    gridcore?: string | number;
  };
  durationMs?: number;
  eventCounts?: {
    baseline?: { pipelineThreats?: number; activeThreats?: number };
    outcome?: { pipelineThreats?: number; activeThreats?: number };
    delta?: { pipelineThreats?: number; activeThreats?: number };
  };
  performance?: {
    requestLatencyMsBefore?: number | null;
    requestLatencyMsAfter?: number | null;
    eventIngestionPerMinute?: number;
    attackVelocity?: number;
    systemHealthScore?: number;
  };
  tenantBreakdown?: Record<string, { before?: string | number; after?: string | number }>;
};

function parseBotAuditMetadata(value: Record<string, unknown> | null): BotAuditMetadata {
  if (!value) return {};
  return value as unknown as BotAuditMetadata;
}

function parseMetricBigInt(value: unknown, fallback = 0n): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.trim() !== "") {
    try {
      return BigInt(value.trim());
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** Stored integer cents → USD string (matches ThreatEvent.financialRisk_cents scale). */
function formatUsdFromStoredCents(centsLike: unknown): string {
  try {
    const cents = parseMetricBigInt(centsLike, 0n);
    const dollars = cents / 100n;
    return Number(dollars).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  } catch {
    return "—";
  }
}

function formatMillionsFromStoredCents(centsLike: unknown): string {
  try {
    const cents = parseMetricBigInt(centsLike, 0n);
    const m = Number(cents) / 100_000_000;
    if (!Number.isFinite(m)) return "—";
    return `$${m.toFixed(2)}M`;
  } catch {
    return "—";
  }
}

type Props = {
  analysisRow: BotAuditLogRow;
  onClose: () => void;
};

export default function BotAuditAnalysisModal({ analysisRow, onClose }: Props) {
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    setTabIndex(0);
  }, [analysisRow.id]);

  const meta = parseBotAuditMetadata(analysisRow.metadata);
  const parseMetric = (value: unknown, fallback = 0): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  };
  const tenantBreakdown =
    meta.tenantBreakdown && typeof meta.tenantBreakdown === "object" ? meta.tenantBreakdown : {};
  const readTenantBreakdown = (tenantUuid: string, phase: "before" | "after"): number => {
    const row = tenantBreakdown[tenantUuid];
    const candidate = phase === "before" ? row?.before : row?.after;
    return parseMetric(candidate, 0);
  };
  const byTenantBefore = {
    medshield: parseMetric(
      meta.aleByTenantBeforeCents?.medshield,
      readTenantBreakdown(TENANT_UUIDS.medshield, "before"),
    ),
    vaultbank: parseMetric(
      meta.aleByTenantBeforeCents?.vaultbank,
      readTenantBreakdown(TENANT_UUIDS.vaultbank, "before"),
    ),
    gridcore: parseMetric(
      meta.aleByTenantBeforeCents?.gridcore,
      readTenantBreakdown(TENANT_UUIDS.gridcore, "before"),
    ),
  };
  const byTenantAfter = {
    medshield: parseMetric(
      meta.aleByTenantAfterCents?.medshield,
      readTenantBreakdown(TENANT_UUIDS.medshield, "after") || byTenantBefore.medshield,
    ),
    vaultbank: parseMetric(
      meta.aleByTenantAfterCents?.vaultbank,
      readTenantBreakdown(TENANT_UUIDS.vaultbank, "after") || byTenantBefore.vaultbank,
    ),
    gridcore: parseMetric(
      meta.aleByTenantAfterCents?.gridcore,
      readTenantBreakdown(TENANT_UUIDS.gridcore, "after") || byTenantBefore.gridcore,
    ),
  };
  const financialRows = [
    { tenant: "Medshield", beforeM: byTenantBefore.medshield / 100_000_000, afterM: byTenantAfter.medshield / 100_000_000 },
    { tenant: "Vaultbank", beforeM: byTenantBefore.vaultbank / 100_000_000, afterM: byTenantAfter.vaultbank / 100_000_000 },
    { tenant: "Gridcore", beforeM: byTenantBefore.gridcore / 100_000_000, afterM: byTenantAfter.gridcore / 100_000_000 },
  ];
  const beforeCents = parseMetric(meta.aleBaselineBeforeCents, 0);
  const afterCents = parseMetric(meta.aleOutcomeAfterCents, beforeCents);
  const durationMs = parseMetric(meta.durationMs, 0);
  const beforeM = beforeCents / 100_000_000;
  const afterM = afterCents / 100_000_000;
  const baselineCounts = meta.eventCounts?.baseline ?? {};
  const outcomeCounts = meta.eventCounts?.outcome ?? {};
  const deltaCounts = meta.eventCounts?.delta ?? {};
  const perf = meta.performance ?? {};
  const requestLatencyBefore = Number(perf.requestLatencyMsBefore ?? 0);
  const requestLatencyAfter = Number(perf.requestLatencyMsAfter ?? requestLatencyBefore);
  const eventIngestionPerMinute = Number(perf.eventIngestionPerMinute ?? 0);
  const attackVelocity = Number(perf.attackVelocity ?? eventIngestionPerMinute);
  const systemHealthScore = Number(perf.systemHealthScore ?? 100);
  const performanceTrendData = [
    { checkpoint: "Before", requestLatencyMs: requestLatencyBefore, eventIngestionSpeed: 0 },
    { checkpoint: "After", requestLatencyMs: requestLatencyAfter, eventIngestionSpeed: eventIngestionPerMinute },
  ];
  const scatterData = [
    {
      attackVelocity,
      systemHealth: systemHealthScore,
      ingestionSpeed: eventIngestionPerMinute,
    },
  ];
  const forensicTraceLogs = (() => {
    const rawTrace = (meta as Record<string, unknown>).traceLog;
    if (Array.isArray(rawTrace)) {
      return rawTrace.map((entry) => String(entry));
    }
    if (typeof rawTrace === "string" && rawTrace.trim().length > 0) {
      return rawTrace.split(/\r?\n/).filter(Boolean);
    }
    return [];
  })();

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-md border border-zinc-800/90 bg-[#050509] p-4 ring-1 ring-white/[0.05]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-zinc-100">Bot Test Analysis</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-300 hover:border-zinc-600"
          >
            Close
          </button>
        </div>

        <p className="mb-3 text-[10px] text-zinc-400">
          {analysisRow.botType} · {analysisRow.disposition} · {new Date(analysisRow.createdAt).toLocaleString()}
        </p>

        <div className="mb-3 rounded-md border border-zinc-800/80 bg-[#08080c]/80 p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">ALE (ledger)</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <p className="text-[9px] uppercase tracking-wide text-zinc-500">Baseline before</p>
              <p className="font-mono text-[11px] text-zinc-200">{formatUsdFromStoredCents(meta.aleBaselineBeforeCents)}</p>
              <p className="text-[9px] text-zinc-500">{formatMillionsFromStoredCents(meta.aleBaselineBeforeCents)} scale</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-zinc-500">Outcome after</p>
              <p className="font-mono text-[11px] text-zinc-200">{formatUsdFromStoredCents(meta.aleOutcomeAfterCents)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-zinc-500">Δ ALE (cents)</p>
              <p className="font-mono text-[11px] text-zinc-200">{formatUsdFromStoredCents(meta.aleDeltaCents)}</p>
              <p className="text-[9px] font-mono text-zinc-600">
                raw: {meta.aleDeltaCents != null ? String(meta.aleDeltaCents) : "—"}
              </p>
            </div>
          </div>
        </div>

        <TabGroup index={tabIndex} onIndexChange={setTabIndex}>
          <TabList variant="line" className="border-zinc-800">
            <Tab>Financial Impact (ALE)</Tab>
            <Tab>System Performance</Tab>
            <Tab>Forensic Trace</Tab>
          </TabList>
          <TabPanels className="mt-3">
            <TabPanel>
              <div className="space-y-3 text-[10px]">
                <div className="rounded-md border border-zinc-800/80 bg-[#08080c]/80 p-3">
                  <p className="mb-2 font-bold uppercase tracking-wide text-zinc-500">Before vs After by Tenant (ALE/Liability)</p>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialRows}>
                        <CartesianGrid stroke="#27272a" vertical={false} />
                        <XAxis dataKey="tenant" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#09090b", border: "1px solid #3f3f46", color: "#e4e4e7" }}
                        />
                        <Bar dataKey="beforeM" name="Before ($M)" fill="#52525b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        <Bar dataKey="afterM" name="After ($M)" fill="#22c55e" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-zinc-800/80 bg-[#08080c]/80 p-3">
                    <p className="mb-1 font-bold uppercase tracking-wide text-zinc-500">Baseline (Before Test)</p>
                    <p className="text-zinc-200">ALE/Liability: ${beforeM.toFixed(2)}M</p>
                    <p className="text-zinc-500">Pipeline threats: {baselineCounts.pipelineThreats ?? 0}</p>
                    <p className="text-zinc-500">Active threats: {baselineCounts.activeThreats ?? 0}</p>
                  </div>
                  <div className="rounded-md border border-zinc-800/80 bg-[#08080c]/80 p-3">
                    <p className="mb-1 font-bold uppercase tracking-wide text-zinc-500">Outcome (After Completion)</p>
                    <p className="text-zinc-200">ALE/Liability: ${afterM.toFixed(2)}M</p>
                    <p className="text-zinc-500">Pipeline threats: {outcomeCounts.pipelineThreats ?? 0}</p>
                    <p className="text-zinc-500">Active threats: {outcomeCounts.activeThreats ?? 0}</p>
                  </div>
                </div>
              </div>
            </TabPanel>
            <TabPanel>
              <div className="space-y-3 text-[10px]">
                <div className="rounded-md border border-zinc-800/80 bg-[#08080c]/80 p-3">
                  <p className="mb-2 font-bold uppercase tracking-wide text-zinc-500">Request Latency vs Event Ingestion Speed</p>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceTrendData}>
                        <CartesianGrid stroke="#27272a" vertical={false} />
                        <XAxis dataKey="checkpoint" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                        <YAxis yAxisId="left" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#09090b", border: "1px solid #3f3f46", color: "#e4e4e7" }}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="requestLatencyMs"
                          name="Request Latency (ms)"
                          fill="#0ea5e9"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="eventIngestionSpeed"
                          name="Event Ingestion Speed (/min)"
                          fill="#a855f7"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-md border border-zinc-800/80 bg-[#08080c]/80 p-3">
                  <p className="mb-2 font-bold uppercase tracking-wide text-zinc-500">System Health vs Attack Velocity</p>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <CartesianGrid stroke="#27272a" />
                        <XAxis type="number" dataKey="attackVelocity" name="Attack Velocity" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                        <YAxis type="number" dataKey="systemHealth" name="System Health" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                        <ZAxis type="number" dataKey="ingestionSpeed" range={[60, 240]} />
                        <Tooltip
                          cursor={{ stroke: "#3f3f46" }}
                          contentStyle={{ backgroundColor: "#09090b", border: "1px solid #3f3f46", color: "#e4e4e7" }}
                        />
                        <Scatter data={scatterData} fill="#22c55e" isAnimationActive={false} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabPanel>
            <TabPanel>
              <div className="rounded-md border border-zinc-800/80 bg-[#08080c]/80 p-3">
                <p className="mb-2 font-bold uppercase tracking-wide text-zinc-500">Forensic Trace</p>
                <LogAnalyzer logs={forensicTraceLogs} />
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Raw Metadata JSON
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-zinc-800 bg-[#050509]/95 p-2 text-[9px] text-zinc-400">
                    {JSON.stringify(analysisRow.metadata ?? {}, null, 2)}
                  </pre>
                </details>
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>

        <div className="mt-4 rounded-md border border-zinc-800/90 bg-[#08080c]/90 p-3 ring-1 ring-white/[0.03]">
          <p className="font-bold uppercase tracking-wide text-zinc-400">Summary</p>
          <p className="text-zinc-300">
            Latency (before/after): {requestLatencyBefore.toFixed(1)}ms → {requestLatencyAfter.toFixed(1)}ms
          </p>
          <p className="text-zinc-300">Ingestion speed: {eventIngestionPerMinute.toFixed(3)} events/min</p>
          <p className="text-zinc-300">System health score: {systemHealthScore.toFixed(0)}</p>
          <p className="mt-1 text-zinc-500">
            Duration: {durationMs > 0 ? `${(durationMs / 1000).toFixed(1)}s` : "n/a"}
          </p>
          <p className="text-zinc-500">
            Event delta: pipeline {(deltaCounts.pipelineThreats ?? 0) >= 0 ? "+" : ""}
            {deltaCounts.pipelineThreats ?? 0}, active {(deltaCounts.activeThreats ?? 0) >= 0 ? "+" : ""}
            {deltaCounts.activeThreats ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}
