"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSustainabilityAnalyticsPlaneData,
  type CarbonLedgerRowDto,
  type SustainabilityAnalyticsPlaneData,
} from "@/app/actions/sustainabilityAnalyticsActions";
import { useKimbotStore } from "@/app/store/kimbotStore";
import {
  computeLedgerCarbonAleCents,
  formatAleCentsUsd,
} from "@/app/utils/sustainabilityLedgerAle";

type ChatLogEntry = {
  id: string;
  timestamp: string;
  prompt: string;
  response: string;
};

type SustainabilityAnalyticsPlaneProps = {
  /** Optional server-hydrated snapshot; refetched on mount when omitted. */
  initialData?: SustainabilityAnalyticsPlaneData | null;
};

/**
 * Epic 9 / 5 — Unified sustainability & risk conversion interface.
 * Separates Ironbloom physical ledger from Kimbot conversational / simulation signals.
 */
export default function SustainabilityAnalyticsPlane({
  initialData = null,
}: SustainabilityAnalyticsPlaneProps) {
  const [activeTab, setActiveTab] = useState<"IRONBLOOM_LEDGER" | "KIMBOT_ASSISTANT">("IRONBLOOM_LEDGER");
  const [planeData, setPlaneData] = useState<SustainabilityAnalyticsPlaneData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const kimbotSignals = useKimbotStore((s) => s.injectedSignals);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSustainabilityAnalyticsPlaneData();
      setPlaneData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sustainability analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) void refresh();
  }, [initialData, refresh]);

  const kimbotLogs: ChatLogEntry[] = useMemo(
    () =>
      kimbotSignals.map((signal) => ({
        id: signal.id,
        timestamp: new Date().toISOString(),
        prompt: signal.title,
        response: `${signal.description} [${signal.severity} · liability $${(signal.liability / 1_000_000).toFixed(1)}M]`,
      })),
    [kimbotSignals],
  );

  const ledgerRows: CarbonLedgerRowDto[] = planeData?.ledgerRows ?? [];

  const cfoAleCentsResult = useMemo(
    () =>
      computeLedgerCarbonAleCents(
        ledgerRows.map((r) => ({
          energyConsumedKwh: r.energyConsumedKwh,
          carbonIntensityGrams: r.carbonIntensityGrams,
        })),
      ),
    [ledgerRows],
  );

  const displayAleFormatted = formatAleCentsUsd(cfoAleCentsResult);
  const productionLedgerDisplay = planeData
    ? formatAleCentsUsd(BigInt(planeData.productionMitigatedValueCents || "0"))
    : "—";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 font-mono text-xs text-slate-200 shadow-2xl">
      <div className="mb-6 flex flex-col justify-between border-b border-slate-800 pb-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-base font-bold uppercase tracking-tight text-emerald-400">
            Sustainability control plane // core audit layout
          </h2>
          <p className="mt-0.5 text-[10px] text-slate-500">
            CSRD forensic compliance matrix · roster status checked
            {planeData?.lastSynchronizedAt
              ? ` · ledger sync ${new Date(planeData.lastSynchronizedAt).toLocaleString()}`
              : ""}
          </p>
          {planeData?.forensicFallbackActive ? (
            <p className="mt-1 text-[10px] font-semibold text-amber-500">
              Forensic regional anchor active — live Electricity Maps unprovisioned or unavailable.
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-2 md:mt-0 md:items-end">
          <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
              CFO carbon ALE mitigated accounting value (reference zones)
            </p>
            <p className="mt-0.5 text-xl font-extrabold tracking-tight text-emerald-400">
              {displayAleFormatted} <span className="text-xs font-normal text-slate-400">USD</span>
            </p>
            <p className="mt-1 text-[10px] text-slate-500">ICP $85/t · {planeData?.referenceKwhLabel ?? "—"}</p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-right">
            <p className="text-[10px] uppercase text-slate-500">Production ledger (tenant)</p>
            <p className="font-bold text-slate-200">{productionLedgerDisplay}</p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="text-[10px] font-bold uppercase text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh ledger"}
          </button>
        </div>
      </div>

      <div className="mb-4 flex space-x-2 border-b border-slate-900 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("IRONBLOOM_LEDGER")}
          className={`rounded px-4 py-2 font-bold uppercase tracking-tight transition-all ${
            activeTab === "IRONBLOOM_LEDGER"
              ? "border border-emerald-700/50 bg-emerald-950 text-emerald-400"
              : "border border-transparent bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          Agent 18 — Ironbloom carbon ledger
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("KIMBOT_ASSISTANT")}
          className={`rounded px-4 py-2 font-bold uppercase tracking-tight transition-all ${
            activeTab === "KIMBOT_ASSISTANT"
              ? "border border-emerald-700/50 bg-emerald-950 text-emerald-400"
              : "border border-transparent bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          Agent 5 — Kimbot dialog record
        </button>
      </div>

      {error ? (
        <p className="mb-3 rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-red-300">{error}</p>
      ) : null}

      <div className="min-h-48 rounded-lg border border-slate-900 bg-black/40 p-4">
        {activeTab === "IRONBLOOM_LEDGER" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2 text-[10px] uppercase text-slate-400">
              <span>Audit target block</span>
              <span>Physical metrics stack</span>
            </div>
            {loading && !ledgerRows.length ? (
              <p className="text-center text-slate-500">Loading gridcore coefficient ledger…</p>
            ) : null}
            {!loading && ledgerRows.length === 0 ? (
              <p className="rounded border border-dashed border-slate-800 p-6 text-center text-slate-500">
                No regional coefficients yet. Run{" "}
                <code className="text-emerald-500">POST /api/internal/cron/gridcore-rate-poll</code> to sync
                Electricity Maps zones.
              </p>
            ) : null}
            {ledgerRows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col justify-between gap-2 rounded border border-slate-800 bg-slate-900/40 p-3 md:flex-row md:items-center"
              >
                <div>
                  <span className="font-bold text-emerald-500">{row.zone}</span>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Timestamp: {new Date(row.recordedAt).toLocaleString()} · {row.source}
                  </p>
                  {row.renewablePercentage != null ? (
                    <p className="text-[10px] text-blue-400/90">
                      Renewable share: {row.renewablePercentage.toFixed(1)}%
                    </p>
                  ) : null}
                </div>
                <div className="space-y-0.5 text-right font-semibold text-slate-300">
                  <p>{row.energyConsumedKwh} kWh</p>
                  <p className="text-[10px] text-amber-500">{row.carbonIntensityGrams} gCO₂eq / kWh</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-b border-slate-900 pb-2 text-[10px] uppercase text-slate-400">
              Conversational session log thread (live Kimbot simulation signals)
            </div>
            {kimbotLogs.length === 0 ? (
              <p className="text-center text-slate-500">
                No Kimbot signals in this session. Enable Kimbot in Strategic Intel to populate the dialog record.
              </p>
            ) : (
              kimbotLogs.map((log) => (
                <div key={log.id} className="space-y-2 rounded border border-slate-900 bg-slate-900/30 p-4">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-bold text-slate-400">{log.id}</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <p className="font-medium text-slate-300">
                    <span className="text-blue-400">User:</span> {log.prompt}
                  </p>
                  <p className="rounded border border-slate-900 bg-black/30 p-2 text-slate-400">
                    <span className="text-emerald-400">Bot:</span> {log.response}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
