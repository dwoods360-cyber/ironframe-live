"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Flame, Skull } from "lucide-react";
import { useTenantContext } from "@/app/context/TenantProvider";

type IntegrityPoll = {
  isConstitutionalEmergency: boolean;
  chaosSimulationActive?: boolean;
  deadManSwitch?: {
    armed: boolean;
    expiresAt: string | null;
    remainingMs: number | null;
    triggered: boolean;
    lwtSent: boolean;
    isSimulation: boolean;
    triggerTenantId: string | null;
  };
};

function formatRemaining(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  pollEnabled?: boolean;
};

export default function ChaosConstitutionalCollapsePanel({ pollEnabled = true }: Props) {
  const { activeTenantUuid, tenantFetch } = useTenantContext();
  const [integrity, setIntegrity] = useState<IntegrityPoll | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!pollEnabled || !activeTenantUuid) return;
    try {
      const res = await tenantFetch("/api/grc/tas-integrity");
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { failureMessage?: string };
        setError(j.failureMessage ?? `Integrity poll failed (${res.status})`);
        return;
      }
      const j = (await res.json()) as IntegrityPoll;
      setIntegrity(j);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [pollEnabled, activeTenantUuid, tenantFetch]);

  useEffect(() => {
    void refresh();
    if (!pollEnabled) return undefined;
    const id = setInterval(() => void refresh(), 2000);
    return () => clearInterval(id);
  }, [refresh, pollEnabled]);

  const dms = integrity?.deadManSwitch;
  const showDrill =
    integrity?.chaosSimulationActive ||
    (dms?.isSimulation && (dms.armed || dms.triggered));

  if (!showDrill) return null;

  const wiped = dms?.triggered === true;
  const lwtPhase = Boolean(dms?.lwtSent && !wiped);

  return (
    <div className="mt-2 rounded border border-rose-800/70 bg-gradient-to-br from-rose-950/50 to-zinc-950/90 p-3">
      <div className="flex items-start justify-between gap-2">
        <ConstitutionalCollapseDrillBody
          wiped={wiped}
          lwtPhase={lwtPhase}
          dms={dms}
          onRefresh={() => void refresh()}
        />
      </div>
      {error ? (
        <p className="mt-2 text-[8px] text-zinc-400" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/admin/resurrection"
          className="inline-flex items-center gap-1.5 rounded border border-cyan-600/70 bg-cyan-950/50 px-2 py-1.5 text-[8px] font-black uppercase tracking-wide text-cyan-100 hover:bg-cyan-900/50"
        >
          <Flame className="h-3 w-3" aria-hidden />
          Phoenix Resurrection
        </Link>
        <p className="self-center text-[8px] text-amber-200/90">
          Then use Constitutional Emergency overlay for Tripartite / Dual-Lock override keys.
        </p>
      </div>
      {wiped ? (
        <p className="mt-2 text-[8px] leading-relaxed text-emerald-300/90">
          Drill complete: nuclear override unlocks Phoenix; restore tenant from off-site Last Will.
        </p>
      ) : null}
    </div>
  );
}

function ConstitutionalCollapseDrillBody(props: {
  wiped: boolean;
  lwtPhase: boolean;
  dms: IntegrityPoll["deadManSwitch"];
  onRefresh: () => void;
}) {
  const { wiped, lwtPhase, dms, onRefresh } = props;

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <Skull className="h-4 w-4 shrink-0 text-rose-300" aria-hidden />
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-rose-100">
            Constitutional Collapse · [SIMULATION_DATA]
          </p>
          <p className="mt-0.5 text-[8px] text-rose-200/80">
            {wiped
              ? "Tenant scorch complete — execute Tripartite Nuclear Override, then Phoenix."
              : lwtPhase
                ? "Last Will transmitted — DMS scorch imminent."
                : `Simulation DMS armed · ${formatRemaining(dms?.remainingMs)} remaining`}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="shrink-0 rounded border border-rose-700/60 px-2 py-1 text-[8px] font-bold uppercase text-rose-100 hover:bg-rose-900/40"
      >
        Refresh
      </button>
    </>
  );
}
