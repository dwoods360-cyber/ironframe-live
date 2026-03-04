"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { purgeSimulation } from "@/app/actions/purgeSimulation";
import { getDbQueryMs } from "@/app/actions/simulation";
import { clearAllAuditLogs } from "@/app/utils/auditLogger";
import { useKimbotStore } from "@/app/store/kimbotStore";
import { useGrcBotStore } from "@/app/store/grcBotStore";
import { useRiskStore } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { sleepBlueTeam } from "@/app/utils/blueTeamSync";
import { useComputeBilling } from "@/app/hooks/useComputeBilling";

const DB_POLL_INTERVAL_MS = 3000;

export default function ReportsFooter() {
  const router = useRouter();
  const [dbMs, setDbMs] = useState<number | null>(null);
  const [zustandSync, setZustandSync] = useState<string>("—");
  const [purging, setPurging] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  const billing = useComputeBilling();

  const updateZustandSync = useCallback(() => {
    setZustandSync(new Date().toISOString());
  }, []);

  useEffect(() => {
    updateZustandSync();
  }, [billing.monthlyBurnUsd, billing.activeTenants, billing.totalKimbotSignals, billing.grcBotRisksCount, updateZustandSync]);

  useEffect(() => {
    let mounted = true;
    const fetchDbMs = async () => {
      try {
        const { ms } = await getDbQueryMs();
        if (mounted) {
          setDbMs(ms);
          useAgentStore.getState().setSystemLatencyMs(ms);
        }
      } catch {
        if (mounted) setDbMs(null);
      }
    };
    fetchDbMs();
    const id = setInterval(fetchDbMs, DB_POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const handlePurge = async () => {
    if (purging) return;
    setPurging(true);
    setPurgeMessage(null);
    try {
      const result = await purgeSimulation();
      if (!result.ok) {
        setPurgeMessage(result.message);
        return;
      }
      const purgedLogs = clearAllAuditLogs();
      useKimbotStore.getState().resetSimulationCounters();
      useGrcBotStore.getState().stop();
      useRiskStore.getState().clearAllRiskStateForPurge();
      useRiskStore.getState().setSelectedThreatId(null);
      useAgentStore.getState().addStreamMessage("> [SYSTEM] Simulation environment wiped. System status: CLEAN.");
      sleepBlueTeam();
      setPurgeMessage(`Purge complete. ${purgedLogs} audit log(s) cleared. Historical Entries reset to 0.`);
      updateZustandSync();
      router.refresh();
    } catch (e) {
      setPurgeMessage(String(e));
    } finally {
      setPurging(false);
      setShowPurgeConfirm(false);
    }
  };

  return (
    <footer className="mt-8 border-t border-slate-800 bg-slate-900/30 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 text-[10px] text-slate-500">
          <span className="font-mono">
            Zustand Sync: <span className="text-slate-300">{zustandSync}</span>
          </span>
          <span className="font-mono">
            DB Query: <span className="text-slate-300">{dbMs != null ? `${dbMs} ms` : "—"}</span>
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          {showPurgeConfirm ? (
            <div className="flex flex-col gap-2 rounded border border-slate-700 bg-slate-900/80 p-3">
              <p className="text-[10px] text-slate-300">
                Permanently remove all simulation data (DB + local)? This will reset KIMBOT/GRCBOT and clear pipeline simulation threats.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPurgeConfirm(false)}
                  disabled={purging}
                  className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePurge}
                  disabled={purging}
                  className="rounded border border-rose-500/60 bg-rose-500/20 px-3 py-1.5 text-[10px] font-bold uppercase text-rose-300 hover:bg-rose-500/30 disabled:opacity-50"
                >
                  {purging ? "Purging…" : "Confirm purge"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPurgeConfirm(true)}
              disabled={purging}
              className="rounded border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
            >
              Purge Simulation Data
            </button>
          )}
          {purgeMessage && (
            <p className="text-[10px] text-slate-400">{purgeMessage}</p>
          )}
        </div>
      </div>
    </footer>
  );
}
