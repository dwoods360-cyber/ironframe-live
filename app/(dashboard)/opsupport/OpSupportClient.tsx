"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  OpSupportClearanceCard,
  OpSupportDeficiencyItem,
  OpSupportDiagnosticComponentRow,
  OpSupportDiagnosticFailureEvent,
  OpSupportSimAuditRow,
  OpSupportWorkspaceTab,
} from "@/app/lib/opsupportDashTypes";
import { resolveOperationalDeficiencyReportAction } from "@/app/actions/operationalDeficiencyActions";
import { clearShadowPlaneLogs, teleportThreatToProduction } from "@/app/actions/teleportActions";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import { useAgentStore } from "@/app/store/agentStore";
import { ThreatState } from "@prisma/client";
import ClearanceDispositionReceiptBar from "@/app/components/ClearanceDispositionReceiptBar";
import { PipelineSelfTestBar } from "@/app/components/ui/PipelineSelfTestBar";
import { DiagnosticReportModal } from "@/app/components/ui/DiagnosticReportModal";

const POLL_MS = 2500;

function formatCentsShort(cents: string): string {
  const n = BigInt(cents);
  const m = Number(n) / 100_000_000;
  if (!Number.isFinite(m)) return "—";
  return `$${m.toFixed(2)}M`;
}

/** Mean time-to-resolve from `SimulationDiagnosticLog.resolvedAt` (GRC 4.9). */
function formatAvgTtr(avgSeconds: number | null, sampleCount: number): string {
  if (avgSeconds == null || sampleCount === 0 || !Number.isFinite(avgSeconds)) return "—";
  const s = avgSeconds;
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return `${h}h ${m}m`;
}

function statusChip(status: ThreatState): string {
  if (status === ThreatState.QUARANTINED) {
    return "border-rose-500/60 bg-rose-950/50 text-rose-200";
  }
  return "border-amber-500/50 bg-amber-950/40 text-amber-100";
}

function ComponentHealthBar({ percent }: { percent: number }) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-zinc-700/50"
      title={`Weighted health bar: ${pct}% (emerald = stronger)`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600 transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

type DiagReplayState = {
  packet: string;
  comment: string;
  threatId: string;
  threatTitle: string;
  threatStatus: string;
  likelihood: number;
  impact: number;
  ingestionDetails: string | null;
  sourceComponentPath: string;
};

export type LedgerSurface = "grid" | "narrative";

export type OpSupportClientProps = {
  mainTab: OpSupportWorkspaceTab;
  /** Operational grid vs Master Intelligence narrative stream. */
  ledgerSurface?: LedgerSurface;
  onLedgerSurfaceChange?: (surface: LedgerSurface) => void;
};

export default function OpSupportClient({
  mainTab,
  ledgerSurface: ledgerSurfaceProp,
  onLedgerSurfaceChange,
}: OpSupportClientProps) {
  const router = useRouter();
  const { isSimulationMode, setSimulationMode } = useSystemConfigStore();
  const [ledgerSurfaceInternal, setLedgerSurfaceInternal] = useState<LedgerSurface>("grid");
  const ledgerSurface = ledgerSurfaceProp ?? ledgerSurfaceInternal;
  const setLedgerSurface = onLedgerSurfaceChange ?? setLedgerSurfaceInternal;

  const intelligenceStream = useAgentStore((s) => s.intelligenceStream);
  const riskIngestionTerminalLines = useAgentStore((s) => s.riskIngestionTerminalLines);
  const narrativeScrollRef = useRef<HTMLDivElement | null>(null);

  const narrativeLines = useMemo(() => {
    const intel = [...intelligenceStream].reverse();
    const risk = riskIngestionTerminalLines;
    return [...intel, ...risk.map((line) => `> [INGEST] ${line}`)];
  }, [intelligenceStream, riskIngestionTerminalLines]);

  useEffect(() => {
    if (ledgerSurface !== "narrative") return;
    const el = narrativeScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [ledgerSurface, narrativeLines.length]);
  const [cards, setCards] = useState<OpSupportClearanceCard[]>([]);
  const [simRows, setSimRows] = useState<OpSupportSimAuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastTick, setLastTick] = useState<string>("");
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [teleportToast, setTeleportToast] = useState<string | null>(null);
  const teleportToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shadowPurgeToast, setShadowPurgeToast] = useState<string | null>(null);
  const shadowPurgeToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [teleportingId, setTeleportingId] = useState<string | null>(null);
  const [clearingShadowLogs, setClearingShadowLogs] = useState(false);
  const [deficiencyItems, setDeficiencyItems] = useState<OpSupportDeficiencyItem[]>([]);
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);
  const [diagComponents, setDiagComponents] = useState<OpSupportDiagnosticComponentRow[]>([]);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [diagReplay, setDiagReplay] = useState<DiagReplayState | null>(null);

  const showTeleportSuccess = useCallback((productionId: string) => {
    if (teleportToastTimerRef.current) clearTimeout(teleportToastTimerRef.current);
    setTeleportToast(`Teleported to Golden Vault · production id ${productionId.slice(0, 12)}…`);
    teleportToastTimerRef.current = setTimeout(() => {
      setTeleportToast(null);
      teleportToastTimerRef.current = null;
    }, 4500);
  }, []);

  const poll = useCallback(async () => {
    try {
      const [cRes, sRes, dRes] = await Promise.all([
        fetch("/api/opsupport/clearance-queue", { cache: "no-store" }),
        fetch("/api/opsupport/simulation-audit", { cache: "no-store" }),
        fetch("/api/opsupport/deficiency-queue", { cache: "no-store" }),
      ]);
      if (!cRes.ok) {
        const j = (await cRes.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `Clearance queue HTTP ${cRes.status}`);
        return;
      }
      if (!sRes.ok) {
        const j = (await sRes.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `Sim audit HTTP ${sRes.status}`);
        return;
      }
      if (!dRes.ok) {
        const j = (await dRes.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `Deficiency queue HTTP ${dRes.status}`);
        return;
      }
      setError(null);
      const cJson = (await cRes.json()) as { cards: OpSupportClearanceCard[] };
      const sJson = (await sRes.json()) as { rows: OpSupportSimAuditRow[] };
      const dJson = (await dRes.json()) as { unresolved: OpSupportDeficiencyItem[] };
      const next = cJson.cards ?? [];
      const prev = prevIdsRef.current;
      const incoming = new Set(next.map((x) => x.id));
      const newOnes = new Set<string>();
      for (const id of incoming) {
        if (!prev.has(id)) newOnes.add(id);
      }
      prevIdsRef.current = incoming;
      if (newOnes.size > 0) {
        setFlashIds(newOnes);
        window.setTimeout(() => setFlashIds(new Set()), 900);
      }
      setCards(next);
      setSimRows(sJson.rows ?? []);
      setDeficiencyItems(dJson.unresolved ?? []);
      setLastTick(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Poll failed");
    }
  }, []);

  const fetchDiagnosticHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/opsupport/diagnostic-history", { cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as {
        components?: OpSupportDiagnosticComponentRow[];
        error?: string;
      };
      if (!res.ok) {
        setDiagnosticError(j.error ?? `Diagnostic history HTTP ${res.status}`);
        return;
      }
      setDiagnosticError(null);
      setDiagComponents(j.components ?? []);
    } catch (e) {
      setDiagnosticError(e instanceof Error ? e.message : "Diagnostic history fetch failed");
    }
  }, []);

  useEffect(() => {
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(id);
  }, [poll]);

  useEffect(() => {
    if (mainTab !== "diagnostic") return;
    void fetchDiagnosticHistory();
    const id = window.setInterval(() => void fetchDiagnosticHistory(), POLL_MS);
    return () => window.clearInterval(id);
  }, [mainTab, fetchDiagnosticHistory]);

  useEffect(() => {
    return () => {
      if (teleportToastTimerRef.current) clearTimeout(teleportToastTimerRef.current);
      if (shadowPurgeToastTimerRef.current) clearTimeout(shadowPurgeToastTimerRef.current);
    };
  }, []);

  const showShadowPurgeSuccess = useCallback(
    (deletedSimThreats: number, deletedAuditLogs: number, deletedSimulationDiagnosticLogs: number) => {
      if (shadowPurgeToastTimerRef.current) clearTimeout(shadowPurgeToastTimerRef.current);
      setShadowPurgeToast(
        `Shadow data cleared · SimThreatEvent ${deletedSimThreats} · AuditLog ${deletedAuditLogs} · SimulationDiagnosticLog ${deletedSimulationDiagnosticLogs}`,
      );
      shadowPurgeToastTimerRef.current = setTimeout(() => {
        setShadowPurgeToast(null);
        shadowPurgeToastTimerRef.current = null;
      }, 5200);
    },
    [],
  );

  const stats = useMemo(() => {
    const pipe = cards.filter((c) => c.status === ThreatState.PIPELINE).length;
    const q = cards.filter((c) => c.status === ThreatState.QUARANTINED).length;
    return { total: cards.length, pipe, q };
  }, [cards]);

  const deficiencyCount = deficiencyItems.length;

  const openGeminiPortal = (rowPath: string, f: OpSupportDiagnosticFailureEvent) => {
    setDiagReplay({
      packet: f.geminiRepairPacket,
      comment: f.comment,
      threatId: f.threatId?.trim() ? f.threatId : "shadow",
      threatTitle: f.threatTitle?.trim() ? f.threatTitle : "Archived sim threat",
      threatStatus: f.threatStatus || "—",
      likelihood: f.likelihood,
      impact: f.impact,
      ingestionDetails: f.ingestionDetails,
      sourceComponentPath: rowPath,
    });
  };

  return (
    <div className="min-h-full w-full bg-black font-mono text-[11px] leading-tight text-amber-50 antialiased">
      <div className="w-full border-b border-amber-900/45 bg-black px-3 py-3 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-500/90">
              Structural Isolation Plane · Dev
            </p>
            <h1 className="mt-1 text-lg font-black uppercase tracking-wide text-zinc-100">
              Operational Support — Internal Ingress &amp; Sanitization
            </h1>
            <p className="mt-1 max-w-3xl font-mono text-[11px] leading-relaxed text-zinc-500">
              Three-tab workspace: live PIPELINE / QUARANTINED clearance, non-golden simulation audit, and diagnostic
              history grouped by component path. Golden production triage stays in Integrity Hub.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px]">
            <div
              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-sm"
              role="group"
              aria-label="Session plane"
            >
              <button
                type="button"
                onClick={() => setSimulationMode(false)}
                className={`rounded px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                  !isSimulationMode
                    ? "bg-zinc-800 font-semibold text-zinc-100 ring-1 ring-zinc-600/90"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                PRODUCTION
              </button>
              <button
                type="button"
                onClick={() => setSimulationMode(true)}
                className={`rounded px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-all ${
                  isSimulationMode
                    ? "font-semibold text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.45)] ring-1 ring-amber-500/50"
                    : "text-zinc-400 hover:text-amber-400/80"
                }`}
              >
                SHADOW PLANE
              </button>
            </div>
            <span className="rounded border border-amber-900/60 bg-black px-2 py-1 text-amber-400/90">
              POLL {POLL_MS}ms
            </span>
            <span className="rounded border border-amber-800/50 bg-amber-950/20 px-2 py-1 text-amber-200/95">
              LAST {lastTick ? new Date(lastTick).toLocaleTimeString() : "—"}
            </span>
            <Link
              href="/admin/clearance"
              className="rounded border border-rose-900/50 bg-rose-950/25 px-2 py-1 font-bold uppercase text-rose-200 hover:bg-rose-950/40"
            >
              DMZ Clearance
            </Link>
            <Link
              href="/"
              className="rounded border border-amber-900/50 bg-black px-2 py-1 font-bold uppercase text-amber-100 hover:border-amber-600/60"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 bg-[#08080a] px-3 py-2 sm:px-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Master ledger surface</p>
        <div
          className="flex rounded-md border border-zinc-700/70 bg-[#050509] p-0.5 ring-1 ring-white/[0.04]"
          role="tablist"
          aria-label="Ledger surface"
        >
          <button
            type="button"
            role="tab"
            aria-selected={ledgerSurface === "grid"}
            onClick={() => setLedgerSurface("grid")}
            className={`rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
              ledgerSurface === "grid"
                ? "bg-zinc-800 text-amber-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Operational grid
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={ledgerSurface === "narrative"}
            onClick={() => setLedgerSurface("narrative")}
            className={`rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
              ledgerSurface === "narrative"
                ? "bg-zinc-800 text-amber-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Narrative feed
          </button>
        </div>
      </div>

      {ledgerSurface === "narrative" ? (
        <section
          aria-label="Master Intelligence stream"
          className="mx-2 mb-4 mt-3 flex min-h-[min(52vh,420px)] flex-col rounded-md border border-zinc-800/80 bg-[#050509] ring-1 ring-white/[0.04] sm:mx-4"
        >
          <div className="border-b border-zinc-800/80 px-3 py-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-400/95">
              Master Intelligence stream
            </h2>
            <p className="mt-0.5 text-[9px] text-zinc-500">
              Amber/white agent narrative + risk ingestion lines (live store; auto-scroll).
            </p>
          </div>
          <div
            ref={narrativeScrollRef}
            className="max-h-[min(60vh,520px)] min-h-[200px] flex-1 overflow-y-auto px-3 py-2 font-mono text-[10px] leading-relaxed text-amber-100/95"
          >
            {narrativeLines.length === 0 ? (
              <p className="text-amber-700/80">No intelligence lines yet.</p>
            ) : (
              narrativeLines.map((line, i) => (
                <p key={`${i}-${line.slice(0, 48)}`} className="whitespace-pre-wrap border-b border-zinc-900/40 py-1 text-amber-50/95 last:border-0">
                  {line}
                </p>
              ))
            )}
          </div>
        </section>
      ) : (
      <div className="w-full max-w-none space-y-4 px-2 py-4 pb-28 sm:px-4">
        {error ? (
          <div className="rounded border border-rose-700/60 bg-rose-950/30 px-3 py-2 text-[11px] text-rose-100">
            {error}
          </div>
        ) : null}
        {diagnosticError && mainTab === "diagnostic" ? (
          <div className="rounded border border-rose-700/60 bg-rose-950/30 px-3 py-2 text-[11px] text-rose-100">
            {diagnosticError}
          </div>
        ) : null}

        {mainTab === "ingestion" ? (
        <section
          id="opsupport-panel-ingestion"
          role="tabpanel"
          aria-labelledby="opsupport-tab-ingestion"
          className="rounded-sm border border-amber-900/40 bg-black shadow-[inset_0_1px_0_0_rgba(251,191,36,0.06)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/35 px-3 py-2 sm:px-4">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-amber-300/95">
              Live Ingestion Stream · Clearance Queue
            </h2>
            <div className="flex flex-wrap gap-2 text-[10px] text-amber-500/90">
              <span className="rounded bg-black/70 px-2 py-0.5 text-amber-100">PIPELINE {stats.pipe}</span>
              <span className="rounded bg-black/70 px-2 py-0.5 text-rose-200/90">QUARANTINED {stats.q}</span>
              <span className="rounded bg-black/70 px-2 py-0.5 text-amber-200/80">TOTAL {stats.total}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-[10px] sm:text-[11px]">
              <thead>
                <tr className="border-b border-amber-900/40 text-left uppercase tracking-wider text-amber-600/90">
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Liability</th>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Id</th>
                  <th className="px-3 py-2">Disposition</th>
                  <th className="px-3 py-2">Teleport</th>
                </tr>
              </thead>
              <tbody>
                {cards.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-amber-700/80">
                      No PIPELINE / QUARANTINED rows for this tenant (or no company linked).
                    </td>
                  </tr>
                ) : (
                  cards.map((c) => (
                    <tr
                      key={c.id}
                      className={`border-b border-amber-950/40 transition-colors ${
                        flashIds.has(c.id) ? "bg-amber-950/25" : "hover:bg-amber-950/15"
                      }`}
                    >
                      <td className="px-3 py-1.5">
                        <span
                          className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${statusChip(c.status)}`}
                        >
                          {c.status}
                        </span>
                        {c.isTestCompany ? (
                          <span className="ml-1 rounded border border-violet-600/50 px-1 py-0.5 text-[8px] font-bold text-violet-200">
                            SIM
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-amber-500/85">
                        {new Date(c.createdAt).toLocaleString()}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-1.5 text-amber-200/95">{c.sourceAgent}</td>
                      <td className="max-w-[280px] truncate px-3 py-1.5 text-white">{c.title}</td>
                      <td className="max-w-[120px] truncate px-3 py-1.5 text-amber-400/80">{c.targetEntity}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-emerald-300/90">
                        {formatCentsShort(c.financialRisk_cents)}
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-1.5 text-amber-400/75">{c.companyName ?? "—"}</td>
                      <td className="max-w-[200px] truncate px-3 py-1.5 text-amber-600/80">{c.id}</td>
                      <td className="min-w-[200px] max-w-[280px] px-3 py-1.5 align-top">
                        <div className="space-y-1">
                          <ClearanceDispositionReceiptBar
                            threatId={c.id}
                            threatStatus={c.status}
                            dispositionStatus={c.dispositionStatus ?? undefined}
                            receiptHash={c.receiptHash ?? undefined}
                            compact
                            onDispositionComplete={() => void poll()}
                          />
                          <PipelineSelfTestBar
                            threatId={c.id}
                            threatTitle={c.title}
                            threatStatus={c.status}
                            ingestionDetails={c.ingestionDetails}
                            sourceComponentPath="app/(dashboard)/opsupport/OpSupportClient.tsx"
                            compact
                            onAfterAction={() => void poll()}
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5">
                        <button
                          type="button"
                          title={
                            isSimulationMode
                              ? "Teleport this shadow card into ThreatEvent (Golden Vault)"
                              : "Enable Simulation Mode to teleport shadow-plane rows"
                          }
                          disabled={!isSimulationMode || teleportingId !== null}
                          onClick={async () => {
                            if (!isSimulationMode || teleportingId !== null) return;
                            setTeleportingId(c.id);
                            try {
                              const res = await teleportThreatToProduction(c.id);
                              if (!res.ok) {
                                setError(res.error);
                                return;
                              }
                              setError(null);
                              showTeleportSuccess(res.productionId);
                              await poll();
                            } finally {
                              setTeleportingId(null);
                            }
                          }}
                          className="inline-flex items-center justify-center rounded border border-emerald-700/60 bg-emerald-950/40 px-2 py-1 text-[11px] hover:border-emerald-500/70 hover:bg-emerald-900/35 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {teleportingId === c.id ? "…" : "🚀"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        ) : null}

        {mainTab === "simAudit" ? (
        <section
          id="opsupport-panel-simAudit"
          role="tabpanel"
          aria-labelledby="opsupport-tab-simAudit"
          className="rounded-lg border border-violet-900/40 bg-[#07060c]"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-violet-900/30 px-4 py-2">
            <div className="min-w-0 flex-1">
            <h2 className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-black uppercase tracking-widest text-violet-300/90">
              <span>Simulation Audit Log · Non-golden trail</span>
              {deficiencyCount > 0 ? (
                <span
                  className="rounded-full border border-rose-500/80 bg-rose-600 px-2 py-0.5 font-mono text-[10px] font-black tabular-nums text-white shadow-[0_0_10px_rgba(244,63,94,0.45)]"
                  title="Unresolved operational deficiency reports (self-test)"
                  aria-label={`${deficiencyCount} unresolved operational deficiency reports`}
                >
                  {deficiencyCount}
                </span>
              ) : null}
            </h2>
            <p className="mt-1 font-mono text-[10px] text-zinc-500">
              Prisma <code className="text-zinc-400">AuditLog</code> (sim-flagged, GRCBOT/KIMBOT, SIMULATION actions)
              merged with <code className="text-zinc-400">SimulationDiagnosticLog</code> (structural self-test /
              deficiency). Production triage history stays in Integrity Hub.
            </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-b border-rose-900/40 bg-gradient-to-r from-rose-950/35 via-black/40 to-rose-950/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10px] leading-relaxed text-rose-200/90">
              <span className="font-black uppercase tracking-wide text-rose-100">Purge shadow plane</span> — removes
              duplicate or stale <code className="text-rose-300/90">SimThreatEvent</code>,{" "}
              <code className="text-rose-300/90">SimulationDiagnosticLog</code>, and sim-flagged{" "}
              <code className="text-rose-300/90">AuditLog</code> rows for this tenant only.
            </p>
            <button
              type="button"
              disabled={clearingShadowLogs}
              onClick={() => {
                if (!window.confirm("Are you sure you want to clear all shadow data?")) {
                  return;
                }
                void (async () => {
                  setClearingShadowLogs(true);
                  try {
                    const res = await clearShadowPlaneLogs();
                    if (!res.ok) {
                      setError(res.error);
                      return;
                    }
                    setError(null);
                    showShadowPurgeSuccess(
                      res.deletedSimThreats,
                      res.deletedAuditLogs,
                      res.deletedSimulationDiagnosticLogs,
                    );
                    await poll();
                    router.refresh();
                  } finally {
                    setClearingShadowLogs(false);
                  }
                })();
              }}
              className="shrink-0 rounded-lg border-2 border-rose-500/90 bg-rose-600/25 px-4 py-2.5 font-mono text-[10px] font-black uppercase tracking-widest text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.25)] transition hover:border-rose-400 hover:bg-rose-600/35 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {clearingShadowLogs ? "Clearing…" : "Clear Shadow Logs"}
            </button>
          </div>
          {deficiencyItems.length > 0 ? (
            <div className="border-b border-rose-900/50 bg-rose-950/25 px-3 py-2">
              <p className="font-mono text-[9px] font-black uppercase tracking-widest text-rose-200/95">
                Airlock · unresolved deficiency reports
              </p>
              <ul className="mt-2 space-y-1.5">
                {deficiencyItems.map((d) => (
                  <li
                    key={d.reportId}
                    className="flex flex-wrap items-start justify-between gap-2 rounded border border-rose-900/40 bg-black/35 px-2 py-1.5 text-[10px] text-rose-100/90"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-zinc-500">{new Date(d.createdAt).toLocaleString()}</span>
                      <span
                        className={`ml-2 rounded border px-1 py-px text-[8px] font-bold uppercase ${
                          (d.severityLabel ?? "").toUpperCase() === "CRITICAL"
                            ? "border-red-600/80 bg-red-950/60 text-red-200"
                            : (d.severityLabel ?? "").toUpperCase() === "HIGH"
                              ? "border-amber-600/70 bg-amber-950/50 text-amber-200"
                              : "border-zinc-600/60 bg-zinc-900 text-zinc-400"
                        }`}
                      >
                        {d.severityLabel ?? "MEDIUM"}
                      </span>
                      {d.threatId ? (
                        <span className="ml-2 font-mono text-zinc-500">threat:{d.threatId.slice(0, 10)}…</span>
                      ) : (
                        <span className="ml-2 font-mono text-zinc-500">shadow row</span>
                      )}
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-rose-100/80">{d.commentPreview}</p>
                    </div>
                    <button
                      type="button"
                      disabled={resolvingReportId !== null}
                      onClick={() => {
                        void (async () => {
                          setResolvingReportId(d.reportId);
                          try {
                            const res = await resolveOperationalDeficiencyReportAction(d.reportId);
                            if (!res.success) {
                              setError(res.error);
                              return;
                            }
                            setError(null);
                            await poll();
                          } finally {
                            setResolvingReportId(null);
                          }
                        })();
                      }}
                      className="shrink-0 rounded border border-emerald-800/70 bg-emerald-950/50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-200 hover:border-emerald-500/80 disabled:opacity-40"
                    >
                      {resolvingReportId === d.reportId ? "…" : "Resolve"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="max-h-[420px] overflow-y-auto p-3 font-mono text-[10px] leading-relaxed">
            {simRows.length === 0 ? (
              <p className="text-zinc-600">No simulation-scoped audit rows yet.</p>
            ) : (
              <ul className="space-y-2">
                {simRows.map((r) => (
                  <li
                    key={r.id}
                    className="rounded border border-zinc-800/80 bg-black/40 px-2 py-1.5 text-zinc-300"
                  >
                    <span
                      className="mr-1.5 inline-flex items-center gap-1 align-middle"
                      title="Shadow-plane audit trail"
                      aria-hidden
                    >
                      <span className="text-sm leading-none opacity-90">👻</span>
                      <span className="rounded border border-amber-500/70 bg-amber-950/50 px-1 py-px font-mono text-[8px] font-black uppercase tracking-wide text-amber-200">
                        SIM
                      </span>
                    </span>
                    <span className="text-zinc-500">{new Date(r.createdAt).toISOString()}</span>{" "}
                    <span className="text-fuchsia-300/90">[{r.action}]</span>{" "}
                    <span className="text-cyan-400/80">{r.operatorId}</span>
                    {r.isSimulation ? (
                      <span className="ml-1 text-[9px] font-bold uppercase text-emerald-400">sim</span>
                    ) : null}
                    {r.threatId ? (
                      <span className="ml-1 text-zinc-600">threat:{r.threatId.slice(0, 12)}…</span>
                    ) : null}
                    <div className="mt-0.5 whitespace-pre-wrap break-words text-zinc-500">{r.justificationPreview}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        ) : null}

        {mainTab === "diagnostic" ? (
        <section
          id="opsupport-panel-diagnostic"
          role="tabpanel"
          aria-labelledby="opsupport-tab-diagnostic"
          className="rounded-lg border border-teal-900/50 bg-[#060a0c] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-teal-900/40 px-4 py-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-mono text-[11px] font-black uppercase tracking-widest text-teal-300/95">
                Reliability dashboard · Diagnostic history
              </h2>
              <p className="mt-1 max-w-3xl font-mono text-[10px] leading-relaxed text-zinc-500">
                Weighted engine: Critical fail −10, High −5, Medium/Low −2, system pass +1. Avg TTR uses
                <code className="text-zinc-400"> resolvedAt − createdAt </code> on cleared deficiencies. Open past failures
                in the Gemini packet portal to copy the frozen repair block.
              </p>
            </div>
            <div
              className="shrink-0 rounded border border-rose-800/60 bg-rose-950/35 px-3 py-2 text-right font-mono"
              title="Matches /api/opsupport/deficiency-queue unresolved count"
            >
              <p className="text-[8px] font-black uppercase tracking-widest text-rose-200/90">Unresolved failures</p>
              <p className="mt-0.5 text-2xl font-black tabular-nums text-rose-100">{deficiencyCount}</p>
            </div>
          </div>
          <div className="p-3">
            {diagComponents.length === 0 ? (
              <p className="px-2 py-6 text-center font-mono text-[11px] text-zinc-600">
                No diagnostic events yet. Run shadow self-tests or file a deficiency to populate this view.
              </p>
            ) : (
              <ul className="space-y-3">
                {diagComponents.map((row) => (
                  <li
                    key={row.sourceComponentPath}
                    className="rounded-lg border border-zinc-800/90 bg-black/35 px-3 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[11px] font-bold text-teal-100/95 break-all">
                          {row.sourceComponentPath}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-zinc-500">
                          <span className="text-rose-200/90">{row.failCount}</span> fails ·{" "}
                          <span className="text-emerald-200/90">{row.passCount}</span> passes
                          {row.reliabilityScore != null ? (
                            <span className="text-zinc-600">
                              {" "}
                              · pass ratio <span className="tabular-nums text-zinc-400">{row.reliabilityScore}%</span>
                            </span>
                          ) : null}
                          <span className="text-zinc-600">
                            {" "}
                            · weighted <span className="tabular-nums text-zinc-400">{row.healthPoints}</span> pts
                          </span>
                        </p>
                      </div>
                      <span className="shrink-0 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-[10px] font-black tabular-nums text-zinc-200">
                        {row.healthBarPercent}%
                      </span>
                    </div>
                    <ComponentHealthBar percent={row.healthBarPercent} />
                    <p className="mt-2 font-mono text-[10px] text-zinc-500">
                      <span className="font-bold uppercase tracking-wide text-cyan-400/90">Avg TTR</span>{" "}
                      <span className="tabular-nums text-zinc-200">{formatAvgTtr(row.avgTtrSeconds, row.ttrSampleCount)}</span>
                      {row.ttrSampleCount > 0 ? (
                        <span className="text-zinc-600"> ({row.ttrSampleCount} resolved)</span>
                      ) : (
                        <span className="text-zinc-600"> (no resolved samples)</span>
                      )}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-zinc-500">
                      <span className="font-bold uppercase tracking-wide text-zinc-400">Latest deficiency</span>{" "}
                      <span className="text-zinc-400">{row.latestDeficiencyComment ?? "—"}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9px] text-zinc-500">
                      {row.lastFailureAt ? (
                        <span>Last fail: {new Date(row.lastFailureAt).toLocaleString()}</span>
                      ) : null}
                      <span>
                        Git @ fail:{" "}
                        <code className="text-cyan-600/90">
                          {row.lastFailureGitRevision?.trim() ? row.lastFailureGitRevision : "—"}
                        </code>
                      </span>
                    </div>
                    {row.failures.length > 0 ? (
                      <div className="mt-3 border-t border-zinc-800/80 pt-2">
                        <p className="font-mono text-[9px] font-black uppercase tracking-widest text-zinc-500">
                          Failure log · Gemini portal
                        </p>
                        <ul className="mt-1.5 space-y-1.5">
                          {row.failures.map((f) => (
                            <li
                              key={f.reportId}
                              className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-800/70 bg-zinc-950/40 px-2 py-1.5 font-mono text-[10px]"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-zinc-500">{new Date(f.createdAt).toLocaleString()}</span>
                                <span className="ml-2 rounded border border-rose-900/50 px-1 py-px text-[8px] font-bold uppercase text-rose-200/90">
                                  {f.severityLabel}
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={!f.geminiRepairPacket.trim()}
                                title="Read-only DiagnosticReportModal with COPY FOR GEMINI"
                                onClick={() => openGeminiPortal(row.sourceComponentPath, f)}
                                className="shrink-0 rounded border border-teal-700/70 bg-teal-950/50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-teal-100 hover:border-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Open packet
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        ) : null}
      </div>
      )}

      {diagReplay ? (
        <DiagnosticReportModal
          open
          variant="replay"
          archivedGeminiRepairPacket={diagReplay.packet}
          archivedComment={diagReplay.comment}
          threatId={diagReplay.threatId}
          threatTitle={diagReplay.threatTitle}
          threatStatus={diagReplay.threatStatus}
          likelihood={diagReplay.likelihood}
          impact={diagReplay.impact}
          ingestionDetails={diagReplay.ingestionDetails}
          sourceComponentPath={diagReplay.sourceComponentPath}
          onClose={() => setDiagReplay(null)}
        />
      ) : null}

      {teleportToast ? (
        <div
          className="pointer-events-none fixed bottom-6 left-1/2 z-[80] max-w-md -translate-x-1/2 rounded-lg border border-emerald-600/50 bg-emerald-950/95 px-4 py-2.5 text-center font-mono text-[11px] font-bold text-emerald-100 shadow-lg shadow-black/40"
          role="status"
          aria-live="polite"
        >
          {teleportToast}
        </div>
      ) : null}
      {shadowPurgeToast ? (
        <div
          className="pointer-events-none fixed bottom-6 right-6 z-[80] max-w-md rounded-lg border border-rose-500/70 bg-rose-950/95 px-4 py-2.5 text-right font-mono text-[10px] font-bold leading-snug text-rose-50 shadow-lg shadow-black/40"
          role="status"
          aria-live="polite"
        >
          {shadowPurgeToast}
        </div>
      ) : null}
    </div>
  );
}
