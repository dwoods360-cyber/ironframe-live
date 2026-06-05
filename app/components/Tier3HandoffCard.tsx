"use client";

import { useState } from "react";
import {
  techClaimCardAction,
  techResolveAction,
  userGrantAccessAction,
} from "@/app/actions/tier3EscalationActions";
import {
  CHAOS_L4_WORK_PERFORMED_MIN_CHARS,
  parseChaosL4IrontechLive,
  parseChaosL4LifecycleFromIngestion,
} from "@/app/utils/chaosL4Lifecycle";

export type Tier3HandoffThreat = {
  id: string;
  title: string;
  status?: string | null;
  ingestionDetails?: string | null;
};

type Tier3HandoffCardProps = {
  threat: Tier3HandoffThreat;
  onRefresh?: () => void | Promise<void>;
  /** Fired after tech resolve — parent drops card + mirrors compliance timeline in Audit Intelligence. */
  onArchived?: (threatId: string, workSummary: string, closedAt: string) => void | Promise<void>;
};

export function Tier3HandoffCard({ threat, onRefresh, onArchived }: Tier3HandoffCardProps) {
  const [workText, setWorkText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ingestionRaw = threat.ingestionDetails ?? "{}";
  const l4 = parseChaosL4LifecycleFromIngestion(ingestionRaw);
  const live = parseChaosL4IrontechLive(ingestionRaw);

  if (!l4) return null;

  const step = l4.lifecycleStep ?? "AWAITING_JIT_GRANT";
  const currentRole = l4.assignedRole ?? "CUSTOMER_ANALYST";

  const runAction = async (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await onRefresh?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const runTechResolve = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await techResolveAction(threat.id, workText);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await onArchived?.(threat.id, workText.trim(), result.closedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-5 font-mono text-xs text-slate-300">
      <div className="mb-4 flex justify-between border-b border-slate-800 pb-3">
        <span className="font-bold text-orange-400">{threat.title}</span>
        <span className="rounded border border-slate-800 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-400">
          STEP: {step}
        </span>
      </div>

      {live && live.attempts.length > 0 ? (
        <div className="mb-4 max-h-40 space-y-1 overflow-y-auto rounded border border-slate-800 bg-slate-950 p-3 text-slate-400">
          {live.attempts.map((att, idx) => (
            <div key={`${att.attempt}-${idx}`} className="text-red-400/90">
              [{new Date(att.at).toLocaleTimeString()}] {att.error}
            </div>
          ))}
          {live.lastTerminalLine.trim() ? (
            <div className="mt-2 border-t border-slate-800 pt-2 text-amber-300/90">{live.lastTerminalLine}</div>
          ) : null}
        </div>
      ) : null}

      {error ? <div className="mb-3 font-bold text-red-500">⚠️ {error}</div> : null}

      {step === "AWAITING_JIT_GRANT" ? (
        <div className="rounded border border-orange-500/30 bg-orange-950/20 p-3">
          <p className="mb-3 text-orange-400">
            🚨 The error requires an Ironframe Support person. Please grant remote access link below.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAction(() => userGrantAccessAction(threat.id))}
            className="w-full rounded bg-orange-600 px-4 py-2 font-bold tracking-wide text-white transition hover:bg-orange-500 disabled:opacity-60"
          >
            🤝 GRANT REMOTE ACCESS WINDOW
          </button>
        </div>
      ) : null}

      {step === "JIT_GRANTED" ? (
        <div className="rounded border border-blue-500/30 bg-blue-950/20 p-3 text-center">
          <p className="mb-3 text-blue-400">
            ✨ Tunnel Establish Complete. Awaiting field support engineer check-in signature.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAction(() => techClaimCardAction(threat.id))}
            className="rounded bg-blue-600 px-6 py-2 font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            🛠️ CLAIM WORKSPACE AS IRONFRAME TECH
          </button>
        </div>
      ) : null}

      {step === "TECH_INVESTIGATING" && currentRole === "IRONFRAME_TECH_SUPPORT" ? (
        <div className="rounded border border-emerald-500/30 bg-slate-950 p-4">
          <label className="mb-2 block font-bold text-emerald-400">
            ✏️ ENGINEER TASK COMPLIANCE RECORD:
          </label>
          <textarea
            value={workText}
            onChange={(e) => setWorkText(e.target.value)}
            placeholder="Enter full engineering audit logs of hotfix deployment actions taken here..."
            className="mb-3 min-h-[70px] w-full rounded border border-slate-700 bg-slate-900 p-2 text-slate-200 outline-none focus:border-emerald-500"
          />
          <p className="mb-2 text-[10px] text-slate-500">
            Minimum {CHAOS_L4_WORK_PERFORMED_MIN_CHARS} characters required for audit ledger.
          </p>
          <button
            type="button"
            disabled={busy || workText.trim().length < CHAOS_L4_WORK_PERFORMED_MIN_CHARS}
            onClick={() => void runTechResolve()}
            className="w-full rounded bg-emerald-600 py-2 font-bold tracking-wider text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            ✅ [SAVE & CLEAN UP PLATFORM LOG]
          </button>
        </div>
      ) : null}
    </div>
  );
}
