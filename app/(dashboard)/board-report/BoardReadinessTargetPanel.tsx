"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTargetReadinessScore } from "@/app/actions/simulationConfigActions";

type Props = {
  initialTarget: number;
};

/** Board Report settings: adjust executive readiness threshold (persisted on `SimulationConfig`). */
export default function BoardReadinessTargetPanel({ initialTarget }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(initialTarget);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialTarget);
  }, [initialTarget]);

  const commit = useCallback(
    (next: number) => {
      setError(null);
      startTransition(async () => {
        const res = await updateTargetReadinessScore(next);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setValue(res.targetReadinessScore);
        router.refresh();
      });
    },
    [router],
  );

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 print:hidden">
      <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
        Board report · Readiness target
      </h3>
      <p className="mt-1 text-[9px] text-zinc-600">
        Operational readiness scores below this threshold set global status to{" "}
        <span className="font-mono text-zinc-400">BREACHED</span> on this dashboard.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
          Target (0–100)
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            disabled={pending}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
        </label>
        <div className="flex items-baseline gap-1 font-mono text-zinc-200">
          <span className="text-2xl font-black tabular-nums">{value}</span>
          <span className="text-[10px] text-zinc-500">/100</span>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => commit(value)}
          className="rounded border border-violet-600/50 bg-violet-950/40 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-violet-200 hover:border-violet-400 disabled:opacity-40"
        >
          Apply
        </button>
      </div>
      {error ? <p className="mt-2 text-[9px] text-rose-400/90">{error}</p> : null}
    </div>
  );
}
